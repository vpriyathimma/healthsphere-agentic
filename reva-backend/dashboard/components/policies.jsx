/* global React, Icon, Pill */
/* Policies tab — Cedar policy management: view → edit draft → policy list → editor */
const { useState: poUseState, useRef: poUseRef } = React;

const POLICY_ROWS = [
  { id: 1, name: "Read Files", desc: "Developers can read files if active", principal: "ClaudeCode · Developer", resource: "ALL", action: "ReadFile", access: "Permit",
    code: `permit (\n    principal is ClaudeCode::Developer,\n    action == ClaudeCode::Action::"ReadFile",\n    resource\n)\nwhen { context has session_active && context.session_active == true };` },
  { id: 2, name: "ShellCommandsExecution-IntentMatch", desc: `A JIRA ticket exists and is "In Progress", the user's OAuth email matches the JIRA assignee email, the GitHub branch is unprotected, trust is sufficient.`, principal: "ClaudeCode · Developer", resource: "ClaudeCode · Command", action: "RunBash", access: "Permit",
    code: `permit (\n    principal is ClaudeCode::Developer,\n    action == ClaudeCode::Action::"RunBash",\n    resource is ClaudeCode::Command\n)\nwhen {\n    context has jira_ticket_status && context.jira_ticket_status == "In Progress"\n    && context has email_matches_assignee && context.email_matches_assignee == true\n    && context has branch_protected && context.branch_protected == false\n    && context has trust_score && context.trust_score > 30\n};` },
  { id: 3, name: "Sensitive File Operations – AppSec", desc: "The file is in a sensitive zone (secrets or config), there's an active JIRA ticket assigned to the authenticated user, the ticket is in progress.", principal: "ClaudeCode · Developer", resource: "ClaudeCode · File", action: "EditFile", access: "Permit",
    code: `permit (\n    principal is ClaudeCode::Developer,\n    action == ClaudeCode::Action::"EditFile",\n    resource is ClaudeCode::File\n)\nwhen {\n    context has file_zone && context.file_zone == "sensitive"\n    && context has jira_ticket_exists && context.jira_ticket_exists == true\n    && context has appsec_reviewed && context.appsec_reviewed == true\n};` },
  { id: 4, name: "Sensitive MCP Operations", desc: "A JIRA ticket exists AND the trust score is above 30 AND the injection risk score is below 30", principal: "ClaudeCode · Developer", resource: "ClaudeCode · Mcptool", action: "MCPWrite", access: "Permit",
    code: `permit (\n    principal is ClaudeCode::Developer,\n    action == ClaudeCode::Action::"MCPWrite",\n    resource is ClaudeCode::MCPTool\n)\nwhen { context has jira_ticket_exists && context.jira_ticket_exists == true && context has trust_score && context.trust_score > 30 && context has injection_score && context.injection_score < 30 };` },
  { id: 5, name: "Read Access — Unrestricted for Active Sessions", desc: "—", principal: "ClaudeCode · Developer", resource: "ClaudeCode · File", action: "ReadFile", access: "Permit",
    code: `permit (\n    principal is ClaudeCode::Developer,\n    action == ClaudeCode::Action::"ReadFile",\n    resource is ClaudeCode::File\n);` },
  { id: 6, name: "RestrictedProjectWriteOperations", desc: `The project name is "reva-auth-service" AND the connection type is not SSH (must be local, remote, or another non-SSH connection type)`, principal: "ALL", resource: "ClaudeCode · File", action: "WriteFile", access: "Forbid",
    code: `forbid (\n    principal,\n    action == ClaudeCode::Action::"WriteFile",\n    resource is ClaudeCode::File\n)\nwhen { context has project_name && context.project_name == "reva-auth-service" && context has connection_type && context.connection_type != "SSH" };` },
  { id: 7, name: "Edit File with Jira In Progress and Approved", desc: "Developer can edit file if Jira ticket is in progress, branch is protected, and approved", principal: "ClaudeCode · Developer", resource: "ClaudeCode · File", action: "EditFile", access: "Permit",
    code: `permit (\n    principal is ClaudeCode::Developer,\n    action == ClaudeCode::Action::"EditFile",\n    resource is ClaudeCode::File\n)\nwhen {\n    context has jira_ticket_status && context.jira_ticket_status == "In Progress"\n    && context has branch_protected && context.branch_protected == true\n    && context has approved && context.approved == true\n};` },
  { id: 8, name: "Forbid Destructive Bash Commands", desc: "Prevent running destructive Bash commands", principal: "ALL", resource: "ALL", action: "RunBash", access: "Forbid",
    code: `forbid (\n    principal,\n    action == ClaudeCode::Action::"RunBash",\n    resource\n)\nwhen { context has command_class && context.command_class == "destructive" };` },
  { id: 9, name: "Run Bash Commands", desc: "Developers can run safe Bash commands if active", principal: "ClaudeCode · Developer", resource: "ClaudeCode · Command", action: "RunBash", access: "Permit",
    code: `permit (\n    principal is ClaudeCode::Developer,\n    action == ClaudeCode::Action::"RunBash",\n    resource is ClaudeCode::Command\n)\nwhen { context has command_class && context.command_class == "safe" && context has session_active && context.session_active == true };` },
  { id: 10, name: "Run Safe Bash Commands", desc: "Product management can run safe Bash commands if active", principal: "Department · Productmanagement", resource: "ClaudeCode · Command", action: "RunBash", access: "Permit",
    code: `permit (\n    principal is Department::Productmanagement,\n    action == ClaudeCode::Action::"RunBash",\n    resource is ClaudeCode::Command\n)\nwhen { context has command_class && context.command_class == "safe" && context has session_active && context.session_active == true };` },
  { id: 11, name: "DetectIntentDrift", desc: "—", principal: "ALL", resource: "ALL", action: "RunBash", access: "Forbid",
    code: `forbid (\n    principal,\n    action == ClaudeCode::Action::"RunBash",\n    resource\n)\nwhen { context has intent_drift_score && context.intent_drift_score > 60 };` },
  { id: 12, name: "Just-in-Time Access Validation", desc: "—", principal: "ClaudeCode · Developer", resource: "ClaudeCode · Command", action: "RunBash", access: "Permit",
    code: `permit (\n    principal is ClaudeCode::Developer,\n    action == ClaudeCode::Action::"RunBash",\n    resource is ClaudeCode::Command\n)\nwhen { context has jit_grant_active && context.jit_grant_active == true };` },
  { id: 13, name: "Write MCP for Product Management", desc: "Product managers can write MCP if approved and active", principal: "Department · Productmanagement", resource: "MCPServer · Claude_ai_atlassian_rovo", action: "MCPWrite", access: "Permit",
    code: `permit (\n    principal is Department::Productmanagement,\n    action == ClaudeCode::Action::"MCPWrite",\n    resource == MCPServer::"Claude_ai_atlassian_rovo"\n)\nwhen { context has approved && context.approved == true && context has session_active && context.session_active == true };` },
  { id: 14, name: "Baseline Safety Floor", desc: "Global floor blocks all actions on a high injection score", principal: "ALL", resource: "ALL", action: "ReadFile", access: "Forbid",
    code: `forbid (\n    principal,\n    action,\n    resource\n)\nwhen { context has injection_score && context.injection_score >= 70 };` },
];

