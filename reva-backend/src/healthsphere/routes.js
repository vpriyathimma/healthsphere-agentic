const express = require("express");
const path = require("path");
const auth = require("./auth");
const { clinicianFor, censusFor, patientById } = require("./data");
const { invokeAgent } = require("./agent");
const { newTraceId } = require("./trace");
const approvals = require("./approvals");
const slack = require("../integrations/slack");
const { subForEmail } = require("./principals");
const runtime = require("./runtime");

const router = express.Router();

// ---- Auth (Cognito PKCE) ----
router.get("/auth/login", (req, res) => {
  const state = auth.randomState();
  const { verifier, challenge } = auth.pkce();
  req.session.hsOauth = { state, verifier };
  res.redirect(auth.authorizeUrl(state, challenge));
});
router.get("/auth/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const saved = req.session.hsOauth;
    if (!code || !state || !saved || state !== saved.state) {
      return res.status(400).send("Invalid sign-in response. <a href='/healthsphere'>Return</a>");
    }
    const tokens = await auth.exchangeCode(code, saved.verifier);
    const claims = await auth.verifyIdToken(tokens.id_token);
    req.session.hsUser = auth.userFromClaims(claims);
    req.session.hsTokens = { accessToken: tokens.access_token, idToken: tokens.id_token };
    delete req.session.hsOauth;
    res.redirect("/healthsphere");
  } catch (e) {
    res.status(500).send(`Sign-in failed: ${e.message}`);
  }
});
router.post("/auth/logout", (req, res) => {
  req.session.hsUser = null;
  req.session.hsTokens = null;
  res.json({ logoutUrl: auth.logoutUrl() });
});

// ---- Guards (page redirects; api returns 401) ----
const pageGuard = (req, res, next) => (req.session.hsUser ? next() : res.redirect("/healthsphere/auth/login"));
const apiGuard = (req, res, next) => (req.session.hsUser ? next() : res.status(401).json({ error: "not_authenticated" }));

// ---- Clinical API (custom-app operations only; nothing audited here) ----
router.get("/api/me", apiGuard, (req, res) => {
  const u = req.session.hsUser;
  res.json({ ...u, clinician: clinicianFor(u.email) });
});
router.get("/api/patients", apiGuard, (req, res) => res.json(censusFor(req.session.hsUser)));
router.get("/api/patients/:id", apiGuard, (req, res) => {
  const p = patientById(req.params.id);
  if (!p) return res.status(404).json({ error: "not_found", message: "No patient with that id." });
  res.json(p);
});
router.post("/api/agent/ask", apiGuard, async (req, res) => {
  const user = req.session.hsUser;
  const traceId = newTraceId();
  const { prompt, patientId } = req.body || {};
  // When a chart is open, pass the patient id as context so the agent can look it up.
  const fullPrompt = patientId ? (prompt || "") + "\n\n[Patient in context: " + patientId + "]" : (prompt || "");
  const _c = (typeof clinicianFor === "function") ? clinicianFor(user.email) : {};
  const actor = { email: user.email || "", name: (_c && _c.name) || user.name || user.email || "", role: user.persona || "" };
  const result = await invokeAgent({
    user, traceId, prompt: fullPrompt, actor,
    bearer: req.session.hsTokens && req.session.hsTokens.accessToken, // user's Cognito token → gateway inbound
    // The ID token, not the access token, for the PDP. Cognito access tokens
    // carry token_use:"access" and no user claims; ID tokens carry the claims
    // an authorization service expects to identify a principal.
    idToken: req.session.hsTokens && req.session.hsTokens.idToken,
  });
  // A gated action came back pending. Raise the approval, post it to Slack,
  // and tell the browser to wait — nothing has been executed.
  if (result.pending) {
    const rec = approvals.create({
      action: result.pending.action,
      arguments: result.pending.arguments,
      requester: (user && user.sub) || "",
      requesterName: actor.name || actor.email,
      sessionId: result.pending.session_id,
      prompt: fullPrompt,
      patientRef: patientId || (result.pending.arguments || {}).mrn || "",
      displayMessage: result.pending.display_message,
    });
    try {
      const ts = await slack.postApproval(rec);
      if (ts) approvals.setSlackTs(rec.approval_id, ts);
    } catch (e) {
      // Slack is one route to a decision, not the only one. The in-app queue
      // still works, so a Slack outage degrades rather than blocks.
      console.warn("[approvals] slack post failed: " + e.message);
    }
    return res.json({
      traceId, ok: true, stub: false,
      status: "pending_approval",
      approval_id: rec.approval_id,
      reply: rec.display_message,
    });
  }

  var reply = (result.ok && result.text)
    ? result.text
    : (result.stub ? "The assistant isn't connected yet." : "I couldn't complete that just now. Please try again.");
  res.json({ traceId, stub: result.stub, ok: result.ok, reply: reply });
});


/* Record a verdict and, if approved, replay the original request with it.
 *
 * Shared by the in-app route and the Slack receiver so the two cannot drift —
 * maker-checker, idempotency and the replay all have to behave identically
 * whichever way the decision arrives.
 */
