const express = require("express");
const path = require("path");
const auth = require("./auth");
const { clinicianFor, censusFor, patientById } = require("./data");
const { invokeAgent } = require("./agent");
const { newTraceId } = require("./trace");

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
  var reply = (result.ok && result.text)
    ? result.text
    : (result.stub ? "The assistant isn't connected yet." : "I couldn't complete that just now. Please try again.");
  res.json({ traceId, stub: result.stub, ok: result.ok, reply: reply });
});

// ---- App shell (guarded page) ----
router.get("/", pageGuard, (_req, res) =>
  res.sendFile(path.join(__dirname, "../../dashboard/healthsphere.html")));

module.exports = router;
