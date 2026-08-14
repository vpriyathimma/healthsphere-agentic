/* global React, ReactDOM */
/* HealthSphere clinical workspace — single-page (state routing).
   Global Copilot-style Care Assistant: opens a right-docked panel; the workspace
   reflows beside it (no overlay). Free-text chat to the supervisor agent.
   Clinical operations only — audit/forensics live in Reva Insights. */

const { useState, useEffect, useRef } = React;

function newChatId() {
  // crypto.randomUUID is not available on every browser/origin combination the
  // workspace is opened from; the fallback only has to be unique per browser
  // tab, not unguessable.
  try { return crypto.randomUUID(); } catch (_) {
    return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
}

const hsApi = {
  async get(p) {
    const r = await fetch(p, { credentials: "include" });
    if (r.status === 401) { window.location.href = "/healthsphere/auth/login"; throw new Error("401"); }
    if (!r.ok) throw new Error(r.status + " " + (await r.text()));
    return r.json();
  },
  // `timeoutMs` because a browser's own fetch timeout is not ours to rely on and
  // not the same in every browser. Safari gave up on a turn the agent was still
  // working on and reported "Load failed" — a network-level failure, with no
  // status and nothing in any server log, for a request that later succeeded.
  // An explicit AbortController makes the limit ours, and makes exceeding it say
  // so instead of looking like the connection broke.
  async post(p, body, opts) {
    const timeoutMs = (opts && opts.timeoutMs) || 30000;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(p, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}), signal: ctrl.signal });
      if (r.status === 401) { window.location.href = "/healthsphere/auth/login"; throw new Error("401"); }
      if (!r.ok) throw new Error(r.status + " " + (await r.text()));
      return r.json();
    } catch (e) {
      if (e.name === "AbortError") {
        throw new Error("the assistant is taking longer than " + Math.round(timeoutMs / 1000) + "s. It may still be working \u2014 check the orders list before retrying, so nothing is placed twice.");
      }
      throw e;
    } finally { clearTimeout(timer); }
  },
  async logout() {
    const { logoutUrl } = await this.post("/healthsphere/auth/logout");
    window.location.href = logoutUrl;
  },
};

const NAV = [
  { id: "patients", label: "Patients", ico: "◉" },
  { id: "orders", label: "Orders", ico: "℞" },
  { id: "records", label: "Records", ico: "❐" },
  { id: "admissions", label: "Admissions", ico: "⇄" },
  { id: "tasks", label: "Tasks", ico: "✓" },
];

function Topbar({ user, assistantOpen, onToggleAssistant }) {
  const c = user.clinician || {};
  const context = [c.specialty, c.department].filter(Boolean).join(" · ") || "—";
  return (
    <div className="topbar">
      <div className="brand"><span className="mark" />HealthSphere <small>Clinical Workspace</small></div>
      <div className="who">
        <button className={"assist-toggle" + (assistantOpen ? " on" : "")} onClick={onToggleAssistant}>
          <span className="spark" />Care Assistant
        </button>
        <span className="persona">{user.persona}</span>
        <div className="clin"><b>{user.name}</b><br /><span>{context}</span></div>
        <button onClick={() => hsApi.logout()}>Sign out</button>
      </div>
    </div>
  );
}

function Nav({ active, onNav }) {
  return (
    <nav className="nav">
      <div className="group">Care</div>
      {NAV.map((n) => (
        <button key={n.id} className={"navlink" + (n.id === active ? " active" : "")} onClick={() => onNav(n.id)}>
          <span>{n.ico}</span>{n.label}
        </button>
      ))}
    </nav>
  );
}

