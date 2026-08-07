/* global React, Icon, Pill */
/* Reva — AI Agent Security Posture: shared primitives + section shell + Posture Overview */
const PsState = React.useState;

/* ---- Risk shield glyph: fills by band ---- */
function RiskShield({ band, size = 22 }) {
  const B = window.PS.PS_BAND[band];
  const fillPct = [0.2, 0.4, 0.6, 0.8, 1][window.PS.PS_BAND_IDX(band)];
  const uid = "sh" + band + size;
  const cutY = 3 + (1 - fillPct) * 18;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <clipPath id={uid}><path d="M12 2l8 3.2v6.1c0 5-3.4 8.6-8 10.2-4.6-1.6-8-5.2-8-10.2V5.2z" /></clipPath>
      </defs>
      <path d="M12 2l8 3.2v6.1c0 5-3.4 8.6-8 10.2-4.6-1.6-8-5.2-8-10.2V5.2z" fill={B.t} stroke={B.c} strokeWidth="1.3" />
      <rect x="0" y={cutY} width="24" height="24" fill={B.c} clipPath={`url(#${uid})`} opacity="0.92" />
      {band === "rogue" && <path d="M12 8v4.5M12 15.4h.01" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

function BandPill({ band, sm }) {
  const B = window.PS.PS_BAND[band];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: sm ? 20 : 24, padding: sm ? "0 8px" : "0 10px",
      borderRadius: 999, background: B.t, color: B.c, fontSize: sm ? 11 : 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: B.c }} />{B.label}
    </span>
  );
}

function SourcePill({ source }) {
  const S = window.PS.PS_SOURCES[source];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>
    <span style={{ width: 7, height: 7, borderRadius: 2, background: S.c }} />{S.short}</span>;
}

function LabelChip({ k, sm }) {
  const L = window.PS.PS_LABELS[k];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, height: sm ? 18 : 20, padding: "0 7px", borderRadius: 5,
    background: "#fff", border: `1px solid ${L.c}40`, color: L.c, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" }}>
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: L.c }} />{L.label}</span>;
}

/* ---- Sparkline ---- */
function PsSparkline({ data, w = 120, h = 32, color = "var(--blue)", fill = true, invert = false }) {
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - 3 - ((v - min) / rng) * (h - 6);
    return [x, y];
  });
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = d + ` L${w} ${h} L0 ${h} Z`;
  const uid = "spk" + Math.random().toString(36).slice(2, 7);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs><linearGradient id={uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.18" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {fill && <path d={area} fill={`url(#${uid})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}

/* ---- Metric card ---- */
function PsMetric({ label, value, sub, foot, icon, accent, onClick }) {
  return (
    <button onClick={onClick} className="card ps-metric" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4,
      textAlign: "left", border: "1px solid var(--border)", background: "var(--surface)", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: accent ? accent.t : "var(--surface-3)", color: accent ? accent.c : "var(--ink-3)", flex: "none" }}><Icon name={icon} size={16} /></span>}
        <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
        <span style={{ fontSize: 27, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {sub}
      </div>
      {foot && <div style={{ marginTop: 4 }}>{foot}</div>}
    </button>
  );
}

