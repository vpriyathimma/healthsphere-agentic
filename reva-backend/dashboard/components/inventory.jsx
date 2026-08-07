/* global React, Icon, Pill, Search, Segmented, SelectChip, TrustMeter, Kebab */
/* Inventory — roster master/detail with Session/System/Identity pivots */

const ROSTER = [
  {
    id: 'Developer::"saisrungaram"', kind: "dev", email: "sai.s@acme.io", model: "claude-opus-4-8[1m]",
    os: "macOS 15.3", sessions: 3, trust: 58, state: "Quarantined", owner: "Patrick Fuller",
    svid: "spiffe://acme.io/dev/saisrungaram", svidFallback: false,
    budget: { used: 0, max: 5, note: "blocked — trust 58 ≤ 60" },
    tools: ["ReadFile", "EditFile", "RunBash (safe)", "WriteFile"],
    mcp: ["github-mcp", "jira-mcp"], gh: "ghs_••••••8f2a (brokered)",
    decisions: [
      { t: "2m", a: "RunBash", e: "Deny", r: "rm -rf flagged destructive" },
      { t: "9m", a: "ReadFile", e: "Deny", r: "secrets/** — Secret zone" },
      { t: "14m", a: "SpawnAgent", e: "Deny", r: "trust 58 ≤ 60" },
    ],
  },
  {
    id: 'Developer::"amartya.k"', kind: "dev", email: "amartya.k@acme.io", model: "claude-sonnet-4-6",
    os: "Ubuntu 24.04", sessions: 2, trust: 64, state: "Spawn-capped", owner: "Patrick Fuller",
    svid: "spiffe://acme.io/dev/amartya.k", svidFallback: false,
    budget: { used: 5, max: 5, note: "budget reached this session" },
    tools: ["ReadFile", "EditFile", "RunBash (safe)", "WriteFile", "SpawnAgent"],
    mcp: ["github-mcp"], gh: "ghs_••••••2b71 (brokered)",
    decisions: [
      { t: "5m", a: "SpawnAgent", e: "Deny", r: "spawn budget 5/5" },
      { t: "21m", a: "EditFile", e: "Permit", r: "Internal zone" },
    ],
  },
  {
    id: 'Agent::"saisrungaram:agent-9f2a…"', kind: "agent", email: "sai.s@acme.io", model: "claude-opus-4-8[1m]",
    os: "macOS 15.3", sessions: 1, trust: 72, state: "Active", owner: "saisrungaram",
    svid: "agent-hash:9f2a4c1e (fallback)", svidFallback: true,
    budget: { used: 0, max: 0, note: "ephemeral — not spawn-capable" },
    tools: ["ReadFile", "EditFile (scoped)"],
    mcp: ["github-mcp (read)"], gh: "inherited",
    decisions: [
      { t: "1m", a: "ReadFile", e: "Permit", r: "Internal zone" },
      { t: "3m", a: "EditFile", e: "Permit", r: "declared scope ok" },
    ],
  },
  {
    id: 'Developer::"d.okonkwo"', kind: "dev", email: "d.okonkwo@acme.io", model: "claude-sonnet-4-6",
    os: "Windows 11", sessions: 1, trust: 78, state: "Active", owner: "Patrick Fuller",
    svid: "spiffe://acme.io/dev/d.okonkwo", svidFallback: false,
    budget: { used: 2, max: 5, note: "" },
    tools: ["ReadFile", "EditFile", "RunBash (safe)", "WriteFile", "SpawnAgent"],
    mcp: ["github-mcp", "jira-mcp", "postgres-mcp"], gh: "ghs_••••••c4d0 (brokered)",
    decisions: [
      { t: "8m", a: "SpawnAgent", e: "Permit", r: "2/5 used" },
      { t: "12m", a: "MCPWrite", e: "HITL", r: "awaiting #ai-approvals" },
    ],
  },
  {
    id: 'Developer::"l.nakamura"', kind: "dev", email: "l.nakamura@acme.io", model: "claude-opus-4-8[1m]",
    os: "macOS 15.2", sessions: 4, trust: 85, state: "Active", owner: "Patrick Fuller",
    svid: "spiffe://acme.io/dev/l.nakamura", svidFallback: false,
    budget: { used: 1, max: 5, note: "" },
    tools: ["ReadFile", "EditFile", "RunBash (safe)", "WriteFile", "SpawnAgent"],
    mcp: ["github-mcp", "jira-mcp"], gh: "ghs_••••••a17e (brokered)",
    decisions: [
      { t: "4m", a: "WriteFile", e: "Permit", r: "Internal zone" },
      { t: "16m", a: "ReadFile", e: "Permit", r: "Public zone" },
    ],
  },
  {
    id: 'Agent::"d.okonkwo:agent-2b71…"', kind: "agent", email: "d.okonkwo@acme.io", model: "claude-haiku-4-3",
    os: "Windows 11", sessions: 1, trust: 69, state: "Active", owner: "d.okonkwo",
    svid: "agent-hash:2b71f8a3 (fallback)", svidFallback: true,
    budget: { used: 0, max: 0, note: "ephemeral — not spawn-capable" },
    tools: ["ReadFile"],
    mcp: ["github-mcp (read)"], gh: "inherited",
    decisions: [{ t: "6m", a: "ReadFile", e: "Permit", r: "Internal zone" }],
  },
  {
    id: 'Developer::"r.delgado"', kind: "dev", email: "r.delgado@acme.io", model: "claude-opus-4-8[1m]",
    os: "macOS 15.3", sessions: 1, trust: 52, state: "Quarantined", owner: "Patrick Fuller",
    svid: "spiffe://acme.io/dev/r.delgado", svidFallback: false,
    budget: { used: 0, max: 5, note: "blocked — trust 52 ≤ 60" },
    tools: ["ReadFile", "EditFile", "RunBash (safe)"],
    mcp: ["github-mcp"], gh: "ghs_••••••5a3d (brokered)",
    decisions: [
      { t: "3m", a: "RunBash", e: "Deny", r: "git reset --hard destructive" },
      { t: "7m", a: "RunBash", e: "Deny", r: "kubectl delete destructive" },
      { t: "11m", a: "SpawnAgent", e: "Deny", r: "trust 52 ≤ 60" },
    ],
  },
  {
    id: 'Developer::"k.lindqvist"', kind: "dev", email: "k.lindqvist@acme.io", model: "claude-sonnet-4-6",
    os: "Ubuntu 24.04", sessions: 2, trust: 55, state: "Quarantined", owner: "Patrick Fuller",
    svid: "spiffe://acme.io/dev/k.lindqvist", svidFallback: false,
    budget: { used: 0, max: 5, note: "blocked — trust 55 ≤ 60" },
    tools: ["ReadFile", "EditFile", "RunBash (safe)", "WriteFile"],
    mcp: ["github-mcp", "jira-mcp"], gh: "ghs_••••••e91c (brokered)",
    decisions: [
      { t: "1m", a: "ReadFile", e: "Deny", r: "prompt injection (score 74)" },
      { t: "6m", a: "EditFile", e: "Deny", r: "scope drift" },
    ],
  },
  {
    id: 'Developer::"j.park"', kind: "dev", email: "j.park@acme.io", model: "claude-sonnet-4-6",
    os: "macOS 15.2", sessions: 1, trust: 66, state: "Spawn-capped", owner: "Patrick Fuller",
    svid: "spiffe://acme.io/dev/j.park", svidFallback: false,
    budget: { used: 5, max: 5, note: "budget reached this session" },
    tools: ["ReadFile", "EditFile", "RunBash (safe)", "WriteFile", "SpawnAgent"],
    mcp: ["github-mcp"], gh: "ghs_••••••7d20 (brokered)",
    decisions: [
      { t: "4m", a: "SpawnAgent", e: "Deny", r: "spawn budget 5/5" },
      { t: "10m", a: "ReadFile", e: "Permit", r: "Internal zone" },
    ],
  },
  {
    id: 'Developer::"m.alvarez"', kind: "dev", email: "m.alvarez@acme.io", model: "claude-opus-4-8[1m]",
    os: "Windows 11", sessions: 3, trust: 81, state: "Active", owner: "Patrick Fuller",
    svid: "spiffe://acme.io/dev/m.alvarez", svidFallback: false,
    budget: { used: 2, max: 5, note: "" },
    tools: ["ReadFile", "EditFile", "RunBash (safe)", "WriteFile", "SpawnAgent"],
    mcp: ["github-mcp", "jira-mcp", "postgres-mcp"], gh: "ghs_••••••b8f4 (brokered)",
    decisions: [
      { t: "5m", a: "EditFile", e: "Permit", r: "Internal zone" },
      { t: "18m", a: "SpawnAgent", e: "Permit", r: "2/5 used" },
    ],
  },
  {
    id: 'Agent::"amartya.k:agent-7c10…"', kind: "agent", email: "amartya.k@acme.io", model: "claude-sonnet-4-6",
    os: "Ubuntu 24.04", sessions: 1, trust: 61, state: "Active", owner: "amartya.k",
    svid: "agent-hash:7c10ab93 (fallback)", svidFallback: true,
    budget: { used: 0, max: 0, note: "ephemeral — not spawn-capable" },
    tools: ["ReadFile", "EditFile (scoped)"],
    mcp: ["github-mcp (read)"], gh: "inherited",
    decisions: [
      { t: "2m", a: "EditFile", e: "Permit", r: "declared scope ok" },
      { t: "9m", a: "SpawnAgent", e: "Deny", r: "scope drift → review" },
    ],
  },
];

