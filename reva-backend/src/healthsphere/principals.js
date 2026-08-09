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

let client = null;
function cognito() {
  if (!client) client = new CognitoIdentityProviderClient({ region: REGION });
  return client;
}

const cache = new Map();

async function subForEmail(email) {
  const key = String(email || "").toLowerCase().trim();
  if (!key) return null;
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

module.exports = { subForEmail };
