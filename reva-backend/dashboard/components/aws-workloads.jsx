/* global React, Icon, Pill, Donut, Search */
/* AWS Agentic AI Workloads — Insights tab with real discovery data.
   Field names match discovery.js response exactly:
     agents[], gateways[], gatewayTargets[], nhis[], users[], groups[], lambdaFunctions[], iamRoles[], relationships[]
   NHI = IAM Roles + Workload Identities + OAuth Credential Providers */

const { useState, useEffect, useMemo } = React;

const AWS_TABS = ["Insights", "Policies", "Guardrails", "Decision Logs", "Settings"];

/* ─── Page Header ─── */
function AwsPageHeader({ onRediscover, loading }) {
  return (
    <div style={{ padding: "22px 32px 0" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: "#fff", border: "1px solid var(--border)", display: "grid", placeItems: "center", flex: "none", boxShadow: "var(--shadow-card)" }}>
          {window.Mark ? <window.Mark brand="aws" size={28} /> : <Icon name="cloud" size={24} color="var(--ink-3)" />}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>AWS Agentic AI Workloads</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
            <Pill tone="blue">HealthSphere</Pill>
            <Pill tone="green" dot>Connected</Pill>
            <Pill tone="purple">AgentCore · us-west-2</Pill>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={onRediscover} disabled={loading}>
            <Icon name="rotate" size={14} /> {loading ? "Discovering…" : "Re-discover"}
          </button>
          <button className="kebab" style={{ border: "1px solid var(--border-strong)" }}><Icon name="kebab" size={18} /></button>
        </div>
      </div>
    </div>
  );
}

