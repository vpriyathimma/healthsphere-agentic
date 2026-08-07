/* global React, Icon, Pill, Toggle */
/* Access Isolation (AAI) — policy catalog + trigger builder drawer + quarantine queue */

const CATS = [
  { code: "RBP", name: "Runtime Behavioral", n: 5 },
  { code: "IAA", name: "Identity-Aware", n: 5 },
  { code: "MWB", name: "Malicious Website", n: 4 },
  { code: "UAP", name: "Unsafe-Action Prevention", n: 4 },
  { code: "AIG", name: "Agent Identity Governance", n: 7 },
];

const POLICIES = {
  RBP: [
    { id: "AAI-RBP-001", name: "Destructive operation attempt", trig: "RunBash matches destructive class", on: true, active: true },
    { id: "AAI-RBP-002", name: "Scope creep", trig: "drift_score ≥ 60 vs declared scope", on: true, active: true },
    { id: "AAI-RBP-003", name: "Privilege escalation", trig: "sudo / chmod 777 / token export", on: true, active: true },
    { id: "AAI-RBP-004", name: "Model / intent drift", trig: "observed intent ≠ declared scope", on: true, active: true },
    { id: "AAI-RBP-005", name: "Ephemeral agent overcreation", trig: "spawn rate > budget within window", on: true, active: true },
  ],
  IAA: [
    { id: "AAI-IAA-001", name: "Repeated authorization denial", trig: "deny count ≥ 5 within 10m", on: true, active: true },
    { id: "AAI-IAA-002", name: "Impossible travel", trig: "geo velocity anomaly", on: false, active: false },
    { id: "AAI-IAA-003", name: "Dormant identity reactivation", trig: "idle > 30d then high activity", on: false, active: false },
    { id: "AAI-IAA-004", name: "Group membership drift", trig: "AD/Okta group change", on: false, active: false },
    { id: "AAI-IAA-005", name: "Credential reuse", trig: "shared token across hosts", on: false, active: false },
  ],
  MWB: [
    { id: "AAI-MWB-001", name: "Malicious URL", trig: "fetch to flagged domain", on: true, active: true },
    { id: "AAI-MWB-002", name: "MCP untrusted redirect", trig: "MCP server 3xx to non-allowlist", on: true, active: true },
    { id: "AAI-MWB-003", name: "Data exfil endpoint", trig: "POST to unknown egress", on: false, active: false },
    { id: "AAI-MWB-004", name: "Typosquat package", trig: "install of near-name dep", on: false, active: false },
  ],
  UAP: [
    { id: "AAI-UAP-001", name: "Prompt injection detection", trig: "injection_score ≥ 70", on: true, active: true },
    { id: "AAI-UAP-002", name: "HITL timeout escalation", trig: "approval unanswered > expiry", on: true, active: true },
    { id: "AAI-UAP-003", name: "Delegation depth breach", trig: "delegation_depth > 2", on: true, active: true },
    { id: "AAI-UAP-004", name: "Bulk deletion guard", trig: "≥ N file deletes / op", on: false, active: false },
  ],
  AIG: [
    { id: "AAI-AIG-001", name: "Unregistered tool exposure", trig: "tool not in inherited allowlist", on: true, active: true },
    { id: "AAI-AIG-002", name: "Unsigned agent identity", trig: "no SVID + hash fallback abuse", on: false, active: false },
    { id: "AAI-AIG-003", name: "Orphaned agent token", trig: "token outlives owner session", on: false, active: false },
    { id: "AAI-AIG-004", name: "Cross-owner impersonation", trig: "agent acts as foreign dev", on: false, active: false },
    { id: "AAI-AIG-005", name: "Untracked MCP server", trig: "MCP not in registry", on: false, active: false },
    { id: "AAI-AIG-006", name: "SVID rotation failure", trig: "expired SVID still in use", on: false, active: false },
    { id: "AAI-AIG-007", name: "Workload type spoof", trig: "claimed model ≠ attested", on: false, active: false },
  ],
};

