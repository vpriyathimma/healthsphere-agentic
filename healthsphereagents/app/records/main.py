import os
import json
import urllib.request

from strands import Agent, tool
from strands.agent.conversation_manager.null_conversation_manager import NullConversationManager
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from bedrock_agentcore.identity.auth import requires_access_token

from model.load import load_model
from mcp_client.client import get_streamable_http_mcp_client

app = BedrockAgentCoreApp()
log = app.logger

DEFAULT_SYSTEM_PROMPT = """
You are the Records Agent for HealthSphere hospital. You retrieve patient records, lab results, and clinical data. You support other agents and clinical staff by providing accurate patient information. Always use the get_patient and get_lab_results tools. Never fabricate data.
"""

# Which credential provider this agent authenticates with (non-secret provider name).
GATEWAY_PROVIDER_NAME = os.environ["GATEWAY_PROVIDER_NAME"]
GATEWAY_SCOPE = os.environ.get("GATEWAY_SCOPE", "healthsphere-agents/invoke")
GATEWAY_BASE = os.environ.get(
    "AGENTCORE_GATEWAY_BASE",
    "https://healthsphere-gateway-krackytzcf.gateway.bedrock-agentcore.us-west-2.amazonaws.com",
)

# Derive this agent's role from its provider name. Shared code, per-agent behaviour.
if "records" in GATEWAY_PROVIDER_NAME:
    ROLE = "records"
elif "admissions" in GATEWAY_PROVIDER_NAME:
    ROLE = "admissions"
else:
    ROLE = "supervisor"

# Each agent may ONLY use its own tools. The supervisor cannot touch records/
# admissions tools directly — it must delegate to those agents.
TOOL_ALLOWLIST = {
    "supervisor": ["place-order", "sign-order", "record-vitals"],
    "records": ["get-patient", "get-lab-results"],
    "admissions": ["request-discharge", "approve-demo-edit"],
}


def _tool_name(t):
    for attr in ("tool_name", "name"):
        v = getattr(t, attr, None)
        if isinstance(v, str):
            return v
    spec = getattr(t, "tool_spec", None)
    if isinstance(spec, dict) and isinstance(spec.get("name"), str):
        return spec["name"]
    return str(t)


def _scope_tools(mcp_tools):
    allow = TOOL_ALLOWLIST.get(ROLE, [])
    return [t for t in mcp_tools if any(a in _tool_name(t) for a in allow)]


def _extract_text_from_sse(raw):
    out, saw = [], False
    for line in str(raw).splitlines():
        if not line.startswith("data:"):
            continue
        saw = True
        try:
            ev = json.loads(line[5:].strip())
        except Exception:
            continue
        if isinstance(ev, dict) and ev.get("error"):
            out.append(str(ev["error"]))
            continue
        e = ev.get("event", ev) if isinstance(ev, dict) else {}
        delta = (e.get("contentBlockDelta") or {}).get("delta") if isinstance(e, dict) else None
        if delta and isinstance(delta.get("text"), str):
            out.append(delta["text"])
    if not saw:
        try:
            j = json.loads(raw)
            return j if isinstance(j, str) else (j.get("output") or j.get("text") or str(raw))
        except Exception:
            return str(raw)
    return "".join(out).strip()


def _invoke_subagent(target, request_text, token, actor=None):
    """Call a sub-agent runtime THROUGH the gateway, authenticated as this agent.
    The gateway swaps our token for the sub-agent's own credential on the way in."""
    actor = actor or {}
    body = json.dumps({
        "prompt": request_text,
        "actor_email": actor.get("email", ""),
        "actor_name": actor.get("name", ""),
        "actor_role": actor.get("role", ""),
    }).encode("utf-8")
    req = urllib.request.Request(
        GATEWAY_BASE + "/" + target + "/invocations",
        data=body,
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "Accept": "text/event-stream, application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        raw = r.read().decode("utf-8")
    return _extract_text_from_sse(raw)



def _extract_actor(payload):
    """The acting clinician, passed by the app/BFF and forwarded across delegation hops."""
    if not isinstance(payload, dict):
        return {"email": "", "name": "", "role": ""}
    return {
        "email": payload.get("actor_email") or "",
        "name": payload.get("actor_name") or "",
        "role": payload.get("actor_role") or "",
    }


def _actor_preamble(actor):
    """System-prompt block so the agent fills actor fields itself and never asks the user."""
    if not actor.get("email"):
        return ""
    who = actor.get("name") or actor.get("email")
    role = actor.get("role")
    return (
        "\n\nACTING CLINICIAN (verified from the signed-in session): "
        + who + " <" + actor["email"] + ">"
        + ((", role: " + role) if role else "")
        + ".\nThis is the authenticated user making the request. For ANY tool argument that "
        "identifies who is acting (for example ordered_by, signed_by, recorded_by, requested_by, "
        "reviewed_by, or any similar 'by' field), use this clinician's email automatically. "
        "NEVER ask the user for their own name, email, or identity \u2014 you already have it. "
        "When you delegate to another agent, pass this clinician along. Only ask for genuinely "
        "clinical inputs that are required by a tool and cannot be derived."
    )


@requires_access_token(
    provider_name=GATEWAY_PROVIDER_NAME,
    scopes=[GATEWAY_SCOPE],
    auth_flow="M2M",
    force_authentication=False,
)
async def _get_gateway_token(*, access_token: str = None) -> str:
    return access_token


def _extract_prompt(payload: dict):
    if "messages" in payload:
        return payload["messages"]
    if "tool_results" in payload:
        return [{"role": "user", "content": [{"toolResult": {
            "toolUseId": tr["toolUseId"],
            "status": tr.get("status", "success"),
            "content": tr.get("content", []),
        }} for tr in payload["tool_results"]]}]
    return payload.get("prompt", "")


@app.entrypoint
async def invoke(payload, context):
    log.info("Invoking %s agent...", ROLE)
    prompt = _extract_prompt(payload)
    actor = _extract_actor(payload)
    system_prompt = DEFAULT_SYSTEM_PROMPT + _actor_preamble(actor)
    token = await _get_gateway_token()

    mcp_client = get_streamable_http_mcp_client(token)
    with mcp_client:
        mcp_tools = _scope_tools(mcp_client.list_tools_sync())
        tools = list(mcp_tools)

        # Only the supervisor can delegate to sub-agents (through the gateway).
        if ROLE == "supervisor":
            @tool
            def consult_records_agent(request: str) -> str:
                """Ask the Records Agent for patient records, demographics, or lab results.
                Use this for ANY patient lookup — you cannot access those tools yourself."""
                return _invoke_subagent("records-agent", request, token, actor)

            @tool
            def consult_admissions_agent(request: str) -> str:
                """Ask the Admissions Agent to request a discharge or approve a demographic change."""
                return _invoke_subagent("admissions-agent", request, token, actor)

            tools = tools + [consult_records_agent, consult_admissions_agent]

        agent = Agent(
            model=load_model(),
            system_prompt=system_prompt,
            tools=tools,
            conversation_manager=NullConversationManager(),
        )

        async for event in agent.stream_async(prompt):
            if not isinstance(event, dict) or "event" not in event:
                continue
            cbs = event["event"].get("contentBlockStart")
            if cbs is not None and not cbs.get("start"):
                continue
            yield event


if __name__ == "__main__":
    app.run()
