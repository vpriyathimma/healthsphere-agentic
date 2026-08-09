/* Email -> Cognito `sub`.
 *
 * An approver has to be attributable to the same identity the PDP evaluates,
 * which is the Cognito `sub`. Slack gives us an email at best, and a display
 * name at worst — neither is an identity. So a Slack click is resolved to a
 * sub here, and if it cannot be, the approval is refused: an unmappable
 * approver is not an approver.
 *
 * Cached because the mapping does not change within a session and every Slack
 * click would otherwise cost an AdminGetUser call.
 */

const {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const REGION = process.env.AWS_REGION || "us-west-2";
// Derived from the issuer the app already uses, so there is one source of truth
// for which pool this is.
const ISSUER = process.env.COGNITO_ISSUER
  || "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_G8lMqbQtE";
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || ISSUER.split("/").pop();

/* Slack email -> clinician email.
 *
 * Slack accounts are real people on a real domain; the demo clinicians are
 * Cognito users on healthsphere.com. Nobody's Slack address is going to be
 * emma.davis@healthsphere.com, so without a mapping every Slack approver is
 * unattributable and every Slack decision is refused.
 *
 * Configured, not hardcoded:
 *   SLACK_APPROVER_MAP="sai.srungaram@reva.ai=david.brown@healthsphere.com,..."
 *
 * This is a demo affordance and should be stated as one: in production the
 * approver would sign in as themselves and no mapping would exist.
 */
const ALIASES = new Map(
  String(process.env.SLACK_APPROVER_MAP || "")
    .split(",")
    .map((pair) => pair.split("=").map((x) => x.trim().toLowerCase()))
    .filter((kv) => kv.length === 2 && kv[0] && kv[1])
);

let client = null;
function cognito() {
  if (!client) client = new CognitoIdentityProviderClient({ region: REGION });
  return client;
}

const cache = new Map();

async function subForEmail(email) {
  let key = String(email || "").toLowerCase().trim();
  if (!key) return null;
  if (ALIASES.has(key)) {
    console.log("[approvals] mapped Slack approver " + key + " -> " + ALIASES.get(key));
    key = ALIASES.get(key);
  }
  if (cache.has(key)) return cache.get(key);

  try {
    const out = await cognito().send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${key}"`,
      Limit: 1,
    }));
    const user = (out.Users || [])[0];
    const sub = user && (user.Attributes || []).find((a) => a.Name === "sub");
    const value = sub ? sub.Value : null;
    cache.set(key, value);
    return value;
  } catch (e) {
    // A lookup failure is not an approval. Log and refuse rather than guessing.
    console.warn("[approvals] could not resolve", key, "->", e.message);
    return null;
  }
}

/* Resolve a Slack email to the clinician identity actually recorded.
 *
 * Returns the email too, so callers can show the clinician the decision is
 * attributed to rather than the Slack username. Those must agree: the audit
 * trail says one identity and the channel must not say another. */
async function resolveApprover(email) {
  const key = String(email || "").toLowerCase().trim();
  const resolved = ALIASES.get(key) || key;
  const sub = await subForEmail(email);
  return sub ? { sub, email: resolved } : null;
}

module.exports = { subForEmail, resolveApprover };
