/* global React, Icon, Pill, Trend, Donut, SelectChip, Segmented, Search */
/* Insights — AISPM dashboard with integrated, tile-filtered identity roster */

function KpiTile({ label, value, sub, foot, tone, active, onClick }) {
  return (
    <button onClick={onClick} className="kpi" style={{
      textAlign: "left", border: `1.5px solid ${active ? "var(--blue)" : "var(--border)"}`,
      background: active ? "#E8F0FF" : "var(--surface)", borderRadius: "var(--r-lg)",
      boxShadow: active ? "0 0 0 3px rgba(37,99,235,.18)" : "var(--shadow-card)",
      padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4, cursor: "pointer",
      transition: "border-color .15s, box-shadow .15s, background .15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {tone && <span style={{ width: 7, height: 7, borderRadius: "50%", background: `var(--${tone})` }} />}
        <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>{value}</span>
        {sub}
      </div>
      <div style={{ marginTop: 2 }}>{foot}</div>
    </button>
  );
}

function CardHead({ title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
      <div className="section-title">{title}</div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>{right}</div>
    </div>
  );
}

const FILTERS = {
  all:         { label: "All identities",   test: () => true },
  coverage:    { label: "Governed users",   test: (r) => r.kind === "dev" },
  active:      { label: "Active",            test: (r) => r.state === "Active" },
  capped:      { label: "Spawn-capped",      test: (r) => r.state === "Spawn-capped" },
  quarantined: { label: "Quarantined",       test: (r) => r.state === "Quarantined" },
  lowtrust:    { label: "Low trust (≤ 60)",  test: (r) => r.trust <= 60 },
};

function Insights() {
  const ROSTER = window.ROSTER, RosterTable = window.RosterTable, AgentDetail = window.AgentDetail;
  const [by, setBy] = React.useState("Session");
  const [pivot, setPivot] = React.useState("Identity");
  const [filter, setFilter] = React.useState("all");
  const [selId, setSelId] = React.useState(ROSTER[0].id);

  const count = (key) => ROSTER.filter(FILTERS[key].test).length;
  const filtered = ROSTER.filter(FILTERS[filter].test);
  const row = filtered.find((r) => r.id === selId) || filtered[0];

  const pickFilter = (key) => {
    setFilter(key);
    const first = ROSTER.filter(FILTERS[key].test)[0];
    if (first) setSelId(first.id);
  };
  const pickIdentity = (rid) => { setFilter("all"); setSelId(rid); };

  const denyLegend = [
    { label: "Prompt Injection", value: 38, color: "#DC2626" },
    { label: "Intent Drift", value: 24, color: "#F59E0B" },
    { label: "Low Trust", value: 18, color: "#7C3AED" },
    { label: "Quarantine", value: 12, color: "#0EA5E9" },
    { label: "Spawn Budget", value: 8, color: "#64748B" },
  ];
  const highDeny = [
    { id: "saisrungaram", rid: 'Developer::"saisrungaram"', type: "dev", deny: 22, dir: "up", model: "claude-opus-4-8" },
    { id: "k.lindqvist", rid: 'Developer::"k.lindqvist"', type: "dev", deny: 19, dir: "up", model: "claude-sonnet-4-6" },
    { id: "r.delgado", rid: 'Developer::"r.delgado"', type: "dev", deny: 17, dir: "up", model: "claude-opus-4-8" },
    { id: "agent-7c10…", rid: 'Agent::"amartya.k:agent-7c10…"', type: "agent", deny: 14, dir: "down", model: "claude-sonnet-4-6" },
    { id: "j.park", rid: 'Developer::"j.park"', type: "dev", deny: 9, dir: "up", model: "claude-sonnet-4-6" },
  ];
  const usage = [
    { tool: "ReadFile", n: 12840, permit: 99 },
    { tool: "RunBash", n: 6310, permit: 88 },
    { tool: "EditFile", n: 4920, permit: 96 },
    { tool: "WriteFile", n: 3110, permit: 94 },
    { tool: "SpawnAgent", n: 1280, permit: 71 },
    { tool: "MCP*", n: 940, permit: 83 },
  ];
  const maxUsage = Math.max(...usage.map((u) => u.n));

  return (
    <div style={{ padding: 28 }}>
      {/* KPI / filter tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 16 }}>
        <KpiTile label="Governance Coverage" value="42" sub={<span style={{ fontSize: 15, color: "var(--ink-3)", fontWeight: 600 }}>/ 48 users</span>}
          foot={<Pill tone="amber">6 ungoverned</Pill>} active={filter === "coverage"} onClick={() => pickFilter("coverage")} />
        <KpiTile label="Active" tone="green" value={count("active")} foot={<Trend dir="flat">healthy</Trend>} active={filter === "active"} onClick={() => pickFilter("active")} />
        <KpiTile label="Spawn-capped" tone="amber" value={count("capped")} foot={<Trend dir="up">budget reached</Trend>} active={filter === "capped"} onClick={() => pickFilter("capped")} />
        <KpiTile label="Active Quarantines" tone="red" value={count("quarantined")} foot={<Trend dir="up">1 new today</Trend>} active={filter === "quarantined"} onClick={() => pickFilter("quarantined")} />
        <KpiTile label="Low Trust (≤ 60)" tone="red" value={count("lowtrust")} foot={<Trend dir="up">spawning blocked</Trend>} active={filter === "lowtrust"} onClick={() => pickFilter("lowtrust")} />
      </div>

      {/* donut + high deny */}
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <CardHead title="Permit / Deny Rate" right={<><Segmented options={["Session", "System", "Identity"]} value={by} onChange={setBy} /><SelectChip>Last Week</SelectChip></>} />
          <div style={{ display: "flex", alignItems: "center", gap: 28, padding: "20px 22px" }}>
            <Donut size={172} thickness={24}
              segments={[{ value: 78, color: "#16A34A" }, ...denyLegend]}
              center={{ value: "78%", label: "Permit" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-3)", marginBottom: 10 }}>Deny by reason · 22%</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {denyLegend.map((d) => (
                  <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flex: "none" }} />
                    <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{d.label}</span>
                    <span className="mono" style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <CardHead title="Identities with High Deny Rate" right={<button className="btn btn-text btn-sm" onClick={() => pickFilter("all")}>View all →</button>} />
          <div style={{ padding: "6px 8px" }}>
            {highDeny.map((h) => (
              <div key={h.id} className="hd-row" onClick={() => pickIdentity(h.rid)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 10, cursor: "pointer" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", flex: "none",
                  background: h.type === "dev" ? "var(--blue-tint)" : "var(--purple-tint)", color: h.type === "dev" ? "var(--blue-700)" : "var(--purple)" }}>
                  <Icon name={h.type === "dev" ? "user" : "bot"} size={17} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{h.id}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{h.model}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <Trend dir={h.dir}>{h.deny}%</Trend>
                  <div style={{ fontSize: 11, color: "var(--ink-4)" }}>deny rate</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* integrated roster */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div className="section-title">Identities</div>
          {filter !== "all" && (
            <span className="pill pill-blue" style={{ height: 26 }}>
              {FILTERS[filter].label}
              <button onClick={() => setFilter("all")} style={{ border: 0, background: "transparent", padding: 0, marginLeft: 2, display: "grid", placeItems: "center", color: "var(--blue-700)", cursor: "pointer" }}><Icon name="x" size={13} /></button>
            </span>
          )}
          <span className="help">{filtered.length} of {ROSTER.length} principals</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            <Search placeholder="Search identities…" width={240} />
            <Segmented options={["Session", "System", "Identity"]} value={pivot} onChange={setPivot} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "start" }}>
          <RosterTable rows={filtered} selectedId={row ? row.id : null} onSelect={setSelId} />
          {row ? <AgentDetail row={row} /> : <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--ink-4)" }}>No identity selected.</div>}
        </div>
      </div>

      {/* usage bars + guardrail enforcement, matched to the permit/deny grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16 }}>
      <div className="card">
        <CardHead title="Usage by Tool" right={<SelectChip>Last Week</SelectChip>} />
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 15 }}>
          {usage.map((u) => (
            <div key={u.tool} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div className="mono" style={{ width: 92, fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>{u.tool}</div>
              <div style={{ flex: 1, height: 22, background: "var(--surface-3)", borderRadius: 6, overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${(u.n / maxUsage) * 100}%`, background: u.permit < 80 ? "linear-gradient(90deg,#7C3AED,#9061f0)" : "linear-gradient(90deg,#2563EB,#4f80f0)", borderRadius: 6 }} />
              </div>
              <div className="mono" style={{ width: 64, textAlign: "right", fontSize: 12.5, color: "var(--ink)", fontWeight: 700 }}>{u.n.toLocaleString()}</div>
              <div style={{ width: 96, textAlign: "right" }}>
                <Pill tone={u.permit < 80 ? "amber" : "green"}>{u.permit}% permit</Pill>
              </div>
            </div>
          ))}
        </div>
      </div>
      {window.GuardrailEnforcementCard ? <window.GuardrailEnforcementCard /> : null}
      </div>

      <style>{`.hd-row:hover{background:var(--surface-2);} .kpi:hover{border-color:var(--border-strong);}`}</style>
    </div>
  );
}

window.Insights = Insights;
