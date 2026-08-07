/* global React, Icon, Pill */
/* Guardrails config — metadata, schemas, field renderers, detail/config drawer.
   Shared globals exported on window for guardrails.jsx (separate babel scope). */

const GR_RISK_TONE = { Critical: "red", High: "amber", Medium: "blue", Low: "gray" };
const GR_STATE_TONE = { Published: "green", Draft: "amber", "Pending approval": "blue", Rejected: "red" };
const GR_ACTIONS = ["Conditional Allow", "Block"];
const GR_CHANNELS = ["Slack", "Okta Verify"];
const JIRA_STATUS = ["To Do", "In Progress", "In Review", "Done"];
const SNOW_STATUS = ["New", "In Progress", "On Hold", "Resolved", "Closed"];

/* an approval-channel field shown only when the action is Conditional Allow */
const APPROVAL_FIELD = { key: "approvalChannel", label: "Approval channel", type: "dropdown", options: GR_CHANNELS, showIf: (p) => p.action === "Conditional Allow" };

/* Each guardrail: name, desc, risk, locked, evaluates, schema[], defaults{} */
const GUARD_META = [
  { name: "Prompt Injection Protection", risk: "Critical", locked: true,
    desc: "Blocks prompt submission when injection or jailbreak content is detected.",
    evaluates: "Every prompt and tool result is scored for injection and jailbreak payloads before the model is allowed to act.", schema: [], defaults: {} },
  { name: "Baseline Safety Controls", risk: "Critical", locked: true,
    desc: "Global floor that blocks all actions on a high injection score or critically low trust.",
    evaluates: "A non-negotiable floor that denies every action when the injection score is critically high or the trust score is critically low.", schema: [], defaults: {} },
  { name: "Intent Drift Validation", risk: "High", locked: false,
    desc: "Blocks command execution when activity drifts from the declared intent.",
    evaluates: "Compares observed intent against the declared task scope across five axes and scores the resulting drift.",
    schema: [
      { key: "threshold", label: "Drift severity threshold", type: "slider", min: 0, max: 1, step: 0.05, help: "Drift at or above this score triggers the configured action." },
      { key: "axes", label: "Per-axis sensitivity", type: "axes" },
      { key: "action", label: "Action on drift", type: "select", options: GR_ACTIONS },
      APPROVAL_FIELD,
    ],
    defaults: { threshold: 0.60, axes: { Actor: 0.5, Target: 0.7, Value: 0.6, Action: 0.5, Scope: 0.4 }, action: "Conditional Allow", approvalChannel: "Slack" } },
  { name: "Destructive Command Control", risk: "High", locked: false,
    desc: "Blocks shell commands classified as destructive.",
    evaluates: "Classifies each shell command into safe, restricted, or destructive and gates execution by class.",
    schema: [
      { key: "safe", label: "Safe commands", type: "taglist", placeholder: "e.g. git status" },
      { key: "restricted", label: "Restricted commands", type: "taglist", placeholder: "e.g. git push" },
      { key: "destructive", label: "Destructive commands", type: "taglist", placeholder: "e.g. rm -rf" },
      { key: "action", label: "Action on destructive", type: "select", options: GR_ACTIONS },
      APPROVAL_FIELD,
    ],
    defaults: { safe: ["cat", "ls", "pwd", "git status"], restricted: ["npm install", "git push", "docker build"], destructive: ["rm -rf", "git reset --hard", "drop table", "kubectl delete"], action: "Block", approvalChannel: "Slack" } },
  { name: "Ephemeral Agent Spawn Control", risk: "High", locked: false,
    desc: "Caps how many subagents a session can spawn, how fast, and how deep delegation can nest.",
    evaluates: "Limits concurrent subagents, spawn rate, and delegation depth for a single session.",
    schema: [
      { key: "maxConcurrent", label: "Max concurrent subagents", type: "number", min: 1, max: 32 },
      { key: "spawnRate", label: "Max spawn rate", type: "number", min: 1, max: 60, suffix: "/ min" },
      { key: "maxDepth", label: "Max delegation depth", type: "number", min: 1, max: 6 },
      { key: "action", label: "Action on breach", type: "select", options: GR_ACTIONS },
      APPROVAL_FIELD,
    ],
    defaults: { maxConcurrent: 8, spawnRate: 5, maxDepth: 2, action: "Block", approvalChannel: "Slack" } },
  { name: "Protected Branch Control", risk: "High", locked: false,
    desc: "Blocks edits on protected branches without approver consent.",
    evaluates: "Blocks edits and writes targeting protected branches unless an approver has consented.",
    schema: [
      { key: "branches", label: "Protected branch patterns", type: "taglist", placeholder: "e.g. release/*" },
      { key: "requireConsent", label: "Require approver consent", type: "toggle" },
    ],
    defaults: { branches: ["main", "master", "release/*"], requireConsent: true } },
  { name: "ITSM Change Control", risk: "Medium", locked: false,
    desc: "Requires a valid in-progress change ticket before code changes.",
    evaluates: "Requires a valid, in-progress change ticket assigned to the authenticated user before any code change.",
    schema: [
      { key: "requireTicket", label: "Require active change ticket", type: "toggle" },
      { key: "system", label: "Ticketing system", type: "dropdown", options: ["Jira", "ServiceNow"] },
      { key: "ticketStatus", label: "Required ticket status", type: "dropdown", options: (p) => p.system === "ServiceNow" ? SNOW_STATUS : JIRA_STATUS },
      { key: "action", label: "Action when missing", type: "select", options: GR_ACTIONS },
      APPROVAL_FIELD,
    ],
    defaults: { requireTicket: true, system: "Jira", ticketStatus: "In Progress", action: "Conditional Allow", approvalChannel: "Slack" } },
  { name: "Identity Integrity Evaluation", risk: "High", locked: true,
    desc: "Blocks edits when committer or assignee identity does not match the authenticated user.",
    evaluates: "Blocks edits when the committer or assignee identity does not match the authenticated principal.", schema: [], defaults: {} },
  { name: "Environment-Based Access Control", risk: "High", locked: false,
    desc: "Restricts protected-project changes to secure session types.",
    evaluates: "Restricts changes to protected projects based on the session connection type.",
    schema: [
      { key: "requireSecure", label: "Require secure session", type: "toggle" },
      { key: "allowed", label: "Allowed connection types", type: "taglist", placeholder: "e.g. ssh" },
      { key: "action", label: "Action on violation", type: "select", options: GR_ACTIONS },
      APPROVAL_FIELD,
    ],
    defaults: { requireSecure: true, allowed: ["local", "ssh"], action: "Block", approvalChannel: "Slack" } },
  { name: "Conditional Access Grants", risk: "High", locked: false,
    desc: "Grants edit, write, and command access only when verified conditions are met.",
    evaluates: "Grants edit, write, and command access only when trust and session conditions are satisfied.",
    schema: [
      { key: "minTrust", label: "Minimum trust score", type: "slider", min: 0, max: 100, step: 5 },
      { key: "requireActive", label: "Require active session", type: "toggle" },
      { key: "action", label: "Action when unmet", type: "select", options: GR_ACTIONS },
      APPROVAL_FIELD,
    ],
    defaults: { minTrust: 30, requireActive: true, action: "Conditional Allow", approvalChannel: "Slack" } },
  { name: "Sensitive File Access Control", risk: "High", locked: false,
    desc: "Requires AppSec review before edits to secret or config files.",
    evaluates: "Requires AppSec review before edits to files matching secret or configuration globs.",
    schema: [
      { key: "secretGlobs", label: "Secret file globs", type: "taglist", placeholder: "e.g. secrets/**" },
      { key: "configGlobs", label: "Config file globs", type: "taglist", placeholder: "e.g. config/**" },
      { key: "requireAppSec", label: "Require AppSec review", type: "toggle" },
    ],
    defaults: { secretGlobs: [".env", "*.pem", "secrets/**"], configGlobs: ["config/**", "*.tfstate"], requireAppSec: true } },
  { name: "MCP Tool Governance", risk: "High", locked: false,
    desc: "Governs which MCP server operations require review and which servers are allowlisted.",
    evaluates: "Determines which MCP operations require review and which MCP servers are permitted.",
    schema: [
      { key: "governed", label: "Governed operations", type: "taglist", placeholder: "e.g. MCPWrite" },
      { key: "allowlist", label: "Allowed MCP servers", type: "taglist", placeholder: "e.g. github-mcp" },
      { key: "action", label: "Action on governed op", type: "select", options: GR_ACTIONS },
      APPROVAL_FIELD,
    ],
    defaults: { governed: ["MCPWrite", "MCPDelete"], allowlist: ["github-mcp", "jira-mcp"], action: "Conditional Allow", approvalChannel: "Slack" } },
  { name: "Safe Command Access", risk: "Low", locked: false,
    desc: "Allows low-risk shell commands for verified, active sessions.",
    evaluates: "Permits low-risk shell commands for verified, active sessions without further review.",
    schema: [
      { key: "allowActive", label: "Allow for active sessions", type: "toggle" },
      { key: "safe", label: "Safe command list", type: "taglist", placeholder: "e.g. npm test" },
    ],
    defaults: { allowActive: true, safe: ["cat", "ls", "pwd", "npm test"] } },
];

