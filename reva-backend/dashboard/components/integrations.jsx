/* global React, Icon, Pill, Toggle, Segmented, LogoTile, Mark */
/* Integrations directory + Create Integration wizard (Select Type → Configure → Instructions) */

const TYPE_TONE = {
  "Policy Store": "blue", "Identity Store": "purple", "Shared Signal": "amber",
  "AI Workload": "green", "AI Coding Agent": "green", "Approval Channel": "blue",
  "Analytics Source": "purple", "API Gateway": "gray", "CMDB": "gray", "Discovered": "gray",
};

const INTEGRATION_TYPES = ["Policy Store", "Identity Store", "Shared Signal", "AI Workload", "API Gateway", "CMDB", "Approval Channel", "Analytics Source"];

const CONNECTORS = [
  { name: "Claude Code", brand: "anthropic", types: ["AI Coding Agent"], featured: true, on: true,
    desc: "Cedar-enforced governance for every Claude Code prompt and tool call.", foot: "Patrick Fuller · 96 agents · last seen 4m ago" },
  { name: "AWS", brand: "aws", types: ["Policy Store"], on: true,
    desc: "Amazon Verified Permissions (AVP) policy store for account 732029699072.", foot: "Platform Sec · last sync 2m ago" },
  { name: "S3", brand: "s3", types: ["Policy Store"], on: true,
    desc: "Policy Store for Reva Trust Gateway — versioned Cedar bundles.", foot: "Platform Sec · last sync 5m ago" },
  { name: "AWS Cognito", brand: "cognito", types: ["Identity Store"], on: true,
    desc: "Cognito user pool for automated testing and integration validation.", foot: "IAM · 312 users" },
  { name: "Microsoft Entra ID", brand: "entra", types: ["Identity Store", "Shared Signal"], on: true,
    desc: "Entra ID (Azure AD) production user & group identity, plus access security signals.", foot: "IAM · 1,284 users" },
  { name: "Okta", brand: "okta", types: ["Identity Store", "Shared Signal"], on: true,
    desc: "Okta identity provider for enterprise SSO and access management signals.", foot: "IAM · 1,284 users" },
  { name: "CrowdStrike", brand: "crowdstrike", types: ["Shared Signal"], on: true,
    desc: "CrowdStrike Falcon endpoint detection and response signals.", foot: "SecOps · streaming" },
  { name: "GitHub AI Discovery", brand: "github", types: ["AI Workload"], on: true,
    desc: "Discover AI workloads and coding agents from GitHub repositories.", foot: "Platform Sec · 41 repos" },
  { name: "Amazon Bedrock AgentCore", brand: "bedrock", types: ["AI Workload"], on: true,
    desc: "Discover and govern AI agents running on AWS Bedrock.", foot: "Platform Sec · 12 agents" },
  { name: "n8n Production Discovery", brand: "n8n", types: ["AI Workload"], on: false,
    desc: "Automated discovery of AI workflows from an n8n production instance via webhook.", foot: "Automation · webhook" },
  // `on: false` deliberately. This tile used to claim it was connected to a
  // channel that did not exist, with a masked token beside it. A
  // governance product must not show a fabricated connection state — someone
  // reading this dashboard has no way to tell it from a real one. The real
  // Slack wiring lives in reva-backend/src/integrations/slack.js and is
  // configured by environment variables; when it is connected this tile should
  // read that state rather than assert it.
  { name: "Slack", brand: "slack", types: ["Approval Channel"], on: false,
    desc: "Route human-in-the-loop approvals to a Slack channel.", foot: "not configured" },
  { name: "Okta Verify", brand: "oktaverify", types: ["Approval Channel"], on: false,
    desc: "Push approval requests to Okta Verify on mobile.", foot: "Not configured" },
  { name: "Anthropic Analytics", brand: "anthropic", types: ["Analytics Source"], on: true,
    desc: "Reconciles who is using Claude Code against governed sessions — powers Governance Coverage.", foot: "OTel · 48 users seen (7d)" },
];

