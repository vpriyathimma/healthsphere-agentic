/* Approval records for clinical actions that need a second clinician.
 *
 * The agent does not suspend. When a gated tool is reached it returns
 * `pending_approval` and nothing runs; we hold the request here, ask a human,
 * and then re-invoke the agent with the verdict attached. That is why this
 * store exists and why it holds the whole replay payload — prompt, session id,
 * actor — rather than just a status.
 *
 * In-memory on purpose for the demo, mirroring the session store. Two
 * consequences, stated rather than discovered:
 *   - it resets on redeploy, and any pending approval is lost with it
 *   - it is per-process, so more than one Render instance would not share it
 * Everything goes through the small interface below so a real store can drop
 * in without touching the routes.
 */

const crypto = require("crypto");

const APPROVALS = new Map();

// Long enough for someone to notice Slack and act; short enough that a stale
// request cannot be approved days later when the clinical picture has moved on.
const TTL_MS = 30 * 60 * 1000;

function newId() {
  return "AP-" + crypto.randomBytes(6).toString("hex").toUpperCase();
}

function isExpired(rec) {
  return Date.now() > new Date(rec.expires_at).getTime();
}

/* Create a pending approval from what the agent handed back. */
function create({ action, arguments: args, requester, requesterName, sessionId,
                  prompt, patientRef, displayMessage, bearer, idToken }) {
  const now = new Date();
  const rec = {
    approval_id: newId(),
    status: "pending",
    action,
    arguments: args || {},
    // The requester is the Cognito sub — the same identity the PDP uses. Maker
    // checker compares subs, never display names.
    requester,
    requester_name: requesterName || requester,
    // Stored, not recomputed. runtime.js derives the session id from the trace
    // id and pads it; the resume must reproduce it exactly, and recomputing
    // invites a mismatch that would silently start a new session.
    session_id: sessionId,
    prompt,
    patient_ref: patientRef || "",
    display_message: displayMessage,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + TTL_MS).toISOString(),
    decided_at: null,
    approver: null,
    approver_display: null,
    note: null,
    slack_ts: null,
    result: null,
    // The verdict lands before the replay finishes. Without this the browser
    // polls, sees "approved", and renders while `result` is still null — so
    // the clinician gets a generic line and the real confirmation arrives
    // unseen a moment later.
    replay_done: false,
    // The requester's Cognito tokens, held for the replay.
    //
    // A Slack click has no browser session, so without these the replay runs
    // on the agent's own machine identity and the PDP reads the AGENT as the
    // originating principal — onBehalfOf then names an agent rather than the
    // clinician, which is precisely the defect this whole chain exists to
    // avoid.
    //
    // The action is still on behalf of the REQUESTER. The approver is a
    // separate fact, recorded separately. Held in memory only, for at most the
    // TTL above.
    bearer: bearer || null,
    id_token: idToken || null,
  };
  APPROVALS.set(rec.approval_id, rec);
  return rec;
}

function get(id) {
  const rec = APPROVALS.get(id);
  if (!rec) return null;
  if (rec.status === "pending" && isExpired(rec)) {
    rec.status = "expired";
    rec.decided_at = new Date().toISOString();
  }
  return rec;
}

/* Pending approvals a given clinician is allowed to act on.
 * Excludes their own requests — you cannot approve your own order. */
function listFor(principal) {
  const out = [];
  for (const rec of APPROVALS.values()) {
    if (rec.status === "pending" && isExpired(rec)) {
      rec.status = "expired";
      rec.decided_at = new Date().toISOString();
    }
    // The requester sees their own pending approvals. The control here is not
    // "somebody else must agree" — it is "the agent does not act until a human
    // says so". Hiding your own request would make it undecidable from the app.
    if (rec.status === "pending") out.push(rec);
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/* Record a verdict.
 *
 * Returns { ok, rec, error }. Every refusal is a distinct error code so the
 * caller can say something specific.
 *
 * Maker-checker is a switch, not a decision baked into the code.
 *
 * HS_HITL_MAKER_CHECKER=true requires the approver to be someone other than the
 * requester, which is what the original HITL spec calls non-negotiable. Default
 * is off, per the later instruction.
 * Sai: "the approvals is not only for going for a second clinician... the same
 * user, Emma Davis, can get a Slack approval and approve on his own Slack.
 * This is not like my manager has to approve it. The human in the loop here is
 * I don't want my agent to execute that action."
 *
 * So the property being enforced is that the AGENT does not act autonomously —
 * a human decides. Whether that human is a second clinician is a policy
 * question, and Cedar is where it would belong, not hard-coded here.
 *
 * First verdict wins. The same approval can be clicked twice, or clicked in
 * Slack and in-app at the same moment; the second gets `already_decided`
 * rather than overwriting the first.
 */
const makerCheckerRequired = () =>
  String(process.env.HS_HITL_MAKER_CHECKER || "").toLowerCase() === "true";

function decide({ approvalId, verdict, approverPrincipal, approverDisplay, note }) {
  const rec = get(approvalId);
  if (!rec) return { ok: false, error: "not_found" };
  if (rec.status === "expired") return { ok: false, error: "expired", rec };
  if (rec.status !== "pending") return { ok: false, error: "already_decided", rec };
  if (!approverPrincipal) return { ok: false, error: "unknown_approver", rec };
  // Off by default. Sai: "the same user, Emma Davis, can get a Slack approval
  // and approve on his own Slack. This is not like my manager has to approve
  // it." The original spec says the opposite and calls it non-negotiable, so
  // this is a switch rather than a choice made in code.
  if (makerCheckerRequired() && approverPrincipal === rec.requester) {
    return { ok: false, error: "self_approval", rec };
  }
  if (verdict !== "approve" && verdict !== "reject") return { ok: false, error: "bad_verdict", rec };

  rec.status = verdict === "approve" ? "approved" : "rejected";
  rec.approver = approverPrincipal;
  rec.approver_display = approverDisplay || approverPrincipal;
  rec.note = note || null;
  rec.decided_at = new Date().toISOString();
  return { ok: true, rec };
}

/* What the agent needs to evaluate the replayed call. Mirrors the Cedar
 * context attributes: an absent verdict means nobody has been asked. */
function hitlFor(rec) {
  if (!rec || (rec.status !== "approved" && rec.status !== "rejected")) return null;
  return {
    status: rec.status,
    approver: rec.approver,
    approval_id: rec.approval_id,
  };
}

function setSlackTs(id, ts) {
  const rec = APPROVALS.get(id);
  if (rec) rec.slack_ts = ts;
}

function setResult(id, text) {
  const rec = APPROVALS.get(id);
  if (rec) {
    rec.result = text;
    rec.replay_done = true;
  }
}

module.exports = { create, get, listFor, decide, hitlFor, setSlackTs, setResult };