function AwsTabBar({ active, onChange }) {
  return (
    <div style={{ padding: "0 32px", marginTop: 18, background: "#fff", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 4 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {AWS_TABS.map(function (t) { var on = t === active; return (
          <button key={t} onClick={function () { onChange(t); }} style={{ position: "relative", border: 0, background: "transparent", padding: "14px 14px 15px", fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", color: on ? "var(--ink)" : "var(--ink-3)", transition: "color .15s", cursor: "pointer" }}>
            {t}{on && <span style={{ position: "absolute", left: 8, right: 8, bottom: -1, height: 2.5, background: "var(--blue)", borderRadius: 2 }} />}
          </button>);
        })}
      </div>
    </div>
  );
}

function AwsKpiTile({ label, value, tone, active, onClick, foot }) {
  var tones = { blue: { bg: "var(--blue-tint)", accent: "var(--blue)", border: "rgba(37,99,235,.25)" }, purple: { bg: "#F5F3FF", accent: "#7C3AED", border: "rgba(124,58,237,.2)" }, green: { bg: "#ECFDF5", accent: "#16A34A", border: "rgba(22,163,74,.2)" }, amber: { bg: "#FFFBEB", accent: "#F59E0B", border: "rgba(245,158,11,.25)" } };
  var t = tones[tone] || tones.blue;
  return (
    <button onClick={onClick} className="card" style={{ cursor: "pointer", padding: "16px 18px", textAlign: "left", transition: "all .15s", border: active ? "2px solid " + t.accent : "1px solid var(--border)", background: active ? t.bg : "#fff" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>{value}</div>
      {foot && <div style={{ marginTop: 10 }}>{foot}</div>}
    </button>
  );
}

function AwsCardHead({ title, right }) {
  return (<div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{title}</span>{right}</div>);
}

function AwsField({ label, children, mono }) {
  return (<div><div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div><div className={mono ? "mono" : ""} style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, wordBreak: "break-all" }}>{children || <span style={{ color: "var(--ink-4)" }}>—</span>}</div></div>);
}

/* ─── NHI Detail Section ─── */
function AwsNhiSection({ nhi }) {
  if (!nhi) return null;
  var isIamRole = nhi.nhiType === "IAM Role";
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ background: "var(--surface-2)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)" }}>
        <Icon name="key" size={12} color="var(--amber-ink)" />
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", flex: 1 }}>{nhi.nhiSubType || nhi.nhiType}</span>
        <Pill tone={nhi.usedBy ? "green" : "red"}>{nhi.usedBy ? "Mapped" : "Orphan"}</Pill>
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
        <AwsField label="Name" mono>{nhi.name}</AwsField>
        {nhi.arn && <AwsField label="ARN" mono>{nhi.arn}</AwsField>}
        {nhi.nhiType === "M2M Credential" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nhi.clientId && <AwsField label="Client ID" mono>{nhi.clientId}</AwsField>}
            {nhi.credentialType && <AwsField label="Type">{nhi.credentialType}{nhi.hasSecret ? " · has secret" : ""}</AwsField>}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Presented outbound by (authenticates as)</div>
              {nhi.usedOutbound && nhi.usedOutbound.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {nhi.usedOutbound.map(function (u, i) { return <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: "var(--blue-tint)", color: "var(--blue-700)", fontSize: 10.5, fontWeight: 600 }}><Icon name="bot" size={10} color="var(--blue-700)" />{u.name}{u.via ? " · " + u.via : ""}</span>; })}
                </div>
              ) : <span style={{ fontSize: 11, color: "var(--ink-4)", fontStyle: "italic" }}>Not presented by any agent</span>}
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Accepted inbound by (who trusts it)</div>
              {nhi.usedInbound && nhi.usedInbound.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {nhi.usedInbound.map(function (u, i) { return <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: "#ECFDF5", color: "#065F46", fontSize: 10.5, fontWeight: 600 }}><Icon name={u.type === "Gateway" ? "sitemap" : "bot"} size={10} color="#065F46" />{u.name}</span>; })}
                </div>
              ) : <span style={{ fontSize: 11, color: "var(--ink-4)", fontStyle: "italic" }}>Not accepted by any runtime/gateway</span>}
            </div>
          </div>
        )}
        {nhi.usedBy && nhi.nhiType !== "M2M Credential" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--ink-3)", fontSize: 11 }}>Used by</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: "var(--blue-tint)", color: "var(--blue-700)", fontSize: 10.5, fontWeight: 600 }}>
              <Icon name={nhi.usedBy.type === "Agent" ? "bot" : nhi.usedBy.type === "Gateway" ? "sitemap" : "zap"} size={10} color="var(--blue-700)" />{nhi.usedBy.name}
            </span>
          </div>
        )}
        {nhi.usedFor && <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontStyle: "italic" }}>{nhi.usedFor}</div>}
        {nhi.description && <AwsField label="Description">{nhi.description}</AwsField>}
        {nhi.vendor && <AwsField label="Vendor">{nhi.vendor}</AwsField>}
        {nhi.roleLastUsed && nhi.roleLastUsed.LastUsedDate && <AwsField label="Last Used">{new Date(nhi.roleLastUsed.LastUsedDate).toLocaleString()} ({nhi.roleLastUsed.Region || "—"})</AwsField>}
        {nhi.maxSessionDuration && <AwsField label="Max Session">{nhi.maxSessionDuration}s</AwsField>}
        {nhi.trustPolicy && (
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Trust Policy (who can assume)</div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 8, fontSize: 10, fontFamily: "var(--mono)", maxHeight: 120, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(nhi.trustPolicy, null, 2)}</div>
          </div>
        )}
        {isIamRole && nhi.policies && nhi.policies.length > 0 && (
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>IAM Policies ({nhi.policies.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {nhi.policies.map(function (pol, i) {
                var risky = (pol.actions || []).some(function (a) { return a.includes("*"); });
                return (
                  <div key={i} style={{ border: "1px solid " + (risky ? "#FCA5A5" : "var(--border)"), borderRadius: 8, padding: "8px 10px", background: risky ? "#FEF2F2" : "var(--surface)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: risky ? "#991B1B" : "var(--ink)" }}>{pol.name}</span>
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, fontWeight: 600, background: pol.type === "managed" ? "#FEF3C7" : "var(--blue-tint)", color: pol.type === "managed" ? "#92400E" : "var(--blue-700)" }}>{pol.type}</span>
                    </div>
                    {pol.actions ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 4 }}>
                        {pol.actions.map(function (a) { var w = a.includes("*"); return <span key={a} className="mono" style={{ fontSize: 9.5, padding: "1px 5px", borderRadius: 4, background: w ? "#FEE2E2" : "#fff", color: w ? "#991B1B" : "var(--ink-2)", border: "1px solid " + (w ? "#FCA5A5" : "var(--border)"), fontWeight: w ? 700 : 500 }}>{a}</span>; })}
                      </div>
                    ) : <div style={{ fontSize: 10, color: "var(--ink-4)", fontStyle: "italic" }}>Managed policy — actions not expanded</div>}
                    {pol.resources && <div className="mono" style={{ fontSize: 9, color: "var(--ink-4)" }}>→ {pol.resources.length > 2 ? pol.resources.length + " resources" : pol.resources.join(", ").slice(0, 100)}</div>}
                    {risky && <div style={{ fontSize: 9.5, color: "#991B1B", fontWeight: 700, marginTop: 3 }}><Icon name="shieldAlert" size={10} color="#991B1B" /> Overprivileged — wildcard access</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {nhi.tags && nhi.tags.length > 0 && (
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{nhi.tags.map(function (t) { return <span key={t.Key} className="mono" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--surface)", border: "1px solid var(--border)" }}>{t.Key}: {t.Value}</span>; })}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Inbound Auth (who may invoke this agent) ─── */
function AwsInboundAuth({ agent }) {
  var jw = agent.authorizerConfiguration && agent.authorizerConfiguration.customJWTAuthorizer;
  var isJwt = !!jw;
  return React.createElement("div", null,
    React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 8, marginBottom: 6 } }, "Inbound Auth (who can invoke)"),
    React.createElement("div", { style: { border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" } },
      React.createElement("div", { style: { background: "var(--surface-2)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)" } },
        React.createElement(Icon, { name: "key", size: 12, color: "var(--amber-ink)" }),
        React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: "var(--ink)", flex: 1 } }, isJwt ? "JWT (OAuth)" : "IAM (SigV4)"),
        React.createElement(Pill, { tone: isJwt ? "green" : "gray" }, isJwt ? "Token-gated" : "IAM")
      ),
      React.createElement("div", { style: { padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, fontSize: 12 } },
        (isJwt && jw.discoveryUrl) ? React.createElement(AwsField, { label: "Discovery URL", mono: true }, jw.discoveryUrl) : null,
        (isJwt && jw.allowedClients && jw.allowedClients.length) ? React.createElement("div", null,
          React.createElement("div", { style: { fontSize: 10.5, color: "var(--ink-3)", marginBottom: 4 } }, "Accepts tokens from (client IDs)"),
          React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } },
            jw.allowedClients.map(function (c) { return React.createElement("span", { key: c, className: "mono", style: { fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--surface)", border: "1px solid var(--border)" } }, c); })
          )
        ) : null,
        !isJwt ? React.createElement("div", { style: { fontSize: 10.5, color: "var(--ink-3)", fontStyle: "italic" } }, "Invoked with AWS SigV4 (IAM) — no token validation.") : null
      )
    )
  );
}

/* ─── Detail Panel ─── */
function AwsAgentDetail({ raw, nhis }) {
  var a = raw;
  var agentNhi = nhis.find(function (n) { return n.arn === a.roleArn; });
  return React.createElement("div", null,
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
      React.createElement(AwsField, { label: "Status" }, React.createElement(Pill, { tone: a.status === "READY" ? "green" : "gray", dot: true }, a.status)),
      React.createElement(AwsField, { label: "Version" }, a.agentRuntimeVersion || "—"),
      React.createElement(AwsField, { label: "Region" }, a.region || "—"),
      React.createElement(AwsField, { label: "Created" }, a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—")
    ),
    a.description ? React.createElement(AwsField, { label: "Description" }, a.description) : null,
    React.createElement(AwsField, { label: "ARN", mono: true }, a.agentRuntimeArn),
    React.createElement(AwsField, { label: "Role ARN", mono: true }, a.roleArn),
    a.authorizerConfiguration ? React.createElement(AwsField, { label: "Authorizer" }, JSON.stringify(a.authorizerConfiguration).slice(0, 120)) : null,
    a.workloadIdentityDetails ? React.createElement(AwsField, { label: "Workload Identity", mono: true }, a.workloadIdentityDetails.workloadIdentityArn) : null,
    React.createElement(AwsInboundAuth, { agent: a }),
    React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 8 } }, "NHI (Execution Role)"),
    React.createElement(AwsNhiSection, { nhi: agentNhi }),
    (a.outboundAuth && a.outboundAuth.length) ? React.createElement("div", { style: { marginTop: 8 } },
      React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 } }, "Outbound Auth (Gateway M2M)"),
      a.outboundAuth.map(function (o, i) {
        return React.createElement("div", { key: i, style: { border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 6 } },
          React.createElement("div", { style: { background: "var(--surface-2)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)" } },
            React.createElement(Icon, { name: "key", size: 12, color: "var(--amber-ink)" }),
            React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: "var(--ink)", flex: 1 } }, "OAuth Credential Provider"),
            React.createElement(Pill, { tone: "green" }, "Mapped")
          ),
          React.createElement("div", { style: { padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, fontSize: 12 } },
            React.createElement(AwsField, { label: "Provider", mono: true }, o.providerName),
            o.clientId ? React.createElement(AwsField, { label: "Client ID", mono: true }, o.clientId) : null,
            o.vendor ? React.createElement(AwsField, { label: "Vendor" }, o.vendor) : null,
            React.createElement("div", { style: { fontSize: 10.5, color: "var(--ink-3)", fontStyle: "italic" } }, "Agent authenticates to the gateway with this credential (M2M)")
          )
        );
      })
    ) : null
  );
}

