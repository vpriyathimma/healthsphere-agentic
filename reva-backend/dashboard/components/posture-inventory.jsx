/* global React, Icon, Pill */
/* Reva AISP — Agent Inventory + Agent 360 detail */
const PiState = React.useState;

function PsInventory({ ctx }) {
  const { PS_AGENTS, PS_SOURCES, PS_BANDS, PS_BAND } = window.PS;
  const [src, setSrc] = PiState("all");
  const [band, setBand] = PiState("all");
  const [shadowOnly, setShadowOnly] = PiState(false);
  const [sensOnly, setSensOnly] = PiState(false);
  const [sel, setSel] = PiState(new Set());
  const [copied, setCopied] = PiState(null);

  let rows = PS_AGENTS.filter((a) =>
    (src === "all" || a.source === src) &&
    (band === "all" || a.band === band) &&
    (!shadowOnly || a.shadow) &&
    (!sensOnly || a.sens === "high")
  );

  const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const allOn = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const toggleAll = () => { allOn ? setSel(new Set()) : setSel(new Set(rows.map((r) => r.id))); };
  const copy = (id, appId) => { setCopied(id); setTimeout(() => setCopied(null), 1200); };

  return (
    <div style={{ padding: 28 }}>
      {/* filter bar */}
      <div className="card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 5 }}>
        <div className="search" style={{ minWidth: 240, height: 36 }}><Icon name="search" size={15} color="var(--ink-4)" /><input placeholder="Search agents, appId, owner…" /></div>
        <PsSelect label="Source" value={src} onChange={setSrc} options={[["all", "All sources"], ...Object.entries(PS_SOURCES).map(([k, v]) => [k, v.label])]} />
        <PsSelect label="Risk band" value={band} onChange={setBand} options={[["all", "All bands"], ...PS_BANDS.map((b) => [b, PS_BAND[b].label])]} />
        <button className={`hp-fpill ${shadowOnly ? "on" : ""}`} onClick={() => setShadowOnly(!shadowOnly)} style={shadowOnly ? { background: "var(--coral-tint)", borderColor: "var(--coral)", color: "var(--coral-ink)" } : null}>
          <Icon name="eyeOff" size={13} /> Shadow agents
        </button>
        <button className={`hp-fpill ${sensOnly ? "on" : ""}`} onClick={() => setSensOnly(!sensOnly)}><Icon name="db" size={13} /> Has sensitive access</button>
        <span className="help" style={{ marginLeft: "auto" }}>{rows.length} of {PS_AGENTS.length}</span>
      </div>

      {/* bulk action bar */}
      {sel.size > 0 && (
        <div className="card" style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, marginBottom: 12, background: "var(--blue-tint)", borderColor: "rgba(37,99,235,.25)" }}>
          <span style={{ fontWeight: 600, color: "var(--blue-700)", fontSize: 13 }}>{sel.size} selected</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm"><Icon name="lock" size={14} /> Quarantine</button>
            <button className="btn btn-ghost btn-sm"><Icon name="user" size={14} /> Assign sponsor</button>
            <button className="btn btn-ghost btn-sm"><Icon name="checkCircle" size={14} /> Request review</button>
            <button className="btn btn-text btn-sm" onClick={() => setSel(new Set())}>Clear</button>
          </div>
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
        <table className="tbl" style={{ minWidth: 1100 }}>
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={allOn} onChange={toggleAll} style={{ cursor: "pointer" }} /></th>
              <th>Agent</th><th>Type</th><th>Source</th><th>Blueprint</th><th>Owner / Sponsor</th>
              <th>appId</th><th className="right">Perms</th><th>Sensitivity</th><th>Last active</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="clickable" onClick={() => ctx.openAgent(a.id)}>
                <td onClick={(e) => { e.stopPropagation(); toggle(a.id); }}><input type="checkbox" checked={sel.has(a.id)} readOnly style={{ cursor: "pointer" }} /></td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <RiskShield band={a.band} size={20} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{a.name}</span>
                        {a.shadow && <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--coral-ink)", background: "var(--coral-tint)", padding: "1px 5px", borderRadius: 4, flex: "none" }}>SHADOW</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="sub" style={{ fontSize: 12.5 }}>{a.type}</td>
                <td><SourcePill source={a.source} /></td>
                <td className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{a.blueprint}</td>
                <td className="sub" style={{ fontSize: 12.5 }}>{a.sponsor === "—" ? <span style={{ color: "var(--coral-ink)" }}>Unsponsored</span> : a.sponsor}</td>
                <td onClick={(e) => { e.stopPropagation(); copy(a.id, a.appId); }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 5, cursor: "copy" }}>
                    {a.appId.slice(0, 8)}… <Icon name={copied === a.id ? "check" : "copy"} size={12} color={copied === a.id ? "var(--green)" : "var(--ink-4)"} />
                  </span>
                </td>
                <td className="right mono" style={{ fontWeight: 600 }}>{a.perms}</td>
                <td><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{a.labels.slice(0, 2).map((l) => <LabelChip key={l} k={l} sm />)}{a.labels.length > 2 && <span style={{ fontSize: 10.5, color: "var(--ink-4)", fontWeight: 600 }}>+{a.labels.length - 2}</span>}</div></td>
                <td className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{a.lastActive}</td>
                <td><StatusPill status={a.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={11} style={{ textAlign: "center", padding: 40, color: "var(--ink-4)" }}>No agents match these filters.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function PsSelect({ label, value, onChange, options }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 10px", background: "#fff", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 12.5 }}>
      <span style={{ color: "var(--ink-4)", fontWeight: 600 }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ border: 0, background: "transparent", fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", outline: "none", cursor: "pointer" }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function StatusPill({ status }) {
  const m = { active: ["green", "Active"], inactive: ["gray", "Inactive"], quarantined: ["red", "Quarantined"] };
  const [tone, label] = m[status];
  return <Pill tone={tone} dot>{label}</Pill>;
}

/* ================= AGENT 360 ================= */
function Agent360({ agentId, ctx }) {
  const a = window.PS.PS_AGENTS.find((x) => x.id === agentId);
  const { PS_BAND, PS_DETECTIONS, PS_SENS_INTERACTIONS, PS_SOURCES } = window.PS;
  const [tab, setTab] = PiState("identity");
  if (!a) return null;
  const dets = PS_DETECTIONS.filter((d) => d.agentId === agentId);
  const sens = PS_SENS_INTERACTIONS.filter((s) => s.agentId === agentId);

  const TABS = [
    { id: "identity", label: "Identity & Lineage", icon: "sitemap" },
    { id: "perms", label: "Permissions & Scope", icon: "key" },
    { id: "risk", label: "Risk Timeline", icon: "activity" },
    { id: "ca", label: "Conditional Access", icon: "shield" },
    { id: "sens", label: "Sensitivity Exposure", icon: "db" },
    { id: "activity", label: "Activity", icon: "clock" },
    ...(a.source === "foundry" ? [{ id: "foundry", label: "Foundry Config", icon: "cpu" }] : []),
  ];

  return (
    <div style={{ padding: 28 }}>
      <a className="crumb" onClick={() => ctx.go("inventory")} style={{ marginBottom: 10 }}><Icon name="arrowLeft" size={12} /> Agent Inventory</a>

      {/* header */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <RiskShield band={a.band} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: "var(--ink)" }}>{a.name}</h1>
              <BandPill band={a.band} />
              <StatusPill status={a.status} />
              {a.shadow && <span style={{ fontSize: 10, fontWeight: 800, color: "var(--coral-ink)", background: "var(--coral-tint)", padding: "2px 7px", borderRadius: 5 }}>SHADOW</span>}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12.5, color: "var(--ink-3)", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><SourcePill source={a.source} /></span>
              <span>Type: <b style={{ color: "var(--ink-2)" }}>{a.type}</b></span>
              <span>Sponsor: <b style={{ color: "var(--ink-2)" }}>{a.sponsor}</b></span>
              <span>Blast radius: <b style={{ color: PS_BAND[a.band].c }}>{a.blast}</b></span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flex: "none" }}>
            {a.status === "quarantined"
              ? <button className="btn btn-ghost btn-sm"><Icon name="rotate" size={14} /> Restore</button>
              : <button className="btn btn-danger btn-sm"><Icon name="lock" size={14} /> Quarantine</button>}
            <button className="kebab" style={{ border: "1px solid var(--border-strong)" }}><Icon name="kebab" size={18} /></button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
        <div>
          {/* tabs */}
          <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border)", marginBottom: 18, overflowX: "auto" }}>
            {TABS.map((t) => {
              const on = t.id === tab;
              return <button key={t.id} onClick={() => setTab(t.id)} style={{ position: "relative", border: 0, background: "transparent", padding: "10px 12px 12px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", color: on ? "var(--ink)" : "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <Icon name={t.icon} size={14} color={on ? "var(--blue)" : "var(--ink-4)"} />{t.label}
                {on && <span style={{ position: "absolute", left: 6, right: 6, bottom: -1, height: 2.5, background: "var(--blue)", borderRadius: 2 }} />}
              </button>;
            })}
          </div>

          {tab === "identity" && <A360Identity a={a} />}
          {tab === "perms" && <A360Perms a={a} />}
          {tab === "risk" && <A360Risk dets={dets} />}
          {tab === "ca" && <A360CA a={a} />}
          {tab === "sens" && <A360Sens a={a} sens={sens} />}
          {tab === "activity" && <A360Activity a={a} />}
          {tab === "foundry" && <A360Foundry a={a} />}
        </div>

        {/* recommended actions rail */}
        <div className="card" style={{ padding: 16, position: "sticky", top: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>Recommended Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(a.band === "rogue" || a.band === "erratic" ? [
              { ic: "lock", t: "Quarantine agent", tone: "danger" },
              { ic: "rotate", t: "Revoke active sessions", tone: "ghost" },
              { ic: "shield", t: "Enforce Conditional Access", tone: "ghost" },
            ] : a.shadow ? [
              { ic: "user", t: "Assign sponsor", tone: "primary" },
              { ic: "checkCircle", t: "Request access review", tone: "ghost" },
              { ic: "link2", t: "Reconcile to registry", tone: "ghost" },
            ] : [
              { ic: "columns", t: "Review permission scope", tone: "ghost" },
              { ic: "checkCircle", t: "Schedule access review", tone: "ghost" },
            ]).map((r) => (
              <button key={r.t} className={`btn btn-${r.tone} btn-sm`} style={{ width: "100%", justifyContent: "flex-start" }}><Icon name={r.ic} size={14} /> {r.t}</button>
            ))}
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div className="help" style={{ fontSize: 11, marginBottom: 8 }}>Signals firing</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {a.signals.length ? a.signals.map((s) => <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "var(--surface-3)", color: "var(--ink-2)" }}>{s}</span>) : <span className="help">None</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function A360Box({ title, children, right }) {
  return (
    <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
        <div className="section-title" style={{ fontSize: 14 }}>{title}</div>{right && <div style={{ marginLeft: "auto" }}>{right}</div>}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

function KV({ k, v, mono }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><span className="eyebrow" style={{ fontSize: 10.5 }}>{k}</span><span className={mono ? "mono" : ""} style={{ fontSize: mono ? 12 : 13.5, color: "var(--ink)", fontWeight: mono ? 600 : 500, wordBreak: "break-all" }}>{v}</span></div>;
}

function A360Identity({ a }) {
  return (
    <>
      <A360Box title="Identity Lineage">
        <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
          {[
            { ic: "columns", lab: "Blueprint", val: a.blueprint, c: "#7C3AED" },
            { ic: "fingerprint", lab: "Agent Identity", val: a.name, c: "#0A7BD4" },
            { ic: "user", lab: "Agent User", val: a.sponsor, c: "#0D9488" },
          ].map((n, i) => (
            <React.Fragment key={n.lab}>
              {i > 0 && <div style={{ width: 36, height: 2, background: "var(--border-strong)", position: "relative" }}><Icon name="chevRight" size={14} color="var(--ink-4)" style={{ position: "absolute", right: -4, top: -7 }} /></div>}
              <div style={{ flex: 1, minWidth: 150, border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface-2)" }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: n.c + "1a", color: n.c }}><Icon name={n.ic} size={17} /></span>
                <div className="eyebrow" style={{ fontSize: 10, marginTop: 9 }}>{n.lab}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.val}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </A360Box>
      <A360Box title="Identity Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
          <KV k="App ID" v={a.appId} mono />
          <KV k="Object ID" v={a.id.replace("ag-", "obj-") + "-9f2a4c1e"} mono />
          <KV k="Credential Type" v={a.credType} />
          <KV k="Created" v={a.created} />
          <KV k="Source Platform" v={window.PS.PS_SOURCES[a.source].label} />
          <KV k="Model" v={a.model} mono />
        </div>
      </A360Box>
    </>
  );
}

function A360Perms({ a }) {
  const inherited = ["Files.Read.All", "Sites.Read.All", "User.Read", "Mail.Send"];
  const specific = ["Reports.Read.All", "Directory.Read.All"];
  const leastPriv = a.perms <= 8 ? "good" : a.perms <= 14 ? "warn" : "bad";
  const lpMap = { good: ["green", "Least-privilege"], warn: ["amber", "Moderately scoped"], bad: ["red", "Over-privileged"] };
  return (
    <A360Box title="Permissions & Scope" right={<Pill tone={lpMap[leastPriv][0]} dot>{lpMap[leastPriv][1]}</Pill>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 10 }}>Inherited from blueprint ({inherited.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {inherited.map((p) => <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}><Icon name="columns" size={13} color="var(--purple)" /><span className="mono" style={{ color: "var(--ink-2)" }}>{p}</span></div>)}
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 10 }}>Agent-specific ({specific.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {specific.map((p) => <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}><Icon name="key" size={13} color="var(--blue)" /><span className="mono" style={{ color: "var(--ink-2)" }}>{p}</span>{p === "Directory.Read.All" && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--amber-ink)", background: "var(--amber-tint)", padding: "1px 6px", borderRadius: 4 }}>broad</span>}</div>)}
          </div>
        </div>
      </div>
    </A360Box>
  );
}

function A360Risk({ dets }) {
  if (!dets.length) return <A360Box title="Risk Timeline"><div style={{ textAlign: "center", padding: 30, color: "var(--ink-4)" }}><Icon name="checkCircle" size={28} color="var(--green)" /><div style={{ marginTop: 8, fontSize: 13 }}>No detections in the current window.</div></div></A360Box>;
  return (
    <A360Box title="Risk Timeline">
      <div style={{ position: "relative", paddingLeft: 8 }}>
        {dets.map((d, i) => (
          <div key={d.id} style={{ display: "flex", gap: 14, paddingBottom: i < dets.length - 1 ? 18 : 0, position: "relative" }}>
            {i < dets.length - 1 && <span style={{ position: "absolute", left: 7, top: 18, bottom: -4, width: 2, background: "var(--border)" }} />}
            <span style={{ width: 16, height: 16, borderRadius: "50%", background: window.PS.PS_BAND[d.band].c, flex: "none", marginTop: 2, boxShadow: "0 0 0 3px #fff" }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{d.kind}</span>
                <BandPill band={d.band} sm />
                <Pill tone={d.status === "open" ? "red" : "green"} sm>{d.status === "open" ? "Open" : "Resolved"}</Pill>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-4)" }}>{d.time}</span>
              </div>
              <div className="sub" style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.5 }}>{d.evidence}</div>
              <div className="help" style={{ fontSize: 11, marginTop: 5 }}>Source: {d.src}</div>
            </div>
          </div>
        ))}
      </div>
    </A360Box>
  );
}

function A360CA({ a }) {
  const policies = [
    { name: "Require agent CA", on: a.caApplied.includes("Require agent CA") },
    { name: "Block legacy auth", on: a.caApplied.includes("Block legacy auth") },
    { name: "Require compliant workload", on: false },
    { name: "Session risk control", on: a.band === "rogue" || a.band === "erratic" },
  ];
  return (
    <A360Box title="Conditional Access Posture" right={<Pill tone={a.ca === "pass" ? "green" : "red"} dot>{a.ca === "pass" ? "What-If: Allow" : "What-If: Block gaps"}</Pill>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {policies.map((p, i) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
            <Icon name={p.on ? "checkCircle" : "alert"} size={17} color={p.on ? "var(--green)" : "var(--ink-4)"} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
            <span style={{ marginLeft: "auto" }}><Pill tone={p.on ? "green" : "gray"}>{p.on ? "Applied" : "Not applied"}</Pill></span>
          </div>
        ))}
      </div>
    </A360Box>
  );
}

function A360Sens({ a, sens }) {
  return (
    <A360Box title="Sensitivity Exposure" right={a.extract ? <Pill tone="red" dot>EXTRACT rights</Pill> : <Pill tone="gray">No EXTRACT</Pill>}>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
        {a.labels.map((l) => <LabelChip key={l} k={l} />)}
      </div>
      {sens.length ? (
        <table className="tbl" style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
          <thead><tr><th>Label</th><th>Action</th><th>Detail</th><th>Risk</th><th>When</th></tr></thead>
          <tbody>
            {sens.map((s, i) => (
              <tr key={i}><td><LabelChip k={s.label} sm /></td><td style={{ fontWeight: 600, color: "var(--ink)", fontSize: 12.5 }}>{s.action}</td><td className="sub" style={{ fontSize: 12 }}>{s.detail}</td><td><BandPill band={s.band} sm /></td><td className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{s.time}</td></tr>
            ))}
          </tbody>
        </table>
      ) : <div className="help">No sensitive interactions recorded.</div>}
    </A360Box>
  );
}

function A360Activity({ a }) {
  const events = [
    { t: "agent-to-tool", icon: "cpu", label: "Invoked tool: underwriting_score(applicant_id)", time: "2m ago", c: "#0A7BD4" },
    { t: "data-accessed", icon: "db", label: "Read 142 records from Underwriting DB", time: "4m ago", c: "#EA580C" },
    { t: "agent-to-agent", icon: "link2", label: "Delegated to fraud-check sub-agent", time: "9m ago", c: "#7C3AED" },
    { t: "human-to-agent", icon: "user", label: `${a.sponsor} approved a HITL request`, time: "21m ago", c: "#0D9488" },
    { t: "agent-to-tool", icon: "send", label: "Posted memo draft to Teams channel", time: "44m ago", c: "#0A7BD4" },
  ];
  return (
    <A360Box title="Interaction Activity" right={<span className="help">last 24h · {a.interactions7d.toLocaleString()} / 7d</span>}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {events.map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
            <span style={{ width: 28, height: 28, borderRadius: 7, display: "grid", placeItems: "center", background: e.c + "1a", color: e.c, flex: "none" }}><Icon name={e.icon} size={15} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{e.label}</div>
              <div className="help" style={{ fontSize: 11 }}>{e.t}</div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{e.time}</span>
          </div>
        ))}
      </div>
    </A360Box>
  );
}

function A360Foundry({ a }) {
  return (
    <A360Box title="Foundry Configuration">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <KV k="Model" v={a.model} mono />
        <KV k="Project" v={a.blueprint.replace("-BP", "-foundry")} mono />
      </div>
      <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 8 }}>System instructions</div>
      <div className="code" style={{ padding: "12px 14px", marginBottom: 16 }}>You are an underwriting assistant. Score commercial credit applications against policy. Never expose applicant PII outside the underwriting workspace. Defer high-value decisions to a human reviewer.</div>
      <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 8 }}>Tools</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {["underwriting_score", "credit_bureau_lookup", "policy_search", "teams_post"].map((t) => <span key={t} className="mono" style={{ fontSize: 11.5, padding: "4px 9px", borderRadius: 6, background: "var(--surface-3)", color: "var(--ink-2)", fontWeight: 600 }}>{t}</span>)}
      </div>
    </A360Box>
  );
}

Object.assign(window, { PsInventory, Agent360, StatusPill, PsSelect });
