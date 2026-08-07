/* global React, Icon, Pill, IntentProfile */
/* Decision Logs — list, split detail, trace-ID filter, intent profile entry */
const { useState: dlUseState, useMemo: dlUseMemo } = React;

const TRACE_MAIN = "17a86fecdaec43b1afb2548a922224f4";
const TRACE_INTENT = "00550138e7654f27943208d782a7b7a1";

function ctxFor(o) {
  return {
    access_state: "Active", agent_id: o.agent_id || "a44924267622d6027", agent_name: o.agent_name || "Explore#a4492426",
    agent_type: "subagent", bypass_attempt: false, command_risk: o.command_risk || "safe", connection_type: "local",
    declared_scope: o.declared_scope || "Review docs directory", escalation_score: 0, exfiltration_score: 0,
    file_path: o.file_path || "/Users/saisrungaram/claude-demo-project/docs/architecture.md", file_zone: "docs",
    git_email: "sai.srungaram99@gmail.com", git_name: "Reva Demo", github_branch_protected: true,
    github_default_branch: "master", github_repo: "saisrungaram-ai/claude-demo-project", github_visibility: "private",
    initial_scope: "spawn mutiple agents to review docs and tests file and summarize",
    injection_score: o.injection_score != null ? o.injection_score : (o.decision === "Deny" ? 100 : 0),
    intent_tier: "read", is_injection: o.decision === "Deny",
  };
}

function makeLog(o, i) {
  const traceId = o.traceId || TRACE_MAIN;
  return {
    id: i, time: "05 Jun, 26 | 10:18",
    principal: o.principal, principalType: o.principalType || "Agent",
    action: o.action, resource: o.resource, resourceKind: o.resourceKind,
    decision: o.decision,
    decisionId: o.decisionId || "f9cb3bf8-3a17-43ce-b00c-2b9cc0ab9e2a",
    traceId, spanId: o.spanId || "e8944b74096e6e6d", parentSpanId: o.parentSpanId || "e8944b74096e6e6d",
    policies: o.decision === "Deny"
      ? [{ name: "Cedar forbid policy matched", v: "V34", d: "Deny" }, { name: "Cedar forbid policy matched", v: "V34", d: "Deny" }]
      : [{ name: "Cedar permit policy matched", v: "V34", d: "Allow" }],
    intent: o.intent || null,
    _ctx: o,
  };
}

const RAW = [
  { principal: "saisrungaram:a44924267622d6027", action: "SubmitPrompt", resource: "prompt-injection", resourceKind: "Prompt", decision: "Deny", intent: { traceId: TRACE_MAIN } },
  { principal: "saisrungaram:a44924267622d6027", action: "RunBash", resource: 'cat /Users/saisrungaram/claude-demo-project/docs/architecture.md && echo "===== SEPARATOR =====" &&', resourceKind: "Command", decision: "Allow" },
  { principal: "saisrungaram:ad9acc5fb54faee49", action: "RunBash", resource: "ls -la /Users/saisrungaram/claude-demo-project/tests/", resourceKind: "Command", decision: "Allow", agent_id: "ad9acc5fb54faee49" },
  { principal: "saisrungaram:a44924267622d6027", action: "ReadFile", resource: "/Users/saisrungaram/claude-demo-project/docs/CONTRIBUTING.md", resourceKind: "File", decision: "Deny" },
  { principal: "saisrungaram:a44924267622d6027", action: "ReadFile", resource: "/Users/saisrungaram/claude-demo-project/docs/api-guide.md", resourceKind: "File", decision: "Deny" },
  { principal: "saisrungaram:a44924267622d6027", action: "ReadFile", resource: "/Users/saisrungaram/claude-demo-project/docs/setup.md", resourceKind: "File", decision: "Deny" },
  { principal: "saisrungaram:ad9acc5fb54faee49", action: "RunBash", resource: "find /Users/saisrungaram/claude-demo-project/tests -type f", resourceKind: "Command", decision: "Allow", agent_id: "ad9acc5fb54faee49" },
  { principal: "saisrungaram:a44924267622d6027", action: "ReadFile", resource: "/Users/saisrungaram/claude-demo-project/docs/changelog.md", resourceKind: "File", decision: "Deny" },
  { principal: "saisrungaram:a44924267622d6027", action: "ReadFile", resource: "/Users/saisrungaram/claude-demo-project/docs/architecture.md", resourceKind: "File", decision: "Deny" },
  { principal: "saisrungaram:ad9acc5fb54faee49", action: "RunBash", resource: 'find /Users/saisrungaram/claude-demo-project/tests -type f -name "*.py" -o -name "*.js" -o -name "*.', resourceKind: "Command", decision: "Allow", agent_id: "ad9acc5fb54faee49" },
  { principal: "securebank-finbot-action", action: "DelegateScope", resource: "mcp", resourceKind: "mcp", decision: "Deny", principalType: "Agent",
    traceId: TRACE_INTENT, decisionId: "78aff0b4-a3ad-4453-8acd-c618463614d4", time2: "03 Jun, 26 | 13:30", intent: { traceId: TRACE_INTENT } },
];