function AwsBedrockAgentDetail({ raw, nhis }) {
  var a = raw;
  var agentNhi = nhis.find(function (n) { return n.arn === a.roleArn; });
  return React.createElement("div", null,
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
      React.createElement(AwsField, { label: "Status" }, React.createElement(Pill, { tone: a.status === "PREPARED" ? "green" : "gray", dot: true }, a.status)),
      React.createElement(AwsField, { label: "Region" }, a.region || "—"),
      React.createElement(AwsField, { label: "Model" }, React.createElement("span", { className: "mono", style: { fontSize: 12, fontWeight: 600, color: "var(--blue-700)" } }, a.foundationModel || "—")),
      React.createElement(AwsField, { label: "Idle TTL" }, a.idleSessionTTLInSeconds ? a.idleSessionTTLInSeconds + "s" : "—")
    ),
    a.description ? React.createElement(AwsField, { label: "Description" }, a.description) : null,
    a.instruction ? React.createElement(AwsField, { label: "Instruction" }, a.instruction.length > 200 ? a.instruction.slice(0, 200) + "…" : a.instruction) : null,
    React.createElement(AwsField, { label: "ARN", mono: true }, a.agentArn),
    React.createElement(AwsField, { label: "Role ARN", mono: true }, a.roleArn),
    a.guardrailConfiguration ? React.createElement(AwsField, { label: "Guardrail" }, JSON.stringify(a.guardrailConfiguration).slice(0, 120)) : null,
    React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 8 } }, "NHI (Execution Role)"),
    React.createElement(AwsNhiSection, { nhi: agentNhi })
  );
}

