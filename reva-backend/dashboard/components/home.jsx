/* global React, Icon, Pill, Mark */
/* Home Dashboard (greeting, KPIs, violations, AAI card, agent inventory) + HomeApp container */

const KPIS = [
  { icon: "box", bg: "var(--blue-tint)", fg: "var(--blue-700)", num: "17", delta: "12%", dir: "up", label: "Ungoverned Agents",
    sub: "17 agents across 5 sources have no policies assigned. GitHub has the highest concentration with 6 ungoverned agents." },
  { icon: "flag", bg: "var(--coral-tint)", fg: "var(--coral)", num: "18", delta: "8%", dir: "down", label: "Active Violations",
    sub: "12 deny and 6 conditional-allow decisions in the last 7 days. 4 goal-hijack violations unresolved, directly impacting OWASP ASI compliance." },
  { icon: "umbrella", bg: "var(--amber-tint)", fg: "var(--amber)", num: "34%", delta: "6%", dir: "down", label: "Enforce Coverage Gap",
    sub: "34% of agent-to-resource edges have no enforcement policy. Underwriter platform and fraud-models are the largest uncovered surfaces." },
  { icon: "heartShield", bg: "var(--green-tint)", fg: "var(--green)", num: "82%", delta: "4%", dir: "up", label: "Access Policy Health",
    sub: "82% of policies pass all design guardrails. 3 policies flagged for missing mandatory conditions, 2 for conflicting permit/forbid effects." },
];

const COMPLIANCE_DOT = {
  "OWASP ASI": "#16A34A", "NIST AI-RMF": "#2563EB", "MAESTRO": "#7C3AED", "HIPAA": "#EA580C", "SOX": "#D97706",
  "NIST 800-53": "#0D9488", "EU AI Act": "#7C3AED",
};

const RUNTIME = {
  filters: ["All", "OWASP ASI", "NIST AI-RMF", "MAESTRO", "HIPAA", "SOX"],
  rows: [
    { name: "Global Baseline (All) : Minimum Trust Score", tags: ["OWASP ASI", "NIST AI-RMF", "MAESTRO"], n: 2 },
    { name: "Global Baseline (Agent) : Threat Protection", tags: ["OWASP ASI", "MAESTRO"], n: 1 },
    { name: "Behavioral Monitoring (Agent) : Drift & Anomaly", tags: ["OWASP ASI", "MAESTRO"], n: 2 },
    { name: "Data Protection (All) : PII & Sensitive Data", tags: ["HIPAA", "OWASP ASI"], n: 1 },
    { name: "Identity & Trust (All) : Session Decay", tags: ["NIST AI-RMF", "MAESTRO"], n: 2 },
  ],
};
const RISK_SEV_TONE = { Critical: "red", High: "amber", Medium: "blue", Low: "gray" };
const RISK_SEV_HEX = { Critical: "#DC2626", High: "#F59E0B", Medium: "#2563EB", Low: "#98A2B3" };
const SEV_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const HIGH_RISK = {
  filters: ["All", "Critical", "High", "Medium", "Low"],
  rows: [
    { agent: "FinBot", owner: "Alex Turner", agentId: "agt_9f2a41c8", sev: "Critical", signal: "Intent Drift 0.92", last: "2m ago" },
    { agent: "CreditAgent", owner: "David Wilson", agentId: "agt_2b71f8a3", sev: "Critical", signal: "Prompt Injection", last: "8m ago" },
    { agent: "ClaudeCode", owner: "Michael Brown", agentId: "agt_7c10ab93", sev: "High", signal: "Jailbreak Attempts ×3", last: "14m ago" },
    { agent: "Codex", owner: "Emily Johnson", agentId: "agt_d4ee0c21", sev: "Medium", signal: "Tool Misuse 0.61", last: "31m ago" },
    { agent: "Kiro", owner: "Laura Garcia", agentId: "agt_a17e5b09", sev: "Low", signal: "Anomalous Volume", last: "1h ago" },
  ],
};

