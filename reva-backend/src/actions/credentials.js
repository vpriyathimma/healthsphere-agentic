/**
 * Reva — Agent credential activate / inactivate
 *
 * Mechanism (validated against AWS official docs and tested live in account
 * 146717645851, us-west-2):
 *
 *   INACTIVATE = iam:DeleteRolePolicy on the agent execution role's inline
 *                credential policy. The agent can no longer call
 *                bedrock-agentcore:GetResourceOauth2Token, so it cannot obtain
 *                its gateway credential and cannot call any MCP tool.
 *   ACTIVATE   = iam:PutRolePolicy replaying the exact saved document.
 *
 * Why delete/put rather than flipping Effect to Deny: discovery derives the
 * agent -> credential-provider binding from the presence of that grant. Deleting
 * the policy makes the change visible in the inventory with no read-path changes.
 * A Deny would leave the action and resource in place and the agent would still
 * render as active.
 *
 * Blast radius is per agent: the grant is scoped to that agent's own credential
 * provider ARN, so inactivating one agent cannot affect the others.
 *
 *   DeleteRolePolicy: https://docs.aws.amazon.com/IAM/latest/APIReference/API_DeleteRolePolicy.html
 *   PutRolePolicy:    https://docs.aws.amazon.com/IAM/latest/APIReference/API_PutRolePolicy.html
 *   ListRolePolicies: https://docs.aws.amazon.com/IAM/latest/APIReference/API_ListRolePolicies.html
 *
 * DURABILITY: the policy document lives only in AWS. Once deleted it cannot be
 * recovered from AWS, so it must be saved before deletion. Render's filesystem is
 * reset on every deploy, so the store file is committed to the repo — the document
 * is static, so a committed baseline is always a valid restore source. Runtime
 * writes update the same path and survive until the next deploy, at which point
 * the committed copy takes over.
 *
 * No identity values are hardcoded. The execution role comes from discovery, and
 * the credential policy is located by scanning the role's inline policies for the
 * GetResourceOauth2Token action.
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const {
  IAMClient,
  ListRolePoliciesCommand,
  GetRolePolicyCommand,
  PutRolePolicyCommand,
  DeleteRolePolicyCommand,
} = require("@aws-sdk/client-iam");

const {
  SecretsManagerClient, RotateSecretCommand, DescribeSecretCommand,
} = require("@aws-sdk/client-secrets-manager");

const CRED_ACTION = "bedrock-agentcore:GetResourceOauth2Token";
const STORE_PATH = process.env.REVA_CREDENTIAL_STORE
  || path.join(__dirname, "../../data/credential-policies.json");

/* ─────────────────────────── store ─────────────────────────── */

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch (_) {
    return { policies: {}, events: [] };
  }
}

function writeStore(store) {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
    return true;
  } catch (err) {
    console.error("[credentials] store write failed:", err.message);
    return false;
  }
}

function recordEvent(store, event) {
  store.events = store.events || [];
  store.events.unshift(Object.assign({ at: new Date().toISOString() }, event));
  store.events = store.events.slice(0, 200);
}

/* ─────────────────────────── helpers ─────────────────────────── */

const roleNameFromArn = (arn) => (arn ? String(arn).split("/").pop() : null);

function region() {
  return process.env.REVA_AWS_REGION || process.env.AWS_REGION || "us-west-2";
}

function secretsManager() {
  const accessKeyId = process.env.REVA_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.REVA_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) throw new Error("AWS credentials not configured on the server.");
  return new SecretsManagerClient({ region: region(), credentials: { accessKeyId, secretAccessKey } });
}

function iam() {
  const region = process.env.REVA_AWS_REGION || process.env.AWS_REGION || "us-west-2";
  const accessKeyId = process.env.REVA_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.REVA_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) throw new Error("AWS credentials not configured on the server.");
  return new IAMClient({ region, credentials: { accessKeyId, secretAccessKey } });
}

const parseDoc = (d) => {
  if (!d) return null;
  if (typeof d === "object") return d;
  try { return JSON.parse(decodeURIComponent(d)); } catch (_) {
    try { return JSON.parse(d); } catch (__) { return null; }
  }
};

function docGrantsCredential(doc) {
  for (const stmt of ((doc || {}).Statement || [])) {
    const actions = Array.isArray(stmt.Action) ? stmt.Action : (stmt.Action ? [stmt.Action] : []);
    if (actions.some((a) => a === CRED_ACTION || a === "bedrock-agentcore:*" || a === "*")) return true;
  }
  return false;
}

