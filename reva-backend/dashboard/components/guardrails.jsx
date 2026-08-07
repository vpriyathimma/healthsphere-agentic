/* global React, Icon, Pill, Search */
/* Guardrails tab — maker-checker draft workflow over the protections table */
const { useState: grUseState, useMemo: grUseMemo } = React;

const GR_ME = "Patrick Fuller";
const GR_APPROVERS = ["Dana Okonkwo", "Mara Alvarez", "Patrick Fuller"];

function grNow() {
  const d = new Date();
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())} ${mon}, ${String(d.getFullYear()).slice(2)} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const GR_SEED_HISTORY = [
  { version: 3, submitter: "Patrick Fuller", approver: "Dana Okonkwo", timestamp: "02 Jun, 26 · 14:20", state: "Published", changes: 4 },
  { version: 2, submitter: "Lena Nakamura", approver: "Patrick Fuller", timestamp: "21 May, 26 · 09:55", state: "Published", changes: 2 },
  { version: 1, submitter: "System", approver: "—", timestamp: "04 May, 26 · 12:00", state: "Published", changes: 13 },
];

/* ----- create-draft modal ----- */
function CreateDraftModal({ onCancel, onConfirm }) {
  return (
    <div className="cf-scrim" onClick={onCancel}>
      <div className="cf-box" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <span style={{ width: 36, height: 36, borderRadius: 9, background: "var(--amber-tint)", color: "var(--amber-ink)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="fileCode" size={18} /></span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>Create a draft version?</h3>
            <p style={{ margin: "6px 0 0", color: "var(--ink-3)", fontSize: 13.5, lineHeight: 1.55 }}>Guardrail changes are made in a draft and submitted for approval before going live.</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm}>Create draft</button>
        </div>
      </div>
    </div>
  );
}

/* ----- diff list ----- */
function DiffList({ groups }) {
  const RISK = window.GR_RISK_TONE;
  if (groups.length === 0) return <div className="help" style={{ padding: "20px 0", textAlign: "center" }}>No changes from the live version.</div>;
  return (
    <div>
      {groups.map((g) => (
        <div key={g.name} className="gr-diffgrp">
          <div className="gr-diffhead">
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{g.name}</span>
            <Pill tone={RISK[g.risk]} style={{ marginLeft: "auto" }}>{g.risk}</Pill>
          </div>
          {g.changes.map((c, i) => (
            <div key={i} className="gr-diffrow">
              <span style={{ fontWeight: 600, color: "var(--ink-2)", minWidth: 150 }}>{c.label}</span>
              {c.old !== "" && <><span className="gr-old">{c.old}</span><Icon name="arrowRight" size={13} className="gr-arrow" /></>}
              <span className="gr-new">{c.neu}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ----- approval review screen ----- */
function ApprovalReview({ draftVer, submitter, groups, onApprove, onReject, onBack }) {
  const [acting, setActing] = grUseState(GR_APPROVERS.find((a) => a !== submitter));
  const [comment, setComment] = grUseState("");
  const selfApprove = acting === submitter;
  return (
    <div style={{ padding: 28, maxWidth: 920 }}>
      <button className="crumb" onClick={onBack}><Icon name="arrowLeft" size={12} /> Guardrails</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, letterSpacing: "-.01em", color: "var(--ink)" }}>Review draft v{draftVer}</h1>
        <Pill tone="blue" dot>Pending approval</Pill>
      </div>
      <p className="sub" style={{ margin: "0 0 22px" }}>Submitted by <b style={{ color: "var(--ink)" }}>{submitter}</b> · {grNow()}</p>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>Change summary</div>
        <DiffList groups={groups} />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span className="gr-flabel" style={{ margin: 0 }}>Acting approver</span>
          <div className="seg" style={{ marginLeft: "auto" }}>
            {GR_APPROVERS.map((a) => <button key={a} className={acting === a ? "active" : ""} onClick={() => setActing(a)}>{a === GR_ME ? a + " (you)" : a}</button>)}
          </div>
        </div>
        {selfApprove && (
          <div className="gr-banner rejected" style={{ marginBottom: 16 }}>
            <Icon name="alert" size={15} /> Maker-checker: the submitter cannot approve their own draft. Select a different approver.
          </div>
        )}
        <span className="gr-flabel">Comment {`(required to reject)`}</span>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add an approval or rejection note…"
          style={{ width: "100%", minHeight: 76, border: "1px solid var(--border-strong)", borderRadius: 9, padding: 12, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical" }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button className="btn btn-ghost" disabled={!comment.trim()} style={!comment.trim() ? { opacity: 0.5, cursor: "not-allowed" } : null} onClick={() => onReject(acting, comment)}>Reject</button>
          <button className="btn btn-primary" disabled={selfApprove} style={selfApprove ? { opacity: 0.5, cursor: "not-allowed" } : null} onClick={() => onApprove(acting, comment)}>Approve &amp; publish</button>
        </div>
      </div>
    </div>
  );
}

/* ----- version history ----- */
function VersionHistory({ history, onBack }) {
  const ST = window.GR_STATE_TONE;
  return (
    <div style={{ padding: 28 }}>
      <button className="crumb" onClick={onBack}><Icon name="arrowLeft" size={12} /> Guardrails</button>
      <h1 style={{ margin: "0 0 4px", fontSize: 23, fontWeight: 600, letterSpacing: "-.01em", color: "var(--ink)" }}>Version history</h1>
      <p className="sub" style={{ margin: "0 0 22px" }}>Every published, rejected, and pending guardrail version with its maker and checker.</p>
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr><th>Version</th><th>Submitter (maker)</th><th>Approver (checker)</th><th>Timestamp</th><th>Changes</th><th style={{ textAlign: "right" }}>State</th></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.version + h.state + h.timestamp}>
                <td><span className="mono" style={{ fontWeight: 700, color: "var(--ink)" }}>v{h.version}</span></td>
                <td>{h.submitter}</td>
                <td>{h.approver}</td>
                <td className="sub mono" style={{ fontSize: 12 }}>{h.timestamp}</td>
                <td className="sub">{h.changes} guardrail{h.changes === 1 ? "" : "s"}</td>
                <td style={{ textAlign: "right" }}><Pill tone={ST[h.state]} dot>{h.state}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----- main ----- */
function GuardrailsTab() {
  const META = window.GUARD_META, METABY = window.GR_META_BY_NAME, RISK = window.GR_RISK_TONE, ST = window.GR_STATE_TONE;
  const [view, setView] = grUseState("list");           // list | review | history
  const [vState, setVState] = grUseState("Published");   // Published | Draft | Pending approval | Rejected
  const [liveVer, setLiveVer] = grUseState(3);
  const [live, setLive] = grUseState(window.defaultGuardSettings);
  const [draft, setDraft] = grUseState(null);
  const [rejectNote, setRejectNote] = grUseState(null);
  const [history, setHistory] = grUseState(GR_SEED_HISTORY);
  const [drawer, setDrawer] = grUseState(null);
  const [modalToggle, setModalToggle] = grUseState(null);
  const [editPrompt, setEditPrompt] = grUseState(false);
  const [toast, setToast] = grUseState(null);
  const [q, setQ] = grUseState("");

  const draftVer = liveVer + 1;
  const editable = vState === "Draft" || vState === "Rejected";
  const effective = vState === "Published" ? live : (draft || live);
  const fireToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const startDraft = () => { const d = window.grClone(live); setDraft(d); setVState("Draft"); setRejectNote(null); return d; };

  const onToggleClick = (name) => {
    const meta = METABY[name];
    if (meta.locked) return;
    if (vState === "Published") { setModalToggle(name); return; }
    if (vState === "Pending approval") { fireToast("Draft is pending approval — recall it to edit"); return; }
    // editable
    setDraft((d) => ({ ...d, [name]: { ...d[name], enabled: !d[name].enabled } }));
  };

  const confirmCreateDraft = () => {
    const d = startDraft();
    if (modalToggle) d[modalToggle] = { ...d[modalToggle], enabled: !d[modalToggle].enabled };
    setDraft({ ...d });
    setModalToggle(null);
  };

  /* edit pressed from inside a read-only drawer → create draft, keep the same drawer open (now editable) */
  const startDraftForEdit = () => { startDraft(); setEditPrompt(false); };

  const saveDrawer = (name, params) => {
    setDraft((d) => ({ ...d, [name]: { ...d[name], params } }));
    setDrawer(null);
    fireToast(`${name} staged into draft v${draftVer}`);
  };

  const groups = grUseMemo(() => draft ? window.grDiff(live, draft) : [], [live, draft]);

  const submit = () => {
    if (groups.length === 0) { fireToast("No changes to submit"); return; }
    setVState("Pending approval");
    fireToast(`Draft v${draftVer} submitted for approval`);
  };

  const approve = (approver) => {
    setLive(window.grClone(draft));
    setHistory((h) => [{ version: draftVer, submitter: GR_ME, approver, timestamp: grNow(), state: "Published", changes: groups.length }, ...h]);
    setLiveVer(draftVer); setDraft(null); setVState("Published"); setRejectNote(null); setView("list");
    fireToast(`Approved — guardrails are live at v${draftVer}`);
  };
  const reject = (approver, comment) => {
    setHistory((h) => [{ version: draftVer, submitter: GR_ME, approver, timestamp: grNow(), state: "Rejected", changes: groups.length }, ...h]);
    setVState("Rejected"); setRejectNote({ by: approver, comment }); setView("list");
    fireToast("Draft rejected — returned for edits");
  };
  const discard = () => { setDraft(null); setVState("Published"); setRejectNote(null); fireToast("Draft discarded"); };

  if (view === "history") return <><VersionHistory history={history} onBack={() => setView("list")} />{toast && <Toast msg={toast} />}</>;
  if (view === "review") return <><ApprovalReview draftVer={draftVer} submitter={GR_ME} groups={groups} onApprove={approve} onReject={reject} onBack={() => setView("list")} />{toast && <Toast msg={toast} />}</>;

  const rows = META.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.desc.toLowerCase().includes(q.toLowerCase()));
  const drawerMeta = drawer ? METABY[drawer] : null;

  return (
    <div style={{ padding: 28 }}>
      {/* banner */}
      {vState === "Draft" && (
        <div className="gr-banner draft">
          <Icon name="fileCode" size={16} />
          <span><b>Draft v{draftVer} — editing.</b> Toggle and configure guardrails, then submit for approval. Changes are staged, not live.</span>
          <button className="gr-link" style={{ marginLeft: "auto" }} onClick={discard}>Discard draft</button>
        </div>
      )}
      {vState === "Pending approval" && (
        <div className="gr-banner pending">
          <Icon name="clock" size={16} />
          <span><b>Draft v{draftVer} — pending approval.</b> Submitted to an approver. The live version is unchanged until approved.</span>
          <button className="gr-link" style={{ marginLeft: 14 }} onClick={() => setView("review")}>Open review</button>
          <button className="gr-link" style={{ marginLeft: 14 }} onClick={() => { setVState("Draft"); fireToast("Draft recalled"); }}>Recall</button>
        </div>
      )}
      {vState === "Rejected" && (
        <div className="gr-banner rejected">
          <Icon name="alert" size={16} />
          <span><b>Draft v{draftVer} — rejected by {rejectNote?.by}.</b> {rejectNote?.comment ? `"${rejectNote.comment}" ` : ""}Edit and resubmit, or discard.</span>
          <button className="gr-link" style={{ marginLeft: "auto" }} onClick={discard}>Discard draft</button>
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="section-title">Guardrails</div>
              <Pill tone={ST[vState]} dot>{vState === "Published" ? `Published · v${liveVer}` : vState}</Pill>
            </div>
            <div className="help" style={{ marginTop: 2 }}>High-level protections evaluated before policies. Changes go through draft and approval before they reach production.</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div className="search" style={{ minWidth: 220, height: 38 }}>
              <Icon name="search" size={16} color="var(--ink-4)" />
              <input placeholder="Search guardrails…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setView("history")}><Icon name="clock" size={15} /> Version history</button>
            {editable && <button className="btn btn-primary btn-sm" onClick={submit}>Submit for approval</button>}
            {vState === "Pending approval" && <button className="btn btn-primary btn-sm" onClick={() => setView("review")}>Review request</button>}
          </div>
        </div>

        <table className="tbl">
          <thead><tr><th>Name</th><th>Description</th><th>Risk Level</th><th style={{ textAlign: "right" }}>Enabled</th></tr></thead>
          <tbody>
            {rows.map((m) => {
              const eff = effective[m.name];
              return (
                <tr key={m.name} className="clickable" onClick={() => setDrawer(m.name)} style={{ opacity: eff.enabled ? 1 : 0.55, transition: "opacity .15s" }}>
                  <td style={{ width: 280 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13.5 }}>{m.name}</span>
                      {m.locked && <span title="Always on — cannot be disabled" style={{ display: "grid", placeItems: "center", color: "var(--ink-4)" }}><Icon name="lock" size={13} /></span>}
                    </div>
                  </td>
                  <td className="sub" style={{ fontSize: 13 }}>{m.desc}</td>
                  <td style={{ width: 130 }}><Pill tone={RISK[m.risk]}>{m.risk}</Pill></td>
                  <td style={{ width: 80, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    {m.locked
                      ? <button className="gr-locktog" title="Always on — cannot be disabled" disabled />
                      : <button className={`toggle ${eff.enabled ? "on" : ""}`} onClick={() => onToggleClick(m.name)} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="tbl-foot">
          <span>{META.length} guardrails · {META.filter((m) => effective[m.name].enabled).length} enabled · 3 always-on</span>
          {editable && <span className="help">{groups.length} guardrail{groups.length === 1 ? "" : "s"} changed in this draft</span>}
        </div>
      </div>

      {drawerMeta && (
        <window.GuardrailDrawer key={drawer} meta={drawerMeta} current={effective[drawer]} editable={editable}
          onSave={saveDrawer} onClose={() => setDrawer(null)} onStartDraft={() => setEditPrompt(true)} />
      )}
      {modalToggle && <CreateDraftModal onCancel={() => setModalToggle(null)} onConfirm={confirmCreateDraft} />}
      {editPrompt && <CreateDraftModal onCancel={() => setEditPrompt(false)} onConfirm={startDraftForEdit} />}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

function Toast({ msg }) {
  return <div className="toast-host"><div className="toast"><Icon name="checkCircle" size={16} color="#5eead4" />{msg}</div></div>;
}

window.GuardrailsTab = GuardrailsTab;
