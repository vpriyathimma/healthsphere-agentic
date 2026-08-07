/* global React, Icon, Pill, Toggle */
/* Settings — registration & risky-action detection */

function SettingsCard({ title, subtitle, children }) {
  return (
    <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
        <div className="section-title">{title}</div>
        {subtitle && <div className="help" style={{ marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderBottom: last ? 0 : "1px solid var(--border)" }}>
      <div style={{ flex: 1 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>{children}</div>
    </div>
  );
}

const DETECTORS = [
  { name: "Prompt Injection Detection", desc: "Score every prompt and tool result for injection.", on: true },
  { name: "Intent Drift Attribution", desc: "Compare observed intent against declared scope and attribute drift.", on: true },
  { name: "Commands Classification", desc: "Classify RunBash commands as safe, restricted, or destructive.", on: true, dev: true },
  { name: "File Sensitivity", desc: "Gate reads/writes by file_zone classification.", on: true, dev: true },
  { name: "Quarantine Access", desc: "Quarantine developers on repeated authorization denials.", on: true },
];

function Detector({ d }) {
  const [on, setOn] = React.useState(d.on);
  return (
    <Row label={
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{d.name}</div>
        <div className="help" style={{ marginTop: 2 }}>{d.desc}</div>
      </div>
    }>
      {d.dev && (
        <span className="help" style={{ fontSize: 12, color: on ? "var(--ink-3)" : "var(--amber-ink)" }}>
          {on
            ? <>Configured in <a href="#" style={{ color: "var(--blue)", fontWeight: 600, textDecoration: "none" }}>Developer Integration</a></>
            : "Disables its config in Developer Integration"}
        </span>
      )}
      <Toggle on={on} onClick={() => setOn(!on)} />
    </Row>
  );
}

const HITL_MAP = [
  { os: "saisrungaram", email: "sai.s@acme.io" },
  { os: "amartya.k", email: "amartya.k@acme.io" },
  { os: "d.okonkwo", email: "d.okonkwo@acme.io" },
  { os: "l.nakamura", email: "l.nakamura@acme.io" },
];

function SettingsTab() {
  const [danger, setDanger] = React.useState(false);
  return (
    <div style={{ padding: 28, maxWidth: 980 }}>
      {/* Policy Store */}
      <SettingsCard title="Policy Store" subtitle="Where this workload's policies are authored and published.">
        <Row label={<span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Policy Store Type</span>}>
          <Pill tone="purple">Cedar</Pill><span className="help">read-only</span>
        </Row>
        <Row label={<span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Policy Publish Destination</span>}>
          <button className="selchip">Reva Managed</button>
        </Row>
        <Row last label={<span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Schema Version</span>}>
          <Pill tone="blue">v7</Pill>
          <a href="#" className="help" style={{ color: "var(--blue)", fontWeight: 600, textDecoration: "none" }}>View schema →</a>
        </Row>
      </SettingsCard>

      {/* Security Settings */}
      <SettingsCard title="Security Settings" subtitle="Detection capabilities that feed Cedar evaluation. Enabled by default.">
        {DETECTORS.map((d, i) => <Detector key={d.name} d={d} />)}
      </SettingsCard>

      {/* Identity */}
      <SettingsCard title="Identity" subtitle="Agent identity attestation and approver mapping.">
        <Row label={<span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>SPIFFE / SPIRE Status</span>}>
          <Pill tone="green" dot>SVID active</Pill>
          <span className="help">hash fallback for unsigned agents</span>
        </Row>
        <div style={{ padding: "4px 20px 16px" }}>
          <div className="eyebrow" style={{ fontSize: 10.5, margin: "10px 0" }}>HITL email mapping</div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <table className="tbl">
              <thead><tr><th>osUser</th><th>Approver email</th><th className="right"></th></tr></thead>
              <tbody>
                {HITL_MAP.map((m, i) => (
                  <tr key={m.os}>
                    <td className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{m.os}</td>
                    <td className="mono" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{m.email}</td>
                    <td className="right"><button className="btn btn-text btn-sm">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SettingsCard>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: "#F3C9C9", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="alert" size={18} color="var(--red)" />
          <div className="section-title" style={{ color: "var(--red)" }}>Danger Zone</div>
        </div>
        <Row last label={
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Disable governance for this workload</div>
            <div className="help" style={{ marginTop: 2 }}>All Claude Code prompts and tool calls will bypass Cedar enforcement.</div>
          </div>
        }>
          <button className="btn btn-sm" style={{ background: "#fff", color: "var(--red)", border: "1px solid #F3C9C9" }} onClick={() => setDanger(true)}>Disable governance</button>
        </Row>
      </div>

      {danger && (
        <>
          <div onClick={() => setDanger(false)} style={{ position: "fixed", inset: 0, background: "rgba(11,18,32,.4)", zIndex: 40 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 440, background: "#fff", borderRadius: 16, zIndex: 41, boxShadow: "var(--shadow-pop)", overflow: "hidden" }}>
            <div style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--red-tint)", color: "var(--red)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="alert" size={20} /></span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>Disable governance?</div>
                  <div className="sub" style={{ marginTop: 6, fontSize: 13 }}>Cedar enforcement stops for all developers on this workload. Quarantines remain but new denials won't trigger. This is logged and notifies workload owners.</div>
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn btn-text" onClick={() => setDanger(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => setDanger(false)}>Disable governance</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

window.SettingsTab = SettingsTab;
