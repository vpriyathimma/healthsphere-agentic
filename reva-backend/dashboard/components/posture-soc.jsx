/* global React, Icon, Pill */
/* Reva AISP — Threat & Risk (SOC triage), Data & Sensitivity, Activity, Governance */
const PtState = React.useState;

/* ================= THREAT & RISK ================= */
function PsThreat({ ctx }) {
  const { PS_DETECTIONS, PS_BANDS, PS_BAND } = window.PS;
  const [selId, setSelId] = PtState(PS_DETECTIONS[0].id);
  const [statusFilter, setStatusFilter] = PtState("open");
  const sel = PS_DETECTIONS.find((d) => d.id === selId);

  const funnel = {}; PS_BANDS.forEach((b) => funnel[b] = PS_DETECTIONS.filter((d) => d.band === b).length);
  const open = PS_DETECTIONS.filter((d) => d.status === "open").length;
  const resolved = PS_DETECTIONS.filter((d) => d.status === "resolved").length;
  const list = PS_DETECTIONS.filter((d) => statusFilter === "all" || d.status === statusFilter);

  return (
    <div style={{ padding: 28 }}>
      {/* funnel */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <div className="section-title" style={{ fontSize: 14.5 }}>Severity Funnel</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
            <span style={{ fontSize: 13 }}><b style={{ color: "var(--red)", fontSize: 18 }}>{open}</b> <span className="muted">open</span></span>
            <span style={{ fontSize: 13 }}><b style={{ color: "var(--green)", fontSize: 18 }}>{resolved}</b> <span className="muted">resolved</span></span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
          {PS_BANDS.map((b) => (
            <div key={b} style={{ border: `1px solid ${PS_BAND[b].c}33`, borderRadius: 10, padding: "12px 14px", background: PS_BAND[b].t + "80" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: PS_BAND[b].c }} /><span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>{PS_BAND[b].label}</span></div>
              <div style={{ fontSize: 24, fontWeight: 700, color: PS_BAND[b].c, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{funnel[b]}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 1.1fr", gap: 16, alignItems: "start" }}>
        {/* detections feed */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div className="section-title" style={{ fontSize: 14 }}>Detections</div>
            <div className="seg" style={{ marginLeft: "auto" }}>
              {["open", "resolved", "all"].map((s) => <button key={s} className={statusFilter === s ? "active" : ""} onClick={() => setStatusFilter(s)} style={{ textTransform: "capitalize" }}>{s}</button>)}
            </div>
          </div>
          <div style={{ maxHeight: 560, overflowY: "auto" }}>
            {list.map((d, i) => {
              const on = d.id === selId;
              return (
                <div key={d.id} onClick={() => setSelId(d.id)} style={{ display: "flex", gap: 11, padding: "13px 16px", borderTop: i ? "1px solid var(--border)" : 0, cursor: "pointer", background: on ? "var(--blue-tint)" : "transparent", borderLeft: on ? "3px solid var(--blue)" : "3px solid transparent" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: PS_BAND[d.band].c, marginTop: 5, flex: "none" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>{d.id}</span>
                      <BandPill band={d.band} sm />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{d.kind}</div>
                    <div className="sub" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.agent}</div>
                  </div>
                  <div style={{ textAlign: "right", flex: "none" }}>
                    <Pill tone={d.status === "open" ? "red" : "green"} sm>{d.status}</Pill>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 5 }}>{d.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* detail */}
        <div className="card" style={{ overflow: "hidden", position: "sticky", top: 12 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>{sel.id}</span>
              <BandPill band={sel.band} />
              <Pill tone={sel.status === "open" ? "red" : "green"} dot>{sel.status}</Pill>
            </div>
            <h2 style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>{sel.kind}</h2>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
              <KV2 k="Affected agent" v={<a className="hp-seelink" onClick={() => ctx.openAgent(sel.agentId)} style={{ fontSize: 13.5 }}>{sel.agent} <Icon name="arrowRight" size={12} /></a>} />
              <KV2 k="Detection source" v={sel.src} />
              <KV2 k="First seen" v={sel.time} />
              <KV2 k="Severity band" v={PS_BAND[sel.band].label} />
            </div>

            <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 8 }}>Evidence</div>
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 20 }}>{sel.evidence}</div>

            <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 10 }}>Remediation</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {sel.remediation.map((r, i) => {
                const primary = i === 0;
                const danger = /quarantine|confirm|revoke/i.test(r);
                return <button key={r} className={`btn btn-${primary ? (danger ? "danger" : "primary") : "ghost"} btn-sm`}>{r}</button>;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KV2({ k, v }) { return <div><div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 3 }}>{k}</div><div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{v}</div></div>; }

/* ================= DATA & SENSITIVITY ================= */
function PsData({ ctx }) {
  const { PS_AGENTS, PS_LABELS, PS_SENS_INTERACTIONS, PS_BAND } = window.PS;
  const labelKeys = Object.keys(PS_LABELS);
  const oversharing = PS_SENS_INTERACTIONS.filter((s) => s.action === "Oversharing").length + 2;
  const exfil = PS_SENS_INTERACTIONS.filter((s) => /exfil/i.test(s.action)).length + 1;
  const unethical = 1;

  // agents x labels matrix (agents that touch sensitive labels)
  const matrixAgents = PS_AGENTS.filter((a) => a.labels.some((l) => ["highly", "conf", "pii", "pci"].includes(l)));

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
        <PsMetric label="Oversharing events" value={oversharing} icon="users" accent={PS_BAND.anomalous} foot={<span className="help" style={{ fontSize: 11.5 }}>recipients lacking label rights</span>} />
        <PsMetric label="Exfiltration attempts" value={exfil} icon="send" accent={PS_BAND.rogue} foot={<BandPill band="rogue" sm />} />
        <PsMetric label="Unethical interactions" value={unethical} icon="alert" accent={PS_BAND.erratic} foot={<span className="help" style={{ fontSize: 11.5 }}>flagged by Purview</span>} />
      </div>

      {/* agents x labels */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
          <div className="section-title" style={{ fontSize: 14.5 }}>Agents × Sensitivity Labels</div>
          <span className="help" style={{ marginLeft: "auto" }}>EXTRACT rights flagged</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ minWidth: 760 }}>
            <thead>
              <tr><th>Agent</th>{labelKeys.map((l) => <th key={l} style={{ textAlign: "center" }}><LabelChip k={l} sm /></th>)}<th style={{ textAlign: "center" }}>EXTRACT</th></tr>
            </thead>
            <tbody>
              {matrixAgents.map((a) => (
                <tr key={a.id} className="clickable" onClick={() => ctx.openAgent(a.id)}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 9 }}><RiskShield band={a.band} size={18} /><span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{a.name}</span></div></td>
                  {labelKeys.map((l) => (
                    <td key={l} style={{ textAlign: "center" }}>
                      {a.labels.includes(l) ? <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: PS_LABELS[l].c }} /> : <span style={{ color: "var(--border-strong)" }}>·</span>}
                    </td>
                  ))}
                  <td style={{ textAlign: "center" }}>{a.extract ? <Pill tone="red" sm>Yes</Pill> : <span className="muted" style={{ fontSize: 12 }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* top sensitive interactions */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}><div className="section-title" style={{ fontSize: 14.5 }}>Top Sensitive Interactions</div></div>
        <table className="tbl">
          <thead><tr><th>Agent</th><th>Classification</th><th>Action taken</th><th>Risk</th><th>When</th></tr></thead>
          <tbody>
            {[...PS_SENS_INTERACTIONS].sort((a, b) => window.PS.PS_BAND_IDX(b.band) - window.PS.PS_BAND_IDX(a.band)).map((s, i) => (
              <tr key={i} className="clickable" onClick={() => ctx.openAgent(s.agentId)}>
                <td style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13 }}>{s.agent}</td>
                <td><LabelChip k={s.label} sm /></td>
                <td><span style={{ fontWeight: 600, fontSize: 12.5, color: /exfil|overshar/i.test(s.action) ? "var(--red)" : "var(--ink-2)" }}>{s.action}</span><div className="sub" style={{ fontSize: 11.5 }}>{s.detail}</div></td>
                <td><BandPill band={s.band} sm /></td>
                <td className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{s.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= ACTIVITY ================= */
function PsActivity({ ctx }) {
  const events = [
    { kind: "agent-to-tool", agent: "FinBot Underwriter", agentId: "ag-finbot", label: "Invoked underwriting_score()", time: "2m ago", c: "#0A7BD4", icon: "cpu" },
    { kind: "agent-to-agent", agent: "FinBot Underwriter", agentId: "ag-finbot", label: "Delegated to fraud-check sub-agent", time: "9m ago", c: "#7C3AED", icon: "link2" },
    { kind: "data-accessed", agent: "underwriting-agent-01", agentId: "ag-uw01", label: "Read 142 records · Underwriting DB", time: "5m ago", c: "#EA580C", icon: "db" },
    { kind: "human-to-agent", agent: "Claude Code (Engineering)", agentId: "ag-claude", label: "Michael Brown issued a task prompt", time: "12m ago", c: "#0D9488", icon: "user" },
    { kind: "agent-to-human", agent: "Commercial Credit Memo Copilot", agentId: "ag-creditmemo", label: "Returned memo draft to Lisa Hoffman", time: "18m ago", c: "#16A34A", icon: "send" },
    { kind: "agent-to-tool", agent: "shipment_supervisor", agentId: "ag-shipment", label: "Spawned 12 sub-agents (budget exceeded)", time: "1h ago", c: "#DC2626", icon: "shuffle" },
    { kind: "data-accessed", agent: "procurement-copilot", agentId: "ag-procure", label: "Shared Confidential memo to 4 recipients", time: "38m ago", c: "#EA580C", icon: "users" },
  ];
  const [kind, setKind] = PtState("all");
  const kinds = ["all", "agent-to-tool", "agent-to-agent", "data-accessed", "human-to-agent", "agent-to-human"];
  const rows = kind === "all" ? events : events.filter((e) => e.kind === kind);
  return (
    <div style={{ padding: 28 }}>
      <div className="card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="search" style={{ minWidth: 220, height: 36 }}><Icon name="search" size={15} color="var(--ink-4)" /><input placeholder="Search interactions…" /></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: 4 }}>
          {kinds.map((k) => <button key={k} className={`hp-fpill ${kind === k ? "on" : ""}`} onClick={() => setKind(k)} style={{ textTransform: k === "all" ? "none" : "none" }}>{k === "all" ? "All types" : k}</button>)}
        </div>
        <span className="help" style={{ marginLeft: "auto" }}>Last 24h</span>
      </div>
      <div className="card" style={{ padding: "8px 20px" }}>
        {rows.map((e, i) => (
          <div key={i} className="ps-feed-row" onClick={() => ctx.openAgent(e.agentId)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderTop: i ? "1px solid var(--border)" : 0, cursor: "pointer" }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: e.c + "1a", color: e.c, flex: "none" }}><Icon name={e.icon} size={16} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{e.label}</div>
              <div className="help" style={{ fontSize: 11.5 }}>{e.agent} · <span style={{ fontWeight: 600 }}>{e.kind}</span></div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{e.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= GOVERNANCE ================= */
function PsGovernance({ ctx }) {
  const caPolicies = [
    { name: "Require agent Conditional Access", scope: "All agent identities", state: "On", cov: "42 / 48" },
    { name: "Block legacy authentication", scope: "All agents", state: "On", cov: "48 / 48" },
    { name: "Require compliant workload", scope: "Foundry agents", state: "Report-only", cov: "9 / 12" },
    { name: "Session risk control", scope: "High-risk agents", state: "On", cov: "5 / 5" },
  ];
  const reviews = [
    { name: "Q2 Agent Access Review", owner: "Patrick Fuller", due: "in 6 days", progress: 64 },
    { name: "Shadow Agent Reconciliation", owner: "Security Reviewers", due: "in 2 days", progress: 30 },
    { name: "Sponsor Recertification", owner: "Lisa Hoffman", due: "in 11 days", progress: 88 },
  ];
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
            <div className="section-title" style={{ fontSize: 14.5 }}>Conditional Access Policies</div>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}><Icon name="plus" size={14} /> New policy</button>
          </div>
          <table className="tbl">
            <thead><tr><th>Policy</th><th>Scope</th><th>State</th><th className="right">Coverage</th></tr></thead>
            <tbody>
              {caPolicies.map((p) => (
                <tr key={p.name}>
                  <td style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13 }}>{p.name}</td>
                  <td className="sub" style={{ fontSize: 12.5 }}>{p.scope}</td>
                  <td><Pill tone={p.state === "On" ? "green" : "amber"} dot>{p.state}</Pill></td>
                  <td className="right mono" style={{ fontSize: 12, fontWeight: 600 }}>{p.cov}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}><div className="section-title" style={{ fontSize: 14.5 }}>Access Reviews</div></div>
          <div style={{ padding: "6px 18px 14px" }}>
            {reviews.map((r, i) => (
              <div key={r.name} style={{ padding: "13px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{r.name}</span>
                  <span className="help" style={{ marginLeft: "auto", fontSize: 11.5 }}>due {r.due}</span>
                </div>
                <div className="sub" style={{ fontSize: 12, marginTop: 2 }}>{r.owner}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--surface-3)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${r.progress}%`, background: r.progress > 75 ? "var(--green)" : "var(--blue)" }} /></div>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)" }}>{r.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden", marginTop: 16 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}><div className="section-title" style={{ fontSize: 14.5 }}>Sponsor Lifecycle</div></div>
        <table className="tbl">
          <thead><tr><th>Sponsor</th><th>Agents owned</th><th>Status</th><th>Next recert</th></tr></thead>
          <tbody>
            {[["Alex Turner", 2, "Active", "Jul 2026"], ["Lisa Hoffman", 1, "Active", "Aug 2026"], ["David Wilson", 1, "Review due", "Jun 2026"], ["Unowned", 1, "No sponsor", "—"]].map((r) => (
              <tr key={r[0]}>
                <td style={{ fontWeight: 600, color: r[0] === "Unowned" ? "var(--coral-ink)" : "var(--ink)", fontSize: 13 }}>{r[0]}</td>
                <td className="mono" style={{ fontWeight: 600 }}>{r[1]}</td>
                <td><Pill tone={r[2] === "Active" ? "green" : r[2] === "Review due" ? "amber" : "red"} dot>{r[2]}</Pill></td>
                <td className="sub" style={{ fontSize: 12.5 }}>{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { PsThreat, PsData, PsActivity, PsGovernance });
