// =========================================================
// Reva — AAI policy data (all 25 OOTB)
// =========================================================
const POLICIES = [
  // ===== Runtime Behavioral Protection (RBP) =====
  {
    id: "AAI-RBP-001",
    name: "Tool Invocation Surge",
    category: "rbp",
    resolution: "Auto-Restore",
    principals: [
      { pid: "agent:data-pipeline", type: "Agent", trigger: "Runtime", reason: "Extract_records tool invoked 847 times in 5-minute window — baseline threshold is 40 invocations per window", quarantineSec: 1620, status: "Quarantined" },
      { pid: "agent:etl-scheduler", type: "Agent", trigger: "Runtime", reason: "Bulk_insert tool invoked 312 times in 3 minutes — throughput exceeded 8x normal operating range", quarantineSec: 880, status: "Auto-restoring" },
    ],
  },
  {
    id: "AAI-RBP-002",
    name: "High Denial Rate",
    category: "rbp",
    resolution: "HITL",
    principals: [
      { pid: "agent:finbot", type: "Agent", trigger: "Runtime", reason: "6 consecutive policy denials in 58 seconds — agent attempted fund transfers exceeding authorized transaction threshold", quarantineSec: 2820, status: "Quarantined" },
      { pid: "agent:uw-01", type: "Agent", trigger: "Runtime", reason: "8 policy denials in 45 seconds — repeated unauthorized write attempts against restricted customer relationship records", quarantineSec: 2640, status: "Awaiting resolution" },
      { pid: "user:j.smith", type: "User", trigger: "Runtime", reason: "5 policy denials in 60 seconds — attempted rate query operations outside authorized data classification scope", quarantineSec: 2400, status: "Quarantined" },
    ],
  },
  {
    id: "AAI-RBP-003",
    name: "Ephemeral Agent Surge",
    category: "rbp",
    resolution: "Auto-Restore",
    principals: [
      { pid: "agent:orchestrator", type: "Agent", trigger: "Runtime", reason: "Spawned 23 ephemeral sub-agents within 2-minute window — configured maximum is 8 instances per 5-minute rolling period", quarantineSec: 720, status: "Auto-restoring" },
    ],
  },
  {
    id: "AAI-RBP-004",
    name: "Data exfiltration pattern",
    category: "rbp",
    resolution: "HITL",
    principals: [
      { pid: "mcp:analytics-server", type: "MCP", trigger: "Runtime", reason: "Server returned 4.2 GB in aggregated responses within 10-minute window — volume exceeds 15x daily average baseline", quarantineSec: 6300, status: "Awaiting resolution" },
    ],
  },
  {
    id: "AAI-RBP-005",
    name: "HITL timeout escalation",
    category: "rbp",
    resolution: "Manual Admin Grant",
    principals: [
      { pid: "agent:loan-processor", type: "Agent", trigger: "Runtime", reason: "3 consecutive human-in-the-loop approval requests timed out without reviewer response — potential broken approval loop or reviewer unavailability", quarantineSec: 14400, status: "Quarantined" },
    ],
  },

  // ===== Identity-Aware Access (IAA) =====
  {
    id: "AAI-IAA-001",
    name: "Authentication failure lockout",
    category: "iaa",
    resolution: "Auto-Restore",
    principals: [
      { pid: "user:m.chen", type: "User", trigger: "Runtime", reason: "5 failed multi-factor authentication attempts within 3-minute window from recognized device", quarantineSec: 480, status: "Auto-restoring" },
      { pid: "user:t.nakamura", type: "User", trigger: "Runtime", reason: "8 failed password attempts originating from unrecognized device fingerprint — possible credential stuffing", quarantineSec: 660, status: "Quarantined" },
    ],
  },
  {
    id: "AAI-IAA-002",
    name: "Impossible travel detection",
    category: "iaa",
    resolution: "HITL",
    principals: [
      { pid: "user:r.patel", type: "User", trigger: "Runtime", reason: "Authenticated from Mumbai at 09:14 IST then from London at 09:52 IST — travel distance physically impossible within elapsed time", quarantineSec: 5400, status: "Awaiting resolution" },
    ],
  },
  {
    id: "AAI-IAA-003",
    name: "Dormant access reactivation",
    category: "iaa",
    resolution: "HITL",
    principals: [
      { pid: "user:k.tanaka", type: "User", trigger: "Runtime", reason: "No recorded platform activity for 127 days followed by bulk data export request for 2,400 customer records", quarantineSec: 9000, status: "Quarantined" },
    ],
  },
  {
    id: "AAI-IAA-004",
    name: "Session concurrency anomaly",
    category: "iaa",
    resolution: "Auto-Restore",
    principals: [
      { pid: "user:a.garcia", type: "User", trigger: "Runtime", reason: "8 concurrent active sessions detected across 4 geographic regions — maximum allowed concurrent sessions is 3", quarantineSec: 1500, status: "Auto-restoring" },
    ],
  },
  {
    id: "AAI-IAA-005",
    name: "NHI token origin anomaly",
    category: "iaa",
    resolution: "HITL",
    principals: [
      { pid: "nhi:reporting-svc", type: "NHI", trigger: "Runtime", reason: "Service token presented from unregistered IP range 10.42.x.x — expected origin is authorized 10.20.x.x subnet only", quarantineSec: 4080, status: "Quarantined" },
    ],
  },

  // ===== Malicious Website Blocking (MWB) =====
  {
    id: "AAI-MWB-001",
    name: "Malicious URL access attempt",
    category: "mwb",
    resolution: "Auto-Restore",
    principals: [
      { pid: "agent:research-bot", type: "Agent", trigger: "Runtime", reason: "Attempted HTTP fetch to domain flagged on enterprise threat intelligence blocklist — request blocked at network layer", quarantineSec: 900, status: "Auto-restoring" },
    ],
  },
  {
    id: "AAI-MWB-002",
    name: "MCP server untrusted redirect",
    category: "mwb",
    resolution: "HITL",
    principals: [
      { pid: "mcp:vendor-api", type: "MCP", trigger: "Runtime", reason: "Server response contained 302 redirect to external domain not listed on approved integration allowlist — potential server compromise", quarantineSec: 7200, status: "Quarantined" },
    ],
  },
  {
    id: "AAI-MWB-003",
    name: "Phishing content in agent output",
    category: "mwb",
    resolution: "HITL",
    principals: [
      { pid: "agent:email-assistant", type: "Agent", trigger: "Runtime", reason: "Generated output containing homoglyph domain paypa1.com matching documented phishing pattern in threat database", quarantineSec: 3300, status: "Awaiting resolution" },
    ],
  },
  {
    id: "AAI-MWB-004",
    name: "Unapproved external API call",
    category: "mwb",
    resolution: "Manual Admin Grant",
    principals: [
      { pid: "agent:procurement-bot", type: "Agent", trigger: "Runtime", reason: "Attempted outbound API call to vendor endpoint not present in registered integration manifest — unverified third-party dependency", quarantineSec: 10800, status: "Quarantined" },
    ],
  },

  // ===== Unsafe Action Prevention (UAP) =====
  {
    id: "AAI-UAP-001",
    name: "Prompt injection detection",
    category: "uap",
    resolution: "HITL",
    principals: [
      { pid: "agent:supply-coordinator", type: "Agent", trigger: "Runtime", reason: "Injection payload detected in MCP tool response — agent attempted system prompt override to bypass financial approval gate", quarantineSec: 7320, status: "Awaiting resolution" },
    ],
  },
  {
    id: "AAI-UAP-002",
    name: "PII / sensitive data exposure",
    category: "uap",
    resolution: "HITL",
    principals: [
      { pid: "agent:support-bot", type: "Agent", trigger: "Runtime", reason: "Response contained unmasked social security number during customer account lookup — data classification threshold exceeded", quarantineSec: 5760, status: "Quarantined" },
    ],
  },
  {
    id: "AAI-UAP-003",
    name: "Destructive operation attempt",
    category: "uap",
    resolution: "Manual Admin Grant",
    principals: [
      { pid: "agent:db-admin", type: "Agent", trigger: "Runtime", reason: "Attempted DROP TABLE operation on production order_transactions schema without approved change management ticket", quarantineSec: 13200, status: "Quarantined" },
    ],
  },
  {
    id: "AAI-UAP-004",
    name: "Privilege escalation attempt",
    category: "uap",
    resolution: "HITL",
    principals: [
      { pid: "user:d.kumar", type: "User", trigger: "Runtime", reason: "4 attempts to invoke admin-level user management operations within 2 minutes — assigned role is read-only analyst", quarantineSec: 4500, status: "Awaiting resolution" },
    ],
  },

  // ===== Agent Identity Governance (AIG) =====
  {
    id: "AAI-AIG-001",
    name: "Certification dispute hold",
    category: "aig",
    resolution: "HITL",
    principals: [
      { pid: "agent:report-gen", type: "Agent", trigger: "Certification", reason: "Certifier flagged dormant agent during quarterly review — no recorded invocations in 94 days, retains access to customer reporting system", quarantineSec: 259200, status: "In certification" },
      { pid: "nhi:etl-service", type: "NHI", trigger: "Certification", reason: "Certifier flagged service account during access review — designated owner departed organization 6 weeks ago, ownership unresolved", quarantineSec: 248400, status: "In certification" },
    ],
  },
  {
    id: "AAI-AIG-002",
    name: "SoD conflict detection",
    category: "aig",
    resolution: "HITL",
    principals: [
      { pid: "user:l.wong", type: "User", trigger: "Runtime", reason: "Granted both trade-execution and trade-settlement access simultaneously — violates segregation of duties policy FIN-SOD-003", quarantineSec: 8100, status: "Quarantined" },
    ],
  },
  {
    id: "AAI-AIG-003",
    name: "Incident Blast Radius",
    category: "aig",
    resolution: "Manual Admin Grant",
    principals: [
      { pid: "nhi:payment-svc", type: "NHI", trigger: "Manual", reason: "Compromised credential suspected during active incident — full isolation triggered per incident response protocol INC-4471", quarantineSec: 86400, status: "Quarantined" },
      { pid: "nhi:batch-processor", type: "NHI", trigger: "Manual", reason: "Shared credential rotation pending — isolated as precautionary measure during INC-4471 blast radius containment", quarantineSec: 84600, status: "Quarantined" },
      { pid: "agent:settlement-bot", type: "Agent", trigger: "Manual", reason: "Security admin clipped access via access explorer — agent connected to compromised payment-svc through delegation chain, isolated to prevent lateral propagation", quarantineSec: 82800, status: "Quarantined" },
    ],
  },
  {
    id: "AAI-AIG-004",
    name: "Model drift detection",
    category: "aig",
    resolution: "HITL",
    principals: [
      { pid: "agent:underwriter", type: "Agent", trigger: "Runtime", reason: "Runtime model identified as claude-3.5-sonnet — registered model in agent manifest is claude-haiku-4.5, deviation from approved model configuration", quarantineSec: 6480, status: "Quarantined" },
    ],
  },
  {
    id: "AAI-AIG-005",
    name: "Unregistered tool exposure",
    category: "aig",
    resolution: "Manual Admin Grant",
    principals: [
      { pid: "mcp:hr-server", type: "MCP", trigger: "Runtime", reason: "Server advertising delete_employee and modify_salary tools not present in registered tool manifest — potential supply chain compromise or unauthorized server update", quarantineSec: 16200, status: "Quarantined" },
    ],
  },
  {
    id: "AAI-AIG-006",
    name: "Delegation chain depth breach",
    category: "aig",
    resolution: "Manual Admin Grant",
    principals: [
      { pid: "agent:sub-task-4", type: "Agent", trigger: "Runtime", reason: "Agent-to-sub-agent delegation exceeded configured 3-hop maximum depth — chain: orchestrator > planner > executor > sub-task-4", quarantineSec: 11400, status: "Quarantined" },
    ],
  },
  {
    id: "AAI-AIG-007",
    name: "Scope creep — unmanifested tool",
    category: "aig",
    resolution: "HITL",
    principals: [
      { pid: "agent:analytics-bot", type: "Agent", trigger: "Runtime", reason: "Attempted to invoke send_email tool not listed in registered agent tool manifest — potential lateral capability expansion beyond authorized scope", quarantineSec: 5040, status: "Quarantined" },
    ],
  },
];