/**
 * Locate the inline policy on a role that carries the credential grant.
 * Returns { policyName, document } or null when the policy is absent, which is
 * the inactive state.
 */
async function findCredentialPolicy(client, roleName) {
  let marker, names = [];
  do {
    const res = await client.send(new ListRolePoliciesCommand({ RoleName: roleName, MaxItems: 100, Marker: marker }));
    names = names.concat(res.PolicyNames || []);
    marker = res.IsTruncated ? res.Marker : null;
  } while (marker);

  for (const policyName of names) {
    const res = await client.send(new GetRolePolicyCommand({ RoleName: roleName, PolicyName: policyName }));
    const document = parseDoc(res.PolicyDocument);
    if (docGrantsCredential(document)) return { policyName, document };
  }
  return null;
}

/** Resolve the agent's execution role from the discovery snapshot. */
function resolveAgent(discovery, agentId) {
  const d = discovery || {};
  const all = (d.agentcoreAgents || []).concat(d.bedrockAgents || []);
  const agent = all.find((a) => a.agentRuntimeId === agentId || a.agentId === agentId);
  if (!agent) return { error: "Agent not found in the current discovery snapshot." };
  if (!agent.roleArn) return { error: "Agent has no execution role; credential state cannot be managed." };
  return { agent, roleName: roleNameFromArn(agent.roleArn) };
}

/* ─────────────────────────── router ─────────────────────────── */

