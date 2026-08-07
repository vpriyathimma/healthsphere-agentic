/**
 * Reva AWS Discovery — Enrichment
 *
 * Adds to the base discovery output:
 *   1. Resource tags for AgentCore Runtimes and Gateways (ListTagsForResource)
 *   2. OBSERVED model per agent, derived from CloudTrail inference events
 *   3. Model drift: declared vs observed, and observed-changed-over-time
 *
 * Validated against official AWS API docs:
 *   ListTagsForResource: https://docs.aws.amazon.com/bedrock-agentcore-control/latest/APIReference/API_ListTagsForResource.html
 *     — supported for AgentCore Runtime / Browser / Code Interpreter / Gateway.
 *       NOT supported for Identity resources (workload identities, OAuth providers).
 *   LookupEvents:       https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_LookupEvents.html
 *     — 90-day window, LookupAttributes accepts exactly ONE item, 2 req/sec per account per Region.
 *   Bedrock CloudTrail: https://docs.aws.amazon.com/bedrock/latest/userguide/logging-using-cloudtrail.html
 *     — Converse / ConverseStream / InvokeModel / InvokeModelWithResponseStream are MANAGEMENT
 *       events, logged by default (no trail required).
 *
 * Observed shape confirmed against account 146717645851 (us-west-2):
 *   requestParameters is null on ConverseStream; the model is in resources[]:
 *     { "type": "AWS::Bedrock::Model",
 *       "ARN": "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-4-6" }
 *   userIdentity.sessionContext.sessionIssuer.arn == the agent's execution roleArn
 *   serviceEventDetails.AdditionalEventData.additionalEntries carries
 *     inferenceRegion / inputTokens / outputTokens
 */

const {
  BedrockAgentCoreControlClient, ListTagsForResourceCommand,
} = require("@aws-sdk/client-bedrock-agentcore-control");

const { CloudTrailClient, LookupEventsCommand } = require("@aws-sdk/client-cloudtrail");

// Bedrock inference event names that are logged as MANAGEMENT events by default.
const INFERENCE_EVENTS = ["ConverseStream", "Converse", "InvokeModelWithResponseStream", "InvokeModel"];

// CloudTrail LookupEvents is capped at 2 requests/second per account per Region.
const LOOKUP_DELAY_MS = 600;
const MAX_PAGES_PER_EVENT = 10;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ────────────────────────────── tags ────────────────────────────── */

/**
 * Well-known tag keys, matched case-insensitively and across separator styles.
 * Nothing here is a HealthSphere value — these are key NAMES only.
 */
const TAG_ALIASES = {
  environment: ["environment", "env", "stage", "tier", "deploymentenvironment"],
  owner: ["owner", "ownedby", "contact", "teamowner", "agentowner"],
  businessContext: ["businesscontext", "application", "app", "service", "product", "project", "system"],
  dataSensitivity: ["datasensitivity", "dataclass", "dataclassification", "classification", "sensitivity"],
  riskTier: ["risktier", "risk", "criticality", "severitytier"],
  costCenter: ["costcenter", "costcentre", "billingcode"],
  team: ["team", "squad", "businessunit", "bu", "department"],
};

