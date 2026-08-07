/* global React, Icon, Pill */
/* Main app shell: slim left rail + top bar + page header + pill tab bar + content router */

const TABS = [
  "Insights", "Policies", "Guardrails", "Data", "Schema", "Version History",
  "Decision Logs", "Developer Integration", "Settings",
];

const RAIL = [
  { id: "home", name: "Home", icon: "home" },
  { id: "workloads", name: "AI Coding Agents", icon: "layers" },
  { id: "aws-workloads", name: "AWS Agentic AI Workloads", icon: "cloud" },
  { id: "posture", name: "AI Agent Security Posture", icon: "microsoft" },
  { id: "integrations", name: "Integrations", icon: "plug" },
  { id: "identities", name: "Identities", icon: "user" },
  { id: "logs", name: "Decision Logs", icon: "list" },
  { id: "isolation", name: "Access Isolation", icon: "shield" },
];

function LeftRail({ activeId, onNavigate }) {
  return (
    <aside style={{
      width: 64, background: "#fff", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 16, paddingBottom: 16, flex: "none", zIndex: 5,
    }}>
      {/* Reva shield logo */}
      <div style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center",
        background: "linear-gradient(150deg, #2563EB, #7C3AED)", boxShadow: "0 4px 12px rgba(124,58,237,.28)" }}>
        <Icon name="shield" size={21} color="#fff" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 22 }}>
        {RAIL.map((r) => {
          const on = r.id === activeId;
          return (
            <button key={r.id} title={r.name} onClick={() => onNavigate(r.id)} style={{
              width: 44, height: 44, borderRadius: 11, border: 0, cursor: "pointer",
              background: on ? "var(--blue-tint)" : "transparent",
              color: on ? "var(--blue-700)" : "var(--ink-4)",
              display: "grid", placeItems: "center", transition: "all .15s",
            }}>{r.icon === "microsoft" ? <window.Mark brand="microsoft" size={20} /> : <Icon name={r.icon} size={20} />}</button>
          );
        })}
      </div>
      <div style={{ marginTop: "auto", width: 36, height: 36, borderRadius: "50%",
        background: "#E8EDF5", color: "var(--ink-2)", display: "grid", placeItems: "center",
        fontSize: 13, fontWeight: 700 }}>PF</div>
    </aside>
  );
}

function TopBar({ crumbs }) {
  return (
    <div style={{
      height: 56, background: "#fff", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", gap: 14, padding: "0 24px", flex: "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
        {crumbs.map((c, i) => (
          <React.Fragment key={c}>
            {i > 0 && <Icon name="chevRight" size={14} color="var(--ink-4)" />}
            <span style={{ color: i === crumbs.length - 1 ? "var(--ink)" : "var(--ink-3)", fontWeight: i === crumbs.length - 1 ? 600 : 400 }}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <div className="search" style={{ minWidth: 240, height: 34 }}>
          <Icon name="search" size={15} color="var(--ink-4)" />
          <input placeholder="Search Reva…" />
        </div>
        <button className="kebab"><Icon name="bell" size={19} /></button>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div style={{ padding: "22px 32px 0" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: "#fff", border: "1px solid var(--border)",
          display: "grid", placeItems: "center", flex: "none", boxShadow: "var(--shadow-card)" }}>
          <ClaudeBurst size={26} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>AI Coding Agents</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
            <Pill tone="blue">Owner: Patrick Fuller</Pill>
            <Pill tone="green" dot>Status: Online</Pill>
            <Pill tone="purple">Cedar-enforced</Pill>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost btn-sm">View schema</button>
          <button className="kebab" style={{ border: "1px solid var(--border-strong)" }}><Icon name="kebab" size={18} /></button>
        </div>
      </div>
    </div>
  );
}

function TabBar({ active, onChange }) {
  const ref = React.useRef(null);
  return (
    <div style={{ padding: "0 32px", marginTop: 18, background: "#fff", borderBottom: "1px solid var(--border)",
      position: "sticky", top: 0, zIndex: 4 }}>
      <div ref={ref} style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map((t) => {
          const on = t === active;
          return (
            <button key={t} onClick={() => onChange(t)} style={{
              position: "relative", border: 0, background: "transparent",
              padding: "14px 14px 15px", fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap",
              color: on ? "var(--ink)" : "var(--ink-3)", transition: "color .15s",
            }}>
              {t}
              {on && <span style={{ position: "absolute", left: 8, right: 8, bottom: -1, height: 2.5,
                background: "var(--blue)", borderRadius: 2 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Placeholder({ name }) {
  return (
    <div style={{ padding: 32 }}>
      <div className="card" style={{ height: 420, display: "grid", placeItems: "center", borderStyle: "dashed", background: "transparent" }}>
        <div style={{ textAlign: "center", color: "var(--ink-4)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-3)" }}>{name}</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Tab content not part of this design pass.</div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [nav, setNav] = React.useState("home");
  const [tab, setTab] = React.useState("Insights");
  const scrollRef = React.useRef(null);
  const isIntegrations = nav === "integrations";
  const isHome = nav === "home";
  const isIsolation = nav === "isolation";
  const isPosture = nav === "posture";
  const isAwsWorkloads = nav === "aws-workloads";

  const navigate = (id) => {
    setNav(id);
    if (id === "logs") setTab("Decision Logs");
    else if (id === "identities" || id === "workloads" || id === "aws-workloads") setTab("Insights");
  };

  const map = {
    "Insights": window.Insights,
    "Policies": window.PoliciesTab,
    "Guardrails": window.GuardrailsTab,
    "Decision Logs": window.DecisionLogs,
    "Developer Integration": window.DeveloperIntegration,
    "Settings": window.SettingsTab,
  };
  const Active = map[tab];
  const Integrations = window.IntegrationsPage;
  const HomeApp = window.HomeApp;
  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [tab, nav]);

  let crumbs;
  if (isHome) crumbs = ["Home"];
  else if (isAwsWorkloads) crumbs = ["AI Workloads", "AWS Agentic AI Workloads"];
  else if (isPosture) crumbs = ["AI Agent Security Posture"];
  else if (isIsolation) crumbs = ["Home", "Adaptive Access Isolation"];
  else if (isIntegrations) crumbs = ["Integrations"];
  else crumbs = ["AI Workloads", "AI Coding Agents"];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <LeftRail activeId={nav} onNavigate={navigate} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar crumbs={crumbs} />
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {isHome ? (
            <HomeApp key="home" initialView="dashboard" />
          ) : isAwsWorkloads ? (
            window.AwsWorkloadsPage ? <window.AwsWorkloadsPage /> : <Placeholder name="AWS Agentic AI Workloads" />
          ) : isPosture ? (
            window.PostureApp ? <window.PostureApp /> : <Placeholder name="AI Agent Security Posture" />
          ) : isIsolation ? (
            <HomeApp key="iso" initialView="policies" />
          ) : isIntegrations ? (
            Integrations ? <Integrations onOpenWorkload={() => navigate("workloads")} onOpenAwsWorkload={() => navigate("aws-workloads")} /> : <Placeholder name="Integrations" />
          ) : (
            <>
              <PageHeader />
              <TabBar active={tab} onChange={setTab} />
              <div style={{ flex: 1 }}>
                {Active ? <Active /> : <Placeholder name={tab} />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
