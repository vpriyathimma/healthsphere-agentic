// Direct AgentCore Runtime invocation — the LangGraph supervisor path.
//
// The existing seam in agent.js calls the gateway at {url}/{target}/invocations.
// That still works and is untouched. This is an alternative destination for the
// three-agent LangGraph orchestration, which is deployed as runtimes rather
// than as gateway targets, so there is no target name to point at.
//
// Enabled by setting HS_SUPERVISOR_ARN. Unset, nothing here runs and the app
// behaves exactly as before.
//
// The supervisor delegates to the records and admissions agents itself, inside
// AWS. The app only ever talks to the supervisor — which is what makes the
// sub-agent calls appear as agent-to-agent hops rather than as three separate
// calls from the application.

const { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } =
  require("@aws-sdk/client-bedrock-agentcore");

// .trim() is load-bearing. Pasting an ARN into a hosting provider's env-var UI
// very easily carries a trailing newline, and the resulting error —
// "No endpoint or agent found with qualifier 'DEFAULT'" — names a real ARN and
// looks like a missing runtime rather than whitespace.
const REGION = (process.env.AWS_REGION || "us-west-2").trim();
const SUPERVISOR_ARN = (process.env.HS_SUPERVISOR_ARN || "").trim();

let _client = null;
function client() {
  if (!_client) _client = new BedrockAgentCoreClient({ region: REGION });
  return _client;
}

function enabled() {
  return Boolean(SUPERVISOR_ARN);
}

// AgentCore rejects session ids under 33 characters. Derive one from the trace
// id so a conversation stays on the same runtime session, and pad if short.
function sessionIdFor(traceId, user) {
  let sid = `hs-${traceId || ""}-${(user && user.sub) || "anon"}`.replace(/[^a-zA-Z0-9_-]/g, "");
  while (sid.length < 33) sid += "0";
  return sid.slice(0, 64);
}

// The agent returns { output: { message, role } }. Unwrap defensively — a
// changed shape should degrade to readable text, not to "[object Object]".
function extractText(data) {
  if (typeof data === "string") return data;
  const out = (data && data.output) || data || {};
  if (typeof out.message === "string") return out.message;
  if (out.message && Array.isArray(out.message.content)) {
    return out.message.content.map((p) => (p && p.text) || "").join("");
  }
  if (typeof out.text === "string") return out.text;
  return JSON.stringify(data);
}

async function invokeSupervisor({ user, traceId, prompt, actor, bearer, idToken,
                                  sessionId: sessionIdOverride, hitl }) {
  // On a replay the session id comes from the approval record rather than
  // being recomputed. sessionIdFor pads and truncates, so recomputing invites
  // a mismatch that would quietly start a different session.
  const sessionId = sessionIdOverride || sessionIdFor(traceId, user);

  console.log("[CALL]  app -> agentcore runtime (direct)");
  console.log("        arn        : " + SUPERVISOR_ARN);
  console.log("        session    : " + sessionId);
  console.log("        actor      : " + ((actor && actor.name) || "-"));

  try {
    const res = await client().send(
      new InvokeAgentRuntimeCommand({
        agentRuntimeArn: SUPERVISOR_ARN,
        runtimeSessionId: sessionId,
        qualifier: "DEFAULT",
        payload: new TextEncoder().encode(
          JSON.stringify({
            input: { prompt: prompt || "" },
            // The PDP keys User entities by Cognito `sub`, not email — email is
            // only the topology's displayName. Sending the email matches no
            // entity, which arrives as "denied by policy" rather than as an
            // unknown principal.
            actor_id: (user && user.sub) || "",
            actor_email: (actor && actor.email) || "",
            actor_name: (actor && actor.name) || "",
            actor_role: (actor && actor.role) || "",
            // Both Cognito tokens, because they are used for different things.
            // The ACCESS token is what the PDP validates at the entry hop — it
            // is the credential the user actually presented. The ID token
            // carries the profile claims. Both are JWTs, so no external IdP is
            // required to satisfy the transaction-token flow.
            user_access_token: bearer || "",
            user_token: idToken || bearer || "",
            // The approval verdict, when replaying after a decision. Absent on
            // the first attempt — and absent is not "pending", it means nobody
            // has been asked, which the policy permits.
            hitl: hitl || null,
          })
        ),
      })
    );

    const raw = await new Response(res.response).text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      data = raw;
    }
    const text = extractText(data);
    console.log("[RESP]  runtime -> app  bytes=" + raw.length);

    // A gated tool comes back as a structured pending response. Pass it up
    // rather than flattening it to prose — the caller needs the action and
    // arguments to replay the call verbatim once a clinician has decided.
    if (data && data.status === "pending_approval") {
      console.log("[PEND]  approval required: " + data.action);
      return {
        ok: true, stub: false, traceId, target: "hs_supervisor", text, raw,
        pending: {
          action: data.action,
          arguments: data.arguments || {},
          requester: data.requester,
          prompt: data.prompt,
          display_message: data.display_message,
          session_id: sessionId,
        },
      };
    }
    return { ok: true, stub: false, traceId, target: "hs_supervisor", text, raw };
  } catch (e) {
    console.warn("[runtime] invoke failed: " + e.message);
    return { ok: false, stub: false, traceId, target: "hs_supervisor", text: "", error: e.message };
  }
}

module.exports = { enabled, invokeSupervisor, sessionIdFor };