const GR_META_BY_NAME = {};
GUARD_META.forEach((g) => { GR_META_BY_NAME[g.name] = g; });

function grClone(o) { return JSON.parse(JSON.stringify(o)); }
function grOpts(field, params) { return typeof field.options === "function" ? field.options(params) : field.options; }
function grVisible(schema, params) { return schema.filter((f) => !f.showIf || f.showIf(params)); }

function defaultGuardSettings() {
  const s = {};
  GUARD_META.forEach((g) => { s[g.name] = { enabled: true, params: grClone(g.defaults) }; });
  return s;
}

/* format a param value for summaries / diffs */
function grFmt(field, val) {
  if (val == null) return "—";
  switch (field.type) {
    case "toggle": return val ? "On" : "Off";
    case "taglist": return `${val.length} item${val.length === 1 ? "" : "s"}`;
    case "axes": return "per-axis sensitivity";
    case "slider": return field.max === 1 ? Number(val).toFixed(2) : String(val);
    case "number": return String(val) + (field.suffix ? " " + field.suffix : "");
    default: return String(val);
  }
}
const grEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* diff two settings objects → [{name, risk, changes:[{label, old, neu}]}] */
function grDiff(live, draft) {
  const groups = [];
  GUARD_META.forEach((meta) => {
    const l = live[meta.name], d = draft[meta.name];
    if (!l || !d) return;
    const changes = [];
    if (l.enabled !== d.enabled) changes.push({ label: "Status", old: l.enabled ? "Enabled" : "Disabled", neu: d.enabled ? "Enabled" : "Disabled" });
    meta.schema.forEach((f) => {
      if (f.showIf && !f.showIf(d.params)) return;       // skip hidden fields
      if (!grEq(l.params[f.key], d.params[f.key])) {
        if (f.type === "axes") changes.push({ label: f.label, old: "", neu: "updated" });
        else changes.push({ label: f.label, old: grFmt(f, l.params[f.key]), neu: grFmt(f, d.params[f.key]) });
      }
    });
    if (changes.length) groups.push({ name: meta.name, risk: meta.risk, changes });
  });
  return groups;
}