const QUEUE = [
  { id: 'Developer::"saisrungaram"', pol: "AAI-IAA-001", state: "Quarantined", tone: "red", elapsed: "14m", mode: "Reviewer Approval" },
  { id: 'Developer::"r.delgado"', pol: "AAI-RBP-001", state: "Awaiting resolution", tone: "amber", elapsed: "1h 02m", mode: "Manual Admin Grant" },
  { id: 'Developer::"k.lindqvist"', pol: "AAI-UAP-001", state: "In certification", tone: "purple", elapsed: "3h 40m", mode: "Certification campaign" },
  { id: 'Developer::"t.abara"', pol: "AAI-IAA-001", state: "Auto-restoring", tone: "blue", elapsed: "restores in 6m", mode: "Auto-Restore (30m)" },
];

function ShieldHeader() {
  return (
    <div style={{ borderRadius: 16, padding: "22px 24px", marginBottom: 18, position: "relative", overflow: "hidden",
      background: "linear-gradient(110deg, #2563EB 0%, #5b46e8 55%, #7C3AED 100%)" }}>
      <div style={{ position: "absolute", right: -30, top: -40, opacity: 0.16 }}>
        <Icon name="shield" size={200} color="#fff" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,.18)", display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>
          <Icon name="shield" size={24} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Adaptive Access Isolation</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.85)" }}>Policy-driven developer-access clipping · 12 of 25 controls active for coding agents</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 16, position: "relative" }}>
          {[["12", "Active policies"], ["4", "Clipped now"], ["2", "Clipping primitives"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{v}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.8)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TriggerDrawer({ policy, onClose }) {
  const [mode, setMode] = React.useState("Reviewer Approval");
  const modes = [
    { k: "Auto-Restore", d: "Reinstate automatically after a timer." },
    { k: "Manual Admin Grant", d: "Admin manually lifts the clip." },
    { k: "Reviewer Approval", d: "Designated reviewer approves reinstatement." },
    { k: "Certification campaign", d: "Certifier attests before restore." },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(11,18,32,.32)", zIndex: 40 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 460, background: "#fff", zIndex: 41, boxShadow: "var(--shadow-drawer)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div className="mono" style={{ fontSize: 11.5, color: "var(--blue)", fontWeight: 700 }}>{policy.id}</div>
            <div className="section-title" style={{ marginTop: 2 }}>{policy.name}</div>
          </div>
          <button className="kebab" style={{ marginLeft: "auto" }} onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 22 }}>
          {/* trigger */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Clip condition</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13.5, color: "var(--ink-2)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
              <span>Clip when</span>
              <span className="selchip" style={{ height: 32 }}>policy denial count</span>
              <span>≥</span>
              <input defaultValue="5" className="mono" style={{ width: 48, height: 32, textAlign: "center", border: "1px solid var(--border-strong)", borderRadius: 7, fontSize: 13, fontWeight: 600 }} />
              <span>within</span>
              <input defaultValue="10" className="mono" style={{ width: 48, height: 32, textAlign: "center", border: "1px solid var(--border-strong)", borderRadius: 7, fontSize: 13, fontWeight: 600 }} />
              <span className="selchip" style={{ height: 32 }}>minutes</span>
            </div>
          </div>

          {/* clipped identity */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Clipped identity</div>
            <div style={{ display: "flex", alignItems: "center", gap: 11, border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", background: "var(--surface-2)" }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--blue-tint)", color: "var(--blue-700)", display: "grid", placeItems: "center" }}><Icon name="user" size={17} /></span>
              <div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Developer</div>
                <div className="help" style={{ fontSize: 11.5 }}>read-only — resolves to <span className="mono">Developer::"&lt;osUser&gt;"</span></div>
              </div>
              <Pill tone="gray" style={{ marginLeft: "auto" }}>Locked</Pill>
            </div>
            <div className="help" style={{ marginTop: 8, display: "flex", gap: 7 }}>
              <Icon name="info" size={15} color="var(--ink-4)" /> Subagents are ephemeral and controlled at spawn, not quarantined.
            </div>
          </div>

          {/* resolution */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Resolution mode</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {modes.map((m) => (
                <button key={m.k} onClick={() => setMode(m.k)} style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", textAlign: "left",
                  border: `1.5px solid ${mode === m.k ? "var(--blue)" : "var(--border-strong)"}`, borderRadius: 12,
                  background: mode === m.k ? "var(--blue-tint)" : "#fff", cursor: "pointer" }}>
                  <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${mode === m.k ? "var(--blue)" : "var(--border-strong)"}`, display: "grid", placeItems: "center", flex: "none" }}>
                    {mode === m.k && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue)" }} />}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{m.k}</div>
                    <div className="help" style={{ fontSize: 11.5 }}>{m.d}</div>
                  </div>
                </button>
              ))}
            </div>
            {mode === "Auto-Restore" && (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="help">Restore after</span>
                <input defaultValue="30" className="mono" style={{ width: 56, height: 32, textAlign: "center", border: "1px solid var(--border-strong)", borderRadius: 7, fontSize: 13, fontWeight: 600 }} />
                <span className="help">minutes</span>
              </div>
            )}
            {mode === "Certification campaign" && (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="help">Certifier</span>
                <input defaultValue="security-reviewers@acme.io" className="mono" style={{ flex: 1, height: 32, border: "1px solid var(--border-strong)", borderRadius: 7, fontSize: 12, padding: "0 10px" }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-text" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onClose}>Save policy</button>
        </div>
      </div>
    </>
  );
}

function AccessIsolation() {
  const [cat, setCat] = React.useState("RBP");
  const [edit, setEdit] = React.useState(null);
  const list = POLICIES[cat];
  return (
    <div style={{ padding: 28 }}>
      <ShieldHeader />

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, marginBottom: 16 }}>
        {/* category rail */}
        <div className="card" style={{ padding: 8, alignSelf: "start" }}>
          <div className="eyebrow" style={{ padding: "8px 10px 6px" }}>Policy catalog</div>
          {CATS.map((c) => {
            const on = c.code === cat;
            const activeCount = POLICIES[c.code].filter((p) => p.active).length;
            return (
              <button key={c.code} onClick={() => setCat(c.code)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 9,
                border: 0, background: on ? "var(--blue-tint)" : "transparent", textAlign: "left", cursor: "pointer", marginBottom: 2 }}>
                <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 6px", borderRadius: 5, background: on ? "var(--blue)" : "var(--surface-3)", color: on ? "#fff" : "var(--ink-3)" }}>{c.code}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: on ? "var(--blue-700)" : "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div className="help" style={{ fontSize: 10.5 }}>{activeCount} active · {c.n} total</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* policy list */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <div className="section-title">{CATS.find((c) => c.code === cat).name}</div>
            <span className="help" style={{ marginLeft: 10 }}>· {cat}</span>
          </div>
          {list.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: i < list.length - 1 ? "1px solid var(--border)" : 0, opacity: p.active ? 1 : 0.62 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600, flex: "none", whiteSpace: "nowrap" }}>{p.id}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>{p.name}</span>
                  {!p.active && <span className="pill pill-gray" style={{ height: 20, fontSize: 10.5 }}>Requires Identity Store</span>}
                </div>
                <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3 }}>{p.trig}</div>
              </div>
              {p.active && <button className="btn btn-ghost btn-sm" onClick={() => setEdit(p)}>Edit trigger</button>}
              <PolicyToggle initial={p.on && p.active} disabled={!p.active} />
            </div>
          ))}
        </div>
      </div>

      {/* quarantine queue */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <div className="section-title">Quarantine Queue</div>
          <span className="pill pill-red" style={{ marginLeft: 10 }}>{QUEUE.length} clipped</span>
          <span className="help" style={{ marginLeft: "auto" }}>Developer-scoped · subagents never quarantined</span>
        </div>
        <table className="tbl">
          <thead><tr><th>Identity</th><th>Trigger policy</th><th>State</th><th>Elapsed</th><th>Resolution mode</th><th className="right">Action</th></tr></thead>
          <tbody>
            {QUEUE.map((q) => (
              <tr key={q.id}>
                <td><span className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{q.id}</span></td>
                <td><span className="mono" style={{ fontSize: 11.5, color: "var(--blue)", fontWeight: 600 }}>{q.pol}</span></td>
                <td><Pill tone={q.tone} dot>{q.state}</Pill></td>
                <td className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{q.elapsed}</td>
                <td className="sub" style={{ fontSize: 12.5 }}>{q.mode}</td>
                <td className="right"><button className="btn btn-ghost btn-sm">Reinstate (HITL)</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && <TriggerDrawer policy={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function PolicyToggle({ initial, disabled }) {
  const [on, setOn] = React.useState(initial);
  return <button className={`toggle ${on ? "on" : ""}`} disabled={disabled} onClick={() => !disabled && setOn(!on)} style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : null} />;
}

window.AccessIsolation = AccessIsolation;
