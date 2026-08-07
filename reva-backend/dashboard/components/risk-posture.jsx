/* global React, Icon, Pill */
/* =========================================================
   Agent Risk Posture — CISO-grade posture section (Home dashboard)
   - Priority correlation callout (3+ simultaneous signals)
   - Bubble matrix: 6 signals (3 families) x 5 populations
   - Risk quadrant scatter: per-agent frequency x blast radius
   - Agent drawer with Contain / Quarantine / Raise-HITL
   Data shape mirrors the requested contract (JS, project uses Babel JSX):
     SeverityBand 'nominal'|'atypical'|'anomalous'|'erratic'|'rogue'
     SignalKey, PopulationKey, MatrixCell, RiskAgent
   ========================================================= */
const { useState: rpState, useMemo: rpMemo } = React;

const RP_SEV = {
  nominal:   { c: "#1F9D57", t: "#E7F6EE", label: "Nominal" },
  atypical:  { c: "#C8960E", t: "#FBF1D9", label: "Atypical" },
  anomalous: { c: "#E07B0E", t: "#FDEEDC", label: "Anomalous" },
  erratic:   { c: "#D2491F", t: "#FBE6DE", label: "Erratic" },
  rogue:     { c: "#9B1C1C", t: "#F4DADA", label: "Rogue" },
};
const RP_SEV_ORDER = ["nominal", "atypical", "anomalous", "erratic", "rogue"];
const rpSevIdx = (s) => RP_SEV_ORDER.indexOf(s);

const RP_POPS = [
  { key: "autonomous", label: "Autonomous", total: 28 },
  { key: "user_delegated", label: "User-Delegated", total: 64 },
  { key: "shadow", label: "Shadow AI", total: 17 },
  { key: "coding", label: "Coding", total: 85 },
  { key: "saas", label: "SaaS", total: 45 },
];
const RP_POP_TOTAL = Object.fromEntries(RP_POPS.map((p) => [p.key, p.total]));
const RP_POP_LABEL = Object.fromEntries(RP_POPS.map((p) => [p.label, p.key]));

const RP_FAMILIES = [
  { key: "integrity", label: "Integrity", probabilistic: true, signals: [
    { key: "anomaly_drift", label: "Behaviour Anomaly & Drift" },
    { key: "intent_alignment", label: "Intent Alignment Evaluator" },
  ]},
  { key: "adversarial", label: "Adversarial", probabilistic: false, signals: [
    { key: "prompt_injection", label: "Prompt Injection" },
    { key: "jailbreak", label: "Jailbreak Patterns" },
  ]},
  { key: "operational", label: "Operational", probabilistic: false, signals: [
    { key: "off_hours", label: "Off-Hours Activity" },
    { key: "high_denial", label: "High Denial Rates" },
  ]},
];
const RP_SIGNAL_LABEL = {};
const RP_SIGNAL_FAMILY = {};
RP_FAMILIES.forEach((f) => f.signals.forEach((s) => { RP_SIGNAL_LABEL[s.key] = s.label; RP_SIGNAL_FAMILY[s.key] = f; }));