const ACTION_TONE = { ReadFile: "#3258d6", RunBash: "#7c3aed", EditFile: "#0d9488", WriteFile: "#b45309", MCPWrite: "#c026d3" };

function ActionChip({ action }) {
  return <span className="mono" style={{ display: "inline-flex", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "var(--surface-3)", color: ACTION_TONE[action] || "var(--ink-3)" }}>{action}</span>;
}

function PrincipalCell({ p }) {
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", lineHeight: 1.6 }}>
        <span style={{ whiteSpace: "nowrap" }}>{p.principal}</span>
        <span style={{ color: "var(--ink-4)", margin: "0 7px" }}>→</span>
        <span style={{ whiteSpace: "nowrap" }}>{p.resource}</span>
      </div>
      <div style={{ marginTop: 7 }}><ActionChip action={p.action} /></div>
    </div>
  );
}

function AccessPill({ access }) {
  return <Pill tone={access === "Permit" ? "green" : "red"}>{access}</Pill>;
}

const UPDATED = "3 Jun 2026, 15:11";

/* Toolbar icon button */
function TBtn({ name, active, onClick, title }) {
  return (
    <button className="kebab" title={title} onClick={onClick} style={{ width: 34, height: 34, color: active ? "var(--red)" : "var(--ink-4)" }}>
      <Icon name={name} size={18} />
    </button>
  );
}

