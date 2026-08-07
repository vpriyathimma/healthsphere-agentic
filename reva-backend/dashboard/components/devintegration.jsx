/* global React, Icon, Toggle */
/* Developer Integration — exactly three accordions */

function Accordion({ title, subtitle, open, onToggle, children, saved }) {
  return (
    <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "18px 20px", background: "transparent", border: 0, textAlign: "left" }}>
        <Icon name={open ? "chevDown" : "chevRight"} size={18} color="var(--ink-3)" />
        <div style={{ flex: 1 }}>
          <div className="section-title">{title}</div>
          {subtitle && <div className="help" style={{ marginTop: 2 }}>{subtitle}</div>}
        </div>
        {saved && <span className="help" style={{ fontSize: 11.5 }}>Last saved {saved}</span>}
      </button>
      {open && <div style={{ borderTop: "1px solid var(--border)" }}>{children}</div>}
    </div>
  );
}

function ChipList({ tone, label, items }) {
  const [chips, setChips] = React.useState(items);
  const [val, setVal] = React.useState("");
  const add = () => { if (val.trim()) { setChips([...chips, val.trim()]); setVal(""); } };
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "var(--surface-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
        <span style={{ width: 8, height: 8, borderRadius: 3, background: `var(--${tone})` }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{label}</span>
        <span className="help" style={{ marginLeft: "auto" }}>{chips.length}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 11 }}>
        {chips.map((c, i) => (
          <span key={c + i} className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, padding: "4px 8px", borderRadius: 7, background: "#fff", border: "1px solid var(--border)", color: "var(--ink-2)" }}>
            {c}
            <button onClick={() => setChips(chips.filter((_, j) => j !== i))} style={{ border: 0, background: "transparent", padding: 0, display: "grid", placeItems: "center", color: "var(--ink-4)", cursor: "pointer" }}><Icon name="x" size={12} /></button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="+ Add command" className="mono"
          style={{ flex: 1, height: 32, border: "1px solid var(--border-strong)", borderRadius: 7, padding: "0 10px", fontSize: 12, outline: "none", background: "#fff" }} />
      </div>
    </div>
  );
}

const ZONES = [
  { zone: "Public", tone: "green", globs: ["README.md", "docs/**", "*.md"], desc: "Freely readable" },
  { zone: "Internal", tone: "blue", globs: ["src/**", "*.ts", "*.py"], desc: "Default working zone" },
  { zone: "Sensitive", tone: "amber", globs: ["config/**", "infra/**", "*.tfstate"], desc: "Drift-monitored" },
  { zone: "Secret", tone: "red", globs: [".env", "*.pem", "secrets/**", "*.key"], desc: "Read denied to agents" },
];

function SaveBar({ onSave }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
      <span className="help">Changes apply to all sessions on next prompt.</span>
      <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={onSave}>Save</button>
    </div>
  );
}

function DeveloperIntegration() {
  const [open, setOpen] = React.useState(0);
  const [hitl, setHitl] = React.useState(true);
  const [provider, setProvider] = React.useState("Slack");
  const toggle = (i) => setOpen(open === i ? -1 : i);

  return (
    <div style={{ padding: 28, maxWidth: 1080 }}>
      {/* 1. Command Classification */}
      <Accordion title="Command Classification" subtitle="Feeds the destructive-command guardrail at RunBash." open={open === 0} onToggle={() => toggle(0)} saved="2h ago">
        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            <ChipList tone="green" label="Safe" items={["cat", "ls", "pwd", "git status", "npm test"]} />
            <ChipList tone="amber" label="Restricted" items={["npm install", "git push", "docker build", "curl"]} />
            <ChipList tone="red" label="Destructive" items={["rm -rf", "git reset --hard", "drop table", "kubectl delete"]} />
          </div>
        </div>
        <SaveBar />
      </Accordion>

      {/* 2. File Sensitivity */}
      <Accordion title="File Sensitivity Classification" subtitle="Sets the file_zone attribute used in drift and injection evaluation." open={open === 1} onToggle={() => toggle(1)} saved="1d ago">
        <table className="tbl">
          <thead><tr><th>Zone</th><th>Glob patterns</th><th>Behavior</th></tr></thead>
          <tbody>
            {ZONES.map((z) => (
              <tr key={z.zone}>
                <td style={{ width: 140 }}><span className={`pill pill-${z.tone}`}><span className="dot" />{z.zone}</span></td>
                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {z.globs.map((g) => <span key={g} className="mono" style={{ fontSize: 11.5, padding: "3px 8px", borderRadius: 6, background: "var(--surface-3)", color: "var(--ink-2)", fontWeight: 600 }}>{g}</span>)}
                    <button className="kebab" style={{ width: 26, height: 26 }}><Icon name="plus" size={14} /></button>
                  </div>
                </td>
                <td className="sub" style={{ fontSize: 12.5 }}>{z.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <SaveBar />
      </Accordion>

      {/* 3. HITL */}
      <Accordion title="HITL" subtitle="Human-in-the-loop approvals for high-sensitivity actions." open={open === 2} onToggle={() => toggle(2)} saved="3d ago">
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 12 }}>
            <Icon name="lock" size={20} color="var(--blue)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Require human approval for high-sensitivity actions</div>
              <div className="help" style={{ marginTop: 2 }}>Protected-branch writes, Secret-zone access, and MCP writes pause for approval.</div>
            </div>
            <Toggle on={hitl} onClick={() => setHitl(!hitl)} />
          </div>

          <div style={{ marginTop: 16, opacity: hitl ? 1 : 0.45, pointerEvents: hitl ? "auto" : "none", transition: "opacity .2s" }}>
            <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 10 }}>Approval provider</div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {["Slack", "Okta Verify"].map((p) => (
                <button key={p} onClick={() => setProvider(p)} style={{
                  flex: 1, display: "flex", alignItems: "center", gap: 11, padding: "14px 16px", textAlign: "left",
                  border: `1.5px solid ${provider === p ? "var(--blue)" : "var(--border-strong)"}`, borderRadius: 12,
                  background: provider === p ? "var(--blue-tint)" : "#fff", cursor: "pointer",
                }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${provider === p ? "var(--blue)" : "var(--border-strong)"}`, display: "grid", placeItems: "center" }}>
                    {provider === p && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--blue)" }} />}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{p}</div>
                    <div className="help" style={{ fontSize: 11.5 }}>{p === "Slack" ? "Channel approval card" : "Mobile push approval"}</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <span className="pill pill-green"><span className="dot" />{provider === "Slack" ? "Slack #ai-approvals — connected" : "Okta Verify — connected"}</span>
              <a href="#" className="help" style={{ marginLeft: "auto", color: "var(--blue)", fontWeight: 600, textDecoration: "none" }}>Configure providers in Integrations → Approval Channel →</a>
            </div>
          </div>
        </div>
        <SaveBar />
      </Accordion>
    </div>
  );
}

window.DeveloperIntegration = DeveloperIntegration;
