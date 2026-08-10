/* Slack approvals — posting the card, verifying the click, identifying who clicked.
 *
 * Three things here are easy to get wrong and each one is a real hole:
 *
 *   1. Signature verification is mandatory. Without it, anyone who discovers
 *      the Render URL can POST a forged "approved" and the order goes through.
 *      In a governance demo that is the worst possible failure.
 *   2. The HMAC is computed over the RAW body. express.json() consumes and
 *      discards it, so the interactivity route needs a raw parser mounted
 *      before the global JSON middleware — see server.js.
 *   3. Slack expects a response within 3 seconds. Acknowledge first, do the
 *      work after.
 *
 * No PHI in Slack. The card carries the approval id, the action, the requester
 * and a redacted patient reference; the clinical detail stays in the app.
 * SLACK_REDACT_PHI=false shows the full reference, so the difference can be
 * demonstrated both ways.
 */

const crypto = require("crypto");

const BOT_TOKEN = (process.env.SLACK_BOT_TOKEN || "").trim();
const SIGNING_SECRET = (process.env.SLACK_SIGNING_SECRET || "").trim();
const CHANNEL = (process.env.SLACK_APPROVALS_CHANNEL || "").trim();
const REDACT_PHI = (process.env.SLACK_REDACT_PHI || "true").toLowerCase() !== "false";
const APP_URL = (process.env.APP_PUBLIC_URL || "").trim();

function enabled() {
  return Boolean(BOT_TOKEN && SIGNING_SECRET && CHANNEL);
}

function configSummary() {
  if (enabled()) return `slack: enabled channel=${CHANNEL} redactPhi=${REDACT_PHI}`;
  const missing = [];
  if (!BOT_TOKEN) missing.push("SLACK_BOT_TOKEN");
  if (!SIGNING_SECRET) missing.push("SLACK_SIGNING_SECRET");
  if (!CHANNEL) missing.push("SLACK_APPROVALS_CHANNEL");
  return `slack: disabled — missing ${missing.join(", ")}`;
}

/* MRN-1004 -> MRN-••04. Enough to tell two requests apart, not enough to
 * identify a patient to someone reading over a shoulder in Slack. */
function redact(ref) {
  if (!ref) return "—";
  if (!REDACT_PHI) return ref;
  const s = String(ref);
  return s.length <= 4 ? "••" : s.slice(0, 4) + "••" + s.slice(-2);
}

async function slackPost(method, body) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${BOT_TOKEN}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`slack ${method}: ${data.error}`);
  return data;
}

function card(rec) {
  const blocks = [
    { type: "header", text: { type: "plain_text", text: "Approval needed" } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${rec.action}* requires a second clinician before it can be carried out.`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Requested by*\n${rec.requester_name}` },
        { type: "mrkdwn", text: `*Patient*\n${redact(rec.patient_ref)}` },
        { type: "mrkdwn", text: `*Request*\n${rec.approval_id}` },
        { type: "mrkdwn", text: `*Expires*\n<!date^${Math.floor(new Date(rec.expires_at).getTime() / 1000)}^{time}|soon>` },
      ],
    },
    {
      type: "actions",
      block_id: `approval_${rec.approval_id}`,
      elements: [
        {
          type: "button", style: "primary",
          text: { type: "plain_text", text: "Approve" },
          action_id: "approval_approve", value: rec.approval_id,
        },
        {
          type: "button", style: "danger",
          text: { type: "plain_text", text: "Reject" },
          action_id: "approval_reject", value: rec.approval_id,
        },
      ],
    },
    {
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: APP_URL
          ? `Full clinical detail in <${APP_URL}/healthsphere|HealthSphere>. You cannot approve your own request.`
          : "Full clinical detail is in HealthSphere. You cannot approve your own request.",
      }],
    },
  ];
  return blocks;
}

async function postApproval(rec) {
  if (!enabled()) return null;
  const data = await slackPost("chat.postMessage", {
    channel: CHANNEL,
    text: `Approval needed: ${rec.action} requested by ${rec.requester_name}`,
    blocks: card(rec),
  });
  return data.ts;
}

/* Replace the card once decided, so the buttons cannot be clicked again and
 * the channel shows the outcome rather than a stale request. */
async function resolveMessage(rec) {
  if (!enabled() || !rec.slack_ts) return;
  const verdict = rec.status === "approved" ? "Approved" :
                  rec.status === "rejected" ? "Rejected" : "Expired";
  const by = rec.approver_display ? ` by ${rec.approver_display}` : "";
  await slackPost("chat.update", {
    channel: CHANNEL,
    ts: rec.slack_ts,
    text: `${verdict}${by}: ${rec.action}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${verdict}${by}* — ${rec.action} for ${redact(rec.patient_ref)}`,
        },
      },
      { type: "context", elements: [{ type: "mrkdwn", text: `Request ${rec.approval_id}` }] },
    ],
  });
}

/* Verify the request really came from Slack.
 *
 * HMAC-SHA256 over `v0:{timestamp}:{rawBody}`, compared in constant time.
 * Requests older than five minutes are rejected so a captured POST cannot be
 * replayed later.
 */
function verifySignature({ rawBody, timestamp, signature }) {
  if (!SIGNING_SECRET || !rawBody || !timestamp || !signature) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const mine = "v0=" + crypto.createHmac("sha256", SIGNING_SECRET).update(base).digest("hex");
  const a = Buffer.from(mine);
  const b = Buffer.from(String(signature));
  // timingSafeEqual throws on length mismatch, which is itself a signal.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* Slack user id -> email. The approver has to map to the same identity the PDP
 * uses, so a Slack display name is not enough. An unmappable clicker is not an
 * approver and the decision is refused. */
async function emailForUser(slackUserId) {
  if (!enabled() || !slackUserId) return null;
  const res = await fetch(
    `https://slack.com/api/users.info?user=${encodeURIComponent(slackUserId)}`,
    { headers: { Authorization: `Bearer ${BOT_TOKEN}` } });
  const data = await res.json();
  if (!data.ok) return null;
  return (data.user && data.user.profile && data.user.profile.email) || null;
}

/* Tell the clicker why their decision did not count.
 *
 * A refused decision used to do nothing at all, which is indistinguishable
 * from a broken integration. Ephemeral so only they see it — a refusal is
 * feedback, not an announcement.
 */
const REFUSALS = {
  unknown_approver: "Your Slack account isn't linked to a clinician, so the decision can't be attributed. Ask an administrator to link it.",
  already_decided: "This request has already been decided.",
  expired: "This request expired before it could be reviewed.",
  not_found: "That request no longer exists.",
  bad_verdict: "That action wasn't recognised.",
};

async function postRefusal(userId, reason) {
  if (!enabled() || !userId) return;
  try {
    await slackPost("chat.postEphemeral", {
      channel: CHANNEL,
      user: userId,
      text: REFUSALS[reason] || `The decision could not be recorded (${reason}).`,
    });
  } catch (e) {
    console.warn("[slack] could not post refusal: " + e.message);
  }
}

module.exports = {
  enabled, configSummary, postApproval, resolveMessage,
  verifySignature, emailForUser, postRefusal,
};
