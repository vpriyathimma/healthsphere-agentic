/* global React, Icon, Pill */
/* Toast + Confirm + Principal-review Side Panel */
const { createContext: aaiCreateContext, useContext: aaiUseContext, useCallback: aaiUseCallback } = React;

const ToastCtx = aaiCreateContext(null);
const useToast = () => aaiUseContext(ToastCtx);

function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);
  const push = aaiUseCallback((msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, leaving: false }]);
    setTimeout(() => setToasts((t) => t.map((x) => x.id === id ? { ...x, leaving: true } : x)), 2700);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-host">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.leaving ? "leaving" : ""}`}>
            <Icon name="checkCircle" size={16} color="#5eead4" /><span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="cf-scrim" onClick={onCancel}>
      <div className="cf-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--red-tint)", color: "var(--red)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="alert" size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{title}</h3>
            <p style={{ margin: "6px 0 0", color: "var(--ink-3)", fontSize: 13.5, lineHeight: 1.55 }}>{body}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

const STATUS_HEX = {
  "Quarantined": "#475569", "Awaiting resolution": "#d97706", "In certification": "#7c3aed",
  "Auto-restoring": "#2563EB", "Resolved": "#059669", "Permanently revoked": "#dc2626",
};

function SidePanel({ policy, onClose, onUpdatePrincipal }) {
  const toast = useToast();
  const [closing, setClosing] = React.useState(false);
  const [confirmRevoke, setConfirmRevoke] = React.useState(null);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") doClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const doClose = () => { setClosing(true); setTimeout(onClose, 200); };
  if (!policy) return null;

  const activeCount = policy.principals.filter((p) => !["Resolved", "Permanently revoked"].includes(p.status)).length;

  const handleAction = (principal, kind) => {
    let nextStatus, msg;
    switch (kind) {
      case "send-approval": nextStatus = "Awaiting resolution"; msg = "Approval request sent — awaiting reviewer authorization"; break;
      case "grant": nextStatus = "Resolved"; msg = "Access reinstated — principal restored to active state"; break;
      case "launch": nextStatus = "In certification"; msg = "Certification campaign launched — assigned to certifier"; break;
      case "revoke": nextStatus = "Permanently revoked"; msg = "Access permanently revoked — removed from access graph"; break;
    }
    onUpdatePrincipal(policy.id, principal.pid, { status: nextStatus });
    toast(msg);
  };

  return (
    <>
      <div className="sp-scrim" style={closing ? { opacity: 0, transition: "opacity .2s" } : null} onClick={doClose} />
      <div className="sp-panel" style={closing ? { transform: "translateX(100%)", transition: "transform .2s cubic-bezier(.7,0,.84,0)" } : null} onClick={(e) => e.stopPropagation()}>
        <div className="sp-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sp-eyebrow">
              <span className="mono-id">{policy.id}</span>
              <span className="sp-dotsep" />
              <span>{activeCount} {activeCount === 1 ? "active principal" : "active principals"}</span>
            </div>
            <h2 className="sp-title">{policy.name}</h2>
          </div>
          <button className="kebab" onClick={doClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="sp-meta">
          <div className="sp-meta-grp">
            <span className="sp-meta-lbl">Category</span>
            <span className="sp-meta-val">{CATEGORIES[policy.category].label} <span className="sp-meta-dim">({CATEGORIES[policy.category].short})</span></span>
          </div>
          <div className="sp-divider" />
          <div className="sp-meta-grp">
            <span className="sp-meta-lbl">Resolution</span>
            <Pill tone={RESOLUTION_PILL[policy.resolution]}>{policy.resolution}</Pill>
          </div>
          <div className="sp-divider" />
          <div className="sp-meta-grp">
            <span className="sp-meta-lbl">Status</span>
            <span className="sp-meta-val" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="live-dot" /> Monitoring</span>
          </div>
        </div>

        <div className="sp-body">
          {policy.principals.length === 0 ? <SpEmpty /> :
            activeCount === 0 ? <SpResolved principals={policy.principals} /> :
            <PrincipalTable principals={policy.principals} resolution={policy.resolution}
              onAction={handleAction} onRevoke={(p) => setConfirmRevoke(p)} />}
        </div>

        <div className="sp-foot">
          <span style={{ color: "var(--ink-3)", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Icon name="clock" size={12} /> Real-time updates · last sync just now
          </span>
          <button className="btn btn-ghost btn-sm"><Icon name="more" size={14} /> Audit log</button>
        </div>
      </div>

      <ConfirmDialog open={!!confirmRevoke}
        title={confirmRevoke ? `Revoke access for ${confirmRevoke.pid}?` : ""}
        body="This permanently removes the principal from the access graph. This cannot be undone."
        confirmLabel="Revoke access"
        onCancel={() => setConfirmRevoke(null)}
        onConfirm={() => { handleAction(confirmRevoke, "revoke"); setConfirmRevoke(null); }} />
    </>
  );
}

function SpEmpty() {
  return (
    <div className="sp-empty">
      <div className="sp-empty-ic"><Icon name="shield" size={28} /></div>
      <h3>No quarantined principals</h3>
      <p>This policy is actively monitoring. Principals will appear here when quarantine conditions are triggered.</p>
    </div>
  );
}
function SpResolved({ principals }) {
  return (
    <div className="sp-empty">
      <div className="sp-empty-ic" style={{ background: "var(--green-tint)", color: "var(--green)" }}><Icon name="checkCircle" size={28} /></div>
      <h3>All principals resolved</h3>
      <p>{principals.length} {principals.length === 1 ? "principal has" : "principals have"} been processed under this policy.</p>
    </div>
  );
}

function PrincipalTable({ principals, resolution, onAction, onRevoke }) {
  return (
    <table className="ptbl">
      <colgroup><col style={{ width: "22%" }} /><col style={{ width: "10%" }} /><col style={{ width: "36%" }} /><col style={{ width: "14%" }} /><col style={{ width: "18%" }} /></colgroup>
      <thead><tr><th>Principal</th><th>Identity</th><th>Clipped via</th><th>Status</th><th style={{ textAlign: "right" }}>Action</th></tr></thead>
      <tbody>
        {principals.map((p) => (
          <PrincipalRow key={p.pid} principal={p} resolution={resolution} onAction={(k) => onAction(p, k)} onRevoke={() => onRevoke(p)} />
        ))}
      </tbody>
    </table>
  );
}

function PrincipalRow({ principal: p, resolution, onAction, onRevoke }) {
  return (
    <tr>
      <td>
        <div className="pid">{p.pid}</div>
        <div className="pid-time"><Icon name="clock" size={11} /> {formatDuration(p.quarantineSec)} ago</div>
      </td>
      <td><Pill tone={IDENTITY_PILL[p.type]}>{p.type}</Pill></td>
      <td>
        <div style={{ marginBottom: 6 }}><Pill tone={TRIGGER_PILL[p.trigger]} dot>{p.trigger}</Pill></div>
        <div className="reason">{p.reason}</div>
      </td>
      <td>
        <Pill tone={STATUS_PILL[p.status]}>
          {p.status === "Auto-restoring" && <span className="status-pulse" style={{ marginRight: 4 }} />}{p.status}
        </Pill>
      </td>
      <td style={{ textAlign: "right" }}>
        <ActionCell status={p.status} resolution={resolution} onAction={onAction} onRevoke={onRevoke} />
      </td>
    </tr>
  );
}

function ActionCell({ status, resolution, onAction, onRevoke }) {
  if (status === "Resolved") return <span className="action-disabled">Access granted</span>;
  if (status === "Permanently revoked") return <span className="action-disabled">Revoked</span>;
  if (status === "Awaiting resolution") return <span className="action-disabled">Approval sent</span>;
  if (status === "In certification") return <span className="action-disabled">Campaign launched</span>;
  if (status === "Auto-restoring") return <span className="action-disabled">Auto-restoring…</span>;

  switch (resolution) {
    case "Auto-Restore":
      return <span className="action-disabled">Auto-restore</span>;
    case "HITL":
      return (
        <div className="action-stack">
          <button className="btn-action btn-blue" onClick={() => onAction("send-approval")}><Icon name="send" size={11} /> Send approval</button>
          <button className="btn-action btn-revoke" onClick={onRevoke}>Revoke</button>
        </div>);
    case "Manual Admin Grant":
      return (
        <div className="action-stack">
          <button className="btn-action btn-teal" onClick={() => onAction("grant")}><Icon name="check" size={11} /> Grant access</button>
          <button className="btn-action btn-revoke" onClick={onRevoke}>Revoke</button>
        </div>);
    case "Launch Certification":
      return (
        <div className="action-stack">
          <button className="btn-action btn-purple" onClick={() => onAction("launch")}><Icon name="rocket" size={11} /> Launch campaign</button>
          <button className="btn-action btn-revoke" onClick={onRevoke}>Revoke</button>
        </div>);
    default: return null;
  }
}

Object.assign(window, { ToastProvider, useToast, ConfirmDialog, SidePanel });