function AwsGatewayDetail({ raw, nhis }) {
  var g = raw;
  var gwNhi = nhis.find(function (n) { return n.arn === g.roleArn; });
  return React.createElement("div", null,
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
      React.createElement(AwsField, { label: "Status" }, React.createElement(Pill, { tone: g.status === "READY" || g.status === "ACTIVE" ? "green" : "gray", dot: true }, g.status)),
      React.createElement(AwsField, { label: "Protocol" }, g.protocolType || "—"),
      React.createElement(AwsField, { label: "Auth Type" }, g.authorizerType || "—"),
      React.createElement(AwsField, { label: "Created" }, g.createdAt ? new Date(g.createdAt).toLocaleDateString() : "—")
    ),
    g.description ? React.createElement(AwsField, { label: "Description" }, g.description) : null,
    React.createElement(AwsField, { label: "Gateway ARN", mono: true }, g.gatewayArn),
    React.createElement(AwsField, { label: "Gateway URL", mono: true }, g.gatewayUrl),
    React.createElement(AwsField, { label: "Role ARN", mono: true }, g.roleArn),
    g.interceptors ? React.createElement(AwsField, { label: "Interceptors" }, JSON.stringify(g.interceptors).slice(0, 150)) : null,
    React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 8 } }, "NHI (Execution Role)"),
    React.createElement(AwsNhiSection, { nhi: gwNhi })
  );
}

function AwsTargetDetail({ raw, nhis }) {
  var t = raw;
  var ld = t.lambdaDetails;
  var execNhi = t.executionRole ? nhis.find(function (n) { return n.arn === t.executionRole.arn; }) : null;
  return React.createElement("div", null,
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
      React.createElement(AwsField, { label: "Status" }, React.createElement(Pill, { tone: t.status === "READY" ? "green" : "gray", dot: true }, t.status)),
      React.createElement(AwsField, { label: "Target Type" }, t.targetType || "Lambda"),
      React.createElement(AwsField, { label: "Gateway" }, t.gatewayName),
      React.createElement(AwsField, { label: "Target ID", mono: true }, t.targetId)
    ),
    t.description ? React.createElement(AwsField, { label: "Description" }, t.description) : null,
    t.targetConfiguration ? React.createElement(AwsField, { label: "Target Config" }, JSON.stringify(t.targetConfiguration).slice(0, 200)) : null,
    ld ? React.createElement("div", null,
      React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 8 } }, "Lambda Function Details"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
        React.createElement(AwsField, { label: "Runtime" }, ld.runtime),
        React.createElement(AwsField, { label: "Handler", mono: true }, ld.handler),
        React.createElement(AwsField, { label: "Memory" }, ld.memorySize ? ld.memorySize + " MB" : "—"),
        React.createElement(AwsField, { label: "Timeout" }, ld.timeout ? ld.timeout + "s" : "—"),
        React.createElement(AwsField, { label: "Code Size" }, ld.codeSize ? Math.round(ld.codeSize / 1024) + " KB" : "—"),
        React.createElement(AwsField, { label: "Architecture" }, (ld.architectures || []).join(", ") || "—")
      ),
      React.createElement(AwsField, { label: "Function ARN", mono: true }, ld.functionArn),
      React.createElement(AwsField, { label: "Role ARN", mono: true }, ld.role)
    ) : null,
    React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 8 } }, "NHI (Lambda Execution Role)"),
    React.createElement(AwsNhiSection, { nhi: execNhi })
  );
}