function MiniToast({ msg }) {
  if (!msg) return null;
  return (
    <div className="toast-host"><div className="toast"><Icon name="checkCircle" size={16} color="#5eead4" />{msg}</div></div>
  );
}

/* ---------- Cedar highlight ---------- */
function highlightCedar(code) {
  const re = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|\b(permit|forbid|when|unless|principal|action|resource|is|has|in|like|true|false|context)\b|\b(\d+)\b|(==|!=|>=|<=|&&|\|\||>|<)/g;
  const lines = code.split("\n");
  return lines.map((line, li) => {
    const parts = []; let last = 0, m; re.lastIndex = 0;
    while ((m = re.exec(line))) {
      if (m.index > last) parts.push({ c: "var(--ink-2)", v: line.slice(last, m.index) });
      if (m[1]) parts.push({ c: "var(--ink-4)", v: m[1] });
      else if (m[2]) parts.push({ c: "#15803D", v: m[2] });
      else if (m[3]) parts.push({ c: "var(--blue)", v: m[3], b: 1 });
      else if (m[4]) parts.push({ c: "var(--purple)", v: m[4] });
      else if (m[5]) parts.push({ c: "var(--teal)", v: m[5] });
      last = re.lastIndex;
    }
    if (last < line.length) parts.push({ c: "var(--ink-2)", v: line.slice(last) });
    return (
      <div key={li} style={{ display: "flex", minHeight: 22 }}>
        <span style={{ width: 40, flex: "none", textAlign: "right", paddingRight: 14, color: "var(--ink-4)", userSelect: "none" }}>{li + 1}</span>
        <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {parts.map((p, i) => <span key={i} style={{ color: p.c, fontWeight: p.b ? 600 : 400 }}>{p.v}</span>)}
        </span>
      </div>
    );
  });
}

const BLANK_TEMPLATE = `permit (\n    principal,\n    action,\n    resource\n)\nwhen {\n    \n};`;