const CATEGORIES = {
  rbp: { label: "Runtime behavioral", short: "RBP" },
  iaa: { label: "Identity-aware",     short: "IAA" },
  mwb: { label: "Malicious blocking", short: "MWB" },
  uap: { label: "Unsafe action",      short: "UAP" },
  aig: { label: "Agent governance",   short: "AIG" },
};

// Mappings for pills
const TRIGGER_PILL = {
  Runtime: "blue",
  Certification: "purple",
  Manual: "amber",
};
const RESOLUTION_PILL = {
  "Auto-Restore": "green",
  "HITL": "amber",
  "Manual Admin Grant": "red",
  "Launch Certification": "purple",
};
const STATUS_PILL = {
  "Quarantined": "gray",
  "Awaiting resolution": "amber",
  "In certification": "purple",
  "Auto-restoring": "blue",
  "Resolved": "green",
  "Permanently revoked": "red",
};
const IDENTITY_PILL = {
  Agent: "blue",
  User: "green",
  NHI: "amber",
  MCP: "coral",
};

// Time formatting
function formatDuration(sec) {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m && h < 6 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${Math.floor(sec / 86400)}d`;
}
function timeBadgeTone(sec) {
  if (sec < 3600) return "gray";
  if (sec < 14400) return "amber";
  return "red";
}

Object.assign(window, {
  POLICIES, CATEGORIES,
  TRIGGER_PILL, RESOLUTION_PILL, STATUS_PILL, IDENTITY_PILL,
  formatDuration, timeBadgeTone,
});