/* ---------------- field editors (used inside an expanded row) ---------------- */
function GRSlider({ field, value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <span className="gr-fhelp" style={{ margin: 0 }}>{field.help || "Adjust the threshold"}</span>
        <span className="mono" style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{grFmt(field, value)}</span>
      </div>
      <input type="range" className="gr-range" min={field.min} max={field.max} step={field.step} value={value}
        onChange={(e) => onChange(field.max === 1 ? parseFloat(e.target.value) : parseInt(e.target.value))} />
    </div>
  );
}
function GRNumber({ field, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="number" className="gr-tinput" style={{ width: 100 }} min={field.min} max={field.max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)} />
      {field.suffix && <span className="help">{field.suffix}</span>}
    </div>
  );
}
function GRSelect({ field, value, options, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o} className={value === o ? "active" : ""} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}
function GRDropdown({ value, options, onChange }) {
  return (
    <div className="gr-selectwrap">
      <select className="gr-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevDown" size={15} />
    </div>
  );
}
function GRToggleField({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button className={`toggle ${value ? "on" : ""}`} onClick={() => onChange(!value)} />
      <span className="help">{value ? "Enabled" : "Disabled"}</span>
    </div>
  );
}
function GRTagList({ field, value, onChange }) {
  const [t, setT] = React.useState("");
  const add = () => { const v = t.trim(); if (v && !value.includes(v)) { onChange([...value, v]); setT(""); } };
  return (
    <div className="gr-tagbox">
      <div className="gr-tagchips">
        {value.map((c, i) => (
          <span key={c + i} className="gr-tagchip">{c}<button onClick={() => onChange(value.filter((_, j) => j !== i))}><Icon name="x" size={11} /></button></span>
        ))}
        {value.length === 0 && <span className="help">No entries yet</span>}
      </div>
      <div className="gr-taginput">
        <div className="field"><Icon name="plus" size={14} color="var(--ink-4)" /><input value={t} placeholder={field.placeholder || "Add an entry"} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} /></div>
        <button className="btn btn-ghost btn-sm" onClick={add}>Add</button>
      </div>
    </div>
  );
}
function GRAxes({ value, onChange }) {
  const axes = ["Actor", "Target", "Value", "Action", "Scope"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
      {axes.map((a) => (
        <div key={a} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 60, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>{a}</span>
          <input type="range" className="gr-range" style={{ flex: 1 }} min={0} max={1} step={0.05} value={value[a]}
            onChange={(e) => onChange({ ...value, [a]: parseFloat(e.target.value) })} />
          <span className="mono" style={{ width: 36, textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{value[a].toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

function GRFieldEditor({ field, value, params, onChange }) {
  switch (field.type) {
    case "slider": return <GRSlider field={field} value={value} onChange={onChange} />;
    case "number": return <GRNumber field={field} value={value} onChange={onChange} />;
    case "select": return <GRSelect field={field} value={value} options={grOpts(field, params)} onChange={onChange} />;
    case "dropdown": return <GRDropdown value={value} options={grOpts(field, params)} onChange={onChange} />;
    case "toggle": return <GRToggleField value={value} onChange={onChange} />;
    case "taglist": return <GRTagList field={field} value={value} onChange={onChange} />;
    case "axes": return <GRAxes value={value} onChange={onChange} />;
    default: return null;
  }
}

/* ---------------- value preview (collapsed row) ---------------- */
function GRValue({ field, value }) {
  if (value == null) return <span className="gr-cfg-empty">—</span>;
  switch (field.type) {
    case "toggle": return <Pill tone={value ? "green" : "gray"} dot>{value ? "On" : "Off"}</Pill>;
    case "select": case "dropdown": return <Pill tone={value === "Block" ? "red" : "blue"}>{value}</Pill>;
    case "slider": return <span className="gr-cfg-num mono">{field.max === 1 ? Number(value).toFixed(2) : value}</span>;
    case "number": return <span className="gr-cfg-num mono">{value}{field.suffix ? " " + field.suffix : ""}</span>;
    case "axes": return <span className="gr-cfg-num mono">5 axes tuned</span>;
    case "taglist":
      if (value.length === 0) return <span className="gr-cfg-empty">None</span>;
      return <>{value.slice(0, 3).map((c, i) => <span key={i} className="gr-chip sm mono">{c}</span>)}{value.length > 3 && <span className="gr-cfg-more">+{value.length - 3} more</span>}</>;
    default: return <span className="gr-cfg-num">{String(value)}</span>;
  }
}

/* ---------------- a single configuration row ---------------- */
function ConfigRow({ field, params, value, editable, isEditing, onEdit, onDone, onChange, onRequestDraft, last }) {
  const showPencil = editable || !!onRequestDraft;
  const handlePencil = editable ? (isEditing ? onDone : onEdit) : onRequestDraft;
  return (
    <div className="gr-cfg-item">
      <div className="gr-cfg-row">
        <span className="gr-cfg-label">{field.label}</span>
        <div className="gr-cfg-val">{isEditing && editable && field.type !== "taglist" && field.type !== "axes" ? <GRFieldEditor field={field} value={value} params={params} onChange={onChange} /> : <GRValue field={field} value={value} />}</div>
        {showPencil && (
          <button className={`gr-cfg-edit ${isEditing ? "on" : ""}`} title={editable ? (isEditing ? "Done" : "Edit") : "Edit — creates a draft"} onClick={handlePencil}>
            <Icon name={isEditing ? "check" : "edit"} size={14} />
          </button>
        )}
      </div>
      {isEditing && editable && (field.type === "taglist" || field.type === "axes") && (
        <div className="gr-cfg-editor"><GRFieldEditor field={field} value={value} params={params} onChange={onChange} /></div>
      )}
    </div>
  );
}

/* ---------------- drawer (no tabs — Details with inline-editable Configuration) ---------------- */
function GuardrailDrawer({ meta, current, editable, onSave, onClose, onStartDraft }) {
  const hasConfig = meta.schema.length > 0;
  const [params, setParams] = React.useState(() => grClone(current.params));
  const [editKey, setEditKey] = React.useState(null);
  const dirty = !grEq(params, current.params);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onFieldChange = (key, v) => {
    setParams((p) => {
      const np = { ...p, [key]: v };
      if (key === "system") {                              // keep ticket status valid for the chosen system
        const opts = v === "ServiceNow" ? SNOW_STATUS : JIRA_STATUS;
        if (!opts.includes(np.ticketStatus)) np.ticketStatus = opts[0];
      }
      return np;
    });
  };

  const visible = grVisible(meta.schema, params);

  return (
    <>
      <div className="sp-scrim" onClick={onClose} />
      <div className="sp-panel" style={{ width: "44vw", maxWidth: 560, minWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="sp-head" style={{ paddingBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
              <Pill tone={GR_RISK_TONE[meta.risk]}>{meta.risk}</Pill>
              <Pill tone={current.enabled ? "green" : "gray"} dot>{current.enabled ? "Enabled" : "Disabled"}</Pill>
              {meta.locked && <Pill tone="gray"><Icon name="lock" size={11} /> Always on</Pill>}
            </div>
            <h2 className="sp-title" style={{ fontSize: 19 }}>{meta.name}</h2>
          </div>
          <button className="kebab" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="sp-body" style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div>
              <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 8 }}>What it evaluates</div>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{meta.evaluates}</p>
            </div>

            {meta.locked && (
              <div className="gr-banner draft" style={{ marginBottom: 0, background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--ink-3)" }}>
                <Icon name="lock" size={15} /> This is an always-on safety control and cannot be disabled or reconfigured.
              </div>
            )}

            {hasConfig && (
              <div>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                  <div className="eyebrow" style={{ fontSize: 10.5 }}>Configuration</div>
                  {editable
                    ? <span className="help" style={{ marginLeft: "auto", fontSize: 12 }}>Tap <Icon name="edit" size={11} style={{ verticalAlign: "-1px" }} /> to edit a setting</span>
                    : <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onStartDraft}><Icon name="edit" size={13} /> Edit</button>}
                </div>
                <div className="card gr-cfg">
                  {visible.map((f, i) => (
                    <ConfigRow key={f.key} field={f} params={params} value={params[f.key]} editable={editable}
                      isEditing={editKey === f.key}
                      onEdit={() => setEditKey(f.key)} onDone={() => setEditKey(null)}
                      onChange={(v) => onFieldChange(f.key, v)}
                      onRequestDraft={!editable ? onStartDraft : undefined}
                      last={i === visible.length - 1} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {editable && hasConfig && (
          <div className="sp-foot">
            <span className="help">{dirty ? "Unsaved changes — staged into the draft on save" : "No changes"}</span>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={!dirty} style={!dirty ? { opacity: 0.5, cursor: "not-allowed" } : null} onClick={() => onSave(meta.name, params)}>Stage into draft</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

Object.assign(window, {
  GR_RISK_TONE, GR_STATE_TONE, GR_ACTIONS, GUARD_META, GR_META_BY_NAME,
  grClone, defaultGuardSettings, grFmt, grEq, grDiff, GuardrailDrawer,
});
