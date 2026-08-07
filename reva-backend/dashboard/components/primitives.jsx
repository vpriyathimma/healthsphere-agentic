/* global React */
const { useState, useRef, useEffect } = React;

/* ---------- Icons (inline, stroke-based, 1.6 weight) ---------- */
function Icon({ name, size = 18, color = "currentColor", style }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", style };
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-3.6-3.6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    chevDown: <path d="M6 9l6 6 6-6" />,
    chevRight: <path d="M9 6l6 6-6 6" />,
    kebab: <><circle cx="12" cy="5" r="1.4" fill={color} stroke="none"/><circle cx="12" cy="12" r="1.4" fill={color} stroke="none"/><circle cx="12" cy="19" r="1.4" fill={color} stroke="none"/></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></>,
    check: <path d="M20 6L9 17l-5-5" />,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
    shield: <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />,
    user: <><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></>,
    bot: <><rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 8V4M9 5l3-1 3 1"/><circle cx="9.5" cy="13.5" r="1" fill={color} stroke="none"/><circle cx="14.5" cy="13.5" r="1" fill={color} stroke="none"/></>,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    filter: <path d="M3 5h18l-7 8v6l-4-2v-4z" />,
    rotate: <><path d="M20 11a8 8 0 1 0-1 5"/><path d="M20 5v6h-6"/></>,
    ext: <><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></>,
    alert: <><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/></>,
    bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>,
    lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
    home: <><path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/></>,
    plug: <><path d="M9 3v5M15 3v5"/><path d="M7 8h10v3a5 5 0 0 1-10 0z"/><path d="M12 16v5"/></>,
    send: <><path d="M5 12l15-7-7 15-2.5-5.5z"/></>,
    layers: <><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></>,
    arrowLeft: <path d="M19 12H5M12 19l-7-7 7-7" />,
    arrowRight: <path d="M5 12h14M12 5l7 7-7 7" />,
    arrowUp: <path d="M12 19V5M5 12l7-7 7 7" />,
    arrowDown: <path d="M12 5v14M19 12l-7 7-7-7" />,
    sort: <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    shuffle: <><path d="M16 3h5v5M4 20l17-17M21 16v5h-5M15 15l6 6M4 4l5 5"/></>,
    rocket: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></>,
    zap: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
    more: <><circle cx="5" cy="12" r="1.4" fill={color} stroke="none"/><circle cx="12" cy="12" r="1.4" fill={color} stroke="none"/><circle cx="19" cy="12" r="1.4" fill={color} stroke="none"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></>,
    key: <><circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L21 2M16 7l3 3M19 4l3 3"/></>,
    server: <><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/></>,
    activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
    flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22V15"/></>,
    umbrella: <><path d="M12 12v7a2 2 0 0 0 4 0M12 2v1.5M3 12a9 9 0 0 1 18 0z"/></>,
    box: <><path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/></>,
    heartShield: <><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9.2 10.8c0-1 .8-1.6 1.6-1.6.6 0 1 .3 1.2.6.2-.3.6-.6 1.2-.6.8 0 1.6.6 1.6 1.6 0 1.4-2 2.8-2.8 3.4-.8-.6-2.8-2-2.8-3.4z"/></>,
    settingsGear: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    cloud: <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />,
    checkCircle: <><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></>,
    shieldAlert: <><path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6l8-3z"/><path d="M12 8v4M12 16h.01"/></>,
    trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></>,
    sparkles: <><path d="M12 3l1.7 4.6L18.5 9.5l-4.8 1.9L12 16l-1.7-4.6L5.5 9.5l4.8-1.9z"/><path d="M19 13l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/></>,
    columns: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></>,
    sitemap: <><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v3M6 16v-2h12v2"/></>,
    fileCode: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M10.5 12.5L9 14l1.5 1.5M13.5 12.5L15 14l-1.5 1.5"/></>,
    calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></>,
    flame: <><path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1.6.7-2.8.7-2.8.6 2 2.3 2.6 2.3 2.6C8.5 8.5 12 6.5 12 2z"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill={color} stroke="none"/></>,
    coin: <><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h3.2a1.8 1.8 0 0 1 0 3.6H10m0 0h3.2a1.8 1.8 0 0 1 0 3.6H9.5"/></>,
    play: <><circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/></>,
    pin: <><path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></>,
    bars: <><path d="M5 13v6M10 9v10M15 5v14M20 11v8"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></>,
    gauge: <><path d="M12 13l4-4"/><path d="M4.5 19a9 9 0 1 1 15 0"/><circle cx="12" cy="13" r="1.4" fill={color} stroke="none"/></>,
    eyeOff: <><path d="M9.9 4.24A9 9 0 0 1 12 4c5 0 9 4 10 8a13 13 0 0 1-2.2 3.2M6.6 6.6A13 13 0 0 0 2 12c1 4 5 8 10 8a9 9 0 0 0 4-.9"/><path d="M3 3l18 18"/></>,
    fingerprint: <><path d="M12 11a2 2 0 0 1 2 2c0 3-1 5-1 5M8 14c0 2 .5 4 1 5M12 7a6 6 0 0 1 6 6c0 1 0 2-.2 3M6 13a6 6 0 0 1 3-5.2"/></>,
    sliders: <><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5"/><circle cx="16" cy="6" r="2" fill={color} stroke="none"/><circle cx="8" cy="12" r="2" fill={color} stroke="none"/><circle cx="13" cy="18" r="2" fill={color} stroke="none"/></>,
    link2: <><path d="M9 12h6"/><path d="M10 8H8a4 4 0 0 0 0 8h2M14 8h2a4 4 0 0 1 0 8h-2"/></>,
    cpu: <><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 1.5v3M15 1.5v3M9 19.5v3M15 19.5v3M1.5 9h3M1.5 15h3M19.5 9h3M19.5 15h3"/></>,
    db: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

function Pill({ tone = "gray", dot, children, style }) {
  return <span className={`pill pill-${tone}`} style={style}>{dot && <span className="dot" />}{children}</span>;
}

function Trend({ dir, children }) {
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "—";
  return <span className={`trend trend-${dir}`}><span style={{ fontSize: 9 }}>{arrow}</span>{children}</span>;
}

function Toggle({ on, onClick }) {
  return <button className={`toggle ${on ? "on" : ""}`} onClick={onClick} aria-pressed={on} />;
}

function Kebab() {
  return <button className="kebab" onClick={(e) => e.stopPropagation()}><Icon name="kebab" size={18} /></button>;
}

function Search({ placeholder = "Search", width }) {
  return (
    <div className="search" style={width ? { minWidth: width } : null}>
      <Icon name="search" size={16} color="var(--ink-4)" />
      <input placeholder={placeholder} />
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o} className={value === o ? "active" : ""} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

function SelectChip({ children }) {
  return <button className="selchip">{children}<Icon name="chevDown" size={15} color="var(--ink-4)" /></button>;
}

/* Trust meter */
function TrustMeter({ value }) {
  const color = value >= 75 ? "var(--green)" : value >= 60 ? "var(--amber)" : "var(--red)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div className="meter" style={{ width: 56 }}><span style={{ width: `${value}%`, background: color }} /></div>
      <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>{value}</span>
    </div>
  );
}

/* Donut chart — segments [{label,value,color}] with centered value */
function Donut({ segments, size = 168, thickness = 22, center }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
              strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
              strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
      </g>
      {center && (
        <>
          <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 26, fontWeight: 700, fill: "var(--ink)" }}>{center.value}</text>
          <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11.5, fontWeight: 600, fill: "var(--ink-3)" }}>{center.label}</text>
        </>
      )}
    </svg>
  );
}

Object.assign(window, { Icon, Pill, Trend, Toggle, Kebab, Search, Segmented, SelectChip, TrustMeter, Donut });