const normKey = (k) => String(k || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Map a raw tag map to the governance attributes the agent passport renders. */
function deriveFromTags(tags) {
  const out = { environment: null, owner: null, businessContext: null, dataSensitivity: null, riskTier: null, costCenter: null, team: null };
  if (!tags) return out;
  const byNorm = {};
  for (const k of Object.keys(tags)) byNorm[normKey(k)] = { key: k, value: tags[k] };

  for (const field of Object.keys(TAG_ALIASES)) {
    for (const alias of TAG_ALIASES[field]) {
      const hit = byNorm[alias];
      if (hit && hit.value !== undefined && hit.value !== null && String(hit.value).length) {
        out[field] = { value: hit.value, tagKey: hit.key };
        break;
      }
    }
  }
  return out;
}

/**
 * Fetch tags for a resource ARN. Returns null (not {}) when the resource type
 * does not support tagging, so the UI can distinguish "untagged" from "unsupported".
 */
async function fetchTags(client, resourceArn, errors, label) {
  if (!resourceArn) return null;
  try {
    const res = await client.send(new ListTagsForResourceCommand({ resourceArn }));
    return res.tags || {};
  } catch (e) {
    // BadRequestException => resource type does not support tagging (e.g. Identity resources).
    if (e.name === "ValidationException" || e.name === "BadRequestException") return null;
    errors.push({ step: "agentcore:ListTagsForResource(" + label + ")", error: e.message });
    return null;
  }
}

/* ──────────────────────── observed models ──────────────────────── */

/** "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-4-6" -> "anthropic.claude-sonnet-4-6" */
function modelIdFromArn(arn) {
  if (!arn) return null;
  const s = String(arn);
  const idx = s.lastIndexOf("/");
  return idx >= 0 ? s.slice(idx + 1) : s;
}

/**
 * Strip cross-region inference-profile prefixes so a DECLARED profile id can be
 * compared against the OBSERVED base model CloudTrail resolves it to.
 *   "us.anthropic.claude-sonnet-4-6"     -> "anthropic.claude-sonnet-4-6"
 *   "global.anthropic.claude-haiku-4-5"  -> "anthropic.claude-haiku-4-5"
 * Also drops a trailing ":0" / ":1" version suffix for comparison purposes only.
 */
function baseModelId(modelId) {
  if (!modelId) return null;
  let s = String(modelId);
  const i = s.lastIndexOf("/");
  if (i >= 0) s = s.slice(i + 1);                 // handle full ARNs / inference-profile ARNs
  s = s.replace(/^(us|eu|apac|us-gov|global)\./i, "");
  s = s.replace(/:\d+$/, "");
  return s;
}

/**
 * One paginated CloudTrail lookup per inference event name, matched client-side
 * to execution roles. Returns { [roleArn]: observation }.
 *
 * NOTE ON SCOPE: events are recorded per-Region. This scans only `region`.
 * Agents inferring in another Region will not appear — surfaced as a limitation
 * rather than silently returning an empty result.
 */
async function discoverObservedModels({ region, credentials, lookbackDays, errors }) {
  const ct = new CloudTrailClient({ region, credentials });
  const StartTime = new Date(Date.now() - (lookbackDays || 7) * 86400000);
  const byRole = {};

  for (const EventName of INFERENCE_EVENTS) {
    let NextToken, pages = 0;
    do {
      let res;
      try {
        res = await ct.send(new LookupEventsCommand({
          LookupAttributes: [{ AttributeKey: "EventName", AttributeValue: EventName }],
          StartTime, MaxResults: 50, NextToken,
        }));
      } catch (e) {
        errors.push({ step: "cloudtrail:LookupEvents(" + EventName + ")", error: e.message });
        break;
      }

      for (const ev of (res.Events || [])) {
        let e;
        try { e = JSON.parse(ev.CloudTrailEvent); } catch (_) { continue; }

        const issuer = ((e.userIdentity || {}).sessionContext || {}).sessionIssuer || {};
        const roleArn = issuer.arn || (e.userIdentity || {}).arn;
        const modelRes = (e.resources || []).find((r) => r.type === "AWS::Bedrock::Model");
        if (!roleArn || !modelRes) continue;

        const extra = ((e.serviceEventDetails || {}).AdditionalEventData || {}).additionalEntries || {};
        const modelId = modelIdFromArn(modelRes.ARN);
        const when = e.eventTime;

        let b = byRole[roleArn];
        if (!b) {
          b = byRole[roleArn] = {
            modelId: null, modelArn: null, inferenceRegion: null, eventRegion: e.awsRegion,
            firstSeen: when, lastSeen: null, invocations: 0, inputTokens: 0, outputTokens: 0,
            source: EventName, history: {},
          };
        }

        // Per-model observation window (this is what makes model CHANGE detectable).
        const h = b.history[modelId] || (b.history[modelId] = {
          modelId, modelArn: modelRes.ARN, firstSeen: when, lastSeen: when,
          invocations: 0, inferenceRegion: extra.inferenceRegion || null,
        });
        if (when < h.firstSeen) h.firstSeen = when;
        if (when > h.lastSeen) h.lastSeen = when;
        h.invocations += 1;
        if (extra.inferenceRegion) h.inferenceRegion = extra.inferenceRegion;

        // Most-recent wins for the headline observation.
        if (!b.lastSeen || when > b.lastSeen) {
          b.lastSeen = when;
          b.modelId = modelId;
          b.modelArn = modelRes.ARN;
          b.inferenceRegion = extra.inferenceRegion || null;
          b.source = EventName;
          b.eventRegion = e.awsRegion;
        }
        if (when < b.firstSeen) b.firstSeen = when;

        b.invocations += 1;
        b.inputTokens += Number(extra.inputTokens || 0);
        b.outputTokens += Number(extra.outputTokens || 0);
      }

      NextToken = res.NextToken;
      await sleep(LOOKUP_DELAY_MS);
    } while (NextToken && ++pages < MAX_PAGES_PER_EVENT);
  }

  // Flatten history maps to sorted arrays.
  for (const roleArn of Object.keys(byRole)) {
    const b = byRole[roleArn];
    b.history = Object.keys(b.history)
      .map((k) => b.history[k])
      .sort((x, y) => new Date(y.lastSeen) - new Date(x.lastSeen));
    b.distinctModels = b.history.length;
  }
  return byRole;
}

/* ─────────────────────── proposed owner ─────────────────────── */

/**
 * OWNER RESOLUTION LADDER
 *
 * AWS provides NO created-by attribution on any resource. IAM returns CreateDate
 * but never a creator. The only source is CloudTrail, and only within its window.
 *
 *   Rung 1  Reva Cedar entity attribute (assigned in-product)   -> Confirmed
 *   Rung 2  Owner tag on the resource                           -> Declared
 *   Rung 3  CloudTrail create event, human principal            -> Proposed (High)
 *   Rung 4  CloudTrail create event via CloudFormation, chained
 *           to the nearest preceding deploy event               -> Proposed (Medium/Low)
 *   Rung 5  Owner tag on the execution role                     -> Proposed (Low)
 *   else    Unresolved
 *
 * Rung 4 is CORRELATION, NOT ATTESTATION: the create event and the deploy event
 * are joined by time proximity, bounded by OWNER_MAX_GAP_SECONDS. Ambiguity
 * (two different principals inside the window) degrades confidence rather than
 * silently picking one.
 *
 * Validated: LookupEvents 90-day window, ONE LookupAttribute per call,
 * 2 req/sec per account per Region.
 * https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_LookupEvents.html
 */

const CREATE_EVENTS = ["CreateAgentRuntime", "CreateAgent"];
const DEPLOY_EVENTS = ["ExecuteChangeSet", "CreateStack", "UpdateStack"];

// Service principals that are never a human owner.
const NON_HUMAN_SESSION = /^(AWSCloudFormation|cloudformation|codebuild|codepipeline|aws-sdk-js|OrganizationAccountAccessRole)$/i;

/** Roles whose sessions are machine deploys, not people. */
function isServiceCreator(u) {
  const arn = String((u && u.arn) || "");
  const session = arn.split("/").pop() || "";
  return NON_HUMAN_SESSION.test(session) || /cfn-exec-role/i.test(arn);
}

/**
 * Extract a human identity from a userIdentity element, or null.
 * Handles: IAMUser, Identity Center sessions, sourceIdentity, and the
 * CDK session-name convention (aws-cdk-<local-profile-identity>).
 */
function humanFrom(u) {
  if (!u) return null;
  const sc = u.sessionContext || {};

  // sourceIdentity survives role chaining and is authoritative when set.
  if (sc.sourceIdentity) return { name: sc.sourceIdentity, via: "sourceIdentity", strong: true };

  if (u.type === "IAMUser") {
    return { name: u.userName || (String(u.arn || "").split("/").pop()), via: "IAMUser", strong: true };
  }
  if (u.type === "Root") return { name: "root", via: "Root", strong: true };

  if (u.type === "AssumedRole") {
    const arn = String(u.arn || "");
    const session = arn.split("/").pop() || "";
    if (!session || NON_HUMAN_SESSION.test(session)) return null;

    // CDK: assumed-role/cdk-hnb659fds-deploy-role-<acct>-<region>/aws-cdk-<identity>
    const cdk = /^aws-cdk-(.+)$/.exec(session);
    if (cdk) return { name: cdk[1], via: "CDK deploy session", strong: false };

    // Identity Center: assumed-role/AWSReservedSSO_<perm>_<hash>/<email-or-username>
    const issuerArn = String(((sc.sessionIssuer || {}).arn) || "");
    if (/AWSReservedSSO/i.test(issuerArn)) return { name: session, via: "IAM Identity Center", strong: true };

    // A session name that looks like an email or user handle.
    if (/@/.test(session) || /^[a-z][a-z0-9._-]{2,}$/i.test(session)) {
      return { name: session, via: "role session name", strong: false };
    }
  }
  return null;
}

/** One paginated LookupEvents call per event name, collected raw. */
async function lookupByEventNames(ct, eventNames, StartTime, errors) {
  const out = [];
  for (const EventName of eventNames) {
    let NextToken, pages = 0;
    do {
      let res;
      try {
        res = await ct.send(new LookupEventsCommand({
          LookupAttributes: [{ AttributeKey: "EventName", AttributeValue: EventName }],
          StartTime, MaxResults: 50, NextToken,
        }));
      } catch (e) {
        errors.push({ step: "cloudtrail:LookupEvents(" + EventName + ")", error: e.message });
        break;
      }
      for (const ev of (res.Events || [])) {
        try { out.push(JSON.parse(ev.CloudTrailEvent)); } catch (_) { /* skip */ }
      }
      NextToken = res.NextToken;
      await sleep(LOOKUP_DELAY_MS);
    } while (NextToken && ++pages < MAX_PAGES_PER_EVENT);
  }
  return out;
}

/** Pull the resource id an agent-create event produced. */
function createdAgentId(e) {
  const re = e.responseElements || {};
  const rp = e.requestParameters || {};
  if (re.agentRuntimeId) return re.agentRuntimeId;
  if ((re.agent || {}).agentId) return re.agent.agentId;
  if (re.agentId) return re.agentId;
  return rp.agentRuntimeName || null;
}

/**
 * Build owner attribution for every agent.
 * Returns { creations: [...], deploys: [...], byAgentId: { id: resolution } }
 */
async function resolveOwners({ region, credentials, lookbackDays, maxGapSeconds, errors }) {
  const ct = new CloudTrailClient({ region, credentials });
  const StartTime = new Date(Date.now() - (lookbackDays || 90) * 86400000);

  const createRaw = await lookupByEventNames(ct, CREATE_EVENTS, StartTime, errors);
  const creations = createRaw.map((e) => ({
    agentId: createdAgentId(e),
    agentName: (e.requestParameters || {}).agentRuntimeName || (e.requestParameters || {}).agentName || null,
    eventTime: e.eventTime, eventName: e.eventName, userAgent: e.userAgent || null,
    userIdentity: e.userIdentity || {},
    viaCloudFormation: /cloudformation/i.test(e.userAgent || "") || isServiceCreator(e.userIdentity),
  })).filter((c) => c.agentId);

  // Only pay for the deploy lookup if at least one creation needs chaining.
  const needsChain = creations.some((c) => c.viaCloudFormation && !humanFrom(c.userIdentity));
  const deploys = needsChain
    ? (await lookupByEventNames(ct, DEPLOY_EVENTS, StartTime, errors)).map((e) => ({
        eventTime: e.eventTime, eventName: e.eventName,
        stackName: (e.requestParameters || {}).stackName
          || (((e.resources || [])[0] || {}).ResourceName) || null,
        userIdentity: e.userIdentity || {}, userAgent: e.userAgent || null,
      })).sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime))
    : [];

  // AssumeRole index, built LAZILY with a tight window around each deploy we
  // actually need to resolve.
  //
  // Do NOT span min(deploy)..max(deploy): the deploy list covers the full lookback
  // across every stack, so that window can be ~90 days wide. LookupEvents returns
  // newest-first and is page-capped, and AssumeRole is high-volume, so a wide
  // window silently never reaches the events we need. This was a real failure mode.
  const arIndex = {};
  const arResolved = new Set();
  async function ensureAssumeRoleWindow(deployTimeIso) {
    const t = new Date(deployTimeIso).getTime();
    const bucket = Math.floor(t / 900000);            // 15-minute buckets, fetched once each
    if (arResolved.has(bucket)) return;
    arResolved.add(bucket);
    await buildAssumeRoleIndex({
      region, credentials, errors, index: arIndex,
      windowStart: new Date(t - 3600000),             // 1h before this deploy
      windowEnd: new Date(t + 60000),                 // 1m after
    });
  }

  const gapLimit = (maxGapSeconds || 600) * 1000;
  const byAgentId = {};

  for (const c of creations) {
    // Rung 3 — human directly on the create event.
    const direct = humanFrom(c.userIdentity);
    if (direct) {
      byAgentId[c.agentId] = {
        owner: direct.name, rung: 3, source: "CloudTrail " + c.eventName,
        confidence: direct.strong ? "High" : "Medium", unconfirmed: true,
        note: "Create event was performed by an identifiable principal (" + direct.via + ").",
        chain: [{ step: c.eventName, at: c.eventTime, principal: c.userIdentity.arn }],
      };
      continue;
    }

    // Rung 4 — chain through the nearest preceding deploy event.
    if (!c.viaCloudFormation) {
      byAgentId[c.agentId] = {
        owner: null, rung: null, confidence: "Unresolved", unconfirmed: true,
        note: "Create event carries no identifiable human principal.",
        chain: [{ step: c.eventName, at: c.eventTime, principal: (c.userIdentity || {}).arn }],
      };
      continue;
    }

    const created = new Date(c.eventTime).getTime();
    const candidates = deploys.filter((d) => {
      const t = new Date(d.eventTime).getTime();
      return t <= created && created - t <= gapLimit && !!humanFrom(d.userIdentity);
    });

    if (!candidates.length) {
      byAgentId[c.agentId] = {
        owner: null, rung: null, confidence: "Unresolved", unconfirmed: true,
        note: "Created by CloudFormation; no correlating deploy event with a human principal within "
          + (maxGapSeconds || 600) + "s.",
        chain: [{ step: c.eventName, at: c.eventTime, principal: (c.userIdentity || {}).arn }],
      };
      continue;
    }

    const nearest = candidates[0];                       // deploys are sorted desc
    const human = humanFrom(nearest.userIdentity);
    const gapSec = Math.round((created - new Date(nearest.eventTime).getTime()) / 1000);

    // Ambiguity is scoped to the SAME STACK. A deploy of a different stack that
    // happens to fall inside the window is not a competing explanation for this
    // resource — counting it wrongly downgrades confidence (e.g. a CDKToolkit
    // bootstrap deploy sitting minutes before an application stack deploy).
    const sameStack = candidates.filter((d) => d.stackName === nearest.stackName);
    const distinct = new Set(sameStack.map((d) => (humanFrom(d.userIdentity) || {}).name).filter(Boolean));
    const ambiguous = distinct.size > 1;

    // Resolve the originating principal for this specific deploy.
    await ensureAssumeRoleWindow(nearest.eventTime);

    // ── AssumeRole join: exact resolution of the originating principal ──
    // The CDK session name is a LOCAL MACHINE username, so it is never a reliable
    // AWS identity. If we can find the AssumeRole that minted the deploy
    // credentials, we get the real principal with no guessing.
    const deployKeyId = (nearest.userIdentity || {}).accessKeyId;
    const minted = deployKeyId ? arIndex[deployKeyId] : null;
    const origin = minted ? humanFrom(minted.userIdentity) : null;

    const chain = [];
    if (minted) {
      chain.push({
        step: "AssumeRole", at: minted.eventTime,
        principal: (minted.userIdentity || {}).arn,
        stack: minted.roleSessionName ? "session: " + minted.roleSessionName : null,
      });
    }
    chain.push({ step: nearest.eventName, at: nearest.eventTime, principal: (nearest.userIdentity || {}).arn, stack: nearest.stackName });
    chain.push({ step: "CloudFormation", at: null, principal: (c.userIdentity || {}).arn });
    chain.push({ step: c.eventName, at: c.eventTime, resource: c.agentId });

    if (origin) {
      // Exact join — no time-proximity inference in the identity itself.
      byAgentId[c.agentId] = {
        owner: origin.name,
        rung: 4,
        originPrincipalArn: (minted.userIdentity || {}).arn || null,
        originPrincipalType: (minted.userIdentity || {}).type || null,
        originAccessKeyId: (minted.userIdentity || {}).accessKeyId || null,
        originLongLivedCredential: String((minted.userIdentity || {}).accessKeyId || "").startsWith("AKIA"),
        sessionName: nearest.userIdentity ? String(nearest.userIdentity.arn || "").split("/").pop() : null,
        source: "CloudTrail AssumeRole \u2192 " + nearest.eventName + " \u2192 CloudFormation \u2192 " + c.eventName,
        confidence: origin.strong ? "High" : "Medium",
        unconfirmed: true,
        exactJoin: true,
        gapSeconds: gapSec,
        note: "Resolved by exact access-key join: the AssumeRole call that minted the deploy "
          + "credentials was made by " + ((minted.userIdentity || {}).arn || "an unknown principal")
          + " (" + origin.via + ").",
        chain: chain,
      };
      continue;
    }

    // Fallback: the session-name heuristic. Note explicitly that the CDK session
    // name is a local machine username so nobody over-reads it.
    byAgentId[c.agentId] = {
      owner: human.name,
      rung: 4,
      sessionName: String((nearest.userIdentity || {}).arn || "").split("/").pop(),
      source: "CloudTrail " + nearest.eventName + " \u2192 CloudFormation \u2192 " + c.eventName,
      confidence: ambiguous ? "Low" : (gapSec <= 300 ? "Medium" : "Low"),
      unconfirmed: true,
      exactJoin: false,
      ambiguous: ambiguous,
      gapSeconds: gapSec,
      note: "Correlated by time proximity (" + gapSec + "s) between the deploy and the resource creation, "
        + "and the identity is taken from the role session name. For CDK deploys that session name is the "
        + "operator's LOCAL MACHINE username, not an AWS principal \u2014 it will not match an IAM user unless "
        + "they happen to share a name. No AssumeRole event was found in the window to resolve the true caller."
        + (ambiguous ? " Multiple deploy principals fall inside the window." : ""),
      chain: chain,
    };
  }

  return { creations, deploys, byAgentId };
}