const INVENTORY = [
  { name: "Commercial Credit Memo Copilot (Microsoft Copilot Studio)", conn: [["box", 1, "var(--blue)"], ["shuffle", 2, "var(--amber)"], ["server", 1, "var(--teal)"]], type: "SaaS", typeTone: "blue", users: 18, app: "Microsoft Copilot Studio", owner: "Lisa Hoffman", brand: "microsoft", status: "Governed" },
  { name: "ReAct Agent", conn: [["shuffle", 1, "var(--amber)"], ["server", 1, "var(--teal)"]], type: "Custom", typeTone: "coral", users: 4, app: "React Agent", owner: "Alex Turner", brand: "langchain", status: "Governed" },
  { name: "underwriting-agent-01", conn: [["box", 2, "var(--blue)"], ["shuffle", 2, "var(--amber)"], ["server", 1, "var(--teal)"]], type: "Custom", typeTone: "coral", users: 5, app: null, owner: "David Wilson", brand: "github", status: "Discovered" },
  { name: "FinBot", conn: [["box", 5, "var(--blue)"], ["shuffle", 3, "var(--amber)"], ["server", 1, "var(--teal)"]], type: "Custom", typeTone: "coral", users: 22, app: null, owner: "Alexis Turner", brand: "github", status: "Discovered" },
  { name: "shipment_supervisor", conn: [["box", 1, "var(--blue)"], ["shuffle", 12, "var(--amber)"], ["server", 1, "var(--teal)"]], type: "Custom", typeTone: "coral", users: 3, app: null, owner: "Laura Garcia", brand: "github", status: "Discovered" },
  { name: "FraudTriageAgent", conn: [["box", 1, "var(--blue)"], ["shuffle", 2, "var(--amber)"], ["server", 1, "var(--teal)"]], type: "Enterprise", typeTone: "purple", users: 14, app: null, owner: "Laura Garcia", brand: "crewai", status: "Discovered" },
  { name: "RelationshipBankerAgent", conn: [["shuffle", 2, "var(--amber)"], ["server", 1, "var(--teal)"]], type: "SaaS", typeTone: "blue", users: 45, app: null, owner: "Emily Johnson", brand: "cloud", status: "Discovered" },
  { name: "Claude Code (Engineering)", conn: [["server", 1, "var(--teal)"]], type: "Coding Agent", typeTone: "amber", users: 85, app: null, owner: "Michael Brown", brand: "anthropic", status: "Discovered" },
];

function KpiCard({ k }) {
  return (
    <div className="card hp-stat">
      <div className="hp-stat-head">
        <div className="hp-stat-ic" style={{ background: k.bg, color: k.fg }}><Icon name={k.icon} size={18} /></div>
        <a className="hp-seelink">See all <Icon name="arrowRight" size={12} /></a>
      </div>
      <div className="hp-stat-num">{k.num}
        <span className={`hp-delta ${k.dir}`}><Icon name={k.dir === "up" ? "arrowUp" : "arrowDown"} size={11} />{k.delta}</span>
      </div>
      <div className="hp-stat-lbl">{k.label}</div>
      <div className="hp-stat-sub">{k.sub}</div>
    </div>
  );
}