/* MatrixCell[] — affected within population, severity, 7d trend, isNew, confidence (integrity only) */
const RP_CELLS = [
  // anomaly_drift
  { signal: "anomaly_drift", population: "autonomous", affected: 9, severity: "erratic", trend7d: 4, isNew: false, conf: 0.88 },
  { signal: "anomaly_drift", population: "user_delegated", affected: 8, severity: "anomalous", trend7d: 1, isNew: false, conf: 0.83 },
  { signal: "anomaly_drift", population: "shadow", affected: 6, severity: "rogue", trend7d: 6, isNew: true, conf: 0.91 },
  { signal: "anomaly_drift", population: "coding", affected: 12, severity: "anomalous", trend7d: -2, isNew: false, conf: 0.79 },
  { signal: "anomaly_drift", population: "saas", affected: 3, severity: "atypical", trend7d: 0, isNew: false, conf: 0.72 },
  // intent_alignment
  { signal: "intent_alignment", population: "autonomous", affected: 7, severity: "erratic", trend7d: 3, isNew: false, conf: 0.85 },
  { signal: "intent_alignment", population: "user_delegated", affected: 5, severity: "atypical", trend7d: 1, isNew: false, conf: 0.81 },
  { signal: "intent_alignment", population: "shadow", affected: 4, severity: "anomalous", trend7d: 2, isNew: true, conf: 0.87 },
  { signal: "intent_alignment", population: "coding", affected: 9, severity: "anomalous", trend7d: -1, isNew: false, conf: 0.78 },
  { signal: "intent_alignment", population: "saas", affected: 2, severity: "atypical", trend7d: 0, isNew: false, conf: 0.74 },
  // prompt_injection
  { signal: "prompt_injection", population: "autonomous", affected: 4, severity: "anomalous", trend7d: 2, isNew: false },
  { signal: "prompt_injection", population: "user_delegated", affected: 11, severity: "erratic", trend7d: 5, isNew: false },
  { signal: "prompt_injection", population: "shadow", affected: 5, severity: "rogue", trend7d: 3, isNew: true },
  { signal: "prompt_injection", population: "coding", affected: 7, severity: "anomalous", trend7d: 1, isNew: false },
  { signal: "prompt_injection", population: "saas", affected: 1, severity: "atypical", trend7d: 0, isNew: false },
  // jailbreak
  { signal: "jailbreak", population: "autonomous", affected: 2, severity: "atypical", trend7d: 0, isNew: false },
  { signal: "jailbreak", population: "user_delegated", affected: 3, severity: "atypical", trend7d: 1, isNew: false },
  { signal: "jailbreak", population: "shadow", affected: 4, severity: "erratic", trend7d: 2, isNew: false },
  { signal: "jailbreak", population: "coding", affected: 6, severity: "anomalous", trend7d: 2, isNew: true },
  { signal: "jailbreak", population: "saas", affected: 0, severity: "nominal", trend7d: 0, isNew: false },
  // off_hours
  { signal: "off_hours", population: "autonomous", affected: 14, severity: "anomalous", trend7d: 1, isNew: false },
  { signal: "off_hours", population: "user_delegated", affected: 9, severity: "atypical", trend7d: -1, isNew: false },
  { signal: "off_hours", population: "shadow", affected: 7, severity: "anomalous", trend7d: 0, isNew: false },
  { signal: "off_hours", population: "coding", affected: 22, severity: "atypical", trend7d: 3, isNew: false },
  { signal: "off_hours", population: "saas", affected: 5, severity: "nominal", trend7d: 0, isNew: false },
  // high_denial
  { signal: "high_denial", population: "autonomous", affected: 6, severity: "anomalous", trend7d: 1, isNew: false },
  { signal: "high_denial", population: "user_delegated", affected: 7, severity: "atypical", trend7d: 2, isNew: false },
  { signal: "high_denial", population: "shadow", affected: 3, severity: "anomalous", trend7d: 1, isNew: false },
  { signal: "high_denial", population: "coding", affected: 18, severity: "erratic", trend7d: 4, isNew: false },
  { signal: "high_denial", population: "saas", affected: 2, severity: "atypical", trend7d: 0, isNew: false },
];
const rpCellAt = (sig, pop) => RP_CELLS.find((c) => c.signal === sig && c.population === pop);

