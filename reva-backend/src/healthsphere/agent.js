// Single seam from the app to the gateway. Originates traceId + user principal on
// every call (interceptor-ready). When live, invokes the supervisor agent target
// through the gateway with the user's token and returns the agent's text reply.
const { traceparent, newSpanId } = require("./trace");
const runtime = require("./runtime");

const gw = {
  url: process.env.GATEWAY_URL || "https://healthsphere-gateway-krackytzcf.gateway.bedrock-agentcore.us-west-2.amazonaws.com",
  supervisorTarget: process.env.SUPERVISOR_TARGET || "clinical-orders-agent",
  live: (process.env.GATEWAY_LIVE || "false") === "true",
};

// The runtime streams Strands events as SSE `data: {json}` lines. Accumulate the
// assistant text from contentBlockDelta events; fall back to plain JSON/text.

// Verbose token logging (for reference). Set HS_TOKEN_LOG=false to silence.
const TOKEN_LOG = (process.env.HS_TOKEN_LOG || "true") === "true";
function decodeJwt(t) {
  try {
    var parts = String(t).split(".");
    if (parts.length < 2) return null;
    var pad = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (pad.length % 4) pad += "=";
    return JSON.parse(Buffer.from(pad, "base64").toString("utf8"));
  } catch (_) { return null; }
}
function logToken(label, token) {
  if (!TOKEN_LOG || !token) return;
  var c = decodeJwt(token) || {};
  console.log("[TOKEN] " + label);
  console.log("        client_id : " + (c.client_id || "-"));
  console.log("        sub       : " + (c.sub || "-"));
  console.log("        username  : " + (c.username || c["cognito:username"] || c.email || "-"));
  console.log("        scope     : " + (c.scope || "-"));
  console.log("        token_use : " + (c.token_use || "-"));
  console.log("        iss       : " + (c.iss || "-"));
  console.log("        exp       : " + (c.exp ? new Date(c.exp * 1000).toISOString() : "-"));
  console.log("        raw       : " + token);
}

function extractText(raw) {
  let out = "";
  let sawData = false;
  for (const line of String(raw).split(/\r?\n/)) {
    const m = line.match(/^data:\s*(.*)$/);
    if (!m) continue;
    sawData = true;
    let ev;
    try { ev = JSON.parse(m[1]); } catch (_) { continue; }
    if (ev && ev.error) { out += String(ev.error) + "\n"; continue; }
    const e = (ev && ev.event) || ev || {};
    const delta = e.contentBlockDelta && e.contentBlockDelta.delta;
    if (delta && typeof delta.text === "string") out += delta.text;
  }
  if (!sawData) {
    try {
      const j = JSON.parse(raw);
      if (typeof j === "string") return j;
      return j.output || j.text || j.result || j.completion || raw;
    } catch (_) { return String(raw); }
  }
  return out.trim();
}

async function invokeAgent({ user, traceId, target, prompt, bearer, actor, idToken,
                             chatId, chatStartedAt, turn, sessionMessages }) {
  // The LangGraph three-agent orchestration is deployed as AgentCore runtimes
  // rather than gateway targets, so there is no target name to route to. When
  // HS_SUPERVISOR_ARN is set, go straight to the supervisor and let it delegate
  // to records/admissions inside AWS. Unset, everything below is unchanged.
  if (runtime.enabled()) {
    // bearer is the signed-in user's access token. The Reva SDK reads the
    // principal claim from it, so the agent needs the token itself, not just
    // the actor fields derived from it.
    // Session fields forwarded explicitly. This wrapper destructures a fixed
    // set of names, so anything routes.js starts sending is dropped here unless
    // it is named — silently, because the argument below is an object literal
    // and a missing key is only ever undefined. That is exactly what happened
    // to chatId: the browser sent it, routes.js passed it, and it disappeared
    // one hop before the runtime, which then fell back to the per-message trace
    // id and gave every message its own session.
    return runtime.invokeSupervisor({ user, traceId, prompt, actor, bearer, idToken,
                                      chatId, chatStartedAt, turn, sessionMessages });
  }

  const t = target || gw.supervisorTarget;
  const url = `${gw.url}/${t}/invocations`;
  const headers = {
    "content-type": "application/json",
    "accept": "text/event-stream, application/json",
    traceparent: traceparent(traceId, newSpanId()),
    "X-Amzn-Bedrock-AgentCore-Runtime-User-Id": user.sub, // human principal (for TrAT/interceptor later)
  };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  actor = actor || {};
  const body = JSON.stringify({
    prompt: prompt || "",
    actor_email: actor.email || "",
    actor_name: actor.name || "",
    actor_role: actor.role || "",
  });

  // ---- Reference logging (Render) ----
  logToken("INBOUND app -> gateway  (user access token, presented as bearer)", bearer);
  console.log("[ACTOR] acting clinician forwarded to agent: " + (actor.name || "-") + " <" + (actor.email || "-") + "> role=" + (actor.role || "-"));
  console.log("[CALL]  app -> gateway");
  console.log("        target      : " + t);
  console.log("        url         : " + url);
  console.log("        traceparent : " + headers.traceparent);
  console.log("        user-id hdr : " + headers["X-Amzn-Bedrock-AgentCore-Runtime-User-Id"]);
  console.log("        NOTE: gateway mints the agent's own M2M token (e.g. healthsphere-supervisor-gw) OUTBOUND to the runtime.");
  console.log("              That agent token is created inside AWS and is visible in CloudWatch gateway logs, not here.");

  if (!gw.live) {
    console.log("[CALL]  gateway not live (GATEWAY_LIVE!=true) - stub");
    return { ok: true, stub: true, traceId, target: t, text: "" };
  }
  try {
    const res = await fetch(url, { method: "POST", headers, body });
    const raw = await res.text();
    console.log("[RESP]  gateway -> app  status=" + res.status + "  bytes=" + raw.length);
    if (!res.ok) {
      console.warn("[agent] gateway " + res.status + ": " + raw.slice(0, 600));
      return { ok: false, stub: false, status: res.status, traceId, target: t, text: "", raw };
    }
    return { ok: true, stub: false, status: res.status, traceId, target: t, text: extractText(raw), raw };
  } catch (e) {
    console.warn("[agent] gateway call failed: " + e.message);
    return { ok: false, stub: false, traceId, target: t, text: "", error: e.message };
  }
}

module.exports = { invokeAgent };