const PROVIDERS = {
  "AI Workload": [
    { id: "claude", name: "Claude Code", brand: "anthropic", desc: "Govern every Claude Code prompt and tool call with Cedar." },
    { id: "n8n", name: "n8n", brand: "n8n", desc: "Discover AI workflows from n8n." },
    { id: "github", name: "GitHub", brand: "github", desc: "Discover AI workloads from GitHub repositories." },
    { id: "bedrock", name: "AWS Bedrock Agents", brand: "bedrock", desc: "Discover AI agents from AWS Bedrock." },
    { id: "crewai", name: "CrewAI", brand: "crewai", desc: "Discover AI agents from CrewAI projects." },
    { id: "langchain", name: "LangChain / LangGraph", brand: "langchain", desc: "Discover LangChain and LangGraph agents from GitHub repositories." },
    { id: "copilot", name: "Microsoft Copilot Studio", brand: "microsoft", desc: "Discover AI agents from Microsoft Copilot Studio across your Microsoft 365 tenant." },
    { id: "custom", name: "Custom", brand: "custom", desc: "Custom discovery source." },
  ],
  "Approval Channel": [
    { id: "slack", name: "Slack", brand: "slack", desc: "Route human approvals to a Slack channel." },
    { id: "oktaverify", name: "Okta Verify", brand: "oktaverify", desc: "Push approvals to Okta Verify." },
  ],
  "Analytics Source": [
    { id: "anthropic-api", name: "Anthropic Analytics API", brand: "anthropic", desc: "Pull Claude Code usage via the Admin Analytics API — for Console-billed orgs." },
    { id: "otel", name: "OpenTelemetry", brand: "otel", desc: "Ingest Claude Code OTel events — works for subscription and all plans." },
  ],
  "Policy Store": [
    { id: "avp", name: "AWS Verified Permissions", brand: "aws", desc: "Cedar policy store on Amazon Verified Permissions." },
    { id: "s3", name: "Amazon S3", brand: "s3", desc: "Versioned Cedar policy bundles in S3." },
    { id: "reva", name: "Reva Managed", brand: "custom", desc: "Reva-hosted Cedar policy store." },
  ],
  "Identity Store": [
    { id: "okta", name: "Okta", brand: "okta", desc: "Okta enterprise SSO and directory." },
    { id: "entra", name: "Microsoft Entra ID", brand: "entra", desc: "Entra ID users and groups." },
    { id: "cognito", name: "AWS Cognito", brand: "cognito", desc: "Cognito user pools." },
  ],
  "Shared Signal": [
    { id: "crowdstrike", name: "CrowdStrike", brand: "crowdstrike", desc: "Falcon endpoint risk signals." },
    { id: "okta", name: "Okta", brand: "okta", desc: "Okta access management signals." },
  ],
  "API Gateway": [
    { id: "kong", name: "Kong", brand: "custom", desc: "Enforce decisions at the Kong gateway." },
    { id: "awsapi", name: "AWS API Gateway", brand: "aws", desc: "Enforce at Amazon API Gateway." },
  ],
  "CMDB": [
    { id: "snow", name: "ServiceNow", brand: "custom", desc: "Sync configuration items from ServiceNow." },
  ],
};

/* ---------- small atoms ---------- */
function CopyBtn({ size = 30 }) {
  const [done, setDone] = React.useState(false);
  return (
    <button className="kebab" style={{ width: size, height: size }} onClick={() => { setDone(true); setTimeout(() => setDone(false), 1200); }}>
      <Icon name={done ? "check" : "copy"} size={15} color={done ? "var(--green)" : "var(--ink-4)"} />
    </button>
  );
}

const inputStyle = { width: "100%", height: 40, border: "1px solid var(--border-strong)", borderRadius: 9, padding: "0 12px", fontSize: 13.5, outline: "none", background: "#fff", color: "var(--ink)" };

function FieldGroup({ label, required, helper, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{label}{required && <span style={{ color: "var(--red)" }}> *</span>}</label>}
      {children}
      {helper && <div className="help" style={{ fontSize: 12 }}>{helper}</div>}
    </div>
  );
}

function MaskedField({ value = "••••••••••••••••", onApply = true, helper }) {
  return (
    <FieldGroup helper={helper}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ ...inputStyle, display: "flex", alignItems: "center", letterSpacing: 1 }} className="mono">{value}</div>
        <CopyBtn size={40} />
        <button className="btn btn-ghost" style={{ height: 40 }}>Apply</button>
      </div>
    </FieldGroup>
  );
}

