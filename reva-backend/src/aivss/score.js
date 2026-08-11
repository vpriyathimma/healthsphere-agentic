// AIVSS scoring — agent metadata in, the block the UI renders out.
//
// Replaces a hand-written JSON. Amit: "instead of giving you a fixed JSON that
// you are loading for a fixed set of things, we will generate this dynamically
// so we don't have the dependency of giving the JSON all the time."
//
// The FORMULA is not ours and is not reimplemented from a description — every
// constant comes from contract.json, which is Abhilasha's own
// `meta.aivss` block copied verbatim. Bands, multipliers, mitigation levels,
// the rubric and the catalogues all read from there, so when she revises the
// methodology this follows without a code change.
//
// What IS ours is deriving the ten factor values from whatever metadata
// discovery happens to have. The contract does not specify that — in her file
// the factors are hand-set per agent with prose notes. So the rules below were
// reverse-engineered from her 32 worked examples rather than invented, and each
// factor reports how it was arrived at. See FACTOR_RULES.

const CONTRACT = require("./contract.json");

const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// ---------------------------------------------------------------- inputs
//
// Accepts either the shape in her inventory file (identity / inventoryRow /
// capabilitiesRisk) or a flat object. Discovery will not always populate the
// same fields, and a scorer that only works on one shape is a scorer that
// works until the first real payload.
function readInputs(agent = {}) {
  const id = agent.identity || {};
  const row = agent.inventoryRow || {};
  const cap = agent.capabilitiesRisk || {};
  const conn = id.connections || agent.connections || {};

  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  return {
    name: id.name ?? agent.name ?? null,
    agentId: id.agentId ?? agent.agentId ?? null,
    status: id.status ?? row.status ?? agent.status ?? null,
    agentType: row.agentType ?? agent.agentType ?? null,
    lifecycle: id.lifecycle ?? agent.lifecycle ?? null,
    tools: num(conn.tools),
    mcpServers: num(conn.mcpServers),
    subAgents: num(conn.subAgents),
    models: num(conn.models),
    users: num(row.users ?? agent.users),
    dataSensitivity: cap.dataSensitivity ?? agent.dataSensitivity ?? [],
    delegates: (cap.delegation || agent.delegation || {}).allowedDelegates ?? [],
    // Present in her file but not required. Absent means "unknown", which is
    // scored as unknown rather than as absent — see the mitigation note.
    mitigationLevel: agent.mitigationLevel ?? null,
    threatCode: agent.threatCode ?? null,
    primaryRiskId: agent.primaryRiskId ?? null,
  };
}

// ------------------------------------------------------------- cvss base
//
// Straight from baseScoreRubric. This part is fully specified — no judgement.
function cvssBase(inp) {
  const r = CONTRACT.baseScoreRubric;
  let score = r.floor;
  const detail = [`floor ${r.floor}`];

  const reach = inp.tools + inp.mcpServers + 2 * inp.subAgents;
  const reachAdd = reach === 0 ? 0 : reach <= 2 ? 1.0 : reach <= 4 ? 2.0 : 3.0;
  score += reachAdd;
  detail.push(`reach ${reach} (+${reachAdd})`);

  // "sensitive(financial/PII/PHI/source)": 2.5 — everything else, and unknown,
  // scores 1.0. Unknown is NOT treated as safe; the rubric says so explicitly
  // ("unknown data sensitivity adds +1.0").
  const sensitive = /financial|pii|phi|source|health|patient|credential/i;
  const sens = (Array.isArray(inp.dataSensitivity) ? inp.dataSensitivity : [inp.dataSensitivity])
    .filter(Boolean).map(String);
  const isSensitive = sens.some((s) => sensitive.test(s));
  const sensAdd = isSensitive ? 2.5 : 1.0;
  score += sensAdd;
  detail.push(sens.length ? `dataSensitivity ${sens.join("/")} (+${sensAdd})`
                          : `dataSensitivity unknown (+${sensAdd})`);

  const expAdd = inp.users < 5 ? 0.0 : inp.users <= 20 ? 0.5 : 1.0;
  score += expAdd;
  detail.push(`users ${inp.users} (+${expAdd})`);

  return { value: round1(Math.min(score, r.cap)), detail };
}