/**
 * AssumeRole join — the authoritative third hop.
 *
 * A CDK deploy event is performed by temporary credentials (accessKeyId ASIA...).
 * The AssumeRole call that MINTED those credentials records the originating
 * principal in its own userIdentity, and the minted key in
 * responseElements.credentials.accessKeyId.
 *
 * Joining on that key is EXACT — no time-proximity guessing, no name matching.
 * It is the only way to recover a real principal from a CDK deploy, because the
 * CDK session name is the operator's LOCAL MACHINE username, not an AWS identity:
 *   https://github.com/aws/aws-cdk-cli/issues/1120
 *
 * STS is logged in the Region where the call was made; the global endpoint lands
 * in us-east-1, so both are scanned.
 */
async function buildAssumeRoleIndex({ region, credentials, windowStart, windowEnd, errors, index }) {
  index = index || {};                    // mintedAccessKeyId -> originating userIdentity
  const regions = Array.from(new Set([region, "us-east-1"]));

  for (const reg of regions) {
    const ct = new CloudTrailClient({ region: reg, credentials });
    let NextToken, pages = 0;
    do {
      let res;
      try {
        res = await ct.send(new LookupEventsCommand({
          LookupAttributes: [{ AttributeKey: "EventName", AttributeValue: "AssumeRole" }],
          StartTime: windowStart, EndTime: windowEnd, MaxResults: 50, NextToken,
        }));
      } catch (e) {
        errors.push({ step: "cloudtrail:LookupEvents(AssumeRole/" + reg + ")", error: e.message });
        break;
      }
      for (const ev of (res.Events || [])) {
        let e;
        try { e = JSON.parse(ev.CloudTrailEvent); } catch (_) { continue; }
        const minted = (((e.responseElements || {}).credentials) || {}).accessKeyId;
        if (!minted) continue;
        index[minted] = {
          userIdentity: e.userIdentity || {},
          roleArn: (e.requestParameters || {}).roleArn || null,
          roleSessionName: (e.requestParameters || {}).roleSessionName || null,
          eventTime: e.eventTime, region: reg,
        };
      }
      NextToken = res.NextToken;
      await sleep(LOOKUP_DELAY_MS);
    } while (NextToken && ++pages < MAX_PAGES_PER_EVENT);
  }
  return index;
}