function Census({ onOpen }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { hsApi.get("/healthsphere/api/patients").then(setRows).catch(() => setRows([])); }, []);
  return (
    <div>
      <div className="page-h">
        <h1>Patient census</h1>
        <span className="sub">{rows ? rows.length + " patients on your worklist" : "Loading…"}</span>
      </div>
      <div className="panel">
        <table className="census">
          <thead><tr><th>Patient</th><th>MRN</th><th>Ward</th><th>Service</th><th>Attending</th><th>HR</th><th>BP</th><th>SpO₂</th><th>Status</th></tr></thead>
          <tbody>
            {rows && rows.length === 0 && <tr><td colSpan="9" style={{ padding: 30, color: "#5b6b82" }}>No patients scoped to your role.</td></tr>}
            {(rows || []).map((r) => (
              <tr key={r.id} onClick={() => onOpen({ id: r.id, name: r.name })}>
                <td className={"railcell " + r.status}><b>{r.name}</b></td>
                <td className="mrn">{r.mrn}</td>
                <td>{r.ward}</td>
                <td>{r.service}</td>
                <td>{r.attending}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{r.hr}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{r.bp}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{r.spo2}%</td>
                <td><span className={"pill " + r.status}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Chart({ patient, onBack }) {
  const [p, setP] = useState(null);
  useEffect(() => { hsApi.get("/healthsphere/api/patients/" + patient.id).then(setP); }, [patient.id]);
  if (!p) return <div className="center">Loading chart…</div>;
  return (
    <div style={{ maxWidth: 920 }}>
      <button className="back" onClick={onBack}>← Back to census</button>
      <div className="page-h">
        <div><h1>{p.name}</h1><span className="sub">{p.mrn} · {p.sex} · DOB {p.dob} · {p.ward} · {p.service}</span></div>
        <span className={"pill " + p.status}>{p.status}</span>
      </div>
      <div className="card"><h3>Vitals</h3>
        <div className="vitals">
          <div className="vital"><div className="lbl">Heart rate</div><div className="val">{p.vitals.hr}</div></div>
          <div className="vital"><div className="lbl">Blood pressure</div><div className="val">{p.vitals.bp}</div></div>
          <div className="vital"><div className="lbl">SpO₂</div><div className="val">{p.vitals.spo2}%</div></div>
          <div className="vital"><div className="lbl">Resp rate</div><div className="val">{p.vitals.rr}</div></div>
          <div className="vital"><div className="lbl">Temp</div><div className="val">{p.vitals.temp}°</div></div>
        </div>
      </div>
      <div className="card"><h3>Allergies</h3>
        {p.allergies.length ? p.allergies.map((a) => <span key={a} className="allergy">{a}</span>) : <span className="sub">No known allergies</span>}
      </div>
      <div className="card"><h3>Encounters</h3>
        {p.encounters.map((e) => <div className="row" key={e.id}><div><b>{e.type}</b><div className="sub">{e.note}</div></div><span className="mrn">{e.date}</span></div>)}
      </div>
      <div className="card"><h3>Orders</h3>
        {p.orders.length ? p.orders.map((o) => <div className="row" key={o.id}><div><b>{o.kind}</b> — {o.detail}<div className="sub">by {o.by}</div></div><span className={"tag " + o.state}>{o.state}</span></div>) : <span className="sub">No active orders</span>}
      </div>
    </div>
  );
}

function Assistant({ context, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // Seconds spent waiting on the current turn. Three animated dots say "not
  // frozen" for about ten seconds and then start to look like one; a turn here
  // can run the better part of a minute because every step of it is authorized
  // before it happens. Saying so is the difference between waiting and
  // wondering whether to hit Send again — and hitting Send again on a turn that
  // places orders is the expensive mistake.
  const [waited, setWaited] = useState(0);
  const threadRef = useRef(null);
  // Bumped by "New session". An approval poll started in an earlier session can
  // still be running — it retries for ~5 minutes — and without this it would
  // append "Approved by..." into a conversation that has already been cleared.
  const genRef = useRef(0);
  // One chat = one session. Until now every message derived its own runtime
  // session id from a fresh trace id, so `session.turn` was always 1 and
  // `session.id` never repeated — which makes the session block meaningless,
  // since a trajectory needs the turns to be recognisably the same chat.
  //
  // Reset by "New session", which is what a clinician understands as starting
  // over.
  const chatIdRef = useRef(newChatId());
  // Prior turns, as the evaluation contract wants them: request in, response
  // out. Kept here because the browser is the only place that sees the whole
  // chat — the agent is stateless by design and its runtimes are per-turn.
  const turnsRef = useRef([]);
  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [messages, busy]);
  useEffect(() => {
    if (!busy) { setWaited(0); return; }
    const t = setInterval(() => setWaited((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setMessages((m) => m.concat({ role: "user", text }));
    setInput(""); setBusy(true);
    try {
      // Three minutes. A multi-step turn — delegate, read the chart, place and
      // sign each order — has been measured at 25-55s, every step of it
      // authorized, and a cold runtime adds to that. The ceiling is deliberately
      // far above the worst observed rather than close to it.
      const a = await hsApi.post("/healthsphere/api/agent/ask", {
        prompt: text,
        patientId: context ? context.id : null,
        chatId: chatIdRef.current,
        turn: turnsRef.current.length + 1,
        // Earlier turns of this chat. The agent caps and truncates these before
        // they reach the PDP; sending them raw keeps the trimming rule in one
        // place rather than splitting it across two deployments.
        sessionMessages: turnsRef.current,
      }, { timeoutMs: 180000 });

      // The action needs a second clinician. Nothing has run — show what is
      // being waited on and poll until someone decides, in the app or in Slack.
      if (a.status === "pending_approval") {
        setMessages((m) => m.concat({ role: "assistant", text: a.reply, pending: a.approval_id }));
        pollApproval(a.approval_id);
        return;
      }

      const reply = a.reply || "(no response)";
      setMessages((m) => m.concat({ role: "assistant", text: reply }));
      // The turn is complete, so it becomes history for the next one. A turn
      // that failed or is still pending approval is deliberately not recorded:
      // a trajectory should be what actually happened, not what was attempted.
      turnsRef.current = turnsRef.current.concat({
        turn: turnsRef.current.length + 1,
        request: { role: "user", contentType: "text/plain", content: text,
                   timestamp: new Date().toISOString() },
        response: { role: "assistant", contentType: "text/plain", content: reply,
                    timestamp: new Date().toISOString() },
      });
    } catch (e) {
      setMessages((m) => m.concat({ role: "assistant", text: "Error: " + e.message }));
    } finally { setBusy(false); }
  };
  // Wait on a decision. Whoever decides first wins, whether that is a
  // clinician in the app or one in Slack; both write the same record.
  const pollApproval = (id) => {
    let tries = 0;
    const gen = genRef.current;
    const stale = () => genRef.current !== gen;
    const tick = async () => {
      if (stale()) return;
      tries += 1;
      try {
        const rec = await hsApi.get("/healthsphere/api/approvals/" + id);
        if (stale()) return;
        // An approval is decided before the action has actually run. Keep
        // waiting until the replay reports back, or the clinician sees
        // "approved" with nothing to show for it.
        const settling = rec.status === "approved" && !rec.replay_done;
        if (rec.status === "pending" || settling) {
          if (tries < 150) return setTimeout(tick, 2000); // ~5 minutes
          return setMessages((m) => m.concat({ role: "assistant",
            text: "Still waiting on a second clinician. This request stays open — you can check back shortly." }));
        }
        const who = rec.approver_display ? " by " + rec.approver_display : "";
        if (rec.status === "approved") {
          setMessages((m) => m.concat({ role: "assistant",
            text: "Approved" + who + ". " + (rec.result || "The action has been carried out.") }));
        } else if (rec.status === "rejected") {
          setMessages((m) => m.concat({ role: "assistant",
            text: "Not approved" + who + ". The order has not been placed." }));
        } else {
          setMessages((m) => m.concat({ role: "assistant",
            text: "This request expired before anyone could review it. Please raise it again if it is still needed." }));
        }
      } catch (e) {
        if (stale()) return;
        setMessages((m) => m.concat({ role: "assistant", text: "Lost track of that approval: " + e.message }));
      }
    };
    setTimeout(tick, 2000);
  };

  // Start over. Nothing needs clearing server-side: the app sends no
  // conversation history and derives a fresh runtime session per request, so
  // the agent already carries nothing between turns. This clears what the
  // clinician can see, and invalidates any approval poll still running.
  const newSession = () => {
    genRef.current += 1;
    chatIdRef.current = newChatId();
    turnsRef.current = [];
    setMessages([]);
    setInput("");
    setBusy(false);
  };

  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <aside className="assistant">
      <div className="a-head">
        <div className="a-title"><span className="mark" />Care Assistant</div>
        <div className="a-actions">
          <button className="a-new" onClick={newSession}
                  disabled={messages.length === 0 && !input}
                  title="Start a new session — the assistant keeps nothing from this conversation">
            New session
          </button>
          <button className="a-close" onClick={onClose} title="Close">×</button>
        </div>
      </div>
      <div className="a-ctx">
        {context ? <span>In context: <b>{context.name}</b></span> : <span>No patient in context — open a chart to add one.</span>}
      </div>
      <div className="a-thread" ref={threadRef}>
        {messages.length === 0 && <div className="a-empty">Ask about a patient, place an order, or request a discharge. Every action is traced end to end.</div>}
        {messages.map((m, i) => (
          <div key={i} className={"msg " + m.role}>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}
        {busy && <div className="msg assistant typing"><span></span><span></span><span></span></div>}
        {busy && waited >= 8 &&
          <div style={{ fontSize: 12, opacity: 0.6, margin: "2px 0 8px 4px" }}>
            {waited < 20 ? "Working on it\u2026"
              : waited < 45 ? "Still working \u2014 this one has several steps."
              : "Still working (" + waited + "s). Longer requests check each step before it runs."}
          </div>}
      </div>
      <div className="a-input">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
          placeholder="Message the Care Assistant…" />
        <button className="a-send" onClick={send} disabled={busy || !input.trim()}>Send</button>
      </div>
    </aside>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("patients");
  const [open, setOpen] = useState(null); // { id, name } when a chart is open
  const [assistantOpen, setAssistantOpen] = useState(false);
  useEffect(() => { hsApi.get("/healthsphere/api/me").then(setUser).catch(() => {}); }, []);
  if (!user) return <div className="center">Loading workspace…</div>;

  let content;
  if (tab === "patients") {
    content = open
      ? <Chart patient={open} onBack={() => setOpen(null)} />
      : <Census onOpen={setOpen} />;
  } else {
    const label = NAV.find((n) => n.id === tab).label;
    content = <div><div className="page-h"><h1>{label}</h1><span className="sub">Coming in a later phase</span></div><div className="panel" style={{ padding: 40, color: "#5b6b82" }}>This area is part of a later build phase.</div></div>;
  }

  // Copilot reflow: the assistant is a real grid column; main shrinks beside it.
  const cols = assistantOpen ? "216px 1fr 400px" : "216px 1fr";
  const context = tab === "patients" && open ? open : null;

  return (
    <div className="app">
      <Topbar user={user} assistantOpen={assistantOpen} onToggleAssistant={() => setAssistantOpen((v) => !v)} />
      <div className="body" style={{ gridTemplateColumns: cols }}>
        <Nav active={tab} onNav={(id) => { setTab(id); setOpen(null); }} />
        <main className="main">{content}</main>
        {assistantOpen && <Assistant context={context} onClose={() => setAssistantOpen(false)} />}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