function ViolationCard({ title, data }) {
  const [filter, setFilter] = React.useState("All");
  const [scope, setScope] = React.useState("agent");
  const rows = filter === "All" ? data.rows : data.rows.filter((r) => r.tags.some((t) => t.startsWith(filter)));
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="hp-card-head">
        <h3>{title}</h3>
        <div className="hp-runtog">
          <button className={scope === "all" ? "on" : ""} onClick={() => setScope("all")} title="All"><Icon name="shield" size={14} /></button>
          <button className={scope === "agent" ? "on" : ""} onClick={() => setScope("agent")} title="Agent"><Icon name="shieldAlert" size={14} /></button>
        </div>
        <a className="hp-seelink">See all</a>
      </div>
      <div className="hp-fpills">
        {data.filters.map((f) => (
          <button key={f} className={`hp-fpill ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {f !== "All" && <span className="cdot" style={{ background: COMPLIANCE_DOT[f] || "var(--ink-4)" }} />}{f}
          </button>
        ))}
      </div>
      <div>
        {rows.map((r) => (
          <div className="hp-vrow" key={r.name}>
            <div className="hp-vrow-main">
              <div className="hp-vrow-name">{r.name}</div>
              <div className="hp-vrow-tags">
                {r.tags.map((t) => {
                  const base = t.split(":")[0];
                  return <span className="hp-vtag" key={t}><span className="cdot" style={{ background: COMPLIANCE_DOT[base] || "var(--ink-4)" }} />{t}</span>;
                })}
              </div>
            </div>
            <span className={`hp-vcount ${r.n > 0 ? "warn" : "ok"}`}><Icon name="alert" size={12} />{r.n}</span>
            <Icon name="chevRight" size={16} color="var(--ink-4)" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HighRiskAgentsCard({ openPanel }) {
  const [filter, setFilter] = React.useState("All");
  const rows = (filter === "All" ? HIGH_RISK.rows : HIGH_RISK.rows.filter((r) => r.sev === filter))
    .slice().sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev]);
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="hp-card-head">
        <h3>High Risk Agents</h3>
        <a className="hp-seelink" style={{ marginLeft: "auto" }}>See all</a>
      </div>
      <div className="hp-fpills">
        {HIGH_RISK.filters.map((f) => (
          <button key={f} className={`hp-fpill ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {f !== "All" && <span className="cdot" style={{ background: RISK_SEV_HEX[f] || "var(--ink-4)" }} />}{f}
          </button>
        ))}
      </div>
      <div>
        {rows.map((r) => (
          <div className="hp-vrow" key={r.agentId}>
            <div className="hp-vrow-main">
              <div className="hp-vrow-name mono">{r.agentId}</div>
              <div className="hp-vrow-tags">
                <span className="hp-vtag"><span className="cdot" style={{ background: RISK_SEV_HEX[r.sev] }} />{r.agent}</span>
                <span className="hp-vtag">Owner: {r.owner}</span>
                <span className="hp-vtag" style={{ color: "var(--coral-ink)", fontWeight: 600 }}><Icon name="flame" size={12} color="var(--coral)" />{r.signal}</span>
              </div>
            </div>
            <Pill tone={RISK_SEV_TONE[r.sev]} dot>{r.sev}</Pill>
            <Icon name="chevRight" size={16} color="var(--ink-4)" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AaiDashCard({ openPanel, goPolicies }) {
  const rows = [
    { policyId: "AAI-RBP-002", name: "High Denial Rate", trigger: "Runtime", count: 3, age: 47 * 60, just: "6 policy denials in 58s across finbot, uw-01, j.smith" },
    { policyId: "AAI-UAP-001", name: "Prompt Injection Detection", trigger: "Runtime", count: 1, age: 2 * 3600, just: "Injection payload detected in agent input — system prompt override attempt" },
    { policyId: "AAI-RBP-003", name: "Ephemeral Agent Surge", trigger: "Runtime", count: 1, age: 12 * 60, just: "agent:orchestrator spawned 23 sub-agents in 2 min — max is 8 per window" },
    { policyId: "AAI-AIG-003", name: "Incident blast radius", trigger: "Manual", count: 3, age: 86400, just: "INC-4471 — blast radius isolation including access graph manual clip" },
  ];
  return (
    <div className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
      <div className="aai-card-head">
        <div className="t"><Icon name="shieldAlert" size={16} color="var(--amber)" /><span>Adaptive access isolation</span></div>
        <a className="hp-seelink" style={{ marginLeft: "auto" }} onClick={goPolicies}>See all <Icon name="arrowRight" size={12} /></a>
      </div>
      <div className="aai-rows">
        {rows.map((r) => (
          <div className="aai-row" key={r.policyId}>
            <div className="aai-row-l1">
              <span className="aai-row-name" title={r.name}>{r.name}</span>
              <a className="hp-seelink" onClick={() => openPanel(r.policyId)}>Review</a>
            </div>
            <div className="aai-row-pills">
              <Pill tone={TRIGGER_PILL[r.trigger]} dot>{r.trigger}</Pill>
              <Pill tone="gray">{r.count} {r.count === 1 ? "principal" : "principals"}</Pill>
              <Pill tone={timeBadgeTone(r.age)}><Icon name="clock" size={10} /> {formatDuration(r.age)}</Pill>
            </div>
            <div className="aai-row-just">{r.just}</div>
          </div>
        ))}
      </div>
      <div className="aai-foot">
        <div className="aai-foot-grp"><span className="aai-foot-dot" style={{ background: "var(--amber)" }} /><span className="aai-foot-num">24</span><span className="aai-foot-lbl">quarantined</span>
          <span style={{ width: 18, height: 18, borderRadius: 4, display: "grid", placeItems: "center", background: "var(--red-tint)", color: "var(--red)", marginLeft: 2 }}><Icon name="arrowUp" size={11} /></span>
        </div>
        <div className="aai-foot-grp"><span className="aai-foot-dot" style={{ background: "var(--red)" }} /><span className="aai-foot-num">15</span><span className="aai-foot-lbl">awaiting resolution</span></div>
      </div>
    </div>
  );
}

function AgentInventory() {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="hp-card-head">
        <h3>Agent Inventory</h3>
        <a className="hp-seelink" style={{ marginLeft: "auto" }}>See all <Icon name="arrowRight" size={12} /></a>
      </div>
      <table className="tbl">
        <thead>
          <tr><th>Name</th><th>Connections</th><th>Agent Type</th><th className="right">Users</th><th>Apps</th><th>Owner</th><th>Source</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {INVENTORY.map((a) => (
            <tr key={a.name} className="clickable">
              <td style={{ maxWidth: 280 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  <Icon name="chevRight" size={13} color="var(--ink-4)" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 11.5, color: "var(--ink-3)" }}><Icon name="box" size={11} /> Agent</div>
              </td>
              <td>
                <div className="hp-conn-wrap">
                  {a.conn.map(([ic, n, col], i) => (
                    <span key={i} className="hp-inv-conn" style={{ background: "var(--surface-3)", color: col }}><Icon name={ic} size={12} />{n}</span>
                  ))}
                </div>
              </td>
              <td><span className={`hp-agent-type`} style={{ color: `var(--${a.typeTone}-ink, var(--${a.typeTone}))` }}>{a.type}</span></td>
              <td className="right" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{a.users}</td>
              <td>{a.app ? <Pill tone="blue">{a.app}</Pill> : <span style={{ color: "var(--ink-4)" }}>—</span>}</td>
              <td className="sub">{a.owner}</td>
              <td><span style={{ display: "inline-grid", placeItems: "center", width: 26, height: 26 }}><Mark brand={a.brand} size={20} /></span></td>
              <td>
                {a.status === "Governed"
                  ? <span className="hp-status gov"><Icon name="check" size={12} /> Governed</span>
                  : <span className="hp-status disc"><Icon name="search" size={11} /> Discovered</span>}
              </td>
              <td className="right"><button className="hp-manage">{a.status === "Governed" ? "Manage" : "Assign"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Behaviour Anomaly heatmap ---------------- */
const BH_GROUPS = [
  { label: "Intent & Goal", col: "#2563EB", signals: ["Intent Drift", "Goal Hijacking", "Task Scope Creep"] },
  { label: "Action & Tool", col: "#7C3AED", signals: ["Tool / Scope Escalation", "Sequence Anomaly", "Execution Loop / Runaway", "Dormant-Permission Activation"] },
  { label: "Data & Egress", col: "#0D9488", signals: ["Volume / Velocity", "Egress / Exfiltration", "Sensitive-Data Access"] },
  { label: "Identity & Delegation", col: "#EA580C", signals: ["Principal / Actor Mismatch", "Delegation Anomaly", "Shadow / Unregistered Access", "Token Anomaly"] },
  { label: "Trust & Integrity", col: "#F59E0B", signals: ["Trust-Score Decay", "Prompt-Injection Density", "Self-Modification Attempt"] },
  { label: "Temporal", col: "#64748B", signals: ["Off-Hours / Dormant", "Cadence Shift"] },
];
const BH_SIGNALS = BH_GROUPS.flatMap((g) => g.signals);

const BH_AGENTS = [
  { agent: "FinBot", id: "agt_9f2a41c8", comp: 0.90, v: [0.92,0.78,0.55, 0.20,0.15,0.10,0.30, 0.40,0.22,0.81, 0.88,0.25,0.10,0.18, 0.62,0.35,0.20, 0.12,0.28] },
  { agent: "CreditAgent", id: "agt_2b71f8a3", comp: 0.85, v: [0.30,0.74,0.20, 0.15,0.18,0.12,0.10, 0.25,0.30,0.45, 0.20,0.15,0.22,0.28, 0.40,0.91,0.66, 0.10,0.15] },
  { agent: "ClaudeCode", id: "agt_7c10ab93", comp: 0.72, v: [0.42,0.35,0.30, 0.72,0.58,0.80,0.25, 0.30,0.20,0.18, 0.12,0.20,0.15,0.22, 0.30,0.77,0.40, 0.15,0.20] },
  { agent: "FraudTriageAgent", id: "agt_5a3d11e0", comp: 0.69, v: [0.20,0.22,0.25, 0.30,0.28,0.25,0.35, 0.32,0.55,0.40, 0.30,0.79,0.72,0.61, 0.30,0.20,0.18, 0.22,0.25] },
  { agent: "shipment_supervisor", id: "agt_e91c77a4", comp: 0.66, v: [0.22,0.20,0.30, 0.25,0.40,0.68,0.30, 0.62,0.35,0.20, 0.18,0.83,0.30,0.22, 0.28,0.18,0.20, 0.20,0.45] },
  { agent: "RelationshipBankerAgent", id: "agt_a17e5b09", comp: 0.55, v: [0.18,0.15,0.20, 0.22,0.18,0.15,0.66, 0.35,0.28,0.70, 0.25,0.20,0.18,0.24, 0.35,0.12,0.15, 0.75,0.40] },
  { agent: "Codex", id: "agt_d4ee0c21", comp: 0.50, v: [0.25,0.18,0.40, 0.61,0.66,0.35,0.20, 0.22,0.10,0.15, 0.10,0.18,0.12,0.14, 0.20,0.25,0.15, 0.10,0.30] },
  { agent: "Kiro", id: "agt_b8f40c12", comp: 0.36, v: [0.12,0.10,0.18, 0.20,0.25,0.22,0.15, 0.74,0.30,0.20, 0.08,0.12,0.10,0.10, 0.18,0.15,0.08, 0.40,0.68] },
];

function bhBand(v) { return v >= 0.8 ? "Critical" : v >= 0.6 ? "High" : v >= 0.4 ? "Medium" : "Low"; }
function bhHeat(v) {
  if (v < 0.08) return { background: "var(--surface-2)", color: "var(--ink-4)" };
  const alpha = (0.08 + v * 0.88).toFixed(2);
  return { background: `rgba(220,38,38,${alpha})`, color: v >= 0.52 ? "#fff" : "var(--ink-2)" };
}
function bhFmt(v) { return v < 0.05 ? "" : v.toFixed(2).replace(/^0/, ""); }

function BehaviorHeatmap() {
  const rows = BH_AGENTS.slice().sort((a, b) => b.comp - a.comp);
  return (
    <div className="card" style={{ overflow: "hidden", marginTop: 20 }}>
      <div className="hp-card-head">
        <h3>Behaviour Anomaly Analysis</h3>
        <div className="bh-legend" style={{ marginLeft: 14 }}>
          <span>Low</span><span className="bar" /><span>Critical</span>
        </div>
        <a className="hp-seelink" style={{ marginLeft: "auto" }}>See all <Icon name="arrowRight" size={12} /></a>
      </div>
      <div style={{ padding: "8px 20px 4px" }}>
        <div className="help" style={{ fontSize: 12.5 }}>Per-signal behaviour risk across active agents. Composite <b>Behavior Risk</b> bands each agent; click a cell in the full view for the Intent Drift Attribution breakdown.</div>
      </div>
      <div className="bh-scroll">
        <table className="bh-table">
          <thead>
            <tr>
              <th className="bh-corner" rowSpan={2} />
              {BH_GROUPS.map((g) => (
                <th key={g.label} className="bh-group" colSpan={g.signals.length} style={{ "--g-col": g.col }}>{g.label}</th>
              ))}
              <th className="bh-comp" rowSpan={2} style={{ verticalAlign: "bottom", paddingBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase", color: "var(--ink-3)" }}>Behavior Risk</span>
              </th>
            </tr>
            <tr>
              {BH_SIGNALS.map((s) => (
                <th key={s} className="bh-vlabel"><span>{s}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="bh-agent">
                  <div className="nm">{r.agent}</div>
                  <div className="id">{r.id}</div>
                </td>
                {r.v.map((val, i) => (
                  <td key={i} style={{ padding: 2 }}>
                    <div className="bh-cell" style={bhHeat(val)} title={`${r.agent} · ${BH_SIGNALS[i]}: ${val.toFixed(2)}`}>{bhFmt(val)}</div>
                  </td>
                ))}
                <td className="bh-comp">
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{r.comp.toFixed(2)}</span>
                    <Pill tone={RISK_SEV_TONE[bhBand(r.comp)]} dot>{bhBand(r.comp)}</Pill>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HomeDashboard({ openPanel, goPolicies }) {
  const [mode, setMode] = React.useState("AI");
  return (
    <div className="hp-wrap">
      <div className="hp-greet-row">
        <div className="hp-greet" style={{ flex: 1 }}>
          <h1>Hey, Patrick Fuller!</h1>
          <p>Real-time insights and key performance indicators across all your applications.</p>
        </div>
        <div className="hp-mode">
          <button className={mode === "AI" ? "on" : ""} onClick={() => setMode("AI")}>AI</button>
          <button className={mode === "Application" ? "on" : ""} onClick={() => setMode("Application")}>Application</button>
        </div>
      </div>

      <div className="hp-stats">
        {KPIS.map((k) => <KpiCard key={k.label} k={k} />)}
      </div>

      <AaiDashCard openPanel={openPanel} goPolicies={goPolicies} />

      <div className="hp-cols">
        <ViolationCard title="Runtime Violations" data={RUNTIME} />
        <HighRiskAgentsCard openPanel={openPanel} />
      </div>

      <AgentInventory />
      {window.AgentRiskPosture ? <window.AgentRiskPosture /> : null}
      <BehaviorHeatmap />
    </div>
  );
}

/* ---------------- HomeApp container ---------------- */
function HomeApp({ initialView }) {
  const [view, setView] = React.useState(initialView || "dashboard"); // dashboard | policies | create
  const [policies, setPolicies] = React.useState(window.POLICIES);
  const [openPolicyId, setOpenPolicyId] = React.useState(null);

  const openPanel = (id) => {
    if (view !== "policies" && view !== "dashboard") setView("policies");
    setOpenPolicyId(id);
  };
  const updatePrincipal = (policyId, pid, patch) => {
    setPolicies((ps) => ps.map((p) => p.id !== policyId ? p : { ...p, principals: p.principals.map((pr) => pr.pid === pid ? { ...pr, ...patch } : pr) }));
  };
  const activePolicy = openPolicyId ? policies.find((p) => p.id === openPolicyId) : null;

  return (
    <window.ToastProvider>
      {view === "dashboard" && <HomeDashboard openPanel={openPanel} goPolicies={() => setView("policies")} />}
      {view === "policies" && <window.IsolationPolicies policies={policies} openPanel={openPanel} goCreate={() => setView("create")} goDashboard={() => setView("dashboard")} />}
      {view === "create" && <window.CreatePolicy goPolicies={() => setView("policies")} />}
      {activePolicy && <window.SidePanel policy={activePolicy} onClose={() => setOpenPolicyId(null)} onUpdatePrincipal={updatePrincipal} />}
    </window.ToastProvider>
  );
}

Object.assign(window, { HomeDashboard, HomeApp });