/**
 * Validate a CloudTrail-proposed owner string against the account's real IAM users.
 *
 * The proposal itself comes from CloudTrail, NOT from IAM — IAM has no created-by
 * attribution. This step only answers "does a real principal exist with that name?"
 * and, when it does, upgrades confidence and attaches a resolvable ARN.
 *
 * Matching is deliberately conservative: exact userName, exact email tag, or the
 * local-part of an email tag. No fuzzy matching — a wrong owner is worse than none.
 */
function validateAgainstIamUsers(resolution, iamUsers) {
  if (!resolution || !resolution.owner || !iamUsers || !iamUsers.length) return resolution;

  // Exact ARN join. When the AssumeRole hop returned a real IAM principal there is
  // nothing to guess: match on ARN, never on name.
  if (resolution.originPrincipalArn) {
    const exact = iamUsers.find((u) => u.arn === resolution.originPrincipalArn);
    if (exact) {
      resolution.iamValidated = true;
      resolution.iamUser = {
        userName: exact.userName, arn: exact.arn, email: exact.email || null,
        mfaEnabled: exact.mfaEnabled, activeKeyCount: exact.activeKeyCount,
        oldestActiveKeyAgeDays: exact.oldestActiveKeyAgeDays,
      };
      // The credential that performed the deploy, if we captured it.
      if (resolution.originAccessKeyId) {
        const k = (exact.accessKeys || []).find((x) => x.accessKeyId === resolution.originAccessKeyId);
        if (k) {
          resolution.originCredential = {
            accessKeyId: k.accessKeyId, status: k.status, ageDays: k.ageDays,
            lastUsedDate: k.lastUsedDate, lastUsedService: k.lastUsedService,
            longLived: String(k.accessKeyId || "").startsWith("AKIA"),
          };
        }
      }
      resolution.confidence = "High";
      resolution.validationNote = "Exact ARN match to IAM user " + exact.arn + ".";
      return resolution;
    }
    resolution.iamValidated = false;
    resolution.validationNote = "Originating principal " + resolution.originPrincipalArn
      + " is not an IAM user in this account (federated, cross-account, or Identity Center).";
    return resolution;
  }
  const lc = (v) => String(v || "").toLowerCase();
  // Normalise separators only: "sai.srungaram" / "sai_srungaram" / "sai-srungaram"
  // all collapse to "saisrungaram". This is normalisation, not fuzzy matching —
  // no edit distance, no prefix matching, no substring matching.
  const norm = (v) => lc(v).replace(/[._\-\s]/g, "");
  const cand = lc(resolution.owner);
  const candN = norm(resolution.owner);

  const match = iamUsers.find((u) => {
    const un = lc(u.userName), unN = norm(u.userName);
    const em = lc(u.email), local = em.split("@")[0], localN = norm(local);
    if (un === cand || em === cand || (local && local === cand)) return true;
    if (candN && (unN === candN || (localN && localN === candN))) return true;
    // Owner/email tags on the IAM user itself.
    const tags = u.tags || {};
    return Object.keys(tags).some((k) => /^(email|owner|username|alias|login)$/i.test(k)
      && (lc(tags[k]) === cand || norm(tags[k]) === candN || norm(lc(tags[k]).split("@")[0]) === candN));
  });

  if (!match) {
    resolution.iamValidated = false;
    resolution.validationNote = "No IAM user matches this name. The principal may be an "
      + "IAM Identity Center user, a federated identity, or a local CLI profile name.";
    return resolution;
  }

  resolution.iamValidated = true;
  resolution.iamUser = {
    userName: match.userName, arn: match.arn, email: match.email || null,
    mfaEnabled: match.mfaEnabled, activeKeyCount: match.activeKeyCount,
    oldestActiveKeyAgeDays: match.oldestActiveKeyAgeDays,
  };
  resolution.validationNote = "Resolved to IAM user " + match.arn + ".";
  // A resolved principal is stronger evidence than a bare session string.
  if (resolution.confidence === "Low") resolution.confidence = "Medium";
  else if (resolution.confidence === "Medium") resolution.confidence = "High";
  return resolution;
}

