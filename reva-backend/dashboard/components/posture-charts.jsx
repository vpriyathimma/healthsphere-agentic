/* global React */
/* Reva AISP — analytics chart kit (SVG). Enterprise, animated-in, varied. */

function psPolar(cx, cy, r, deg) { const a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
function psArcPath(cx, cy, r, a0, a1) {
  const [x0, y0] = psPolar(cx, cy, r, a0), [x1, y1] = psPolar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

/* ---- Arc gauge (270°) ---- */
function ArcGauge({ value, band, size = 188 }) {
  const B = window.PS.PS_BAND[band];
  const cx = size / 2, cy = size / 2, r = size / 2 - 16;
  const start = -135, end = 135, span = end - start;
  const valAng = start + (value / 100) * span;
  const ticks = [0, 25, 50, 75, 100];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={psArcPath(cx, cy, r, start, end)} fill="none" stroke="var(--surface-3)" strokeWidth="12" strokeLinecap="round" />
      {/* graded band ticks */}
      {["nominal", "atypical", "anomalous", "erratic", "rogue"].map((bb, i) => {
        const a0 = start + (i / 5) * span, a1 = start + ((i + 1) / 5) * span;
        return <path key={bb} d={psArcPath(cx, cy, r + 11, a0 + 1, a1 - 1)} fill="none" stroke={window.PS.PS_BAND[bb].c} strokeWidth="3" strokeLinecap="round" opacity="0.55" />;
      })}
      <path d={psArcPath(cx, cy, r, start, valAng)} fill="none" stroke={B.c} strokeWidth="12" strokeLinecap="round" style={{ transition: "all .8s cubic-bezier(.2,.8,.2,1)" }} />
      {/* needle dot */}
      {(() => { const [nx, ny] = psPolar(cx, cy, r, valAng); return <circle cx={nx} cy={ny} r="7" fill="#fff" stroke={B.c} strokeWidth="3.5" />; })()}
      {ticks.map((t) => { const [tx, ty] = psPolar(cx, cy, r - 22, start + (t / 100) * span); return <text key={t} x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 9, fill: "var(--ink-4)", fontWeight: 600 }}>{t}</text>; })}
      <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 40, fontWeight: 700, fill: "var(--ink)", letterSpacing: "-0.02em" }}>{value}</text>
      <text x={cx} y={cy + 22} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: B.c, letterSpacing: ".02em" }}>{B.label.toUpperCase()}</text>
    </svg>
  );
}

/* ---- Rose / polar-area (band distribution) ---- */
function RoseChart({ counts, size = 184 }) {
  const cx = size / 2, cy = size / 2, maxR = size / 2 - 14;
  const bands = window.PS.PS_BANDS;
  const max = Math.max(...bands.map((b) => counts[b] || 0), 1);
  const seg = 360 / bands.length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.33, 0.66, 1].map((f) => <circle key={f} cx={cx} cy={cy} r={maxR * f} fill="none" stroke="var(--border)" strokeWidth="1" />)}
      {bands.map((b, i) => {
        const n = counts[b] || 0; if (!n) return null;
        const r = 16 + (n / max) * (maxR - 16);
        const a0 = i * seg, a1 = (i + 1) * seg - 3;
        const [x0, y0] = psPolar(cx, cy, r, a0), [x1, y1] = psPolar(cx, cy, r, a1);
        const large = a1 - a0 > 180 ? 1 : 0;
        return <path key={b} d={`M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`} fill={window.PS.PS_BAND[b].c} opacity="0.82" stroke="#fff" strokeWidth="1.5" />;
      })}
      {bands.map((b, i) => { const [lx, ly] = psPolar(cx, cy, maxR + 0, i * seg + seg / 2); return null; })}
    </svg>
  );
}

/* ---- Area chart (two series, gradient) ---- */
function AreaChart({ seriesA, seriesB, labelA, labelB, colorA = "#DC2626", colorB = "#16A34A", w = 520, h = 150 }) {
  const all = [...seriesA, ...(seriesB || [])];
  const max = Math.max(...all, 1) * 1.15, min = 0;
  const pad = { l: 6, r: 6, t: 10, b: 18 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const pts = (s) => s.map((v, i) => [pad.l + (i / (s.length - 1)) * iw, pad.t + ih - ((v - min) / (max - min)) * ih]);
  const line = (p) => p.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" ");
  const area = (p) => line(p) + ` L ${pad.l + iw} ${pad.t + ih} L ${pad.l} ${pad.t + ih} Z`;
  const pa = pts(seriesA), pb = seriesB ? pts(seriesB) : null;
  const ga = "ga" + colorA.replace("#", ""), gb = "gb" + colorB.replace("#", "");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={ga} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colorA} stopOpacity="0.22" /><stop offset="1" stopColor={colorA} stopOpacity="0" /></linearGradient>
        <linearGradient id={gb} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colorB} stopOpacity="0.16" /><stop offset="1" stopColor={colorB} stopOpacity="0" /></linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={pad.l} y1={pad.t + ih * f} x2={pad.l + iw} y2={pad.t + ih * f} stroke="var(--border)" strokeDasharray="3 4" />)}
      {pb && <path d={area(pb)} fill={`url(#${gb})`} />}
      {pb && <path d={line(pb)} fill="none" stroke={colorB} strokeWidth="2" />}
      <path d={area(pa)} fill={`url(#${ga})`} />
      <path d={line(pa)} fill="none" stroke={colorA} strokeWidth="2.4" />
      <circle cx={pa[pa.length - 1][0]} cy={pa[pa.length - 1][1]} r="3.2" fill={colorA} />
    </svg>
  );
}