function AwsUserDetail({ raw }) {
  var u = raw;
  return React.createElement("div", null,
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
      React.createElement(AwsField, { label: "Status" }, React.createElement(Pill, { tone: u.status === "CONFIRMED" ? "green" : "gray", dot: true }, u.status)),
      React.createElement(AwsField, { label: "Enabled" }, u.enabled ? "Yes" : "No"),
      React.createElement(AwsField, { label: "Created" }, u.userCreateDate ? new Date(u.userCreateDate).toLocaleDateString() : "—"),
      React.createElement(AwsField, { label: "Modified" }, u.userLastModifiedDate ? new Date(u.userLastModifiedDate).toLocaleDateString() : "—")
    ),
    React.createElement(AwsField, { label: "Email", mono: true }, u.email),
    React.createElement(AwsField, { label: "Phone", mono: true }, u.phoneNumber),
    React.createElement(AwsField, { label: "Name" }, u.name),
    React.createElement(AwsField, { label: "Sub (Cognito ID)", mono: true }, u.sub),
    React.createElement(AwsField, { label: "Pool" }, (u.poolName || "") + " (" + (u.poolId || "") + ")"),
    React.createElement(AwsField, { label: "Email Verified" }, u.emailVerified || "—"),
    u.groups && u.groups.length > 0 ? React.createElement("div", null,
      React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 } }, "Groups (" + u.groups.length + ")"),
      React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } }, u.groups.map(function (g) { return React.createElement(Pill, { key: g, tone: "blue" }, g); }))
    ) : null,
    u.attributes && Object.keys(u.attributes).length > 0 ? React.createElement("div", null,
      React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 } }, "All Attributes"),
      React.createElement("div", { style: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 8 } },
        Object.keys(u.attributes).map(function (k) { return React.createElement("div", { key: k, style: { fontSize: 11, marginBottom: 3 } }, k + ": ", React.createElement("span", { className: "mono", style: { color: "var(--ink)" } }, u.attributes[k])); })
      )
    ) : null
  );
}

function AwsIamUserDetail({ raw }) {
  var u = raw;
  var keys = u.accessKeys || [];
  var keyTone = function (k) {
    if (k.status !== "Active") return "gray";
    if (k.neverUsed) return "red";
    if (k.ageDays != null && k.ageDays > 90) return "red";
    if (k.idleDays != null && k.idleDays > 30) return "amber";
    return "green";
  };
  return React.createElement("div", null,
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
      React.createElement(AwsField, { label: "MFA" },
        React.createElement(Pill, { tone: u.mfaEnabled ? "green" : "red", dot: true }, u.mfaEnabled ? "Enabled" : "Not enabled")),
      React.createElement(AwsField, { label: "Active access keys" },
        React.createElement(Pill, { tone: u.activeKeyCount ? (u.oldestActiveKeyAgeDays > 90 ? "red" : "amber") : "green" },
          String(u.activeKeyCount || 0))),
      React.createElement(AwsField, { label: "Created" }, u.createDate ? new Date(u.createDate).toLocaleDateString() : "—"),
      React.createElement(AwsField, { label: "Console last used" }, u.passwordLastUsed ? new Date(u.passwordLastUsed).toLocaleDateString() : "Never")
    ),
    React.createElement(AwsField, { label: "ARN", mono: true }, u.arn),
    u.email ? React.createElement(AwsField, { label: "Email", mono: true }, u.email) : null,
    u.groups && u.groups.length ? React.createElement("div", null,
      React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 } }, "Groups (" + u.groups.length + ")"),
      React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } },
        u.groups.map(function (g) { return React.createElement(Pill, { key: g, tone: "blue" }, g); }))
    ) : null,
    React.createElement("div", null,
      React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "8px 0 6px" } },
        "Long-Lived Credentials (" + keys.length + ")"),
      keys.length === 0
        ? React.createElement("div", { style: { fontSize: 12, color: "var(--ink-4)" } }, "No access keys \u2014 no long-lived credential exposure.")
        : keys.map(function (k) {
            return React.createElement("div", { key: k.accessKeyId, style: { border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 8, background: "var(--surface)" } },
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 7 } },
                React.createElement("span", { className: "mono", style: { fontSize: 11.5, fontWeight: 600, color: "var(--ink)" } }, k.accessKeyId),
                React.createElement(Pill, { tone: keyTone(k), dot: true }, k.status)
              ),
              React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
                React.createElement(AwsField, { label: "Key age" }, k.ageDays != null ? k.ageDays + " days" : "—"),
                React.createElement(AwsField, { label: "Last used" },
                  k.neverUsed ? React.createElement(Pill, { tone: "red" }, "Never used")
                    : (k.lastUsedDate ? (k.idleDays + " days ago") : "—")),
                React.createElement(AwsField, { label: "Service" }, k.lastUsedService || "—"),
                React.createElement(AwsField, { label: "Region" }, k.lastUsedRegion || "—")
              )
            );
          })
    ),
    u.policies && u.policies.length ? React.createElement("div", null,
      React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "8px 0 6px" } }, "Policies (" + u.policies.length + ")"),
      React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } },
        u.policies.map(function (pl, i) {
          return React.createElement("span", { key: i, className: "mono", style: { fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--surface)", border: "1px solid var(--border)" } }, pl.name + " \u00b7 " + pl.type);
        }))
    ) : null,
    u.tags && Object.keys(u.tags).length ? React.createElement("div", null,
      React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "8px 0 6px" } }, "Tags"),
      React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } },
        Object.keys(u.tags).map(function (k) {
          return React.createElement("span", { key: k, className: "mono", style: { fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--surface)", border: "1px solid var(--border)" } }, k + ": " + u.tags[k]);
        }))
    ) : null
  );
}