/* RiskAgent[] */
const RP_RAGENTS = [
  { id: "agt-finbot", name: "FinBot", owner: "Alexis Turner", populations: ["coding", "autonomous"], frequency: 88, blastRadius: 92, severity: "rogue", firing: ["anomaly_drift", "intent_alignment", "prompt_injection", "off_hours", "high_denial"] },
  { id: "agt-shadowgpt", name: "shadow-gpt-x", owner: "—", populations: ["shadow"], frequency: 90, blastRadius: 80, severity: "rogue", firing: ["anomaly_drift", "prompt_injection", "jailbreak", "intent_alignment"] },
  { id: "agt-credit", name: "CreditAgent", owner: "Lisa Hoffman", populations: ["user_delegated", "saas"], frequency: 72, blastRadius: 78, severity: "erratic", firing: ["prompt_injection", "intent_alignment", "high_denial", "off_hours"] },
  { id: "agt-uw01", name: "underwriting-agent-01", owner: "David Wilson", populations: ["coding", "shadow"], frequency: 80, blastRadius: 60, severity: "erratic", firing: ["anomaly_drift", "prompt_injection", "jailbreak", "high_denial"] },
  { id: "agt-mcp09", name: "MCP-bridge-09", owner: "Laura Garcia", populations: ["autonomous", "saas"], frequency: 60, blastRadius: 72, severity: "erratic", firing: ["intent_alignment", "off_hours", "high_denial"] },
  { id: "agt-codex", name: "Codex-7f2a", owner: "Michael Brown", populations: ["coding", "shadow"], frequency: 75, blastRadius: 50, severity: "erratic", firing: ["anomaly_drift", "jailbreak", "prompt_injection"] },
  { id: "agt-fraud", name: "FraudTriageAgent", owner: "Laura Garcia", populations: ["autonomous", "saas"], frequency: 55, blastRadius: 85, severity: "anomalous", firing: ["anomaly_drift", "off_hours", "high_denial"] },
  { id: "agt-ship", name: "shipment_supervisor", owner: "Laura Garcia", populations: ["autonomous"], frequency: 65, blastRadius: 70, severity: "erratic", firing: ["intent_alignment", "off_hours", "high_denial"] },
  { id: "agt-claude", name: "Claude Code (Eng)", owner: "Michael Brown", populations: ["coding"], frequency: 40, blastRadius: 45, severity: "anomalous", firing: ["off_hours", "high_denial"] },
  { id: "agt-kiro", name: "Kiro-2b71", owner: "David Wilson", populations: ["autonomous"], frequency: 48, blastRadius: 40, severity: "anomalous", firing: ["anomaly_drift", "off_hours"] },
  { id: "agt-banker", name: "RelationshipBanker", owner: "Emily Johnson", populations: ["saas"], frequency: 30, blastRadius: 65, severity: "atypical", firing: ["off_hours"] },
  { id: "agt-react", name: "ReAct Agent", owner: "Alex Turner", populations: ["user_delegated"], frequency: 35, blastRadius: 30, severity: "atypical", firing: ["high_denial"] },
  { id: "agt-policy", name: "PolicyDraftAgent", owner: "Sarah Lee", populations: ["coding"], frequency: 25, blastRadius: 35, severity: "atypical", firing: ["off_hours"] },
  { id: "agt-datasync", name: "DataSyncBot", owner: "Tom Reed", populations: ["saas"], frequency: 20, blastRadius: 25, severity: "nominal", firing: ["off_hours"] },
  { id: "agt-invoice", name: "invoice-parser", owner: "Nina Patel", populations: ["user_delegated"], frequency: 15, blastRadius: 20, severity: "nominal", firing: ["high_denial"] },
];

function SevDot({ sev, size = 9 }) { return <span style={{ width: size, height: size, borderRadius: 3, background: RP_SEV[sev].c, flex: "none", display: "inline-block" }} />; }
function SevPill({ sev }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: RP_SEV[sev].t, color: RP_SEV[sev].c }}><SevDot sev={sev} size={7} />{RP_SEV[sev].label}</span>;
}
function TrendArrow({ v }) {
  if (v === 0) return <span style={{ fontSize: 10, color: "var(--ink-4)" }}>±0</span>;
  const up = v > 0;
  return <span style={{ fontSize: 10.5, fontWeight: 700, color: up ? RP_SEV.erratic.c : RP_SEV.nominal.c, display: "inline-flex", alignItems: "center", gap: 1 }}><Icon name={up ? "arrowUp" : "arrowDown"} size={10} />{Math.abs(v)}</span>;
}