function PolicyEditor({ policy, onBack, onPublish, onDelete }) {
  const isNew = !policy;
  const [draft, setDraft] = poUseState(isNew ? BLANK_TEMPLATE : policy.code);
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "18px 22px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
        <button className="kebab" onClick={onBack} style={{ marginTop: 2 }}><Icon name="arrowLeft" size={18} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{isNew ? "New policy" : policy.name}</span>
            <Icon name="sparkles" size={16} color="var(--purple)" />
          </div>
          <div className="help" style={{ marginTop: 3 }}>{isNew ? "Write a Cedar policy below, then publish." : (policy.desc === "—" ? "No description" : policy.desc)}</div>
        </div>
        {!isNew && <button className="kebab" onClick={onDelete}><Icon name="trash" size={17} color="var(--ink-4)" /></button>}
      </div>
      <div style={{ padding: 22 }}>
        {isNew ? (
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "#fff", fontFamily: "var(--mono)", fontSize: 12.5, lineHeight: "22px" }}>
            <div style={{ width: 40, flex: "none", background: "var(--surface-2)", borderRight: "1px solid var(--border)", padding: "14px 0", textAlign: "right" }}>
              {draft.split("\n").map((_, i) => <div key={i} style={{ paddingRight: 12, color: "var(--ink-4)" }}>{i + 1}</div>)}
            </div>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false}
              style={{ flex: 1, border: 0, outline: 0, resize: "vertical", minHeight: 240, padding: "14px 16px", fontFamily: "var(--mono)", fontSize: 12.5, lineHeight: "22px", color: "var(--ink-2)", background: "#fff" }} />
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
              <Icon name="fileCode" size={14} color="var(--ink-4)" />
              <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>policy.cedar</span>
              <span className="pill pill-gray" style={{ marginLeft: "auto", height: 20, fontSize: 10.5 }}>Cedar</span>
            </div>
            <div style={{ padding: "14px 16px", fontFamily: "var(--mono)", fontSize: 12.5, lineHeight: "22px" }}>
              {highlightCedar(draft)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PoliciesTab() {
  const [mode, setMode] = poUseState("view");      // view | edit | editor
  const [showModal, setShowModal] = poUseState(false);
  const [selectedDraft, setSelectedDraft] = poUseState(null);
  const [editingPolicy, setEditingPolicy] = poUseState(undefined); // undefined=none, null=new
  const [policies, setPolicies] = poUseState(POLICY_ROWS);
  const [toast, setToast] = poUseState(null);
  const fireToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const goEditor = (p) => { setEditingPolicy(p); setMode("editor"); };
  const publish = () => { setMode("view"); setEditingPolicy(undefined); fireToast("Draft published — policies are now live"); };
  const removePolicy = (id) => setPolicies((ps) => ps.filter((p) => p.id !== id));

  /* ----- VIEW MODE ----- */
  if (mode === "view") {
    return (
      <div style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span className="help">{policies.length} policies · published</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <TBtn name="filter" title="Filter" /><TBtn name="download" title="Export" /><TBtn name="flag" title="Flags" />
            <TBtn name="columns" title="Columns" /><TBtn name="sitemap" title="Graph view" />
            <button className="btn btn-primary btn-sm" style={{ marginLeft: 6 }} onClick={() => { setShowModal(true); setSelectedDraft("draft1"); }}>Edit</button>
          </div>
        </div>
        <PolicyTable policies={policies} numbered onRowClick={null} />
        {showModal && (
          <EditPolicyModal selected={selectedDraft} onSelect={setSelectedDraft}
            onClose={() => setShowModal(false)}
            onCreateDraft={() => { setShowModal(false); setMode("edit"); fireToast("New draft created"); }}
            onEdit={() => { setShowModal(false); setMode("edit"); }} />
        )}
        <MiniToast msg={toast} />
      </div>
    );
  }

  /* ----- EDITOR VIEW ----- */
  if (mode === "editor") {
    return (
      <div style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
          <span className="pill pill-amber">Draft 1 · unpublished</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <TBtn name="filter" title="Filter" /><TBtn name="flag" active title="Flags" /><TBtn name="download" title="Export" /><TBtn name="columns" title="Columns" /><TBtn name="sitemap" title="Graph view" />
            <button className="btn btn-primary btn-sm" style={{ marginLeft: 6 }} onClick={publish}>Publish</button>
            <button className="kebab" style={{ border: "1px solid var(--border-strong)" }} onClick={() => setMode("edit")}><Icon name="x" size={18} /></button>
          </div>
        </div>
        <PolicyEditor policy={editingPolicy} onBack={() => setMode("edit")} onPublish={publish}
          onDelete={() => { if (editingPolicy) removePolicy(editingPolicy.id); setMode("edit"); fireToast("Policy deleted from draft"); }} />
        <MiniToast msg={toast} />
      </div>
    );
  }

  /* ----- EDIT (DRAFT LIST) MODE ----- */
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
        <span className="pill pill-amber">Editing · Draft 1</span>
        <span className="help" style={{ marginLeft: 8 }}>{policies.length} policies · click a row to open the editor</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <TBtn name="filter" title="Filter" /><TBtn name="flag" active title="Flags" /><TBtn name="download" title="Import" /><TBtn name="columns" title="Columns" /><TBtn name="sitemap" title="Graph view" />
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6, color: "var(--blue)", borderColor: "rgba(37,99,235,.4)" }} onClick={() => goEditor(null)}><Icon name="plus" size={15} /> Policy</button>
          <button className="btn btn-primary btn-sm" onClick={publish}>Publish</button>
          <button className="kebab" style={{ border: "1px solid var(--border-strong)" }} onClick={() => setMode("view")}><Icon name="x" size={18} /></button>
        </div>
      </div>
      <PolicyTable policies={policies} numbered editable onRowClick={goEditor} onDelete={removePolicy} />
      <MiniToast msg={toast} />
    </div>
  );
}