function AwsDetailPanel({ row, discovery }) {
  if (!row) return null;
  var cat = row._category;
  var nhis = discovery ? (discovery.nhis || []) : [];

  var content = null;
  if (cat === "Agent" && row._raw && row._raw.agentType === "Bedrock Agent") content = React.createElement(AwsBedrockAgentDetail, { raw: row._raw, nhis: nhis });
  else if (cat === "Agent") content = React.createElement(AwsAgentDetail, { raw: row._raw, nhis: nhis });
  else if (cat === "Gateway") content = React.createElement(AwsGatewayDetail, { raw: row._raw, nhis: nhis });
  else if (cat === "Gateway Target") content = React.createElement(AwsTargetDetail, { raw: row._raw, nhis: nhis });
  else if (cat === "NHI") content = React.createElement(AwsNhiSection, { nhi: row._raw });
  else if (cat === "User" && row._type === "IAM") content = React.createElement(AwsIamUserDetail, { raw: row._raw });
  else if (cat === "User") content = React.createElement(AwsUserDetail, { raw: row._raw });

  return (
    <div className="card" style={{ overflow: "hidden", position: "sticky", top: 60 }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 11 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: cat === "Agent" ? "var(--blue-tint)" : cat === "NHI" ? "#FEF3C7" : cat === "User" ? "#ECFDF5" : cat === "Gateway" ? "#F5F3FF" : "#FFF4ED", color: cat === "Agent" ? "var(--blue-700)" : cat === "NHI" ? "#92400E" : cat === "User" ? "#065F46" : cat === "Gateway" ? "#5B21B6" : "#BC480A" }}>
          <Icon name={cat === "Agent" ? "bot" : cat === "NHI" ? "key" : cat === "User" ? "user" : cat === "Gateway" ? "sitemap" : "zap"} size={19} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="section-title" style={{ fontSize: 14.5 }}>{row._name}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row._arn || ""}</div>
        </div>
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
        {content}
      </div>
    </div>
  );
}

/* ─── Roster Table ─── */
function AwsTable({ rows, selectedKey, onSelect }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
        {["Name", "Category", "Type", "Status"].map(function (h) { return <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>; })}
      </tr></thead>
      <tbody>
        {rows.map(function (r) { return (
          <tr key={r._key} onClick={function () { onSelect(r._key); }} style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", background: selectedKey === r._key ? "var(--blue-tint)" : "transparent", transition: "background .1s" }}
            onMouseEnter={function (e) { if (selectedKey !== r._key) e.currentTarget.style.background = "var(--surface-2)"; }}
            onMouseLeave={function (e) { if (selectedKey !== r._key) e.currentTarget.style.background = "transparent"; }}>
            <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--ink)" }}>{r._name}</td>
            <td style={{ padding: "10px 14px" }}><Pill tone={r._catTone}>{r._category}</Pill></td>
            <td style={{ padding: "10px 14px", color: "var(--ink-3)", fontSize: 12 }}>{r._type || "—"}</td>
            <td style={{ padding: "10px 14px" }}><Pill tone={r._statusTone} dot>{r._status || "—"}</Pill></td>
          </tr>
        ); })}
      </tbody>
    </table>
  );
}