async function decideAndResume({ approvalId, verdict, approverPrincipal,
                                 approverDisplay, note, bearer, idToken, user }) {
  const d = approvals.decide({ approvalId, verdict, approverPrincipal, approverDisplay, note });
  if (!d.ok) {
    const codes = { not_found: 404, self_approval: 403, unknown_approver: 403,
                    already_decided: 409, expired: 410, bad_verdict: 400 };
    return { ok: false, error: d.error, code: codes[d.error] || 400, rec: d.rec };
  }
  const rec = d.rec;

  // Update the Slack card so the buttons cannot be clicked again and the
  // channel shows the outcome.
  try { await slack.resolveMessage(rec); }
  catch (e) { console.warn("[approvals] slack update failed: " + e.message); }

  // Replay on the SAME session, with the verdict attached. On a rejection this
  // still goes to the agent: the forbid policy is what refuses it, so the
  // denial is a real authorization decision in the log rather than the app
  // quietly declining to call.
  try {
    const replay = await runtime.invokeSupervisor({
      user: user || { sub: rec.requester },
      traceId: null,
      sessionId: rec.session_id,
      prompt: rec.prompt,
      actor: { name: rec.requester_name },
      bearer, idToken,
      hitl: approvals.hitlFor(rec),
    });
    approvals.setResult(rec.approval_id, replay.text || "");
  } catch (e) {
    console.warn("[approvals] replay failed: " + e.message);
    approvals.setResult(rec.approval_id,
      "The decision was recorded but the action could not be completed. Please retry.");
  }
  return { ok: true, rec: approvals.get(rec.approval_id) };
}

// ---- Approvals ----

// The queue a clinician may act on. Their own requests are excluded — the
// approver must not be the requester.
router.get("/api/approvals", apiGuard, (req, res) => {
  res.json(approvals.listFor(req.session.hsUser.sub));
});

// Single record, for the chat card to poll while it waits.
router.get("/api/approvals/:id", apiGuard, (req, res) => {
  const rec = approvals.get(req.params.id);
  if (!rec) return res.status(404).json({ error: "not_found" });
  res.json(rec);
});

// Record a verdict in-app, then replay the original request with it attached.
router.post("/api/approvals/:id/decide", apiGuard, async (req, res) => {
  const u = req.session.hsUser;
  const { verdict, note } = req.body || {};
  const out = await decideAndResume({
    approvalId: req.params.id,
    verdict,
    approverPrincipal: u.sub,
    approverDisplay: (clinicianFor(u.email) || {}).name || u.email,
    note,
    bearer: req.session.hsTokens && req.session.hsTokens.accessToken,
    idToken: req.session.hsTokens && req.session.hsTokens.idToken,
    user: u,
  });
  if (!out.ok) return res.status(out.code || 400).json({ error: out.error });
  res.json(out.rec);
});


// ---- Slack interactivity ----
//
// Mounted with a RAW body parser in server.js, before the global express.json.
// The signature is an HMAC over the raw bytes; once JSON middleware has parsed
// and discarded them, the HMAC can never be reproduced and every request would
// fail verification for a reason that looks like a bad secret.
//
// Slack expects a reply within 3 seconds, so this acknowledges immediately and
// does the decision and replay afterwards.
router.post("/slack/interactivity", async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "");
  const ok = slack.verifySignature({
    rawBody: raw,
    timestamp: req.get("x-slack-request-timestamp"),
    signature: req.get("x-slack-signature"),
  });
  if (!ok) {
    console.warn("[slack] signature verification failed");
    return res.status(401).send("bad signature");
  }

  let payload;
  try {
    const params = new URLSearchParams(raw);
    payload = JSON.parse(params.get("payload") || "{}");
  } catch (e) {
    return res.status(400).send("bad payload");
  }

  const action = (payload.actions || [])[0] || {};
  const approvalId = action.value;
  const verdict = action.action_id === "approval_approve" ? "approve"
                : action.action_id === "approval_reject" ? "reject" : null;
  if (!approvalId || !verdict) return res.status(200).send();

  // Acknowledge first. Everything below runs after Slack has its 200.
  res.status(200).send();

  try {
    // A Slack identity is not an identity the PDP knows. Resolve it to the
    // Cognito sub, and refuse if it cannot be resolved — an approver we cannot
    // attribute is not an approver.
    const email = await slack.emailForUser(payload.user && payload.user.id);
    const sub = email ? await subForEmail(email) : null;
    if (!sub) {
      console.warn("[slack] unmappable approver: " + ((payload.user || {}).id || "?")
        + " email=" + (email || "none"));
      await slack.postRefusal(payload.user && payload.user.id, "unknown_approver");
      return;
    }
    const out = await decideAndResume({
      approvalId, verdict,
      approverPrincipal: sub,
      approverDisplay: (payload.user && payload.user.name) || email,
      note: null,
    });
    if (!out.ok) {
      console.warn("[slack] decision refused: " + out.error);
      await slack.postRefusal(payload.user && payload.user.id, out.error);
    }
  } catch (e) {
    console.warn("[slack] interactivity failed: " + e.message);
  }
});

// ---- App shell (guarded page) ----
router.get("/", pageGuard, (_req, res) =>
  res.sendFile(path.join(__dirname, "../../dashboard/healthsphere.html")));

module.exports = router;