const LOGS = RAW.map((o, i) => makeLog(o, i));

const DEC_TONE = { Deny: "red", Allow: "green" };

/* ---------- toolbar ---------- */
function Toolbar({ traceFilter, onClearTrace }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
      <div className="search" style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 999 }}>
        {traceFilter && (
          <span className="pill pill-blue" style={{ height: 28, flex: "none" }}>
            Trace ID is {traceFilter.slice(0, 22)}…
            <button onClick={onClearTrace} style={{ border: 0, background: "transparent", padding: 0, marginLeft: 2, display: "grid", placeItems: "center", color: "var(--blue-700)", cursor: "pointer" }}><Icon name="x" size={13} /></button>
          </span>
        )}
        <input placeholder="Filter by column…" style={{ flex: 1 }} />
        {traceFilter && <><button className="kebab" onClick={onClearTrace} style={{ width: 28, height: 28 }}><Icon name="x" size={15} /></button><Icon name="search" size={17} color="var(--blue)" /></>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="help" style={{ fontSize: 13 }}>Show enrichment logs</span>
        <button className="toggle" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button className="kebab" title="Export"><Icon name="download" size={18} /></button>
        <button className="kebab" title="Filter" style={{ color: "var(--blue)", border: "1px solid rgba(37,99,235,.4)", background: "var(--blue-tint)" }}><Icon name="filter" size={17} /></button>
        <button className="kebab" title="Date range"><Icon name="calendar" size={18} /></button>
        <button className="kebab" title="Refresh"><Icon name="rotate" size={18} /></button>
      </div>
    </div>
  );
}

