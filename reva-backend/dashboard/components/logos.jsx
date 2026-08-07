/* global React */
/* Brand logo marks for integration tiles. Simple, recognizable, used as identifiers. */

function ClaudeBurst({ size = 24, color = "#D97757" }) {
  const rays = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    rays.push(<line key={i}
      x1={12 + Math.cos(a) * 2.6} y1={12 + Math.sin(a) * 2.6}
      x2={12 + Math.cos(a) * 9.6} y2={12 + Math.sin(a) * 9.6}
      stroke={color} strokeWidth={2.3} strokeLinecap="round" />);
  }
  return <svg width={size} height={size} viewBox="0 0 24 24">{rays}</svg>;
}

function Initials({ text, bg = "var(--surface-3)", fg = "var(--ink-3)", size = 24 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 7, background: bg, color: fg,
      display: "grid", placeItems: "center", fontSize: size * 0.4, fontWeight: 700, letterSpacing: "-.02em" }}>{text}</div>
  );
}

function Mark({ brand, size = 24 }) {
  const s = size;
  switch (brand) {
    case "anthropic":
      return <ClaudeBurst size={s} />;
    case "aws":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <text x="20" y="20" textAnchor="middle" fontSize="11" fontWeight="700" fill="#232F3E" fontFamily="Inter">aws</text>
          <path d="M9 25c7 4 15 4 22 0" stroke="#FF9900" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M29 23.5l2.5-.6-.6 2.5z" fill="#FF9900" />
        </svg>
      );
    case "s3":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M6 7h12l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H8.7a1.5 1.5 0 0 1-1.5-1.3z" fill="#3F8624" />
          <ellipse cx="12" cy="7" rx="6" ry="1.8" fill="#5FA83C" />
        </svg>
      );
    case "cognito":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M12 3l7 4v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V7z" fill="#DD344C" />
          <circle cx="12" cy="10" r="2.2" fill="#fff" /><path d="M8.5 16a3.5 3.5 0 0 1 7 0z" fill="#fff" />
        </svg>
      );
    case "entra":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M12 3L4 20h4l4-9 4 9h4z" fill="#0A7BD4" />
          <path d="M12 3L4 20h4l4-9z" fill="#33B1E1" />
        </svg>
      );
    case "okta":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" fill="none" stroke="#00297A" strokeWidth="3.6" />
        </svg>
      );
    case "oktaverify":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="11" cy="12" r="7" fill="none" stroke="#00297A" strokeWidth="3.2" />
          <path d="M16 7l4 2-1.5 4" stroke="#16A34A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "crowdstrike":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M3 8c4-1 7 1 9 4 2-3 5-5 9-4-3 2-4 5-9 9-5-4-6-7-9-9z" fill="#E01A22" />
        </svg>
      );
    case "github":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="6.5" cy="7" r="2" fill="#181717" /><circle cx="6.5" cy="17" r="2" fill="#181717" /><circle cx="16" cy="7" r="2" fill="#181717" />
          <path d="M6.5 9v6M16 9v2c0 2.5-2 3-4 3.2" stroke="#181717" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "bedrock":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M12 3l7 4v10l-7 4-7-4V7z" fill="none" stroke="#FF9900" strokeWidth="1.8" />
          <path d="M12 8.5l3 1.7v3.6l-3 1.7-3-1.7v-3.6z" fill="#FF9900" />
        </svg>
      );
    case "n8n":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="2.2" fill="#EA4B71" /><circle cx="12" cy="7" r="2.2" fill="#EA4B71" /><circle cx="12" cy="17" r="2.2" fill="#EA4B71" /><circle cx="19" cy="12" r="2.2" fill="#EA4B71" />
          <path d="M6.8 11l3.4-2.4M6.8 13l3.4 2.4M13.8 8.6L17.2 11M13.8 15.4L17.2 13" stroke="#EA4B71" strokeWidth="1.5" />
        </svg>
      );
    case "slack":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <g strokeWidth="3.4" strokeLinecap="round">
            <path d="M9 5.5v6" stroke="#36C5F0" /><path d="M14.5 9h-6" stroke="#2EB67D" />
            <path d="M15 12.5v6" stroke="#ECB22E" /><path d="M9.5 15h6" stroke="#E01E5A" />
          </g>
        </svg>
      );
    case "microsoft":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <rect x="4" y="4" width="7" height="7" fill="#F25022" /><rect x="13" y="4" width="7" height="7" fill="#7FBA00" />
          <rect x="4" y="13" width="7" height="7" fill="#00A4EF" /><rect x="13" y="13" width="7" height="7" fill="#FFB900" />
        </svg>
      );
    case "langchain":
      return <Initials text="LC" bg="#E7F6EE" fg="#1C8A4E" size={s} />;
    case "crewai":
      return <Initials text="C" bg="#1F2430" fg="#fff" size={s} />;
    case "custom":
      return <Initials text="+" bg="var(--surface-3)" fg="var(--ink-3)" size={s} />;
    case "otel":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="12" cy="9" r="3" fill="none" stroke="#F5A800" strokeWidth="2" />
          <circle cx="12" cy="9" r="1.2" fill="#425CC7" />
          <path d="M8 15l-2 3M16 15l2 3M12 13v5" stroke="#425CC7" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return <Initials text={(brand || "?").slice(0, 2).toUpperCase()} size={s} />;
  }
}

function LogoTile({ brand, size = 44, mark = 24 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 12, background: "#fff",
      border: "1px solid var(--border)", display: "grid", placeItems: "center", flex: "none",
    }}>
      <Mark brand={brand} size={mark} />
    </div>
  );
}

Object.assign(window, { Mark, LogoTile, ClaudeBurst });
