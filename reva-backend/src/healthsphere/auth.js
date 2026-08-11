// Cognito OIDC (authorization-code + PKCE, public SPA client — no secret).
const crypto = require("node:crypto");

const cfg = {
  issuer: process.env.COGNITO_ISSUER || "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_G8lMqbQtE",
  domain: process.env.COGNITO_DOMAIN || "https://us-west-2g8lmqbqte.auth.us-west-2.amazoncognito.com",
  clientId: process.env.COGNITO_CLIENT_ID || "5n0dsr1in8u8nl2ccodugei34k",
  redirectUri: process.env.COGNITO_REDIRECT_URI || "https://healthsphere-agentic.onrender.com/healthsphere/auth/callback",
  scopes: (process.env.COGNITO_SCOPES || "openid email").split(/\s+/),
  // Sign-out lands on the clinician picker, so the demo loops straight back to
  // "choose who to be" instead of a dead end.
  //
  // This value must EXACTLY match a registered sign-out URL on the app client —
  // Cognito compares the whole string, and a mismatch renders as a bare
  // "Invalid request" that names nothing. It was previously unregistered
  // entirely, which is why sign-out failed.
  postLogout: process.env.HS_POST_LOGOUT
    || "https://healthsphere-agentic-wep2.onrender.com/healthsphere/signin",
};

// Derived from the issuer rather than configured separately: the issuer URL
// ends in the pool id, so two settings that must agree become one that cannot
// disagree.
cfg.userPoolId = (process.env.COGNITO_USER_POOL_ID
  || String(cfg.issuer).split("/").filter(Boolean).pop() || "").trim();

// Shared password for the one-click clinician picker. Every demo user has the
// same one, so nobody types it — see passwordSignIn below.
cfg.demoPassword = process.env.HS_DEMO_PASSWORD || "";

const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function pkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}
const randomState = () => b64url(crypto.randomBytes(16));

// loginHint prefills the email on Cognito's page, so a demo never involves
// typing an address in front of a customer. Cognito has no equivalent for the
// password — there is no parameter for it and there should not be — so the
// browser's saved credential is what fills that field. See the profile picker.
function authorizeUrl(state, challenge, loginHint) {
  const p = new URLSearchParams({
    response_type: "code", client_id: cfg.clientId, redirect_uri: cfg.redirectUri,
    scope: cfg.scopes.join(" "), state, code_challenge: challenge, code_challenge_method: "S256",
  });
  if (loginHint) p.set("login_hint", loginHint);
  return `${cfg.domain}/oauth2/authorize?${p.toString()}`;
}
function logoutUrl() {
  const p = new URLSearchParams({ client_id: cfg.clientId, logout_uri: cfg.postLogout });
  return `${cfg.domain}/logout?${p.toString()}`;
}
async function exchangeCode(code, verifier) {
  const body = new URLSearchParams({
    grant_type: "authorization_code", client_id: cfg.clientId, code,
    redirect_uri: cfg.redirectUri, code_verifier: verifier, // PKCE — no client_secret
  });
  const res = await fetch(`${cfg.domain}/oauth2/token`, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body,
  });
  if (!res.ok) throw new Error(`token exchange ${res.status}: ${await res.text()}`);
  return res.json();
}
/* One-click sign-in for the clinician picker.
 *
 * Cognito's hosted UI has no password parameter — there is none and there
 * should not be — so `login_hint` could only ever prefill the email and the
 * password page still had to be dealt with. This authenticates against Cognito
 * directly instead, with the shared demo password, and returns the same token
 * pair the authorization-code flow returns.
 *
 * The tokens are REAL Cognito JWTs. That is the point, and it is why this does
 * not mint its own: the entry hop sends the access token to the PDP for
 * validation and the topology keys User entities by the `sub` claim, so a
 * locally-signed token would be rejected and would read as a policy denial.
 *
 * Two flows, tried in order, because which one is available depends on how the
 * pool was set up and getting it wrong is a confusing failure:
 *   USER_PASSWORD_AUTH        needs ALLOW_USER_PASSWORD_AUTH on the app client,
 *                             needs no AWS credentials.
 *   ADMIN_USER_PASSWORD_AUTH  needs cognito-idp:AdminInitiateAuth on the
 *                             backend's role, needs no client change.
 *
 * This is a demo affordance and a bypass: anyone who can reach the picker can
 * sign in as any listed clinician. It is not an authentication control. What it
 * does preserve is that the APP never asserts who it is acting for — Cognito
 * still issues the tokens, and every downstream identity claim comes from them.
 */
async function passwordSignIn(email) {
  if (!cfg.demoPassword) {
    throw new Error("HS_DEMO_PASSWORD is not set — one-click sign-in is disabled.");
  }
  const {
    CognitoIdentityProviderClient, InitiateAuthCommand, AdminInitiateAuthCommand,
  } = require("@aws-sdk/client-cognito-identity-provider");

  const region = String(cfg.issuer).split("/")[2].split(".")[1] || "us-west-2";
  const client = new CognitoIdentityProviderClient({ region });
  const AuthParameters = { USERNAME: email, PASSWORD: cfg.demoPassword };

  let res;
  try {
    res = await client.send(new InitiateAuthCommand({
      ClientId: cfg.clientId, AuthFlow: "USER_PASSWORD_AUTH", AuthParameters,
    }));
  } catch (e) {
    console.warn("[auth] USER_PASSWORD_AUTH unavailable (" + e.name + "), trying admin flow");
    res = await client.send(new AdminInitiateAuthCommand({
      UserPoolId: cfg.userPoolId, ClientId: cfg.clientId,
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH", AuthParameters,
    }));
  }

  // A challenge means Cognito wants something more (a new password, MFA). That
  // cannot be answered from a one-click picker, so say which challenge it is
  // rather than failing with an empty token.
  if (!res.AuthenticationResult) {
    throw new Error(`Cognito returned a challenge (${res.ChallengeName || "unknown"}) for ${email}.`);
  }
  return {
    id_token: res.AuthenticationResult.IdToken,
    access_token: res.AuthenticationResult.AccessToken,
  };
}

async function verifyIdToken(idToken) {
  const jose = await import("jose"); // dynamic import — jose is ESM, reva-backend is CJS
  const jwks = jose.createRemoteJWKSet(new URL(`${cfg.issuer}/.well-known/jwks.json`));
  const { payload } = await jose.jwtVerify(idToken, jwks, { issuer: cfg.issuer, audience: cfg.clientId });
  return payload;
}
function personaFromGroups(groups) {
  const g = (groups || []).map((x) => String(x).toLowerCase());
  if (g.includes("doctors")) return "physician";
  if (g.includes("nurses")) return "nurse";
  if (g.includes("patients")) return "patient";
  return "patient";
}
function titleFromEmail(email) {
  return String(email).split("@")[0].split(/[._]/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}
function userFromClaims(payload) {
  const groups = payload["cognito:groups"] || [];
  const email = payload.email || "";
  return {
    sub: payload.sub, email, groups,
    name: payload.name || (email ? titleFromEmail(email) : "User"),
    persona: personaFromGroups(groups),
  };
}

module.exports = { cfg, pkce, randomState, authorizeUrl, logoutUrl, exchangeCode,
                   passwordSignIn, verifyIdToken, userFromClaims };