/* ─── Insights Tab ─── */
function AwsInsightsTab({ data }) {
  var filterState = useState(null);
  var filter = filterState[0], setFilter = filterState[1];
  var selState = useState(null);
  var selectedKey = selState[0], setSelectedKey = selState[1];

  var roster = useMemo(function () {
    var d = data || {};
    var rows = [];

    // AgentCore Agents
    (d.agentcoreAgents || []).forEach(function (a, i) {
      rows.push({ _key: "ac-agent-" + i, _name: a.name, _category: "Agent", _catTone: "blue", _type: "AgentCore Runtime", _status: a.status, _statusTone: a.status === "READY" ? "green" : "gray", _arn: a.agentRuntimeArn, _raw: a });
    });
    // Bedrock Agents
    (d.bedrockAgents || []).forEach(function (a, i) {
      rows.push({ _key: "br-agent-" + i, _name: a.name, _category: "Agent", _catTone: "blue", _type: "Bedrock Agent", _status: a.status, _statusTone: a.status === "PREPARED" || a.status === "READY" ? "green" : "gray", _arn: a.agentArn, _raw: a });
    });

    // Gateways (under Gateway Targets tile)
    (d.gateways || []).forEach(function (g, i) {
      rows.push({ _key: "gw-" + i, _name: g.name || g.gatewayId, _category: "Gateway", _catTone: "purple", _type: "AgentCore Gateway", _status: g.status, _statusTone: (g.status === "READY" || g.status === "ACTIVE") ? "green" : "gray", _arn: g.gatewayArn, _raw: g });
    });

    // Gateway Targets (blended with Lambda)
    (d.gatewayTargets || []).forEach(function (t, i) {
      rows.push({ _key: "target-" + i, _name: t.name, _category: "Gateway Target", _catTone: "amber", _type: t.lambdaDetails ? "Lambda" : (t.targetType || "Target"), _status: t.status, _statusTone: t.status === "READY" ? "green" : "gray", _arn: t.lambdaDetails ? t.lambdaDetails.functionArn : null, _raw: t });
    });

    // NHIs
    (d.nhis || []).forEach(function (n, i) {
      rows.push({ _key: "nhi-" + i, _name: n.name, _category: "NHI", _catTone: "purple", _type: n.nhiSubType || n.nhiType, _status: n.usedBy ? "Mapped" : "Orphan", _statusTone: n.usedBy ? "green" : "red", _arn: n.arn, _raw: n });
    });

    // Users — Cognito (application identities)
    (d.users || []).forEach(function (u, i) {
      rows.push({ _key: "user-" + i, _name: u.username || u.name, _category: "User", _catTone: "green", _type: "Cognito", _status: u.status, _statusTone: u.status === "CONFIRMED" ? "green" : "gray", _arn: null, _raw: u });
    });

    // Users — IAM (console/CLI operators). Status reflects long-lived credential
    // posture, which is what checkpoint 1.8 asks about.
    (d.iamUsers || []).forEach(function (u, i) {
      var risky = u.activeKeyCount > 0 && (u.oldestActiveKeyAgeDays == null || u.oldestActiveKeyAgeDays > 90);
      var status = u.activeKeyCount > 0
        ? (u.oldestActiveKeyAgeDays != null ? u.oldestActiveKeyAgeDays + "d key" : "Active key")
        : (u.mfaEnabled ? "No keys" : "No keys / no MFA");
      rows.push({
        _key: "iamuser-" + i, _name: u.userName, _category: "User", _catTone: "green",
        _type: "IAM", _status: status,
        _statusTone: risky ? "red" : (u.activeKeyCount > 0 ? "amber" : (u.mfaEnabled ? "green" : "gray")),
        _arn: u.arn, _raw: u,
      });
    });

    return rows;
  }, [data]);

  var counts = useMemo(function () {
    var agents = roster.filter(function (r) { return r._category === "Agent"; }).length;
    var nhis = roster.filter(function (r) { return r._category === "NHI"; }).length;
    var users = roster.filter(function (r) { return r._category === "User"; }).length;
    var gwTargets = roster.filter(function (r) { return r._category === "Gateway" || r._category === "Gateway Target"; }).length;
    return { agents: agents, nhis: nhis, users: users, gwTargets: gwTargets, total: agents + nhis + users + gwTargets };
  }, [roster]);

  var filterMap = { "Agent": "Agent", "NHI": "NHI", "User": "User", "GW": function (r) { return r._category === "Gateway" || r._category === "Gateway Target"; } };
  var filtered = filter ? roster.filter(function (r) { return typeof filterMap[filter] === "function" ? filterMap[filter](r) : r._category === filterMap[filter]; }) : roster;
  var selected = roster.find(function (r) { return r._key === selectedKey; });

  // Agents open as a full page (passport) instead of the right-hand slider.
  // Every other category keeps the existing split-detail behaviour.
  if (selected && selected._category === "Agent" && window.AwsAgentDetailPage) {
    return React.createElement(window.AwsAgentDetailPage, {
      agent: selected._raw,
      discovery: data,
      onBack: function () { setSelectedKey(null); },
    });
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <AwsKpiTile label="Agents" value={counts.agents} tone="blue" active={filter === "Agent"} onClick={function () { setFilter(filter === "Agent" ? null : "Agent"); }} foot={<Pill tone="blue">{counts.agents} total</Pill>} />
        <AwsKpiTile label="NHI Identities" value={counts.nhis} tone="purple" active={filter === "NHI"} onClick={function () { setFilter(filter === "NHI" ? null : "NHI"); }} foot={<span className="help">{counts.nhis} total</span>} />
        <AwsKpiTile label="Users" value={counts.users} tone="green" active={filter === "User"} onClick={function () { setFilter(filter === "User" ? null : "User"); }} foot={<Pill tone="green">Cognito</Pill>} />
        <AwsKpiTile label="Gateway Targets" value={counts.gwTargets} tone="amber" active={filter === "GW"} onClick={function () { setFilter(filter === "GW" ? null : "GW"); }} foot={<span className="help">{(data || {}).gateways ? (data.gateways.length) + " gateway" : "0"}</span>} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16, marginBottom: 20 }}>
        <div className="card">
          <AwsCardHead title="Discovery Composition" />
          <div style={{ display: "flex", alignItems: "center", gap: 28, padding: "20px 22px" }}>
            {window.Donut ? <Donut size={168} thickness={22} segments={[{ value: counts.agents || 0.01, color: "#2563EB" }, { value: counts.nhis || 0.01, color: "#7C3AED" }, { value: counts.users || 0.01, color: "#16A34A" }, { value: counts.gwTargets || 0.01, color: "#F59E0B" }]} center={{ value: counts.total, label: "Total" }} /> : <div style={{ width: 168, height: 168, borderRadius: "50%", background: "var(--surface-2)", display: "grid", placeItems: "center" }}><span style={{ fontSize: 28, fontWeight: 700 }}>{counts.total}</span></div>}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-3)", marginBottom: 10 }}>Discovered resources</div>
              {[{ l: "Agents", v: counts.agents, c: "#2563EB" }, { l: "NHI Identities", v: counts.nhis, c: "#7C3AED" }, { l: "Users", v: counts.users, c: "#16A34A" }, { l: "Gateway Targets", v: counts.gwTargets, c: "#F59E0B" }].map(function (r) { return (
                <div key={r.l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.c, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: "var(--ink-2)", flex: 1 }}>{r.l}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{r.v}</span>
                </div>); })}
            </div>
          </div>
        </div>
        <div className="card">
          <AwsCardHead title="NHI Breakdown" />
          <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[{ l: "IAM Roles", v: (data && data.iamRoles ? data.iamRoles.length : 0), d: "Agent, Gateway, Lambda execution roles" },
              { l: "Workload Identities", v: (data && data.workloadIdentities ? data.workloadIdentities.length : 0), d: "Agent/gateway workload access tokens" },
              { l: "OAuth Credential Providers", v: (data && data.oauthProviders ? data.oauthProviders.length : 0), d: "Outbound auth to external APIs" },
            ].map(function (r) { return (
              <div key={r.l} style={{ fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--ink-3)" }}>{r.l}</span><span style={{ fontWeight: 700, color: "var(--ink)" }}>{r.v}</span></div>
                <div style={{ fontSize: 10, color: "var(--ink-4)", fontStyle: "italic" }}>{r.d}</div>
              </div>); })}
          </div>
        </div>
      </div>

      {filter && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Showing</span>
          <Pill tone="blue">{filter === "GW" ? "Gateway + Targets" : filter}</Pill>
          <button onClick={function () { setFilter(null); }} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--ink-4)", fontSize: 12, textDecoration: "underline" }}>Clear</button>
          <span className="help" style={{ marginLeft: "auto" }}>{filtered.length} results</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1.3fr 0.7fr" : "1fr", gap: 16 }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <AwsCardHead title="Identities" right={<span className="help">{filtered.length} identities</span>} />
          <div style={{ overflowX: "auto" }}><AwsTable rows={filtered} selectedKey={selectedKey} onSelect={setSelectedKey} /></div>
        </div>
        {selected && <AwsDetailPanel row={selected} discovery={data} />}
      </div>
    </div>
  );
}