function CodeBlock({ lines, label }) {
  return (
    <div>
      {label && <div className="help" style={{ marginBottom: 6 }}>{label}</div>}
      <div className="code" style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <pre style={{ margin: 0, flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{lines}</pre>
        <CopyBtn />
      </div>
    </div>
  );
}

function EmailMapTable() {
  const [rows, setRows] = React.useState([
    { os: "saisrungaram", email: "sai.s@acme.io" },
    { os: "d.okonkwo", email: "d.okonkwo@acme.io" },
  ]);
  return (
    <div>
      <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr><th>osUser</th><th>Approver email</th><th></th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{r.os}</td>
                <td className="mono" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{r.email}</td>
                <td className="right"><button className="kebab" style={{ width: 28, height: 28 }} onClick={() => setRows(rows.filter((_, j) => j !== i))}><Icon name="x" size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn-text btn-sm" style={{ marginTop: 8, paddingLeft: 4 }} onClick={() => setRows([...rows, { os: "newuser", email: "user@acme.io" }])}><Icon name="plus" size={14} /> Add row</button>
    </div>
  );
}

function TestButton({ label }) {
  const [state, setState] = React.useState("idle");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button className="btn btn-ghost" style={{ height: 38 }} onClick={() => { setState("sending"); setTimeout(() => setState("ok"), 700); }}>{label}</button>
      {state === "ok" && <span className="pill pill-green"><Icon name="check" size={13} /> Sent — check the channel</span>}
      {state === "sending" && <span className="help">Sending…</span>}
    </div>
  );
}

function LocalAccordion({ title, subtitle, open, onToggle, children }) {
  return (
    <div className="card" style={{ overflow: "hidden", marginBottom: 14 }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", background: "transparent", border: 0, textAlign: "left" }}>
        <Icon name={open ? "chevDown" : "chevRight"} size={18} color="var(--ink-3)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{title}</div>
          {subtitle && <div className="help" style={{ marginTop: 2 }}>{subtitle}</div>}
        </div>
      </button>
      {open && <div style={{ borderTop: "1px solid var(--border)", padding: 18 }}>{children}</div>}
    </div>
  );
}

/* ---------- directory ---------- */
function ConnectorCard({ c, onClick }) {
  const [on, setOn] = React.useState(c.on);
  return (
    <div className="card conn" onClick={onClick} style={{ padding: 18, cursor: onClick ? "pointer" : "default", position: "relative",
      borderColor: c.featured ? "rgba(124,58,237,.35)" : "var(--border)", boxShadow: c.featured ? "0 0 0 3px rgba(124,58,237,.07), var(--shadow-card)" : "var(--shadow-card)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <LogoTile brand={c.brand} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1, paddingTop: 3 }}>
          {c.types.map((t) => <Pill key={t} tone={TYPE_TONE[t] || "gray"}>{t}</Pill>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
          <Toggle on={on} onClick={() => setOn(!on)} />
          <button className="kebab"><Icon name="kebab" size={18} /></button>
        </div>
      </div>
      <div style={{ marginTop: 14, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{c.name}</div>
      <div className="sub" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5, minHeight: 38,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.desc}</div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--ink-4)" }}>{c.foot}</div>
    </div>
  );
}

function IntegrationsPage({ onOpenWorkload, onOpenAwsWorkload }) {
  const [grid, setGrid] = React.useState(true);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [wizard, setWizard] = React.useState(null); // category string

  const openWizard = (cat) => { setMenuOpen(false); setWizard(cat); };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>Integrations</h1>
        <p style={{ margin: "8px 0 0", maxWidth: 980, color: "var(--ink-3)", fontSize: 13.5, lineHeight: 1.55 }}>
          Connect the policy stores, identity providers, CMDBs, agent registries, API gateways, approval channels, and analytics sources that authorization decisions depend on — bringing signals in and pushing enforcement out.
        </p>
      </div>

      {/* toolbar */}
      <div className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div className="search" style={{ flex: 1, minWidth: 0 }}>
          <Icon name="search" size={16} color="var(--ink-4)" />
          <input placeholder="Search integrations…" />
          <Icon name="send" size={16} color="var(--ink-4)" />
        </div>
        <div className="seg" style={{ padding: 3 }}>
          <button className={grid ? "" : "active"} onClick={() => setGrid(false)} style={{ width: 34, padding: 0, display: "grid", placeItems: "center" }}><Icon name="list" size={17} /></button>
          <button className={grid ? "active" : ""} onClick={() => setGrid(true)} style={{ width: 34, padding: 0, display: "grid", placeItems: "center" }}><Icon name="grid" size={16} /></button>
        </div>
        <button className="selchip">Type: All <Icon name="chevDown" size={15} color="var(--ink-4)" /></button>
        <div style={{ position: "relative" }}>
          <button className="btn btn-primary" onClick={() => setMenuOpen(!menuOpen)}><Icon name="plus" size={16} /> Integration <Icon name="chevDown" size={15} color="#fff" /></button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
              <div className="card" style={{ position: "absolute", top: 46, right: 0, width: 220, padding: 6, zIndex: 31, boxShadow: "var(--shadow-pop)" }}>
                {INTEGRATION_TYPES.map((t) => (
                  <button key={t} onClick={() => openWizard(t)} style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: 0, background: "transparent", borderRadius: 8, fontSize: 13.5, fontWeight: 500, color: "var(--ink-2)", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-2)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>{t}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* grid */}
      <div style={{ display: "grid", gridTemplateColumns: grid ? "repeat(3, 1fr)" : "1fr", gap: 16 }}>
        {CONNECTORS.map((c) => (
          <ConnectorCard key={c.name} c={c} onClick={c.name === "Claude Code" ? onOpenWorkload : c.name === "Amazon Bedrock AgentCore" ? () => setWizard("AI Workload") : undefined} />
        ))}
        {/* ghost add card */}
        <button onClick={() => setWizard("AI Workload")} className="card" style={{ minHeight: 168, borderStyle: "dashed", background: "transparent", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--ink-4)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface-3)", display: "grid", placeItems: "center", margin: "0 auto 8px" }}><Icon name="plus" size={20} color="var(--ink-3)" /></div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-3)" }}>Add workload</div>
          </div>
        </button>
      </div>

      {wizard && <CreateWizard category={wizard} onClose={() => setWizard(null)} />}

      <style>{`.conn{transition:box-shadow .15s,border-color .15s,transform .15s;} .conn:hover{box-shadow:var(--shadow-pop);} `}</style>
    </div>
  );
}

/* ---------- wizard ---------- */
function Stepper({ step }) {
  const labels = ["Select Type", "Configure", "Instructions"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
      {labels.map((l, i) => {
        const state = i < step ? "done" : i === step ? "current" : "future";
        const color = state === "done" ? "var(--green)" : state === "current" ? "var(--blue)" : "var(--border-strong)";
        return (
          <React.Fragment key={l}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", background: color, display: "grid", placeItems: "center", flex: "none" }}>
                {state === "done" && <Icon name="check" size={11} color="#fff" />}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: state === "future" ? "var(--ink-4)" : state === "current" ? "var(--blue)" : "var(--ink-2)" }}>{l}</span>
            </div>
            {i < labels.length - 1 && <span style={{ width: 28, height: 1, background: "var(--border-strong)", margin: "0 14px" }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ProviderCard({ p, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      textAlign: "left", padding: 18, borderRadius: 14, cursor: "pointer", position: "relative",
      border: `1.5px solid ${selected ? "var(--blue)" : "var(--border)"}`,
      background: selected ? "var(--blue-tint)" : "#fff",
      boxShadow: selected ? "0 0 0 3px rgba(37,99,235,.12)" : "none", transition: "all .15s",
    }}>
      {selected && <span style={{ position: "absolute", top: 14, right: 14, width: 20, height: 20, borderRadius: "50%", background: "var(--blue)", display: "grid", placeItems: "center" }}><Icon name="check" size={13} color="#fff" /></span>}
      <LogoTile brand={p.brand} size={40} mark={22} />
      <div style={{ marginTop: 12, fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{p.name}</div>
      <div className="sub" style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.45 }}>{p.desc}</div>
    </button>
  );
}

function ConnectionSettings({ provider, category }) {
  const id = provider ? provider.id : null;
  const helper = "Joined against Reva SessionStart events to compute Governance Coverage.";

  if (id === "slack") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <FieldGroup label="Bot Token" required helper="Starts with xoxb-. Stored encrypted.">
          <div style={{ display: "flex", gap: 8 }}>
            {/* Empty, not a masked placeholder. A row of dots reads as "a token is
                stored here" — it is not, and in a governance console that is the
                one thing a screenshot must not imply. */}
            <div style={{ ...inputStyle, display: "flex", alignItems: "center", color: "#9e9da1" }} className="mono">not configured</div>
            <CopyBtn size={40} /><button className="btn btn-ghost" style={{ height: 40 }}>Apply</button>
          </div>
        </FieldGroup>
        <FieldGroup label="Channel" helper="The bot must be invited to this channel.">
          <div style={{ display: "flex", gap: 8 }}>
            <button className="selchip" style={{ flex: 1, justifyContent: "space-between", height: 40 }}>#ai-approvals <Icon name="chevDown" size={15} color="var(--ink-4)" /></button>
            <button className="btn btn-ghost" style={{ height: 40 }}><Icon name="rotate" size={15} /> Fetch channels</button>
          </div>
        </FieldGroup>
        <FieldGroup label="Approval expiry (minutes)"><input style={{ ...inputStyle, width: 140 }} defaultValue="60" className="mono" /></FieldGroup>
        <FieldGroup label="Approver email mapping" helper="osUser → email used to address the approval request."><EmailMapTable /></FieldGroup>
        <TestButton label="Send test message" />
      </div>
    );
  }
  if (id === "oktaverify") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <FieldGroup label="Okta domain" required><input style={inputStyle} placeholder="acme.okta.com" /></FieldGroup>
        <FieldGroup label="Authorization server id"><input style={inputStyle} className="mono" placeholder="aus1a2b3c4D5e6F7g8" /></FieldGroup>
        <FieldGroup label="Approver email mapping" helper="osUser → email mapped to an Okta Verify enrollment."><EmailMapTable /></FieldGroup>
        <TestButton label="Send test push" />
      </div>
    );
  }
  if (category === "Analytics Source") {
    return <AnalyticsSettings defaultMode={id === "anthropic-api" ? "Admin Analytics API" : "OpenTelemetry"} helper={helper} />;
  }
  // generic / AI Workload
  if (id === "bedrock") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <FieldGroup label="AWS Access Key ID" required helper="IAM user with Bedrock, Lambda, Cognito, IAM read permissions.">
          <input style={inputStyle} className="mono" placeholder="AKIA…" />
        </FieldGroup>
        <FieldGroup label="AWS Secret Access Key" required helper="Stored encrypted. Never logged.">
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ ...inputStyle, display: "flex", alignItems: "center", letterSpacing: 1, flex: 1 }} className="mono">••••••••••••••••••••••••</div>
            <CopyBtn size={40} />
          </div>
        </FieldGroup>
        <FieldGroup label="AWS Region" required>
          <button className="selchip" style={{ justifyContent: "space-between", width: 260, height: 40 }}>us-west-2 <Icon name="chevDown" size={15} color="var(--ink-4)" /></button>
        </FieldGroup>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {id === "claude" && (
        <FieldGroup label="Plan" helper="Determines install path on the Instructions step.">
          <Segmented options={["Individual", "Enterprise"]} value={"Enterprise"} onChange={() => {}} />
        </FieldGroup>
      )}
      <FieldGroup label="Endpoint / Base URL" required><input style={inputStyle} className="mono" placeholder="https://api.example.com" /></FieldGroup>
      <FieldGroup label="Access Token" required helper="Scoped, read-only. Stored encrypted.">
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ ...inputStyle, display: "flex", alignItems: "center", letterSpacing: 1 }} className="mono">••••••••••••••••</div>
          <CopyBtn size={40} /><button className="btn btn-ghost" style={{ height: 40 }}>Apply</button>
        </div>
      </FieldGroup>
      <FieldGroup label="Sync schedule"><button className="selchip" style={{ justifyContent: "space-between", width: 220, height: 40 }}>Every 15 minutes <Icon name="chevDown" size={15} color="var(--ink-4)" /></button></FieldGroup>
    </div>
  );
}

