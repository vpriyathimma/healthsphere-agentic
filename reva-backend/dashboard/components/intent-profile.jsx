/* global React, Icon */
/* Intent Drift Attribution — full view shown from a decision log's Intent Profile */

const SEV_TONE = { Low: "green", Medium: "amber", High: "coral", Critical: "red" };

function SevBadge({ level }) {
  const tone = SEV_TONE[level] || "gray";
  return (
    <span className={`pill pill-${tone}`} style={{ gap: 5 }}>
      <Icon name="bars" size={11} /> {level}
    </span>
  );
}

const AXES = [
  { k: "Actor", v: 0.15 },
  { k: "Target", v: 0.94 },
  { k: "Value", v: 0.68 },
  { k: "Action", v: 0.47 },
  { k: "Scope", v: 0.32 },
];

function DriftRadar() {
  const size = 300, cx = size / 2, cy = size / 2 + 4, maxR = 96;
  const pt = (i, r) => {
    const a = (-90 + i * 72) * Math.PI / 180;
    return [cx + Math.cos(a) * r * maxR, cy + Math.sin(a) * r * maxR];
  };
  const poly = (vals) => vals.map((v, i) => pt(i, v).join(",")).join(" ");
  const rings = [0.25, 0.5, 0.75, 1];
  const actual = AXES.map((a) => a.v);
  const baseline = [0.4, 0.4, 0.4, 0.4, 0.4];
  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ maxHeight: 300 }}>
      {rings.map((r, i) => (
        <polygon key={i} points={AXES.map((_, j) => pt(j, r).join(",")).join(" ")}
          fill="none" stroke="var(--border)" strokeWidth="1" />
      ))}
      {AXES.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="1" />; })}
      <polygon points={poly(baseline)} fill="rgba(124,58,237,.06)" stroke="var(--purple)" strokeWidth="1.4" strokeDasharray="4 4" opacity=".7" />
      <polygon points={poly(actual)} fill="rgba(220,38,38,.13)" stroke="var(--red)" strokeWidth="2" />
      {actual.map((v, i) => { const [x, y] = pt(i, v); return <circle key={i} cx={x} cy={y} r="3.2" fill="var(--red)" />; })}
      {AXES.map((a, i) => {
        const [x, y] = pt(i, 1.16);
        return (
          <g key={a.k}>
            <text x={x} y={y - 3} textAnchor="middle" style={{ fontSize: 11, fontWeight: 600, fill: "var(--ink-3)" }}>{a.k}</text>
            <text x={x} y={y + 10} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: "var(--ink)" }}>{a.v.toFixed(2)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DriftScoreBar({ score }) {
  return (
    <div>
      <div style={{ position: "relative", height: 12, borderRadius: 999, overflow: "visible", display: "flex" }}>
        <span style={{ flex: 0.4, background: "var(--green)", borderRadius: "999px 0 0 999px" }} />
        <span style={{ flex: 0.2, background: "var(--amber)" }} />
        <span style={{ flex: 0.4, background: "var(--red)", borderRadius: "0 999px 999px 0" }} />
        <span style={{ position: "absolute", top: "50%", left: `${score * 100}%`, transform: "translate(-50%,-50%)", width: 18, height: 18, borderRadius: "50%", background: "#fff", border: "3px solid var(--red)", boxShadow: "0 1px 4px rgba(16,24,40,.2)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--ink-4)" }}>
        <span>0.0</span><span style={{ marginLeft: "32%" }}>0.4</span><span style={{ marginLeft: "8%" }}>0.6</span><span>1.0</span>
      </div>
      <div style={{ display: "flex", marginTop: 2, fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500 }}>
        <span style={{ flex: 0.4, textAlign: "center" }}>Aligned</span>
        <span style={{ flex: 0.2, textAlign: "center" }}>Misaligned</span>
        <span style={{ flex: 0.4, textAlign: "center" }}>Drifted</span>
      </div>
    </div>
  );
}

const DRIFT_CARDS = [
  { icon: "user", tint: "blue", score: "0.15", label: "Actor", sub: "Identity", sev: "Low",
    from: "mike.wilson@reva.ai (Bank Manager)", to: "mike.wilson@reva.ai (Bank Manager)", drift: false,
    note: "Same delegating principal throughout — Bank Manager identity and delegation context unchanged" },
  { icon: "target", tint: "red", score: "0.94", label: "Target", sub: "Resource", sev: "Critical",
    from: "Tom Bradley (Applicant)", to: "Kevin (Applicant)", drift: true,
    note: "Subject changed mid-session — all prior lookups were scoped to Tom Bradley; this hop targets a different applicant's loan record entirely" },
  { icon: "coin", tint: "coral", score: "0.68", label: "Value", sub: "Parameter", sev: "High",
    from: "CreditScore · Tom Bradley", to: "LoanApproval · Kevin", drift: true,
    note: "Parameter shifted from a credit data query to a loan approval payload — different parameter class but within normal Bank Manager workflow range" },
  { icon: "play", tint: "green", score: "0.47", label: "Action", sub: "Intent Type", sev: "Medium",
    from: "getCreditScore / getCreditRiskAnalysis", to: "ApproveLoan", drift: true,
    note: "Researching an applicant and then approving a loan is a normal underwriting sequence — action drift is moderate; the subject change is the primary signal, not the action type" },
  { icon: "pin", tint: "purple", score: "0.32", label: "Scope", sub: "Boundary", sev: "Low",
    from: "Bank domain · Loan Underwriting", to: "Bank domain · Loan Underwriting", drift: false,
    note: "Execution remained within the Bank domain and loan underwriting workflow — scope boundary unchanged" },
];

function Transition({ from, to, drift }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
      <span style={{ color: "var(--blue)" }}>{from}</span>
      <Icon name="arrowRight" size={13} color="var(--ink-4)" />
      <span style={{ color: drift ? "var(--red)" : "var(--blue)" }}>{to}</span>
    </div>
  );
}

function DriftCard({ c }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <span style={{ width: 40, height: 40, borderRadius: 11, flex: "none", display: "grid", placeItems: "center", background: `var(--${c.tint}-tint)`, color: `var(--${c.tint}-ink, var(--${c.tint}))` }}>
          <Icon name={c.icon} size={20} />
        </span>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", letterSpacing: "-.02em", lineHeight: 1 }}>{c.score}</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{c.label} <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>({c.sub})</span></div>
        </div>
        <div style={{ marginLeft: "auto" }}><SevBadge level={c.sev} /></div>
      </div>
      <Transition from={c.from} to={c.to} drift={c.drift} />
      <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.55 }}>{c.note}</div>
    </div>
  );
}