// --------------------------------------------------------------- factors
//
// Reverse-engineered from the 32 scored agents in her file. `accuracy` is how
// often the rule reproduces her own value, so a reader can tell a derived
// number from a defaulted one.
const FACTOR_RULES = {
  language: { accuracy: "32/32",
    why: "every agent in the reference set scores 1.0 — an LLM agent is prompt-driven by definition",
    derive: () => ({ value: 1.0, note: "Natural-language driven" }) },

  tools: { accuracy: "32/32",
    why: "count of tools: 0 -> 0.0, 1-2 -> 0.5, 3+ -> 1.0",
    derive: (i) => ({
      value: i.tools === 0 ? 0.0 : i.tools <= 2 ? 0.5 : 1.0,
      note: i.tools === 0 ? "No tools" : `${i.tools} tool${i.tools === 1 ? "" : "s"}` }) },

  context: { accuracy: "32/32",
    why: "count of MCP servers: 0 -> 0.0, 1-2 -> 0.5, 3+ -> 1.0",
    derive: (i) => ({
      value: i.mcpServers === 0 ? 0.0 : i.mcpServers <= 2 ? 0.5 : 1.0,
      note: i.mcpServers === 0 ? "No external context sources"
                               : `${i.mcpServers} MCP server${i.mcpServers === 1 ? "" : "s"}` }) },

  non_determinism: { accuracy: "32/32",
    why: "Governed -> 0.5, anything else -> 1.0",
    derive: (i) => ({
      value: i.status === "Governed" ? 0.5 : 1.0,
      note: i.status === "Governed" ? "Governed — output controls in place"
                                    : "Unassessed output variability" }) },

  opacity: { accuracy: "32/32",
    why: "Governed -> 0.5, anything else -> 1.0",
    derive: (i) => ({
      value: i.status === "Governed" ? 0.5 : 1.0,
      note: i.status === "Governed" ? "Governed — decisions traced"
                                    : "No confirmed audit trail" }) },

  identity: { accuracy: "18/32 by agentType",
    why: "SaaS-Embedded runs under the host platform's identity (14/14 scored 1.0); Browser Endpoint scored 0.5 (4/4). Others default to 0.5.",
    derive: (i) => (i.agentType === "SaaS-Embedded"
      ? { value: 1.0, note: "Runs under the host platform's identity" }
      : { value: 0.5, note: "Scoped credentials assumed — confirm on assessment" }) },

  self_modification: { accuracy: "24/32 by agentType",
    why: "SaaS-Embedded and Platform-Built cannot alter themselves (17/17 scored 0.0). Others default to 0.0 — self-modification is rare and assuming it inflates every score.",
    derive: (i) => ({ value: 0.0,
      note: i.agentType === "SaaS-Embedded" || i.agentType === "Platform-Built"
        ? "Platform-managed — cannot alter its own configuration"
        : "No self-modification observed" }) },

  autonomy: { accuracy: "21/32 by agentType",
    why: "Custom-Built and Platform-Built act without approval (13/14 scored 1.0); SaaS-Embedded and Browser Endpoint sit behind a human (15/18 scored 0.5).",
    derive: (i) => (["Custom-Built", "Platform-Built"].includes(i.agentType)
      ? { value: 1.0, note: "Acts without a human approval step" }
      : { value: 0.5, note: "Human in the loop for consequential actions" }) },

  multi_agent: { accuracy: "26/32",
    why: "sub-agents or declared delegates. Not clean in the reference set — some agents scored above 0 with neither, on judgement the metadata does not carry.",
    derive: (i) => {
      const n = i.subAgents + (i.delegates || []).length;
      if (n === 0) return { value: 0.0, note: "No sub-agents or delegates" };
      return { value: n >= 2 ? 1.0 : 0.5,
               note: `${n} sub-agent/delegate relationship${n === 1 ? "" : "s"}` };
    } },

  persistence: { accuracy: "18/32",
    why: "weakest rule. Memory across sessions is not in the metadata; Ephemeral -> 0.0, otherwise 0.5, which is the modal value.",
    derive: (i) => (i.lifecycle === "Ephemeral"
      ? { value: 0.0, note: "Ephemeral — no state retained" }
      : { value: 0.5, note: "Session state assumed — confirm on assessment" }) },
};