function AnalyticsSettings({ defaultMode, helper }) {
  const [mode, setMode] = React.useState(defaultMode);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Segmented options={["Admin Analytics API", "OpenTelemetry"]} value={mode} onChange={setMode} />
      {mode === "Admin Analytics API" ? (
        <>
          <FieldGroup label="Admin Key" required helper="Must start with sk-ant-admin…">
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ ...inputStyle, display: "flex", alignItems: "center", letterSpacing: 1 }} className="mono">sk-ant-admin-••••••••</div>
              <CopyBtn size={40} /><button className="btn btn-ghost" style={{ height: 40 }}>Apply</button>
            </div>
          </FieldGroup>
          <FieldGroup label="Org / workspace" required><input style={inputStyle} placeholder="acme-engineering" /></FieldGroup>
        </>
      ) : (
        <>
          <FieldGroup label="OTLP endpoint" required><input style={inputStyle} className="mono" placeholder="https://otel.acme.io:4317" /></FieldGroup>
          <CodeBlock label="Set these on each Claude Code host" lines={`CLAUDE_CODE_ENABLE_TELEMETRY=1\nOTEL_EXPORTER_OTLP_ENDPOINT=https://otel.acme.io:4317\nOTEL_EXPORTER_OTLP_PROTOCOL=grpc`} />
        </>
      )}
      <div className="help" style={{ display: "flex", gap: 7 }}><Icon name="info" size={15} color="var(--ink-4)" /> {helper}</div>
    </div>
  );
}