/* ---------------- Heatmap helpers ---------------- */
function rpHexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
const RP_FILL_A = { nominal: 0.12, atypical: 0.22, anomalous: 0.40, erratic: 0.68, rogue: 0.92 };
const rpFill = (sev) => rpHexA(RP_SEV[sev].c, RP_FILL_A[sev]);
const rpText = (sev) => (sev === "erratic" || sev === "rogue") ? "#fff" : "var(--ink)";

function rpFamRollup(fam) {
  const cs = fam.signals.flatMap((sig) => RP_POPS.map((p) => rpCellAt(sig.key, p.key)).filter(Boolean));
  const worst = cs.reduce((m, c) => Math.max(m, rpSevIdx(c.severity)), 0);
  const score = Math.round(cs.reduce((acc, c) => acc + rpSevIdx(c.severity), 0) / cs.length / 4 * 100);
  return { worst: RP_SEV_ORDER[worst], score };
}

/* graded heat tile */
const RP_SENSOR = [
  { key: "anomaly_drift",    short: "Anomaly/Drift", score: 74, prev: 62, series: [40,44,47,52,50,55,60,58,64,69,72,74] },
  { key: "intent_alignment", short: "Intent",        score: 66, prev: 58, series: [52,54,53,57,59,56,60,62,61,64,65,66] },
  { key: "prompt_injection", short: "Prompt Inj.",   score: 78, prev: 52, series: [44,46,50,55,58,60,64,68,70,73,76,78] },
  { key: "jailbreak",        short: "Jailbreak",      score: 46, prev: 44, series: [42,43,41,44,45,43,46,44,47,45,46,46] },
  { key: "off_hours",        short: "Off-Hours",      score: 57, prev: 63, series: [63,64,62,60,61,59,58,60,57,58,56,57] },
  { key: "high_denial",      short: "Denials",        score: 63, prev: 55, series: [50,52,51,54,56,55,58,60,59,61,62,63] },
];
const rpBand = (sc) => sc >= 85 ? "rogue" : sc >= 70 ? "erratic" : sc >= 50 ? "anomalous" : sc >= 30 ? "atypical" : "nominal";

function Sparkline({ series, color, w = 128, h = 36 }) {
  const min = Math.min(...series), max = Math.max(...series), span = (max - min) || 1;
  const pts = series.map((v, i) => [ (i / (series.length - 1)) * (w - 4) + 2, h - 3 - ((v - min) / span) * (h - 10) ]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = d + " L " + (w - 2).toFixed(1) + " " + h + " L 2 " + h + " Z";
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={"0 0 " + w + " " + h} style={{ display: "block" }} aria-hidden="true">
      <path d={area} fill={color} fillOpacity="0.10" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  );
}