const STATE_TONE = { "Active": "green", "Spawn-capped": "amber", "Quarantined": "red" };

function RosterTable({ rows, selectedId, onSelect }) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>Identity</th><th>Authenticated As</th><th>Model</th><th>OS</th>
            <th className="right">Sess.</th><th>Trust</th><th>State</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={`clickable ${r.id === selectedId ? "selected" : ""}`} onClick={() => onSelect(r.id)}>
              <td style={{ maxWidth: 230 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, flex: "none", display: "grid", placeItems: "center",
                    background: r.kind === "dev" ? "var(--blue-tint)" : "var(--purple-tint)", color: r.kind === "dev" ? "var(--blue-700)" : "var(--purple)" }}>
                    <Icon name={r.kind === "dev" ? "user" : "bot"} size={15} />
                  </span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.id}</span>
                </div>
              </td>
              <td className="sub">{r.email}</td>
              <td><span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{r.model}</span></td>
              <td className="sub">{r.os}</td>
              <td className="right mono" style={{ fontWeight: 600 }}>{r.sessions}</td>
              <td><TrustMeter value={r.trust} /></td>
              <td><Pill tone={STATE_TONE[r.state]} dot>{r.state}</Pill></td>
              <td className="right"><Kebab /></td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-4)" }}>No identities match this filter.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Inventory() {
  const [pivot, setPivot] = React.useState("Identity");
  const [selId, setSelId] = React.useState(ROSTER[0].id);
  const row = ROSTER.find((r) => r.id === selId) || ROSTER[0];
  return (
    <div style={{ padding: 28 }}>
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Search placeholder="Search identities, agents, emails…" width={320} />
        <Segmented options={["Session", "System", "Identity"]} value={pivot} onChange={setPivot} />
        <SelectChip>Type: All</SelectChip>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <span className="help">{ROSTER.length} principals · grouped by {pivot}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "start" }}>
        <RosterTable rows={ROSTER} selectedId={selId} onSelect={setSelId} />
        <AgentDetail row={row} />
      </div>
    </div>
  );
}