function NumberedStep({ n, title, children }) {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--blue-tint)", color: "var(--blue-700)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, flex: "none" }}>{n}</span>
      <div style={{ flex: 1, paddingBottom: 18, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>{title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
      </div>
    </div>
  );
}

function Checklist({ items }) {
  return (
    <div style={{ background: "var(--green-tint)", border: "1px solid #BBE7CB", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", marginBottom: 10 }}>Verify</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {items.map((it) => (
          <div key={it} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--ink-2)" }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--green)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="check" size={12} color="#fff" /></span>
            {it}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepLabel({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{children}</div>;
}

function TokenField() {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Access Token</label>
      <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
        <div style={{ ...inputStyle, display: "flex", alignItems: "center", letterSpacing: 2 }} className="mono">••••••••••••</div>
        <CopyBtn size={40} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
        <span className="help" style={{ fontSize: 12, flex: 1 }}>Fine-grained, read-only, scoped to the plugin repo. Expires; rotate from this screen.</span>
        <a href="#" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--blue)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="rotate" size={13} /> Rotate</a>
      </div>
    </div>
  );
}

function CollapsibleSub({ title, children }) {
  const [o, setO] = React.useState(false);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <button onClick={() => setO(!o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "11px 14px", border: 0, background: "transparent", textAlign: "left", cursor: "pointer" }}>
        <Icon name={o ? "chevDown" : "chevRight"} size={15} color="var(--ink-3)" />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>{title}</span>
      </button>
      {o && <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>}
    </div>
  );
}

const MANAGED_JSON = `{
  "extraKnownMarketplaces": {
    "reva-governance": {
      "source": { "source": "git", "url": "https://git.acme.internal/devtools/reva-governance.git" }
    }
  },
  "enabledPlugins": { "reva-governance@reva-governance": true },
  "strictKnownMarketplaces": true,
  "allowManagedHooksOnly": true,
  "allowedHttpHookUrls": ["https://reva-plugin.onrender.com/*"],
  "httpHookAllowedEnvVars": ["USER", "CLAUDE_PROJECT_DIR"]
}`;

const WHY_KEYS = [
  ["enabledPlugins", "force-enables Reva; its hooks load even under allowManagedHooksOnly."],
  ["allowManagedHooksOnly: true", "only managed + force-enabled-plugin hooks run; developers can't add bypass hooks."],
  ["allowedHttpHookUrls", "REQUIRED (Reva's hooks are HTTP); omit the URL and enforcement silently stops."],
  ["httpHookAllowedEnvVars", "keeps $USER / $CLAUDE_PROJECT_DIR from resolving empty (breaks identity attribution)."],
  ["strictKnownMarketplaces: true", "pins installs to the Reva source only."],
];

function ClaudeInstructions() {
  const [ind, setInd] = React.useState(true);
  const [ent, setEnt] = React.useState(false);
  return (
    <div>
      <LocalAccordion title="Individual Plan" subtitle="Private repo — authenticate git with the read-only token below, then register the marketplace." open={ind} onToggle={() => setInd(!ind)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <StepLabel>Step 0 — Confirm git access</StepLabel>
          <CodeBlock lines={`git ls-remote https://github.com/saisrungaram-ai/reva-cowork-plugin.git`} />

          <TokenField />

          <StepLabel>Step 1 — Register the token with git</StepLabel>
          <CodeBlock lines={`gh auth login --hostname github.com --git-protocol https --with-token   # paste the token above\ngh auth setup-git`} />

          <StepLabel>Step 2 — Add the marketplace</StepLabel>
          <CodeBlock lines={`/plugin marketplace add https://github.com/saisrungaram-ai/reva-cowork-plugin.git`} />

          <CollapsibleSub title="Fallback — manual clone (if the credential helper isn't picked up)">
            <CodeBlock lines={`git clone https://x-access-token:<PASTE_TOKEN>@github.com/saisrungaram-ai/reva-cowork-plugin.git ~/.reva/reva-cowork-plugin\n/plugin marketplace add ~/.reva/reva-cowork-plugin`} />
            <div className="help" style={{ fontSize: 12 }}>Note: prefer Step 1 — the inline-token form persists the token in <span className="mono">.git/config</span>.</div>
          </CollapsibleSub>

          <StepLabel>Step 3 — Install + activate</StepLabel>
          <CodeBlock lines={`/plugin install reva-governance@reva-governance\n/reload-plugins`} />

          <Checklist items={["/plugin shows reva-governance enabled", "Errors tab is empty", "Trigger a governed action — a Reva Governance decision appears in the terminal"]} />

          <div className="help" style={{ fontSize: 12, display: "flex", gap: 7 }}>
            <Icon name="info" size={15} color="var(--ink-4)" />
            No local secrets — hooks call the hosted PDP at <span className="mono">reva-plugin.onrender.com</span>; ensure outbound HTTPS to that host is allowed.
          </div>
        </div>
      </LocalAccordion>

      <LocalAccordion title="Enterprise Plan" subtitle="Distributed centrally via managed settings — developers never access the plugin repo. One service credential mirrors the plugin into your own Git." open={ent} onToggle={() => setEnt(!ent)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <StepLabel>Step 1 — Mirror (platform team, once)</StepLabel>
          <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>Reva provides a read-only deploy token; set up a scheduled pull-mirror of the plugin into your internal Git, e.g. <span className="mono">git.acme.internal/devtools/reva-governance</span>.</div>

          <StepLabel>Step 2 — Managed settings (Admin Console → Claude Code → Managed settings)</StepLabel>
          <CodeBlock lines={MANAGED_JSON} />

          <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16, background: "var(--surface-2)" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>Why these keys</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {WHY_KEYS.map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 9, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
                  <span style={{ color: "var(--ink-4)" }}>•</span>
                  <span><span className="mono" style={{ fontWeight: 600, color: "var(--ink)" }}>{k}</span> — {v}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, background: "var(--amber-tint)", border: "1px solid #F3D9A6", borderRadius: 10, padding: "12px 14px" }}>
            <Icon name="info" size={17} color="var(--amber-ink)" style={{ flex: "none", marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: "var(--amber-ink)", lineHeight: 1.5 }}><b>CLI users:</b> plugins from managed settings may not auto-install in the CLI — run Individual Plan Steps 2–3 once as a bootstrap.</div>
          </div>

          <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, background: "var(--surface-3)", borderRadius: 10, padding: "11px 14px" }}>
            CI / containers / ephemeral envs — bake the clone into the image and seed via <span className="mono">CLAUDE_CODE_PLUGIN_SEED_DIR</span> (no runtime auth).
          </div>
        </div>
      </LocalAccordion>
    </div>
  );
}

function InstructionsGuide({ provider, category }) {
  const id = provider ? provider.id : null;
  if (id === "claude") return <ClaudeInstructions />;
  if (id === "slack") {
    return (
      <div className="card" style={{ padding: 22 }}>
        <NumberedStep n="1" title="Create a Slack app">Visit api.slack.com/apps → Create New App → From scratch, in your workspace.</NumberedStep>
        <NumberedStep n="2" title="Add bot token scopes"><CodeBlock lines={`chat:write\nchannels:read`} /></NumberedStep>
        <NumberedStep n="3" title="Install to workspace">Install the app and copy the Bot User OAuth Token.</NumberedStep>
        <NumberedStep n="4" title="Paste the Bot Token">Return to Connection Settings and paste the token into the Bot Token field, then Apply.<CodeBlock lines={`xoxb-1234567890-XXXXXXXXXXXX`} /></NumberedStep>
        <NumberedStep n="5" title="Invite the bot">Invite it to your approvals channel.<CodeBlock lines={`/invite @reva-governance #ai-approvals`} /></NumberedStep>
      </div>
    );
  }
  if (id === "otel" || category === "Analytics Source") {
    return (
      <div className="card" style={{ padding: 22 }}>
        <NumberedStep n="1" title="Run an OpenTelemetry collector">Point it at your backend; expose an OTLP endpoint reachable by developer machines.</NumberedStep>
        <NumberedStep n="2" title="Set Claude Code environment variables">Distribute via managed settings or your dotfiles.<CodeBlock lines={`CLAUDE_CODE_ENABLE_TELEMETRY=1\nOTEL_EXPORTER_OTLP_ENDPOINT=https://otel.acme.io:4317\nOTEL_EXPORTER_OTLP_PROTOCOL=grpc`} /></NumberedStep>
        <NumberedStep n="3" title="Confirm events arrive"><Checklist items={["Collector receiving Claude Code spans", "Events include user.email attribute", "SessionStart events visible in Reva"]} /></NumberedStep>
      </div>
    );
  }
  if (id === "anthropic-api") {
    return (
      <div className="card" style={{ padding: 22 }}>
        <NumberedStep n="1" title="Create an Admin API key">In the Anthropic Console → Settings → Admin keys. Console-billed orgs only.</NumberedStep>
        <NumberedStep n="2" title="Paste the key">Add it to Connection Settings (must start with sk-ant-admin…).<CodeBlock lines={`sk-ant-admin-XXXXXXXXXXXXXXXX`} /></NumberedStep>
        <NumberedStep n="3" title="Confirm reconciliation"><Checklist items={["Admin Analytics API reachable", "Usage rows returned for the last 7d", "Joined to governed SessionStart events"]} /></NumberedStep>
      </div>
    );
  }
  // generic
  return (
    <div className="card" style={{ padding: 22 }}>
      <NumberedStep n="1" title="Authorize the connection">Generate a scoped, read-only credential in {provider ? provider.name : "the provider"} and paste it into Connection Settings.</NumberedStep>
      <NumberedStep n="2" title="Grant discovery access">Allow read access to the resources Reva should govern.<CodeBlock lines={`reva connect ${id || "provider"} --read-only`} /></NumberedStep>
      <NumberedStep n="3" title="Verify"><Checklist items={["Connection authenticated", "First sync completed", "Workloads appear in the directory"]} /></NumberedStep>
    </div>
  );
}

function CreateWizard({ category, onClose }) {
  const providers = PROVIDERS[category] || [];
  const [step, setStep] = React.useState(0);
  const [pid, setPid] = React.useState(null);
  const [open, setOpen] = React.useState({ basic: true, conn: true });
  const [lib, setLib] = React.useState(true);
  const [app, setApp] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveResult, setSaveResult] = React.useState(null);
  const provider = providers.find((p) => p.id === pid);
  const title = `Create ${category} Integration` + (provider && step > 0 ? ` — ${provider.name}` : "");
  const isBedrock = pid === "bedrock";

  const handleSave = () => {
    if (isBedrock) {
      setSaving(true);
      setSaveResult(null);
      fetch("/api/discovery/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        .then(r => r.json())
        .then(d => {
          setSaving(false);
          if (d.errors && d.errors.length > 0 && (!d.agents || d.agents.length === 0)) {
            setSaveResult({ ok: false, msg: "Connection failed: " + d.errors[0].error });
          } else {
            setSaveResult({ ok: true, msg: "Connected successfully. Discovered " + (d.summary ? (d.summary.agents + " agents, " + d.summary.nhis + " NHIs, " + d.summary.users + " users, " + d.summary.gatewayTargets + " gateway targets.") : "resources.") });
            setStep(2);
          }
        })
        .catch(e => { setSaving(false); setSaveResult({ ok: false, msg: "Connection failed: " + e.message }); });
    } else {
      setStep(2);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(11,18,32,.34)", zIndex: 50 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(840px, 80vw)", background: "var(--bg)", zIndex: 51, boxShadow: "var(--shadow-drawer)", display: "flex", flexDirection: "column" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", background: "#fff", borderBottom: "1px solid var(--border)" }}>
          {step > 0 && <button className="kebab" onClick={() => setStep(step - 1)}><Icon name="chevRight" size={18} style={{ transform: "rotate(180deg)" }} /></button>}
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{title}</div>
          <button className="kebab" style={{ marginLeft: "auto", border: "1px solid var(--border-strong)" }} onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ background: "#fff" }}><Stepper step={step} /></div>

        {/* body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {step === 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {providers.map((p) => <ProviderCard key={p.id} p={p} selected={pid === p.id} onClick={() => setPid(p.id)} />)}
            </div>
          )}

          {step === 1 && (
            <div>
              <LocalAccordion title="Basic Information" open={open.basic} onToggle={() => setOpen({ ...open, basic: !open.basic })}>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <FieldGroup label="Integration Name" required><input style={inputStyle} defaultValue={provider ? `${provider.name} — Integration` : ""} placeholder="e.g. Slack — AI Approvals" /></FieldGroup>
                  <FieldGroup label="Description"><textarea style={{ ...inputStyle, height: 80, padding: 12, resize: "vertical" }} placeholder="Describe this integration…" /></FieldGroup>
                  <FieldGroup label="Choose Owner of This Connection"><button className="selchip" style={{ width: "100%", justifyContent: "space-between", height: 40 }}><span className="muted">Search &amp; select</span> <Icon name="chevDown" size={15} color="var(--ink-4)" /></button></FieldGroup>
                  <FieldGroup label="Applicable Entity Types" helper="Select entity types this integration applies to.">
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <EntityCheck on={lib} onToggle={() => setLib(!lib)} title="Library" sub="System Components" multiLabel="Library Entity Types" />
                      <EntityCheck on={app} onToggle={() => setApp(!app)} title="Application" sub="Application Specific" multiLabel="Application Entity Types" />
                    </div>
                  </FieldGroup>
                </div>
              </LocalAccordion>

              <LocalAccordion title="Connection Settings" subtitle={provider ? provider.name : ""} open={open.conn} onToggle={() => setOpen({ ...open, conn: !open.conn })}>
                <ConnectionSettings provider={provider} category={category} />
              </LocalAccordion>
            </div>
          )}

          {step === 2 && <InstructionsGuide provider={provider} category={category} />}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", padding: "14px 24px", background: "#fff", borderTop: "1px solid var(--border)" }}>
          {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button className="btn btn-text" onClick={onClose}>Cancel</button>
            {step === 0 && <button className="btn btn-primary" disabled={!pid} style={!pid ? { opacity: 0.5, cursor: "not-allowed" } : null} onClick={() => pid && setStep(1)}>Next</button>}
            {step === 1 && (
              <>
                {saveResult && (
                  <div style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: saveResult.ok ? "var(--green-tint)" : "#FEF2F2", color: saveResult.ok ? "var(--green)" : "#991B1B", border: "1px solid " + (saveResult.ok ? "#BBE7CB" : "#FCA5A5"), maxWidth: 400 }}>
                    {saveResult.ok ? <Icon name="checkCircle" size={13} color="var(--green)" /> : <Icon name="alert" size={13} color="#991B1B" />} {saveResult.msg}
                  </div>
                )}
                <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? "Connecting…" : "Save & Activate"}</button>
              </>
            )}
            {step === 2 && <button className="btn btn-primary" onClick={onClose}>Done</button>}
          </div>
        </div>
      </div>
    </>
  );
}

function EntityCheck({ on, onToggle, title, sub, multiLabel }) {
  return (
    <div style={{ border: `1.5px solid ${on ? "var(--blue)" : "var(--border-strong)"}`, borderRadius: 12, padding: 14, background: on ? "var(--blue-tint)" : "#fff" }}>
      <button onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 11, border: 0, background: "transparent", width: "100%", textAlign: "left", cursor: "pointer", padding: 0 }}>
        <span style={{ width: 20, height: 20, borderRadius: 5, flex: "none", display: "grid", placeItems: "center", background: on ? "var(--blue)" : "#fff", border: on ? "0" : "1.5px solid var(--border-strong)" }}>{on && <Icon name="check" size={13} color="#fff" />}</span>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{title}</div>
          <div className="help" style={{ fontSize: 12 }}>{sub}</div>
        </div>
      </button>
      {on && (
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{multiLabel}<span style={{ color: "var(--red)" }}> *</span></label>
          <button className="selchip" style={{ width: "100%", justifyContent: "space-between", height: 40, marginTop: 7 }}><span className="muted">Search &amp; select</span> <Icon name="chevDown" size={15} color="var(--ink-4)" /></button>
        </div>
      )}
    </div>
  );
}

window.IntegrationsPage = IntegrationsPage;