function Gauge({ label, score, sev, onClick }) {
  const W = 138, H = 96, cx = 69, cy = 80, r = 54;
  const L = Math.PI * r;
  const frac = Math.max(0, Math.min(1, score / 100));
  const ang = Math.PI - frac * Math.PI;
  const nx = cx + r * Math.cos(ang), ny = cy - r * Math.sin(ang);
  const arc = "M " + (cx - r) + " " + cy + " A " + r + " " + r + " 0 0 1 " + (cx + r) + " " + cy;
  return (
    <button onClick={onClick} aria-label={label + " roll-up " + score + ", severity " + RP_SEV[sev].label}
      style={{ border: 0, background: "transparent", cursor: onClick ? "pointer" : "default", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={W} height={H} viewBox={"0 0 " + W + " " + H}>
        <path d={arc} fill="none" stroke="var(--surface-3)" strokeWidth="11" strokeLinecap="round" />
        <path d={arc} fill="none" stroke={RP_SEV[sev].c} strokeWidth="11" strokeLinecap="round" strokeDasharray={(frac * L).toFixed(1) + " " + (L * 2).toFixed(1)} />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill="var(--ink)" />
        <text x={cx} y={cy - 13} textAnchor="middle" style={{ fontSize: 20, fontWeight: 700, fill: "var(--ink)" }}>{score}</text>
      </svg>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{label}</span>
        <SevPill sev={sev} />
      </div>
    </button>
  );
}

function RiskRadar({ onAxis }) {
  const cx = 180, cy = 162, R = 116;
  const axes = RP_SENSOR, N = axes.length;
  const pt = (i, frac) => { const a = -Math.PI / 2 + i * (2 * Math.PI / N); return [cx + R * frac * Math.cos(a), cy + R * frac * Math.sin(a)]; };
  const polyStr = (vals) => vals.map((v, i) => pt(i, v / 100)).map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const ringStr = (f) => axes.map((_, i) => pt(i, f)).map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  return (
    <svg width="100%" viewBox="0 0 360 330" preserveAspectRatio="xMidYMid meet" style={{ display: "block", maxWidth: 360, maxHeight: 330, margin: "0 auto" }} role="img" aria-label="Risk posture radar across six signals, current versus seven-day baseline">
      {[0.25, 0.5, 0.75, 1].map((f, ri) => <polygon key={ri} points={ringStr(f)} fill={ri === 0 ? "var(--surface-2)" : "none"} stroke="var(--border)" strokeWidth="1" />)}
      {axes.map((_, i) => { const e = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={e[0]} y2={e[1]} stroke="var(--border)" strokeWidth="1" />; })}
      <polygon points={polyStr(axes.map((a) => a.prev))} fill="none" stroke="var(--ink-4)" strokeWidth="1.4" strokeDasharray="4 3" />
      <polygon points={polyStr(axes.map((a) => a.score))} fill="rgba(210,73,31,0.13)" stroke={RP_SEV.erratic.c} strokeWidth="2" />
      {axes.map((a, i) => { const p = pt(i, a.score / 100); return (
        <circle key={a.key} cx={p[0]} cy={p[1]} r="5" fill={RP_SEV[rpBand(a.score)].c} stroke="#fff" strokeWidth="1.6" style={{ cursor: "pointer" }} onClick={() => onAxis(a.key)}>
          <title>{RP_SIGNAL_LABEL[a.key] + ": " + a.score + " (" + RP_SEV[rpBand(a.score)].label + ")"}</title>
        </circle>
      ); })}
      {axes.map((a, i) => { const l = pt(i, 1.16); return (
        <text key={a.key} x={l[0]} y={l[1]} textAnchor={Math.abs(l[0] - cx) < 12 ? "middle" : (l[0] > cx ? "start" : "end")} dominantBaseline="middle" style={{ fontSize: 10, fontWeight: 600, fill: "var(--ink-2)" }}>{a.short}</text>
      ); })}
    </svg>
  );
}

function SensorRow({ s, onClick }) {
  const sev = rpBand(s.score), d = s.score - s.prev;
  return (
    <button onClick={onClick} className="rp-arow" aria-label={RP_SIGNAL_LABEL[s.key] + " sensor, score " + s.score + ", severity " + RP_SEV[sev].label}
      style={{ display: "grid", gridTemplateColumns: "1fr 128px 52px", alignItems: "center", gap: 12, padding: "9px 10px", borderRadius: 10, border: 0, background: "transparent", cursor: "pointer", textAlign: "left", width: "100%" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, background: RP_SEV[sev].c, flex: "none" }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{RP_SIGNAL_LABEL[s.key]}</span>
        </div>
        <div style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 2, paddingLeft: 15 }}>{RP_SIGNAL_FAMILY[s.key].probabilistic ? "confidence-scored" : "rule-based"}</div>
      </div>
      <Sparkline series={s.series} color={RP_SEV[sev].c} />
      <div style={{ textAlign: "right" }}>
        <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>{s.score}</div>
        <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 3, color: d > 0 ? RP_SEV.erratic.c : d < 0 ? RP_SEV.nominal.c : "var(--ink-4)" }}>{d > 0 ? "\u25b2" : d < 0 ? "\u25bc" : "\u00b1"}{Math.abs(d)}</div>
      </div>
    </button>
  );
}

