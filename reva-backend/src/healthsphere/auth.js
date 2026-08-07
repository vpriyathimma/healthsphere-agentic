// Cognito OIDC (authorization-code + PKCE, public SPA client — no secret).
const crypto = require("node:crypto");

const cfg = {
  issuer: process.env.COGNITO_ISSUER || "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_G8lMqbQtE",
  domain: process.env.COGNITO_DOMAIN || "https://us-west-2g8lmqbqte.auth.us-west-2.amazoncognito.com",
  clientId: process.env.COGNITO_CLIENT_ID || "5n0dsr1in8u8nl2ccodugei34k",
  redirectUri: process.env.COGNITO_REDIRECT_URI || "https://healthsphere-agentic.onrender.com/healthsphere/auth/callback",
  scopes: (process.env.COGNITO_SCOPES || "openid email").split(/\s+/),
  postLogout: process.env.HS_POST_LOGOUT || "https://healthsphere-agentic.onrender.com/healthsphere",
};

const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function pkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}
const randomState = () => b64url(crypto.randomBytes(16));

function authorizeUrl(state, challenge) {
  const p = new URLSearchParams({
    response_type: "code", client_id: cfg.clientId, redirect_uri: cfg.redirectUri,
    scope: cfg.scopes.join(" "), state, code_challenge: challenge, code_challenge_method: "S256",
  });
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

module.exports = { cfg, pkce, randomState, authorizeUrl, logoutUrl, exchangeCode, verifyIdToken, userFromClaims };