function Field({ label, children, mono }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span className="eyebrow" style={{ fontSize: 10.5 }}>{label}</span>
      <span className={mono ? "mono" : ""} style={{ fontSize: mono ? 12.5 : 13.5, color: "var(--ink)", fontWeight: mono ? 600 : 500, wordBreak: "break-all" }}>{children}</span>
    </div>
  );
}

function AgentDetail({ row }) {
  const quarantined = row.state === "Quarantined";
  const [graphOpen, setGraphOpen] = React.useState(false);
  /* Map roster id to discovery agent id for the drawer */
  const agentIdMap = {
    'Agent::"saisrungaram:agent-9f2a…"': "agent-clinical-orders",
    'Agent::"d.okonkwo:agent-2b71…"': "agent-records",
    'Agent::"amartya.k:agent-7c10…"': "agent-admissions",
  };
  const discoveryAgentId = agentIdMap[row.id] || "agent-clinical-orders";
  return (
    <div className="card" style={{ overflow: "hidden", position: "sticky", top: 60 }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 11 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, flex: "none", display: "grid", placeItems: "center",
          background: row.kind === "dev" ? "var(--blue-tint)" : "var(--purple-tint)", color: row.kind === "dev" ? "var(--blue-700)" : "var(--purple)" }}>
          <Icon name={row.kind === "dev" ? "user" : "bot"} size={19} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="section-title" style={{ fontSize: 14.5 }}>{row.kind === "dev" ? "Developer Details" : "Agent Details"}</div>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.id}</div>
        </div>
        {row.kind === "agent" && (
          <button className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: 5, height: 30 }} onClick={() => setGraphOpen(true)}>
            <Icon name="sitemap" size={14} color="var(--blue-700)" /> Access Graph
          </button>
        )}
      </div>
      {graphOpen && window.AccessGraphDrawer && React.createElement(window.AccessGraphDrawer, { agentId: discoveryAgentId, onClose: () => setGraphOpen(false) })}

      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16, maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
        {quarantined && (
          <div style={{ background: "var(--red-tint)", border: "1px solid #F5C2C2", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: "#fff", border: "1px solid #F5C2C2", display: "grid", placeItems: "center", flex: "none" }}><Icon name="lock" size={16} color="var(--red)" /></span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--red)" }}>Access Quarantined</div>
                <div style={{ fontSize: 12.5, color: "#B42318", marginTop: 2 }}>Triggered by repeated authorization denials. Access to tools and resources is suspended pending approval.</div>
              </div>
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12, width: "100%", height: 40 }}><Icon name="send" size={15} /> Restore Access</button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Authenticated As">{row.email}</Field>
          <Field label="Owner">{row.owner}</Field>
          <Field label="Model" mono>{row.model}</Field>
          <Field label="Sessions">{row.sessions} active</Field>
        </div>

        <Field label={row.svidFallback ? "Agent ID (SVID fallback)" : "SPIFFE / SVID"} mono>{row.svid}</Field>
        {row.svidFallback && <div className="help" style={{ marginTop: -10, color: "var(--amber-ink)" }}>No SVID issued — using agent-hash fallback.</div>}

        {/* Persistent access */}
        <div>
          <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 9 }}>Persistent Access</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div className="help" style={{ marginBottom: 6 }}>MCP servers</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {row.mcp.map((t) => <span key={t} className="mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "var(--purple-tint)", color: "var(--purple)", fontWeight: 600 }}>{t}</span>)}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="help">Brokered GitHub App token</span>
              <span className="mono" style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--ink-2)" }}>{row.gh}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Inventory = Inventory;
Object.assign(window, { ROSTER, STATE_TONE, RosterTable, AgentDetail });