/** Attach the ladder result to one agent, preferring higher rungs. */
function attachOwner(agent, agentId, ownerData, execRole, iamUsers) {
  const tagOwner = (agent.tagged || {}).owner;

  // Rung 1 — Reva-assigned entity attribute (set elsewhere; honoured if present).
  if (agent.assignedOwner) {
    agent.resolvedOwner = {
      owner: agent.assignedOwner, rung: 1, confidence: "Confirmed", unconfirmed: false,
      source: "Reva policy store", note: "Assigned in Reva and enforced as a Cedar entity attribute.",
      chain: [],
    };
    return;
  }
  // Rung 2 — Owner tag on the resource.
  if (tagOwner && tagOwner.value) {
    agent.resolvedOwner = {
      owner: tagOwner.value, rung: 2, confidence: "Declared", unconfirmed: false,
      source: "Resource tag: " + tagOwner.tagKey,
      note: "Declared by the resource owner tag.", chain: [],
    };
    return;
  }
  // Rungs 3 / 4 — CloudTrail.
  const ct = agentId ? ownerData.byAgentId[agentId] : null;
  if (ct && ct.owner) {
    agent.resolvedOwner = validateAgainstIamUsers(ct, iamUsers);
    return;
  }

  // Rung 5 — Owner tag on the execution role.
  const roleTag = (execRole && (execRole.tags || []).find((t) => /^(owner|ownedby|team|contact)$/i.test(t.Key))) || null;
  if (roleTag) {
    agent.resolvedOwner = {
      owner: roleTag.Value, rung: 5, confidence: "Low", unconfirmed: true,
      source: "Execution role tag: " + roleTag.Key,
      note: "Inherited from the execution role tag; the role may be shared across agents.",
      chain: [],
    };
    return;
  }

  agent.resolvedOwner = (ct) || {
    owner: null, rung: null, confidence: "Unresolved", unconfirmed: true,
    source: null,
    note: "No owner tag, and no create event found in the CloudTrail window. "
      + "Attribution requires a tag at creation, sourceIdentity propagation, or a CloudTrail Lake data store.",
    chain: [],
  };
}