/** getDiscovery: () => discoveryCache */
module.exports = function credentialRoutes(getDiscovery) {
  const router = express.Router();

  // ── status ──
  router.get("/:agentId/credentials", async (req, res) => {
    try {
      const r = resolveAgent(getDiscovery(), req.params.agentId);
      if (r.error) return res.status(404).json({ error: r.error });

      const found = await findCredentialPolicy(iam(), r.roleName);
      const store = readStore();
      const saved = store.policies[req.params.agentId];

      res.json({
        agentId: req.params.agentId,
        agentName: r.agent.name,
        roleName: r.roleName,
        state: found ? "active" : "inactive",
        policyName: found ? found.policyName : (saved ? saved.policyName : null),
        canActivate: !found && !!saved,
        canInactivate: !!found,
        restorable: !!saved,
        lastChangedAt: saved ? saved.savedAt : null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── inactivate: save the document, then delete the policy ──
  router.post("/:agentId/credentials/inactivate", async (req, res) => {
    try {
      const agentId = req.params.agentId;
      const r = resolveAgent(getDiscovery(), agentId);
      if (r.error) return res.status(404).json({ error: r.error });

      const client = iam();
      const found = await findCredentialPolicy(client, r.roleName);
      if (!found) return res.status(409).json({ error: "Credentials are already inactive.", state: "inactive" });

      // Save BEFORE deleting — AWS cannot recover a deleted inline policy.
      const store = readStore();
      store.policies[agentId] = {
        agentName: r.agent.name,
        roleName: r.roleName,
        policyName: found.policyName,
        document: found.document,
        savedAt: new Date().toISOString(),
      };
      if (!writeStore(store)) {
        return res.status(500).json({ error: "Could not save the policy document. Aborting to avoid an unrecoverable delete." });
      }

      await client.send(new DeleteRolePolicyCommand({ RoleName: r.roleName, PolicyName: found.policyName }));

      recordEvent(store, { agentId, agentName: r.agent.name, action: "inactivate", roleName: r.roleName, policyName: found.policyName });
      writeStore(store);

      console.log("[credentials] inactivated " + r.agent.name + " (" + r.roleName + "/" + found.policyName + ")");
      res.json({ agentId, state: "inactive", policyName: found.policyName, roleName: r.roleName, restorable: true });
    } catch (err) {
      console.error("[credentials] inactivate failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── activate: replay the saved document ──
  router.post("/:agentId/credentials/activate", async (req, res) => {
    try {
      const agentId = req.params.agentId;
      const r = resolveAgent(getDiscovery(), agentId);
      if (r.error) return res.status(404).json({ error: r.error });

      const client = iam();
      const found = await findCredentialPolicy(client, r.roleName);
      if (found) return res.status(409).json({ error: "Credentials are already active.", state: "active" });

      const store = readStore();
      const saved = store.policies[agentId];
      if (!saved || !saved.document) {
        return res.status(409).json({ error: "No saved policy document for this agent. It cannot be restored automatically." });
      }

      await client.send(new PutRolePolicyCommand({
        RoleName: r.roleName,
        PolicyName: saved.policyName,
        PolicyDocument: JSON.stringify(saved.document),
      }));

      recordEvent(store, { agentId, agentName: r.agent.name, action: "activate", roleName: r.roleName, policyName: saved.policyName });
      writeStore(store);

      console.log("[credentials] activated " + r.agent.name + " (" + r.roleName + "/" + saved.policyName + ")");
      res.json({ agentId, state: "active", policyName: saved.policyName, roleName: r.roleName });
    } catch (err) {
      console.error("[credentials] activate failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /* ─────────────── rotation ─────────────── */

  /**
   * Rotation is keyed by CREDENTIAL PROVIDER, not by agent: a provider can exist
   * before any agent uses it, and a shared provider could back several agents.
   *
   * RotateSecret triggers the configured rotation Lambda immediately and resets the
   * schedule clock. It is only available for customer-owned (EXTERNAL) secrets with
   * a rotation function attached — service-managed secrets are rotated by AWS and
   * expose no customer control.
   */
  function findProvider(discovery, name) {
    return ((discovery || {}).oauthProviders || []).find((p) => p.name === name) || null;
  }

  router.get("/credentials/providers", (_req, res) => {
    const providers = ((getDiscovery() || {}).oauthProviders || []).map((p) => ({
      name: p.name,
      vendor: p.vendor,
      clientId: p.clientId,
      usedByAgents: (p.usedByAgents || []).map((u) => u.agentName),
      secret: p.secret || null,
      canRotate: !!(p.secret && p.secret.rotatable),
      rotateBlockedReason: !p.secret ? "No secret resolved for this provider."
        : (p.secret.ownership === "MANAGED"
            ? "Rotation is controlled by AWS for service-managed secrets."
            : (!p.secret.rotationLambdaArn ? "No rotation function is attached to this secret." : null)),
    }));
    res.json({ providers });
  });

  router.post("/credentials/providers/:name/rotate", async (req, res) => {
    try {
      const prov = findProvider(getDiscovery(), req.params.name);
      if (!prov) return res.status(404).json({ error: "Credential provider not found in the current discovery snapshot." });

      const sec = prov.secret;
      if (!sec) return res.status(409).json({ error: "No secret resolved for this provider." });
      if (sec.ownership === "MANAGED") {
        return res.status(409).json({ error: "Rotation is controlled by AWS for service-managed secrets and cannot be triggered here." });
      }
      if (!sec.rotationLambdaArn) {
        return res.status(409).json({ error: "No rotation function is attached to this secret." });
      }

      const sm = secretsManager();
      const out = await sm.send(new RotateSecretCommand({ SecretId: sec.arn }));
      const after = await sm.send(new DescribeSecretCommand({ SecretId: sec.arn }));

      const store = readStore();
      recordEvent(store, {
        provider: prov.name, action: "rotate", secretArn: sec.arn,
        versionId: out.VersionId || null,
      });
      writeStore(store);

      console.log("[credentials] rotation triggered for " + prov.name + " (" + sec.arn + ")");
      res.json({
        provider: prov.name,
        secretArn: sec.arn,
        versionId: out.VersionId || null,
        // Rotation runs asynchronously; these reflect state at trigger time.
        rotationEnabled: after.RotationEnabled === true,
        lastRotatedDate: after.LastRotatedDate || null,
        nextRotationDate: after.NextRotationDate || null,
        versionStages: after.VersionIdsToStages || null,
        note: "Rotation runs asynchronously. Re-check status in a few seconds.",
      });
    } catch (err) {
      console.error("[credentials] rotate failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/credentials/providers/:name/secret", async (req, res) => {
    try {
      const prov = findProvider(getDiscovery(), req.params.name);
      if (!prov || !prov.secret || !prov.secret.arn) return res.status(404).json({ error: "No secret for this provider." });
      const d = await secretsManager().send(new DescribeSecretCommand({ SecretId: prov.secret.arn }));
      res.json({
        provider: prov.name,
        ownership: prov.secret.ownership,
        rotationEnabled: d.RotationEnabled === true,
        lastRotatedDate: d.LastRotatedDate || null,
        nextRotationDate: d.NextRotationDate || null,
        lastChangedDate: d.LastChangedDate || null,
        versionStages: d.VersionIdsToStages || null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── lifecycle event history ──
  router.get("/credentials/events", (_req, res) => res.json({ events: readStore().events || [] }));

  return router;
};