function AwsPlaceholder({ name }) {
  return (<div style={{ padding: 32 }}><div className="card" style={{ height: 360, display: "grid", placeItems: "center", borderStyle: "dashed", background: "transparent" }}><div style={{ textAlign: "center", color: "var(--ink-4)" }}><div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-3)" }}>{name}</div><div style={{ fontSize: 13, marginTop: 6 }}>Pending implementation.</div></div></div></div>);
}

/* ─── Main Page ─── */
function AwsWorkloadsPage() {
  var tabState = useState("Insights"); var tab = tabState[0], setTab = tabState[1];
  var discState = useState(null); var discovery = discState[0], setDiscovery = discState[1];
  var loadState = useState(false); var loading = loadState[0], setLoading = loadState[1];

  var runDiscovery = function () {
    setLoading(true);
    fetch("/api/discovery/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(function (r) { return r.json(); })
      .then(function (d) { setDiscovery(d); setLoading(false); })
      .catch(function () { setLoading(false); });
  };

  useEffect(function () {
    fetch("/api/discovery").then(function (r) { if (r.ok) return r.json(); throw new Error(); }).then(function (d) { if (d && (d.agentcoreAgents || d.bedrockAgents || d.summary)) setDiscovery(d); }).catch(function () {});
  }, []);

  return (<div>
    <AwsPageHeader onRediscover={runDiscovery} loading={loading} />
    <AwsTabBar active={tab} onChange={setTab} />
    <div style={{ flex: 1 }}>
      {loading && (<div style={{ padding: "10px 32px", background: "var(--blue-tint)", borderBottom: "1px solid rgba(37,99,235,.2)", display: "flex", alignItems: "center", gap: 8 }}><Icon name="rotate" size={14} color="var(--blue-700)" /><span style={{ fontSize: 13, fontWeight: 600, color: "var(--blue-700)" }}>Running discovery…</span></div>)}
      {tab === "Insights" ? <AwsInsightsTab data={discovery} /> : <AwsPlaceholder name={tab} />}
    </div>
  </div>);
}

window.AwsWorkloadsPage = AwsWorkloadsPage;