/* ───────────────────────── drift evaluation ───────────────────────── */

/**
 * Compare declared vs observed and evaluate change-over-time.
 *
 * status values:
 *   Match         declared == observed (after profile normalisation)
 *   Differs       declared != observed  → HIGHLIGHT
 *   Changed       more than one distinct model observed in the window → HIGHLIGHT
 *   ObservedOnly  no declared value available (AgentCore Runtime — expected)
 *   DeclaredOnly  declared known, no inference observed in the window
 *   Unknown       neither available
 */
function evaluateModelDrift(declared, observed) {
  const d = declared && declared.modelId ? declared.modelId : null;
  const o = observed && observed.modelId ? observed.modelId : null;
  const changed = !!(observed && observed.distinctModels > 1);

  if (changed) {
    const prev = observed.history[1];
    return {
      status: "Changed", highlight: true,
      detail: "Model changed during the observation window: " + prev.modelId + " \u2192 " + observed.modelId,
      previousModelId: prev.modelId, changedAt: observed.history[0].firstSeen,
    };
  }
  if (d && o) {
    const same = baseModelId(d) === baseModelId(o);
    return same
      ? { status: "Match", highlight: false, detail: "Declared configuration matches observed inference." }
      : { status: "Differs", highlight: true, detail: "Declared " + d + " but observed " + o + " in inference telemetry." };
  }
  if (o) return { status: "ObservedOnly", highlight: false, detail: "AgentCore Runtime does not expose a model field on the control plane; value is observed from inference telemetry." };
  if (d) return { status: "DeclaredOnly", highlight: false, detail: "No inference observed in the CloudTrail window; declared value shown." };
  return { status: "Unknown", highlight: false, detail: "No declared or observed model available." };
}