/* ---- Risk distribution segmented bar ---- */
function RiskDistBar({ counts }) {
  const total = window.PS.PS_BANDS.reduce((s, b) => s + (counts[b] || 0), 0);
  return (
    <div>
      <div style={{ display: "flex", height: 30, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        {window.PS.PS_BANDS.map((b) => {
          const n = counts[b] || 0; if (!n) return null;
          const B = window.PS.PS_BAND[b];
          return <div key={b} title={`${B.label}: ${n}`} style={{ width: `${(n / total) * 100}%`, background: B.c, display: "grid", placeItems: "center", color: "#fff", fontSize: 11.5, fontWeight: 700 }}>{n}</div>;
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 12 }}>
        {window.PS.PS_BANDS.map((b) => (
          <span key={b} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-2)" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: window.PS.PS_BAND[b].c }} />{window.PS.PS_BAND[b].label}
            <b style={{ fontVariantNumeric: "tabular-nums" }}>{counts[b] || 0}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---- Section shell with sub-nav ---- */
const PS_NAV = [
  { id: "overview", label: "Posture", icon: "gauge" },
  { id: "inventory", label: "Agent Inventory", icon: "columns" },
  { id: "governance", label: "Governance", icon: "settingsGear" },
];

function PostureApp() {
  const [view, setView] = PsState("overview");
  const [agentId, setAgentId] = PsState(null);
  const scrollRef = React.useRef(null);
  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [view, agentId]);

  const openAgent = (id) => setAgentId(id);
  const go = (v) => { setAgentId(null); setView(v); };

  const ctx = { openAgent, go, setView };
  const Screen = agentId ? null : ({
    overview: window.PostureOverview, inventory: window.PsInventory, governance: window.PsGovernance,
  }[view]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* header band */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--border)", padding: "18px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, display: "grid", placeItems: "center",
            background: "#fff", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)", flex: "none" }}>
            <window.Mark brand="microsoft" size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>AI Agent Security Posture</h1>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>Unified agent signals from Entra Agent ID · Azure AI Foundry · Copilot Studio · Agent 365</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm"><Icon name="download" size={15} /> Export posture</button>
            <button className="btn btn-ghost btn-sm"><Icon name="sliders" size={15} /> Connectors</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, marginTop: 16 }}>
          {PS_NAV.map((n) => {
            const on = !agentId && n.id === view;
            return (
              <button key={n.id} onClick={() => go(n.id)} style={{ position: "relative", border: 0, background: "transparent",
                padding: "11px 14px 13px", fontSize: 13.5, fontWeight: 600, color: on ? "var(--ink)" : "var(--ink-3)",
                display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                <Icon name={n.icon} size={15} color={on ? "var(--blue)" : "var(--ink-4)"} />{n.label}
                {on && <span style={{ position: "absolute", left: 8, right: 8, bottom: -1, height: 2.5, background: "var(--blue)", borderRadius: 2 }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* body */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
        {agentId ? <window.Agent360 agentId={agentId} ctx={ctx} />
          : Screen ? <Screen ctx={ctx} /> : null}
      </div>
    </div>
  );
}

/* ================= POSTURE OVERVIEW ================= */
function PostureOverview({ ctx }) {
  const { PS_AGENTS, PS_BAND, PS_BANDS, PS_DETECTIONS, PS_TREND, PS_SOURCES, PS_LABELS, PS_SENS_INTERACTIONS } = window.PS;
  const I = window.PS.PS_BAND_IDX;
  const counts = {}; PS_AGENTS.forEach((a) => { counts[a.band] = (counts[a.band] || 0) + 1; });
  const bySource = {}; PS_AGENTS.forEach((a) => { bySource[a.source] = (bySource[a.source] || 0) + 1; });
  const highRisk = PS_AGENTS.filter((a) => ["erratic", "rogue"].includes(a.band)).length;
  const sensitive = PS_AGENTS.filter((a) => a.sens === "high").length;
  const shadow = PS_AGENTS.filter((a) => a.shadow).length;
  const score = PS_TREND[PS_TREND.length - 1];
  const scoreBand = score >= 75 ? "nominal" : score >= 60 ? "atypical" : score >= 45 ? "anomalous" : "erratic";

  const openS = PS_TREND.map((v) => Math.max(1, Math.round((92 - v) / 6)));
  const resolvedS = openS.map((x) => Math.max(0, Math.round(x * 0.45)));
  const funnelData = PS_BANDS.map((b) => ({ label: PS_BAND[b].label, value: PS_DETECTIONS.filter((d) => d.band === b).length, color: PS_BAND[b].c }));
  const typeCounts = {}; PS_DETECTIONS.forEach((d) => { typeCounts[d.kind] = (typeCounts[d.kind] || 0) + 1; });
  const typeData = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v, color: "#0A7BD4" }));
  const sourceSeg = Object.entries(bySource).map(([s, n]) => ({ value: n, color: PS_SOURCES[s].c, label: PS_SOURCES[s].label }));

  const matrix = PS_AGENTS.map((a) => ({ id: a.id, band: a.band, blast: a.blast, sig: Math.max(1, a.signals.length), freq: Math.min(96, Math.max(10, a.signals.length * 20 + I(a.band) * 7 + (a.shadow ? 8 : 0))) }));
  const actNow = matrix.filter((m) => m.freq >= 50 && m.blast >= 50).length;

  const sensLabels = ["highly", "conf", "pii", "pci", "internal"];
  const sensData = sensLabels.map((l) => ({ label: PS_LABELS[l].label, value: PS_AGENTS.filter((a) => a.labels.includes(l)).length, color: PS_LABELS[l].c, dot: PS_LABELS[l].c }));
  const extractYes = PS_AGENTS.filter((a) => a.extract).length;

  const topRisk = [...PS_AGENTS].sort((a, b) => I(b.band) - I(a.band) || b.blast - a.blast).slice(0, 5);
  const feed = PS_DETECTIONS.filter((d) => d.status === "open").slice(0, 6);
  const activitySpark = [12, 18, 14, 22, 19, 26, 24, 31, 28, 34, 30, 27];

  const stats = [
    { label: "Total Agents", value: PS_AGENTS.length, spark: [8, 8, 9, 9, 10, 10, 10], color: "#0A7BD4", delta: "+2", up: true, neutral: true },
    { label: "High-Risk", value: highRisk, spark: [1, 1, 2, 2, 2, 3, 3], color: PS_BAND.erratic.c, delta: "+1", up: true },
    { label: "Shadow Agents", value: shadow, spark: [1, 2, 2, 2, 3, 3, 3], color: PS_BAND.anomalous.c, delta: "+1", up: true },
    { label: "Sensitive Access", value: sensitive, spark: [2, 2, 3, 3, 3, 3, 3], color: "#7C3AED", delta: "0", up: false, neutral: true },
  ];

  const recs = [
    { ic: "lock", t: "Quarantine FinBot Underwriter", d: "Prompt injection confirmed · blast 92", band: "rogue", action: "Quarantine", to: "ag-finbot" },
    { ic: "columns", t: "Tighten Underwriting-BP-v3 scope", d: "2 agents over-scoped vs blueprint", band: "erratic", action: "Review scope", to: "ag-uw01" },
    { ic: "eyeOff", t: "Review shadow agent", d: "procurement-copilot · unreconciled", band: "anomalous", action: "Reconcile", to: "ag-procure" },
    { ic: "shield", t: "Enforce Conditional Access", d: "3 agents missing agent CA policy", band: "atypical", action: "Enforce CA", to: "ag-shipment" },
  ];

  const Panel = ({ title, sub, right, children, style, bodyPad = 18 }) => (
    <div className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
        <div>
          <div className="section-title" style={{ fontSize: 14 }}>{title}</div>
          {sub && <div className="help" style={{ fontSize: 11.5, marginTop: 1 }}>{sub}</div>}
        </div>
        {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
      </div>
      <div style={{ padding: bodyPad, flex: 1 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ padding: 28 }}>
      {/* ===== HERO ===== */}
      <div style={{ position: "relative", borderRadius: 18, padding: 1, marginBottom: 18, background: "linear-gradient(120deg, #0A7BD4, #7C3AED 55%, #DC2626)" }}>
        <div style={{ background: "#fff", borderRadius: 17, padding: "22px 26px", display: "grid", gridTemplateColumns: "auto 1px 1fr", gap: 26, alignItems: "center" }}>
          {/* gauge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 210 }}>
            <window.ArcGauge value={score} band={scoreBand} size={196} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: -8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-3)" }}>Posture Score</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", display: "inline-flex", alignItems: "center", gap: 2 }}><Icon name="arrowDown" size={12} /> 19 · 30d</span>
            </div>
          </div>
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
          {/* stat tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
            {stats.map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>{s.label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 4 }}>
                  <span style={{ fontSize: 30, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: s.neutral ? "var(--ink-4)" : s.up ? "var(--red)" : "var(--green)" }}>{s.delta}</span>
                </div>
                <div style={{ marginTop: 8 }}><PsSparkline data={s.spark} w={150} h={34} color={s.color} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== ROW B: composition rose + detection volume area ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.7fr", gap: 16, marginBottom: 16 }}>
        <Panel title="Risk Composition" sub={`${PS_AGENTS.length} agents · 5-band scale`}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <window.RoseChart counts={counts} size={172} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
              {PS_BANDS.slice().reverse().map((b) => (
                <div key={b} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: PS_BAND[b].c }} />
                  <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{PS_BAND[b].label}</span>
                  <span className="mono" style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{counts[b] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Detection Volume" sub="Opened vs resolved · 30 days"
          right={<div style={{ display: "flex", gap: 14, fontSize: 11.5 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--ink-3)" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#DC2626" }} /> Opened</span><span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--ink-3)" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#16A34A" }} /> Resolved</span></div>}>
          <window.AreaChart seriesA={openS} seriesB={resolvedS} colorA="#DC2626" colorB="#16A34A" w={640} h={170} />
        </Panel>
      </div>

      {/* ===== ROW C: funnel + detection types + sources donut ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Panel title="Severity Funnel" sub="Open + resolved detections">
          <FunnelChart data={funnelData} />
        </Panel>
        <Panel title="Detection Types" sub="By signal class">
          <HBars data={typeData} />
        </Panel>
        <Panel title="Agents by Source" sub="Connected platforms">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <window.MiniDonut segments={sourceSeg} size={128} thickness={18} centerTop={PS_AGENTS.length} centerSub="agents" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
              {sourceSeg.map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                  <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{s.label}</span>
                  <span className="mono" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* ===== ROW D: bubble matrix + sensitivity ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16 }}>
        <Panel title="Agent Risk Matrix" sub="Signal frequency × blast radius · bubble size = signals firing"
          right={<span className="pill pill-red" style={{ height: 22 }}>{actNow} in Act-Now</span>}>
          <window.BubbleMatrix agents={matrix} onPick={ctx.openAgent} w={620} h={330} />
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Sensitivity Exposure" sub="Agents touching each label">
            <HBars data={sensData} />
          </Panel>
          <Panel title="EXTRACT Rights">
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <window.MiniDonut segments={[{ value: extractYes, color: "#DC2626" }, { value: PS_AGENTS.length - extractYes, color: "var(--surface-3)" }]} size={110} thickness={16} centerTop={extractYes} centerSub="with EXTRACT" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}><b style={{ color: "var(--red)" }}>{extractYes} agents</b> can exercise EXTRACT rights on sensitive labels.</div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => ctx.go("inventory")}>Review in inventory <Icon name="arrowRight" size={13} /></button>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* ===== ROW E: top risk + activity stream ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 16 }}>
        <Panel title="Top Risk Agents" right={<a className="hp-seelink" onClick={() => ctx.go("inventory")}>Open inventory <Icon name="arrowRight" size={12} /></a>} bodyPad={0}>
          <table className="tbl">
            <thead><tr><th>Agent</th><th>Source</th><th>Owner</th><th>Risk</th><th>Primary detection</th></tr></thead>
            <tbody>
              {topRisk.map((a) => (
                <tr key={a.id} className="clickable" onClick={() => ctx.openAgent(a.id)}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 9 }}><RiskShield band={a.band} size={20} /><span style={{ fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{a.name}</span></div></td>
                  <td><SourcePill source={a.source} /></td>
                  <td className="sub">{a.owner}</td>
                  <td><BandPill band={a.band} sm /></td>
                  <td className="sub" style={{ fontSize: 12.5 }}>{a.detection !== "—" ? a.detection : <span style={{ color: "var(--ink-4)" }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Live Activity" sub="Detections · last 24h"
          right={<span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--green)", fontWeight: 600 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} /> Live</span>} bodyPad={0}>
          <div style={{ padding: "12px 18px 6px" }}><PsSparkline data={activitySpark} w={360} h={48} color="#7C3AED" /></div>
          <div>
            {feed.slice(0, 5).map((d, i) => (
              <div key={d.id} className="ps-feed-row" onClick={() => ctx.openAgent(d.agentId)} style={{ display: "flex", gap: 11, padding: "11px 18px", borderTop: "1px solid var(--border)", cursor: "pointer" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: PS_BAND[d.band].c, marginTop: 5, flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{d.kind}</div>
                  <div className="sub" style={{ fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.agent}</div>
                </div>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)", flex: "none" }}>{d.time}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ===== recommended actions ===== */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <div className="section-title" style={{ fontSize: 14.5 }}>Recommended Actions</div>
          <span className="help" style={{ marginLeft: "auto" }}>Prioritized by blast radius</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {recs.map((r) => (
            <div key={r.t} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, boxShadow: "none", borderColor: window.PS.PS_BAND[r.band].c + "40" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: window.PS.PS_BAND[r.band].t, color: window.PS.PS_BAND[r.band].c, flex: "none" }}><Icon name={r.ic} size={16} /></span>
                <BandPill band={r.band} sm />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.35 }}>{r.t}</div>
                <div className="sub" style={{ fontSize: 12, marginTop: 3 }}>{r.d}</div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: "auto", width: "100%" }} onClick={() => ctx.openAgent(r.to)}>{r.action}</button>
            </div>
          ))}
        </div>
      </div>

      <style>{`.ps-feed-row:hover{background:var(--surface-2);}`}</style>
    </div>
  );
}

Object.assign(window, { RiskShield, BandPill, SourcePill, LabelChip, PsSparkline, PsMetric, RiskDistBar, PostureApp, PostureOverview });