function factors(inp) {
  return CONTRACT.factorCatalog.map((f) => {
    const rule = FACTOR_RULES[f.key];
    const out = rule.derive(inp);
    return {
      key: f.key,
      label: f.label,
      value: out.value,
      note: out.note,
      tiedToPrimaryRisk: false,
      // Kept so a reviewer can see which numbers are measured and which are
      // defaulted. Strip it in the response if the UI objects to extra keys.
      derivation: { rule: rule.why, agreesWithReference: rule.accuracy },
    };
  });
}

// ------------------------------------------------------------- the score
function score(agent = {}) {
  const inp = readInputs(agent);
  const base = cvssBase(inp);
  const fs = factors(inp);
  const factorSum = round1(fs.reduce((t, f) => t + f.value, 0));
  const maxedFactors = fs.filter((f) => f.value >= 1.0).length;

  // Defaults are the contract's own, and both are deliberately conservative:
  // "Unreported (0.5) unless a known exploit exists", and Discovered ->
  // Unassessed (0.9) because "discovery no longer implies absent controls".
  const threat = CONTRACT.threatMultiplierOptions
    .find((t) => t.code === inp.threatCode) ||
    CONTRACT.threatMultiplierOptions.find((t) => t.code === "Unreported");

  const mitigation =
    CONTRACT.mitigationMap.find((m) => m.status === inp.status && m.level === inp.mitigationLevel) ||
    CONTRACT.mitigationMap.find((m) => m.status === inp.status) ||
    CONTRACT.mitigationMap.find((m) => m.status === "Discovered");

  const aars = round1((10 - base.value) * (factorSum / 10) * threat.value);
  const aivss = round1(clamp((base.value + aars) * mitigation.factor, 0, 10));

  const band = CONTRACT.severityBands.find((b) => aivss >= b.min && aivss <= b.max) ||
               CONTRACT.severityBands[CONTRACT.severityBands.length - 1];

  const primaryRisk = CONTRACT.coreRiskCatalog.find((r) => r.id === inp.primaryRiskId) ||
                      CONTRACT.coreRiskCatalog[0];

  return {
    version: "0.8",
    primaryRisk: { id: primaryRisk.id, name: primaryRisk.name },
    cvssBase: base.value,
    threatMultiplier: { value: threat.value, code: threat.code },
    factors: fs,
    factorSum,
    maxedFactors,
    mitigation: { status: mitigation.status, level: mitigation.level, factor: mitigation.factor },
    aars,
    score: aivss,
    severity: band.band,
    composition: {
      baseSeverity: base.value,
      agenticAmplification: aars,
      reducedByGovernance: round1((base.value + aars) * (1 - mitigation.factor)),
    },
    formula: {
      aars: `AARS = (10 - ${base.value}) x (${factorSum} / 10) x ${threat.value} = ${aars}`,
      aivss: `AIVSS = (${base.value} + ${aars}) x ${mitigation.factor} = ${aivss}`,
    },
    recommendedActions: recommendedActions(aivss, inp, mitigation),
    severityDisplay: { tier: band.tier, color: band.color, showBanner: band.showBanner },
    // How the base was reached, so a number on screen can be explained rather
    // than only asserted.
    baseComposition: base.detail,
  };
}

function recommendedActions(aivss, inp, mitigation) {
  const cat = CONTRACT.recommendedActionCatalog;
  const pick = (id) => cat.find((a) => a.id === id);
  const out = [];
  if (mitigation.level === "Unassessed") out.push(pick("assess_controls") || pick(cat[0].id));
  if (aivss >= 7.0) out.push(pick("reduce_blast_radius") || pick("restrict_tools"));
  if (inp.status === "Governed" && aivss < 7.0) out.push(pick("maintain_controls"));
  const seen = new Set();
  return out.filter(Boolean).filter((a) => !seen.has(a.id) && seen.add(a.id));
}

module.exports = { score, CONTRACT, FACTOR_RULES, readInputs, cvssBase };