function IntentProfile({ traceId, onBack }) {
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        <button className="kebab" onClick={onBack} style={{ width: 38, height: 38, border: "1px solid var(--border-strong)" }}><Icon name="arrowLeft" size={18} /></button>
        <div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: "-.02em", color: "var(--ink)" }}>Intent Drift Attribution</h1>
          <div className="mono" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>TraceID: {traceId}</div>
        </div>
      </div>

      {/* radar + comparison/score */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="section-title" style={{ fontSize: 15, marginBottom: 6 }}>Drift Attribution</div>
          <DriftRadar />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>Intent Comparison</div>
            <div style={{ display: "flex", alignItems: "stretch", gap: 14 }}>
              <div style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", marginBottom: 6 }}>Original Intent</div>
                <div style={{ fontSize: 13.5, color: "var(--ink)", fontStyle: "italic" }}>"Show me credit score and risk analysis for Tom Bradley"</div>
              </div>
              <div style={{ display: "grid", placeItems: "center" }}><Icon name="arrowRight" size={20} color="var(--ink-4)" /></div>
              <div style={{ flex: "0 0 38%", background: "var(--red-tint)", border: "1px solid #F5C2C2", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", marginBottom: 6 }}>Current Hop Reason</div>
                <div style={{ fontSize: 13.5, color: "var(--coral-ink)", fontStyle: "italic" }}>"Approve Kevin's loan"</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>Drift Score</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 38, fontWeight: 700, color: "var(--red)", letterSpacing: "-.03em", lineHeight: 1 }}>0.64</span>
              <span style={{ fontSize: 13.5, color: "var(--ink-3)", fontWeight: 500 }}>High/drifted</span>
              <SevBadge level="High" />
            </div>
            <DriftScoreBar score={0.64} />
          </div>
        </div>
      </div>

      {/* attribution cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {DRIFT_CARDS.map((c) => <DriftCard key={c.label} c={c} />)}
      </div>
    </div>
  );
}

window.IntentProfile = IntentProfile;
