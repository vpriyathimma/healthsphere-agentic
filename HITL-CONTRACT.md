# HITL wire contract

The shape passed between the agent runtime (`healthsphere-agents`) and the
clinical app (`healthsphere-agentic`) when an action needs a human.

**This file is committed to both repos and must stay identical.** The two sides
are deployed separately — the agents to AgentCore, the app to Render — so
nothing but this document stops them drifting.

---

## The join key

**`session_id`**, and it must equal the AgentCore `runtimeSessionId`.

The app computes it once, stores it on the approval record, and reuses it
verbatim on the replay. It must **not** be recomputed: `sessionIdFor()` derives
it from the trace id and pads to 33 characters, so recomputing invites a
mismatch that would silently address a different session.

---

## 1. Pending — agent to app

Returned when a gated tool is reached and nobody has decided yet. **Nothing has
been executed and no transaction token has been minted.**

```json
{
  "output": {
    "message": "This action needs a second clinician to approve it before it can be carried out.",
    "role": "supervisor"
  },
  "status": "pending_approval",
  "pending": {
    "tool": "approve_demo_edit_lg",
    "arguments": { "mrn": "MRN-1004", "field": "ward", "new_value": "ICU" },
    "display_message": "This action needs a second clinician to approve it before it can be carried out.",
    "requester": "<cognito sub of the clinician who asked>",
    "session_id": "<runtimeSessionId — the join key>",
    "prompt": "<the user's original words>"
  }
}
```

`display_message` is what a clinician sees. It never contains the words Cedar,
PDP, Reva, policy store or governance.

## 2. Resume — app to agent

Sent when someone decides. Same `session_id`, so the trace continues.

```json
{
  "input": { "prompt": "<the original prompt, verbatim>" },
  "actor_id": "<requester's cognito sub>",
  "actor_name": "...", "actor_role": "...", "actor_email": "...",
  "hitl": {
    "status": "approved" | "rejected",
    "approver": "<approver's cognito sub>",
    "approval_id": "<the app's approval record id>"
  }
}
```

`approver` is the **Cognito sub**, not a display name and not a Slack user id.
An approver who cannot be mapped to a sub is not an approver, and the approval
is refused.

## 3. Terminal — agent to app

Normal shape. On rejection the refusal is business-contextual, and the Cedar
forbid — not the application — is what stopped it.

```json
{ "output": { "message": "...", "role": "supervisor" } }
```

---

## What the verdict becomes inside the agent

| | |
|---|---|
| `hitl.status` | `HSNewApp_hitl_status` in Cedar `context` |
| `hitl.approver` | `HSNewApp_hitl_approver` |
| `hitl.approval_id` | `HSNewApp_hitl_approval_id` |

The prefix comes from the policy store's application name and is set by
`HITL_ATTR_PREFIX`. **Change the store's app name and this changes**, and a
mismatch produces no error — the forbid simply never matches.

Carried only on the **direct evaluation**. `proxy.mcp`'s enrich envelope has no
context passthrough, so a verdict sent only through the SDK path is invisible
to Cedar and a rejection would be silently ignored.

The approval is **not** recorded as a separate hop — see deviation 4. Who
decided is carried on the tool hop's own decision, in the context attributes
above, and nowhere else.

---

## Which tools are gated

`HS_HITL_TOOLS`, an env var read by `common/entities.py`. Empty disables HITL.

**This is a known deviation from the original spec**, which requires the PDP to
return a pending obligation and forbids the application holding a list of risky
actions. The PDP returns `{decision, threadId}` and no obligation field, so the
app-side list is currently the only mechanism. `gen_topology.py` mirrors this
list into the topology's `requiresHumanApproval`, so the store and the code at
least agree.

`place_order` is deliberately **not** gated: gating it stops the intent-drift
scenario before the risky action it exists to demonstrate.

## Known deviations from the original spec

1. **No LangGraph checkpointer.** The turn is replayed rather than resumed.
   Verified empirically: three invocations with the same `runtimeSessionId`
   landed on **two different microVMs**, so `MemorySaver` would lose suspended
   state and the resume would fail silently. A correct implementation needs a
   DynamoDB-backed checkpointer.
2. **The PDP returns no HITL obligation**, so the gated list lives in the app.
3. **Maker-checker is off.** The spec requires approver ≠ requester; the later
   instruction was that anyone in the channel may approve, including the
   requester. Controlled by `HS_HITL_MAKER_CHECKER`.
4. **The approval is not a hop in the decision log.** An earlier draft of this
   file said the agent records `approveAction` / `rejectAction` against an
   `Approval` resource. It does not, and there is no plan to. The verdict, the
   approver and the approval id all reach the PDP as context attributes on the
   tool hop's direct evaluation, which is what the forbid policy reads; a second
   entity and a second decision would add a row to the log without adding a
   control. Read the approver off the tool hop, not off a hop of its own.