/* ---------------- Agent drawer ---------------- */
function RiskDrawer({ title, subtitle, agents, onClose }) {
  const toast = window.useToast ? window.useToast() : (() => {});
  const [closing, setClosing] = rpState(false);
  const doClose = () => { setClosing(true); setTimeout(onClose, 180); };
  React.useEffect(() => { const k = (e) => e.key === "Escape" && doClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  return (
    <>
      <div className="sp-scrim" style={closing ? { opacity: 0, transition: "opacity .18s" } : null} onClick={doClose} />
      <div className="sp-panel" style={{ width: "44vw", maxWidth: 620, minWidth: 460, ...(closing ? { transform: "translateX(100%)", transition: "transform .18s cubic-bezier(.7,0,.84,0)" } : null) }} onClick={(e) => e.stopPropagation()}>
        <div className="sp-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sp-eyebrow"><Icon name="shieldAlert" size={13} color={RP_SEV.erratic.c} /> {subtitle}</div>
            <h2 className="sp-title" style={{ fontSize: 19 }}>{title}</h2>
          </div>
          <button className="kebab" onClick={doClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="sp-body" style={{ padding: 0 }}>
          <table className="ptbl">
            <thead><tr><th>Agent</th><th>Severity</th><th>Signals</th><th style={{ textAlign: "right" }}>Action</th></tr></thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13 }}>{a.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{a.owner !== "—" ? a.owner : "Unowned · Shadow AI"}</div>
                    <a className="hp-seelink" style={{ fontSize: 11.5, marginTop: 4, display: "inline-flex" }} onClick={() => toast(`Opening trace log for ${a.name}`)}>View trace log <Icon name="arrowRight" size={11} /></a>
                  </td>
                  <td><SevPill sev={a.severity} /></td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 160 }}>
                      {a.firing.slice(0, 4).map((s) => <span key={s} style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-2)", background: "var(--surface-3)", padding: "2px 6px", borderRadius: 5 }}>{RP_SIGNAL_LABEL[s].split(" ")[0]}</span>)}
                      {a.firing.length > 4 && <span style={{ fontSize: 10, color: "var(--ink-4)" }}>+{a.firing.length - 4}</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="action-stack">
                      <button className="btn-action btn-revoke" onClick={() => toast(`${a.name} quarantined — access clipped`)}><Icon name="lock" size={11} /> Quarantine</button>
                      <button className="btn-action btn-blue" onClick={() => toast(`HITL raised for ${a.name}`)}><Icon name="users" size={11} /> Raise HITL</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sp-foot">
          <span style={{ color: "var(--ink-3)", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="clock" size={12} /> {agents.length} agent{agents.length !== 1 ? "s" : ""} · severity by label + color</span>
        </div>
      </div>
    </>
  );
}

/* ---------------- Section shell + controls ---------------- */
function AgentRiskPosture() {
  const [win, setWin] = rpState("7d");
  const [fams, setFams] = rpState(RP_FAMILIES.map((f) => f.key));
  const [pops, setPops] = rpState(RP_POPS.map((p) => p.key));
  const [threshold, setThreshold] = rpState(0);
  const [drawer, setDrawer] = rpState(null);
  const [expandPriority, setExpandPriority] = rpState(false);

  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const multi = rpMemo(() => RP_RAGENTS.filter((a) => a.firing.length >= 3).sort((a, b) => b.blastRadius - a.blastRadius), []);

  const openCell = (cell) => {
    const pool = RP_RAGENTS.filter((a) => a.populations.includes(cell.population) && a.firing.includes(cell.signal));
    const list = pool.length ? pool : RP_RAGENTS.filter((a) => a.populations.includes(cell.population)).slice(0, cell.affected);
    setDrawer({ title: RP_SIGNAL_LABEL[cell.signal], subtitle: `${RP_POPS.find((p) => p.key === cell.population).label} · ${cell.affected} of ${RP_POP_TOTAL[cell.population]} agents`, agents: list.slice(0, 8) });
  };
  const openAgent = (a) => setDrawer({ title: a.name, subtitle: `Individual agent · ${a.firing.length} signals firing`, agents: [a] });

  const openMulti = () => setDrawer({ title: "Multi-signal agents", subtitle: `${multi.length} agents firing 3+ signals \u00b7 sorted by blast radius`, agents: multi });
  const openSignal = (sig) => setDrawer({ title: RP_SIGNAL_LABEL[sig], subtitle: "Signal sensor \u00b7 agents currently firing this signal", agents: RP_RAGENTS.filter((a) => a.firing.includes(sig)) });

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>Agent Risk Posture</h3>
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--ink-3)" }}>Severity of each risk signal across agent populations, with the agents to act on now.</p>
        </div>
        <a className="hp-seelink" style={{ marginLeft: "auto" }}>See all <Icon name="arrowRight" size={12} /></a>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
          <div className="section-title" style={{ fontSize: 14.5 }}>Risk Posture &mdash; Live Sensors</div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginLeft: 6 }}>
            {RP_SEV_ORDER.map((sv) => (
              <span key={sv} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--ink-3)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: RP_SEV[sv].c }} />{RP_SEV[sv].label}
              </span>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="help">Window</span>
            <div className="seg">{["24h","7d","30d"].map((w) => <button key={w} className={win === w ? "active" : ""} onClick={() => setWin(w)}>{w}</button>)}</div>
          </div>
        </div>

        <button onClick={openMulti} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", background: "linear-gradient(90deg, #FCEEEC, #fff)", border: 0, borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: RP_SEV.rogue.t, color: RP_SEV.rogue.c, display: "grid", placeItems: "center", flex: "none" }}><Icon name="shieldAlert" size={21} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)" }}><span style={{ color: RP_SEV.rogue.c }}>{multi.length} agents</span> tripping 3+ sensors simultaneously</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>Correlated multi-signal exposure is the real alarm &mdash; review now.</div>
          </div>
          <span className="btn btn-ghost btn-sm" style={{ pointerEvents: "none" }}>Review <Icon name="arrowRight" size={14} /></span>
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 12, padding: "18px 20px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
          {RP_FAMILIES.map((fam) => { const r = rpFamRollup(fam); return <Gauge key={fam.key} label={fam.label} score={r.score} sev={r.worst} onClick={() => openSignal(fam.signals[0].key)} />; })}
        </div>

        <div className="rp-grid" style={{ display: "grid", gridTemplateColumns: "1fr 372px", gap: 0 }}>
          <div style={{ padding: "16px 20px", borderRight: "1px solid var(--border)", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-4)" }}>Posture radar</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-3)" }}><span style={{ width: 14, borderTop: "2px solid " + RP_SEV.erratic.c }} /> Current</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-3)" }}><span style={{ width: 14, borderTop: "2px dashed var(--ink-4)" }} /> 7d ago</span>
            </div>
            <RiskRadar onAxis={openSignal} />
          </div>
          <div style={{ padding: "16px 18px", background: "var(--surface-2)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 6, paddingLeft: 4 }}>Signal trend sensors</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {RP_SENSOR.map((sig) => <SensorRow key={sig.key} s={sig} onClick={() => openSignal(sig.key)} />)}
            </div>
          </div>
        </div>
      </div>

      {drawer && <RiskDrawer {...drawer} onClose={() => setDrawer(null)} />}
      <style>{`.rp-arow:hover{background:var(--surface-2) !important;} @media (max-width: 1080px){ .rp-grid{ grid-template-columns: 1fr !important; } .rp-grid > div:first-child{ border-right:0 !important; border-bottom:1px solid var(--border); } }`}</style>
    </div>
  );
}

window.AgentRiskPosture = AgentRiskPosture;