/* ---------- list table ---------- */
function LogTable({ logs, onOpen }) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <table className="tbl" style={{ tableLayout: "fixed", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ width: 160 }}>TimeStamp</th>
            <th style={{ width: 280 }}>Principal</th>
            <th style={{ width: 150 }}>Action</th>
            <th>Resource</th>
            <th style={{ width: 110, textAlign: "right" }}>Decision <Icon name="plus" size={13} color="var(--blue)" /></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="clickable" onClick={() => onOpen(l.id)}>
              <td className="sub" style={{ fontSize: 12.5 }}>{l._ctx.time2 || l.time}</td>
              <td>
                <div className="mono" style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.principal}</div>
                <div className="help" style={{ fontSize: 11.5, marginTop: 2 }}>{l.principalType}</div>
              </td>
              <td><span className="pill pill-gray" style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{l.action}</span></td>
              <td>
                <div className="mono" style={{ fontSize: 12.5, color: "var(--ink-2)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.resource}</div>
                <div className="help" style={{ fontSize: 11.5, marginTop: 2 }}>{l.resourceKind}</div>
              </td>
              <td style={{ textAlign: "right" }}><Pill tone={DEC_TONE[l.decision]}>{l.decision}</Pill></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- left rail card (detail mode) ---------- */
function RailCard({ log, active, onClick }) {
  const ok = log.decision === "Allow";
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: "pointer", marginBottom: 10,
      background: active ? "var(--blue-tint)" : "#fff", border: `1.5px solid ${active ? "var(--blue)" : "var(--border)"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 84 }}>{log.principal.split(":")[0]}</span>
        <Icon name="arrowRight" size={12} color="var(--ink-4)" />
        <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{log.resource.length > 16 ? log.resource.slice(0, 16) + "…" : log.resource}</span>
        <span className="pill pill-gray" style={{ height: 22, fontSize: 11, fontFamily: "var(--mono)" }}>{log.action}</span>
        <span style={{ width: 18, height: 18, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", background: ok ? "var(--green)" : "var(--red)" }}>
          <Icon name={ok ? "check" : "x"} size={11} color="#fff" />
        </span>
      </div>
      <div className="help" style={{ fontSize: 11.5, marginTop: 6 }}>{log._ctx.time2 || log.time}</div>
    </button>
  );
}

/* ---------- detail field ---------- */
function DField({ label, children, mono }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 5 }}>{label}</div>
      <div className={mono ? "mono" : ""} style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500, wordBreak: "break-all" }}>{children}</div>
    </div>
  );
}

function KvRow({ k, v, last }) {
  let color = "var(--ink-2)";
  if (typeof v === "number") color = "var(--blue)";
  else if (typeof v === "boolean") color = "var(--teal)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, padding: "11px 0", borderBottom: last ? 0 : "1px solid var(--border)", alignItems: "center" }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--blue)" }}>{k}</span>
      <span className="mono" style={{ fontSize: 12.5, color, wordBreak: "break-all" }}>{v === "" ? "—" : String(v)}</span>
    </div>
  );
}

function CopyBtn({ text }) {
  const [d, setD] = dlUseState(false);
  return <button className="kebab" style={{ width: 26, height: 26 }} onClick={() => { setD(true); setTimeout(() => setD(false), 1200); }}><Icon name={d ? "check" : "copy"} size={14} color={d ? "var(--green)" : "var(--ink-4)"} /></button>;
}

function DetailPanel({ log, onClose, onTraceFilter, onIntent }) {
  const body = {
    decision_id: log.decisionId, policy_store_id: "fb3ffd57-6759-4ca3-b768-0230804a03b5",
    subject: `${log.principalType}::${log.principal}`, action: log.action,
    resource: `${log.resourceKind}::${log.resource.length > 30 ? log.resource.slice(0, 30) + "…" : log.resource}`,
    decision: log.decision.toLowerCase(), reason: "", latency_ms: 0, source: "pdp",
    policy_store_name: "AI Coding Agents", application_name: "uncategorized", environment: "Default",
    parent_span_id: log.parentSpanId, trace_id: log.traceId, trace_source: "request-body",
  };
  const bodyEntries = Object.entries(body);
  const ctx = ctxFor(log._ctx);
  const ctxEntries = Object.entries(ctx);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
      {/* top grid */}
      <div style={{ position: "relative" }}>
        <button className="kebab" onClick={onClose} style={{ position: "absolute", top: 0, right: 0, width: 32, height: 32, borderRadius: "50%", background: "var(--blue-tint)", color: "var(--blue)" }}><Icon name="x" size={17} /></button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 40px", paddingRight: 40 }}>
          <DField label="Source"><Pill tone="blue">PDP</Pill></DField>
          <DField label="Decision"><Pill tone={DEC_TONE[log.decision]}>{log.decision}</Pill></DField>
          <DField label="Decision ID" mono>{log.decisionId}</DField>
          <DField label="Timestamp">{log._ctx.time2 || log.time}</DField>
          <DField label="Principal" mono>{log.principal}</DField>
          <DField label="Action">{log.action}</DField>
          <DField label="Resource" mono>{log.resource.length > 40 ? log.resource.slice(0, 40) + "…" : log.resource}</DField>
          <DField label="Trace ID">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="mono" style={{ fontSize: 12.5 }}>{log.traceId}</span>
              <CopyBtn text={log.traceId} />
              <button className="kebab" title="Filter with TraceID" onClick={onTraceFilter} style={{ width: 26, height: 26 }}><Icon name="filter" size={14} color="var(--blue)" /></button>
            </div>
            {log.intent && (
              <button onClick={onIntent} style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid rgba(234,88,12,.3)", background: "var(--coral-tint)", color: "var(--coral-ink)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                <Icon name="flame" size={14} color="var(--coral)" /> View Intent Profile <Icon name="arrowRight" size={13} />
              </button>
            )}
          </DField>
        </div>
      </div>

      {/* evaluated policies */}
      <div style={{ marginTop: 26 }}>
        <div className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>Evaluated Policies</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {log.policies.map((p, i) => (
            <div key={i} className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <span className="pill pill-blue" style={{ height: 22 }}>{p.v}</span>
                <Pill tone={DEC_TONE[p.d]}>{p.d}</Pill>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* raw logs */}
      <div style={{ marginTop: 26 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <div className="section-title" style={{ fontSize: 16 }}>Raw Logs</div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="help" style={{ fontSize: 13 }}>Beautify</span><button className="toggle on" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 9 }}>Service</div>
            <span className="pill" style={{ background: "#EAF1FF", color: "#3258d6", fontFamily: "var(--mono)" }}>pdp</span>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 9 }}>Scope</div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="pill pill-purple" style={{ fontFamily: "var(--mono)" }}>log-processor</span>
              <span className="pill pill-purple" style={{ fontFamily: "var(--mono)" }}>v1.0.0</span>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Log Record</span>
            <span className="pill pill-amber" style={{ height: 20, fontSize: 10.5 }}>WARN</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 40px", marginBottom: 16 }}>
            <DField label="Timestamp" mono>{log._ctx.time2 || log.time}</DField>
            <DField label="Observed Timestamp" mono>{log._ctx.time2 || log.time}</DField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px 24px" }}>
            <DField label="Trace ID" mono>{log.traceId}</DField>
            <DField label="Span ID" mono>{log.spanId}</DField>
            <DField label="Parent Span ID" mono>{log.parentSpanId}</DField>
          </div>
        </div>
      </div>

      {/* decision context */}
      <div className="card" style={{ marginTop: 16, padding: 18, borderLeft: "3px solid var(--blue)" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 14 }}>Decision Context</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 8 }}>Application</div>
            <span className="pill pill-blue">uncategorized</span>
          </div>
          <div>
            <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 8 }}>Policy Store</div>
            <span className="pill pill-blue">AI Coding Agents</span>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="card" style={{ marginTop: 16, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Body</span>
          <span className="pill pill-blue" style={{ marginLeft: "auto", height: 22 }}>{bodyEntries.length}</span>
        </div>
        <div>
          {bodyEntries.map(([k, v], i) => <KvRow key={k} k={k} v={v} last={i === bodyEntries.length - 1} />)}
        </div>
      </div>

      {/* context JSON */}
      <div className="card" style={{ marginTop: 16, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--blue)" }}>context</span>
          <span className="pill pill-amber" style={{ height: 20, fontSize: 10.5 }}>JSON</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {ctxEntries.map(([k, v]) => {
            let color = "var(--ink-2)";
            if (typeof v === "number") color = "var(--blue)";
            else if (typeof v === "boolean") color = "var(--teal)";
            return (
              <div key={k} style={{ display: "flex", gap: 8, fontSize: 12.5 }}>
                <span style={{ fontWeight: 600, color: "var(--blue)", whiteSpace: "nowrap" }}>{k}:</span>
                <span className="mono" style={{ color, wordBreak: "break-all" }}>{String(v)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- confirm modal ---------- */
function ReplaceFiltersModal({ onCancel, onConfirm }) {
  return (
    <div className="cf-scrim" onClick={onCancel}>
      <div className="cf-box" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>Replace filters?</h3>
          <button className="kebab" style={{ marginLeft: "auto", border: "1px solid var(--border-strong)" }} onClick={onCancel}><Icon name="x" size={17} /></button>
        </div>
        <p className="sub" style={{ margin: "0 0 20px", fontSize: 13.5 }}>This will clear all current filters and apply the Trace ID filter instead.</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm}>Replace Filters</button>
        </div>
      </div>
    </div>
  );
}

function DecisionLogs() {
  const [openId, setOpenId] = dlUseState(null);
  const [traceFilter, setTraceFilter] = dlUseState(null);
  const [confirmTrace, setConfirmTrace] = dlUseState(null);
  const [intentTrace, setIntentTrace] = dlUseState(null);

  const visible = dlUseMemo(() => traceFilter ? LOGS.filter((l) => l.traceId === traceFilter) : LOGS, [traceFilter]);
  const openLog = openId != null ? LOGS.find((l) => l.id === openId) : null;

  if (intentTrace) {
    return <window.IntentProfile traceId={intentTrace} onBack={() => setIntentTrace(null)} />;
  }

  return (
    <div style={{ padding: "24px 28px", height: "calc(100vh - 195px)", display: "flex", flexDirection: "column" }}>
      <Toolbar traceFilter={traceFilter} onClearTrace={() => setTraceFilter(null)} />

      {openLog ? (
        <div style={{ flex: 1, display: "flex", gap: 16, minHeight: 0 }}>
          <div style={{ width: 360, flex: "none", overflowY: "auto", paddingRight: 4 }}>
            {visible.map((l) => <RailCard key={l.id} log={l} active={l.id === openId} onClick={() => setOpenId(l.id)} />)}
          </div>
          <div className="card" style={{ flex: 1, minWidth: 0, display: "flex", overflow: "hidden" }}>
            <DetailPanel log={openLog} onClose={() => setOpenId(null)}
              onTraceFilter={() => setConfirmTrace(openLog.traceId)}
              onIntent={() => setIntentTrace(openLog.intent.traceId)} />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <LogTable logs={visible} onOpen={(id) => setOpenId(id)} />
        </div>
      )}

      {confirmTrace && (
        <ReplaceFiltersModal onCancel={() => setConfirmTrace(null)}
          onConfirm={() => { setTraceFilter(confirmTrace); setConfirmTrace(null); setOpenId(null); }} />
      )}
    </div>
  );
}

window.DecisionLogs = DecisionLogs;