/* ───────────────────────────── entrypoint ───────────────────────────── */

/**
 * Mutates `results` in place. Call at the END of runDiscovery, after
 * agentcoreAgents / bedrockAgents / gateways / iamRoles are populated.
 */
async function enrichDiscovery(results, { region, credentials, lookbackDays }) {
  const acClient = new BedrockAgentCoreControlClient({ region, credentials });
  const errors = results.errors;

  // ── 1. Tags: AgentCore Runtimes ──
  for (const a of results.agentcoreAgents) {
    a.tags = await fetchTags(acClient, a.agentRuntimeArn, errors, "runtime/" + a.name);
    a.tagged = deriveFromTags(a.tags);
  }
  // ── 1b. Tags: Gateways ──
  for (const g of results.gateways) {
    g.tags = await fetchTags(acClient, g.gatewayArn, errors, "gateway/" + g.name);
    g.tagged = deriveFromTags(g.tags);
  }
  // ── 1c. Bedrock Agents already carry tags via GetAgent; normalise the same way ──
  for (const b of results.bedrockAgents) {
    b.tagged = deriveFromTags(b.tags || null);
  }

  // ── 2. Owner attribution (CloudTrail ladder) ──
  let ownerData = { creations: [], deploys: [], byAgentId: {} };
  try {
    ownerData = await resolveOwners({
      region, credentials,
      lookbackDays: Number(process.env.REVA_OWNER_LOOKBACK_DAYS || 90),
      maxGapSeconds: Number(process.env.REVA_OWNER_MAX_GAP_SECONDS || 600),
      errors,
    });
  } catch (e) {
    errors.push({ step: "enrichment:resolveOwners", error: e.message });
  }
  results.ownerAttribution = { creations: ownerData.creations, deploys: ownerData.deploys };

  // ── 3. Observed models ──
  let observedByRole = {};
  try {
    observedByRole = await discoverObservedModels({ region, credentials, lookbackDays, errors });
  } catch (e) {
    errors.push({ step: "enrichment:discoverObservedModels", error: e.message });
  }
  results.observedModelsByRole = observedByRole;

  // ── 4. Attach model metadata, owner and drift ──
  for (const a of results.agentcoreAgents) {
    const observed = a.roleArn ? (observedByRole[a.roleArn] || null) : null;
    // AgentCore GetAgentRuntime returns no model field. If an operator has promoted
    // the model to an env var, honour it as DECLARED — never invent one.
    const envVars = a.environmentVariables || {};
    const declaredId = envVars.MODEL_ID || envVars.BEDROCK_MODEL_ID || null;

    a.declaredModel = declaredId
      ? { modelId: declaredId, source: "GetAgentRuntime.environmentVariables" }
      : { modelId: null, source: null, unavailableReason: "AgentCore GetAgentRuntime does not return a model field." };
    a.observedModel = observed;
    a.modelDrift = evaluateModelDrift(a.declaredModel, observed);
    a.residencyDrift = !!(observed && observed.inferenceRegion && observed.inferenceRegion !== a.region);

    const acRole = results.iamRoles.find((r) => r.arn === a.roleArn) || null;
    attachOwner(a, a.agentRuntimeId, ownerData, acRole, results.iamUsers || []);
  }

  for (const b of results.bedrockAgents) {
    const observed = b.roleArn ? (observedByRole[b.roleArn] || null) : null;
    b.declaredModel = b.foundationModel
      ? { modelId: b.foundationModel, source: "GetAgent.foundationModel" }
      : { modelId: null, source: null, unavailableReason: "GetAgent returned no foundationModel." };
    b.observedModel = observed;
    b.modelDrift = evaluateModelDrift(b.declaredModel, observed);
    b.residencyDrift = !!(observed && observed.inferenceRegion && observed.inferenceRegion !== b.region);

    const brRole = results.iamRoles.find((r) => r.arn === b.roleArn) || null;
    attachOwner(b, b.agentId, ownerData, brRole, results.iamUsers || []);
  }

  // ── 4b. Attach the agent's own app-client token lifetimes ──
  // The agent presents a client_credentials token minted for its outbound client.
  // Surfacing the validity window makes the "cannot revoke a minted JWT" answer
  // concrete rather than theoretical.
  const clientById = {};
  for (const c of (results.appClients || [])) clientById[c.clientId] = c;
  for (const a of results.agentcoreAgents.concat(results.bedrockAgents)) {
    const ids = (a.outboundAuth || []).map((o) => o.clientId).filter(Boolean);
    const c = ids.map((id) => clientById[id]).find(Boolean);
    a.tokenPosture = c ? {
      clientId: c.clientId,
      clientName: c.name,
      accessTokenValidity: c.accessTokenValidity,
      idTokenValidity: c.idTokenValidity,
      refreshTokenValidity: c.refreshTokenValidity,
      units: c.tokenValidityUnits || null,
      scopes: c.allowedOAuthScopes || [],
      tokenRevocationEnabled: c.enableTokenRevocation,
      credentialType: c.credentialType,
    } : null;
  }

  // ── 5. Summary counters ──
  const allAgents = results.agentcoreAgents.concat(results.bedrockAgents);
  results.summary = results.summary || {};
  results.summary.modelDriftFlagged = allAgents.filter((a) => a.modelDrift && a.modelDrift.highlight).length;
  results.summary.residencyDriftFlagged = allAgents.filter((a) => a.residencyDrift).length;
  results.summary.agentsWithObservedModel = allAgents.filter((a) => a.observedModel).length;
  results.summary.agentsWithTags = allAgents.filter((a) => a.tags && Object.keys(a.tags).length).length;
  results.summary.agentsWithOwner = allAgents.filter((a) => a.resolvedOwner && a.resolvedOwner.owner).length;
  results.summary.agentsUnowned = allAgents.filter((a) => !a.resolvedOwner || !a.resolvedOwner.owner).length;
  results.summary.agentOwnersIamValidated = allAgents.filter((a) => a.resolvedOwner && a.resolvedOwner.iamValidated).length;

  // ── 6. Creation events with no surviving agent ──
  // A CreateAgentRuntime/CreateAgent in the window whose resource is absent from
  // the live inventory. Either torn down, or live but outside what we enumerate.
  const liveIds = new Set(allAgents.map((a) => a.agentRuntimeId || a.agentId).filter(Boolean));
  results.orphanedCreations = (ownerData.creations || [])
    .filter((c) => c.agentId && !liveIds.has(c.agentId))
    .map((c) => ({
      agentId: c.agentId, agentName: c.agentName, createdAt: c.eventTime,
      eventName: c.eventName, createdBy: (c.userIdentity || {}).arn || null,
      proposedOwner: (ownerData.byAgentId[c.agentId] || {}).owner || null,
    }));
  results.summary.orphanedCreations = results.orphanedCreations.length;

  return results;
}

module.exports = {
  enrichDiscovery,
  discoverObservedModels,
  resolveOwners,
  humanFrom,
  buildAssumeRoleIndex,
  attachOwner,
  validateAgainstIamUsers,
  deriveFromTags,
  evaluateModelDrift,
  baseModelId,
};