function PolicyTable({ policies, numbered, editable, onRowClick, onDelete }) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <table className="tbl">
        <thead>
          <tr>
            {numbered && <th style={{ width: 44 }}></th>}
            <th style={{ width: 220 }}>Name</th>
            <th>Description</th>
            <th style={{ width: 320 }}>Principal → Resource [Action]</th>
            <th style={{ width: 100 }}>Access</th>
            <th style={{ width: 150 }}>Last Updated</th>
            {editable && <th style={{ width: 48 }}></th>}
          </tr>
        </thead>
        <tbody>
          {policies.map((p, i) => (
            <tr key={p.id} className={onRowClick ? "clickable" : ""} onClick={onRowClick ? () => onRowClick(p) : undefined}>
              {numbered && <td><span style={{ display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: "50%", background: "var(--surface-3)", color: "var(--ink-3)", fontSize: 11.5, fontWeight: 700 }}>{i + 1}</span></td>}
              <td><span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13.5 }}>{p.name}</span></td>
              <td className="sub" style={{ fontSize: 12.5, maxWidth: 280 }}>
                <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.desc}</span>
              </td>
              <td><PrincipalCell p={p} /></td>
              <td><AccessPill access={p.access} /></td>
              <td className="sub mono" style={{ fontSize: 12 }}>{UPDATED}</td>
              {editable && <td className="right"><button className="kebab" onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}><Icon name="trash" size={16} color="var(--ink-4)" /></button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditPolicyModal({ selected, onSelect, onClose, onCreateDraft, onEdit }) {
  return (
    <div className="cf-scrim" onClick={onClose}>
      <div className="cf-box" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>Edit Policy</h3>
          <Icon name="info" size={15} color="var(--ink-4)" />
          <button className="kebab" style={{ marginLeft: "auto", border: "1px solid var(--border-strong)" }} onClick={onClose}><Icon name="x" size={17} /></button>
        </div>
        <p className="help" style={{ margin: "0 0 16px" }}>Select to edit an existing draft or create a new one.</p>
        <button onClick={() => onSelect("draft1")} style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 11, padding: "14px 16px", textAlign: "left", borderRadius: 12, cursor: "pointer", background: selected === "draft1" ? "var(--blue-tint)" : "#fff", border: `1.5px solid ${selected === "draft1" ? "var(--blue)" : "var(--border-strong)"}` }}>
          <span style={{ width: 18, height: 18, borderRadius: "50%", marginTop: 1, flex: "none", display: "grid", placeItems: "center", border: `2px solid ${selected === "draft1" ? "var(--blue)" : "var(--border-strong)"}` }}>
            {selected === "draft1" && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--blue)" }} />}
          </span>
          <span>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Draft 1</span>
            <span className="help" style={{ fontSize: 12 }}>Created by Patrick Fuller on 28 May, 26 · 21:02</span>
          </span>
        </button>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onCreateDraft}>Create New Draft</button>
          <button className="btn btn-primary" disabled={!selected} style={!selected ? { opacity: .5, cursor: "not-allowed" } : null} onClick={onEdit}>Edit</button>
        </div>
      </div>
    </div>
  );
}

window.PoliciesTab = PoliciesTab;