/* ---- Funnel (severity) ---- */
function FunnelChart({ data }) {
  // data: [{label, value, color}]
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 78, fontSize: 12, fontWeight: 600, color: "var(--ink-2)", textAlign: "right" }}>{d.label}</span>
          <div style={{ flex: 1, height: 26, position: "relative", display: "flex", justifyContent: "center" }}>
            <div style={{ width: `${Math.max(8, (d.value / max) * 100)}%`, height: "100%", background: d.color, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", transition: "width .7s cubic-bezier(.2,.8,.2,1)", clipPath: "polygon(3% 0, 97% 0, 100% 100%, 0 100%)" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{d.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Horizontal bars ---- */
function HBars({ data, unit = "", showVal = true }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: "grid", gridTemplateColumns: "130px 1fr 46px", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
            {d.dot && <span style={{ width: 8, height: 8, borderRadius: 2, background: d.dot, flex: "none" }} />}{d.label}
          </span>
          <div style={{ height: 14, borderRadius: 4, background: "var(--surface-3)", overflow: "hidden" }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", borderRadius: 4, background: d.color || "var(--blue)", transition: "width .7s cubic-bezier(.2,.8,.2,1)" }} />
          </div>
          {showVal && <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", textAlign: "right" }}>{d.value}{unit}</span>}
        </div>
      ))}
    </div>
  );
}

/* ---- Mini donut ---- */
function MiniDonut({ segments, size = 130, thickness = 18, centerTop, centerSub }) {
  const r = (size - thickness) / 2, c = 2 * Math.PI * r, cx = size / 2;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${cx} ${cx})`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
        {segments.map((s, i) => { const len = (s.value / total) * c; const el = <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} />; off += len; return el; })}
      </g>
      {centerTop != null && <text x={cx} y={cx - 3} textAnchor="middle" style={{ fontSize: 24, fontWeight: 700, fill: "var(--ink)" }}>{centerTop}</text>}
      {centerSub && <text x={cx} y={cx + 16} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 600, fill: "var(--ink-3)" }}>{centerSub}</text>}
    </svg>
  );
}

/* ---- Bubble risk matrix (frequency × blast) ---- */
function BubbleMatrix({ agents, onPick, w = 560, h = 320 }) {
  const pad = { l: 44, r: 16, t: 16, b: 36 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const X = (v) => pad.l + (v / 100) * iw;
  const Y = (v) => pad.t + ih - (v / 100) * ih;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      {/* quadrant guides */}
      <line x1={X(50)} y1={pad.t} x2={X(50)} y2={pad.t + ih} stroke="var(--border)" strokeDasharray="4 4" />
      <line x1={pad.l} y1={Y(50)} x2={pad.l + iw} y2={Y(50)} stroke="var(--border)" strokeDasharray="4 4" />
      <rect x={X(50)} y={pad.t} width={iw / 2} height={ih / 2} fill="#DC2626" opacity="0.04" />
      <text x={X(50) + 8} y={pad.t + 14} style={{ fontSize: 10, fontWeight: 700, fill: "var(--red)", opacity: .8 }}>ACT NOW</text>
      {/* axes */}
      <line x1={pad.l} y1={pad.t + ih} x2={pad.l + iw} y2={pad.t + ih} stroke="var(--border-strong)" />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ih} stroke="var(--border-strong)" />
      <text x={pad.l + iw / 2} y={h - 4} textAnchor="middle" style={{ fontSize: 10.5, fill: "var(--ink-3)", fontWeight: 600 }}>Signal frequency →</text>
      <text x={12} y={pad.t + ih / 2} textAnchor="middle" transform={`rotate(-90 12 ${pad.t + ih / 2})`} style={{ fontSize: 10.5, fill: "var(--ink-3)", fontWeight: 600 }}>Blast radius →</text>
      {agents.map((a) => {
        const R = 6 + a.sig * 5;
        const B = window.PS.PS_BAND[a.band];
        return (
          <g key={a.id} style={{ cursor: "pointer" }} onClick={() => onPick && onPick(a.id)}>
            <circle cx={X(a.freq)} cy={Y(a.blast)} r={R} fill={B.c} opacity="0.18" />
            <circle cx={X(a.freq)} cy={Y(a.blast)} r={R} fill="none" stroke={B.c} strokeWidth="2" />
            <circle cx={X(a.freq)} cy={Y(a.blast)} r="2.5" fill={B.c} />
          </g>
        );
      })}
    </svg>
  );
}

Object.assign(window, { ArcGauge, RoseChart, AreaChart, FunnelChart, HBars, MiniDonut, BubbleMatrix });
