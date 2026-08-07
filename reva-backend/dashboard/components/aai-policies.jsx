/* global React, Icon, Pill */
/* Isolation Policies page + 4-step Create Policy builder */
const { useMemo: ipUseMemo } = React;

function SortHeader({ col, label, sortBy, sortDir, toggle, style, alignRight }) {
  const active = sortBy === col;
  return (
    <th style={style}>
      <button className={`sort-head ${active ? "active" : ""}`} onClick={() => toggle(col)} style={{ marginLeft: alignRight ? "auto" : 0 }}>
        <span>{label}</span>
        {active ? <Icon name={sortDir === "asc" ? "arrowUp" : "arrowDown"} size={11} /> : <Icon name="sort" size={11} style={{ opacity: .4 }} />}
      </button>
    </th>
  );
}

function IsolationPolicies({ policies, openPanel, goCreate, goDashboard }) {
  const [filter, setFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("principals");
  const [sortDir, setSortDir] = React.useState("desc");
  const [page, setPage] = React.useState(1);
  const PER_PAGE = 15;

  const counts = ipUseMemo(() => {
    const c = { all: policies.length, rbp: 0, iaa: 0, mwb: 0, uap: 0, aig: 0 };
    policies.forEach((p) => { c[p.category]++; });
    return c;
  }, [policies]);

  const filtered = ipUseMemo(() => {
    const list = filter === "all" ? policies : policies.filter((p) => p.category === filter);
    const act = (p) => p.principals.filter((x) => !["Resolved", "Permanently revoked"].includes(x.status)).length;
    const sorted = [...list].sort((a, b) => {
      let av, bv;
      switch (sortBy) {
        case "id": av = a.id; bv = b.id; break;
        case "name": av = a.name; bv = b.name; break;
        case "category": av = a.category; bv = b.category; break;
        case "resolution": av = a.resolution; bv = b.resolution; break;
        default: av = act(a); bv = act(b);
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [policies, filter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir(col === "principals" ? "desc" : "asc"); }
  };

  const tabs = [
    { id: "all", label: "All", count: counts.all },
    { id: "rbp", label: "Runtime behavioral", count: counts.rbp },
    { id: "iaa", label: "Identity-aware", count: counts.iaa },
    { id: "mwb", label: "Malicious blocking", count: counts.mwb },
    { id: "uap", label: "Unsafe action", count: counts.uap },
    { id: "aig", label: "Agent governance", count: counts.aig },
  ];

  return (
    <div className="hp-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <a className="crumb" onClick={goDashboard}><Icon name="arrowLeft" size={12} /> Dashboard</a>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-.02em", color: "var(--ink)" }}>Isolation policies</h1>
          <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13.5 }}>25 active policies governing access clipping for users, agents, NHIs, and MCP servers</p>
        </div>
        <button className="btn btn-primary" onClick={goCreate}><Icon name="plus" size={14} /> Create policy</button>
      </div>

      <div className="ip-tabs">
        {tabs.map((t) => (
          <button key={t.id} className={`ip-tab ${filter === t.id ? "on" : ""}`} onClick={() => { setFilter(t.id); setPage(1); }}>
            {t.label} <span className="ct">({t.count})</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: "hidden" }} key={filter}>
        <table className="tbl">
          <thead>
            <tr>
              <SortHeader col="id" label="Policy ID" sortBy={sortBy} sortDir={sortDir} toggle={toggleSort} style={{ width: 140 }} />
              <SortHeader col="name" label="Policy name" sortBy={sortBy} sortDir={sortDir} toggle={toggleSort} />
              <SortHeader col="category" label="Category" sortBy={sortBy} sortDir={sortDir} toggle={toggleSort} style={{ width: 120 }} />
              <SortHeader col="resolution" label="Resolution" sortBy={sortBy} sortDir={sortDir} toggle={toggleSort} style={{ width: 200 }} />
              <SortHeader col="principals" label="Principals" sortBy={sortBy} sortDir={sortDir} toggle={toggleSort} style={{ width: 110 }} alignRight />
              <th style={{ width: 100, textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((p) => {
              const active = p.principals.filter((x) => !["Resolved", "Permanently revoked"].includes(x.status)).length;
              return (
                <tr key={p.id} className="clickable" onClick={() => openPanel(p.id)}>
                  <td><span className="mono-id">{p.id}</span></td>
                  <td><span style={{ fontWeight: 600, color: "var(--ink)" }}>{p.name}</span></td>
                  <td><span className="cat-code">{CATEGORIES[p.category].short}</span></td>
                  <td><Pill tone={RESOLUTION_PILL[p.resolution]}>{p.resolution}</Pill></td>
                  <td style={{ textAlign: "right" }}><span className={active ? "pcount active" : "pcount zero"}>{active}</span></td>
                  <td style={{ textAlign: "right" }}><a className="hp-seelink" onClick={(e) => { e.stopPropagation(); openPanel(p.id); }}>Review</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="tbl-foot">
          <span>Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} style={page === 1 ? { opacity: .5 } : null} onClick={() => setPage((p) => p - 1)}><Icon name="arrowLeft" size={12} /> Prev</button>
            <button className="btn btn-ghost btn-sm" disabled={page === totalPages} style={page === totalPages ? { opacity: .5 } : null} onClick={() => setPage((p) => p + 1)}>Next <Icon name="arrowRight" size={12} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Create Policy ---------------- */
function CpField({ label, sublabel, required, error, children }) {
  return (
    <div className="cp-field">
      <label className="cp-flabel">
        <span>{label} {required && <span style={{ color: "var(--red)" }}>*</span>}</span>
        {sublabel && <span className="cp-fsub">{sublabel}</span>}
      </label>
      <div className="cp-finput">{children}</div>
      {error && <div className="cp-err"><Icon name="alert" size={11} /> {error}</div>}
    </div>
  );
}

function CreatePolicy({ goPolicies }) {
  const toast = useToast();
  const [step, setStep] = React.useState(1);
  const [completed, setCompleted] = React.useState(new Set());
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [form, setForm] = React.useState({
    name: "", category: "rbp", description: "", metric: "Policy denial count", operator: "Greater than",
    threshold: 5, windowVal: 60, windowUnit: "seconds", source: "Authorization engine",
    subjects: ["Agent"], targetScope: "full", targetType: "App", resolution: "HITL",
    ttl: 30, ttlUnit: "minutes", channels: ["Console", "Email"], certifier: "",
  });
  const policyId = `AAI-CUSTOM-${String(Date.now()).slice(-3).padStart(3, "0")}`;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = (s) => {
    const e = {};
    if (s === 1) { if (!form.name.trim()) e.name = "Policy name is required"; else if (form.name.length > 80) e.name = "Max 80 characters"; }
    if (s === 2) { if (!form.threshold || form.threshold <= 0) e.threshold = "Must be a positive integer"; if (!form.windowVal || form.windowVal <= 0) e.windowVal = "Required"; }
    if (s === 3) { if (form.subjects.length === 0) e.subjects = "Select at least one subject type"; }
    return e;
  };
  const next = () => { const e = validate(step); setErrors(e); if (Object.keys(e).length === 0) { setCompleted((c) => new Set([...c, step])); setStep((s) => Math.min(4, s + 1)); } };
  const goTo = (s) => { if (s < step || completed.has(s - 1) || s === step) setStep(s); };
  const cancel = () => { if (form.name || form.description) setConfirmCancel(true); else goPolicies(); };
  const activate = () => { toast(`Policy ${policyId} activated — monitoring is live`); setTimeout(goPolicies, 600); };

  const steps = [{ n: 1, label: "Define" }, { n: 2, label: "Trigger" }, { n: 3, label: "Enforcement" }, { n: 4, label: "Review" }];

  return (
    <div className="hp-wrap">
      <div style={{ marginBottom: 24 }}>
        <a className="crumb" onClick={goPolicies}><Icon name="arrowLeft" size={12} /> Isolation policies</a>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-.02em", color: "var(--ink)" }}>Create isolation policy</h1>
        <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13.5 }}>Define when and how access should be clipped</p>
      </div>

      <div className="cp-stepper">
        {steps.map((s, i) => {
          const isDone = completed.has(s.n), isActive = step === s.n;
          const clickable = isDone || isActive || (i > 0 && completed.has(s.n - 1));
          return (
            <div key={s.n} className="cp-srow">
              <button className={`cp-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`} onClick={() => clickable && goTo(s.n)} style={{ cursor: clickable ? "pointer" : "default" }}>
                <span className="cp-sdot">{isDone ? <Icon name="check" size={11} /> : s.n}</span>
                <span className="cp-slabel">{s.label}</span>
              </button>
              {i < steps.length - 1 && <div className={`cp-line ${isDone ? "done" : ""}`} />}
            </div>
          );
        })}
      </div>

      <div className="cp-builder">
        {step === 1 && <CpStep1 form={form} set={set} errors={errors} policyId={policyId} />}
        {step === 2 && <CpStep2 form={form} set={set} errors={errors} />}
        {step === 3 && <CpStep3 form={form} set={set} errors={errors} />}
        {step === 4 && <CpStep4 form={form} policyId={policyId} />}

        <div className="cp-foot">
          <button className="btn btn-ghost" onClick={cancel}>Cancel</button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 1 && <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}><Icon name="arrowLeft" size={12} /> Back</button>}
            {step < 4 ? <button className="btn btn-primary" onClick={next}>Continue <Icon name="arrowRight" size={12} /></button> : (
              <>
                <button className="btn btn-ghost">Save as draft</button>
                <button className="btn btn-primary" onClick={activate}><Icon name="zap" size={13} /> Activate policy</button>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog open={confirmCancel} title="Discard policy?" body="You have unsaved changes. Leaving now will discard your progress."
        confirmLabel="Discard" onCancel={() => setConfirmCancel(false)} onConfirm={() => { setConfirmCancel(false); goPolicies(); }} />
    </div>
  );
}

function CpStep1({ form, set, errors, policyId }) {
  return (
    <div className="cp-pane">
      <h2 className="cp-title">Define the policy</h2>
      <p className="cp-desc">Give it a clear name and choose where it lives in your governance taxonomy.</p>
      <CpField label="Policy name" required error={errors.name}>
        <input className={`cp-input ${errors.name ? "err" : ""}`} placeholder="e.g., Custom API rate limiting" value={form.name} maxLength={80} onChange={(e) => set("name", e.target.value)} />
        <span className="cp-cc">{form.name.length} / 80</span>
      </CpField>
      <CpField label="Category">
        <select className="cp-input" value={form.category} onChange={(e) => set("category", e.target.value)}>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </CpField>
      <CpField label="Description" sublabel="Optional. What problem does this policy address?">
        <textarea className="cp-input" rows={3} placeholder="Describe when and why this policy should trigger" value={form.description} maxLength={300} onChange={(e) => set("description", e.target.value)} />
        <span className="cp-cc">{form.description.length} / 300</span>
      </CpField>
      <CpField label="Policy ID" sublabel="Auto-generated">
        <span className="cp-readonly"><span className="mono-id">{policyId}</span></span>
      </CpField>
    </div>
  );
}

function CpStep2({ form, set, errors }) {
  const sentence = `Trigger when ${form.metric.toLowerCase()} is ${form.operator.toLowerCase()} ${form.threshold} within ${form.windowVal} ${form.windowUnit} from ${form.source.toLowerCase()}`;
  return (
    <div className="cp-pane">
      <h2 className="cp-title">Trigger condition</h2>
      <p className="cp-desc">Build the rule that determines when this policy fires.</p>
      <div className="cp-trigger">
        <span className="cp-tt">When</span>
        <select className="cp-input cp-tinput" value={form.metric} onChange={(e) => set("metric", e.target.value)}>
          {["Policy denial count", "Tool invocation frequency", "Error rate", "Data volume", "Session count", "Authentication failures", "Custom attribute"].map((o) => <option key={o}>{o}</option>)}
        </select>
        <span className="cp-tt">is</span>
        <select className="cp-input cp-tinput" value={form.operator} onChange={(e) => set("operator", e.target.value)}>
          {["Greater than", "Less than", "Equal to", "Spike over baseline"].map((o) => <option key={o}>{o}</option>)}
        </select>
        <input className={`cp-input cp-tinput cp-tnum ${errors.threshold ? "err" : ""}`} type="number" value={form.threshold} min={1} onChange={(e) => set("threshold", parseInt(e.target.value) || 0)} />
        <span className="cp-tt">within</span>
        <input className={`cp-input cp-tinput cp-tnum ${errors.windowVal ? "err" : ""}`} type="number" value={form.windowVal} min={1} onChange={(e) => set("windowVal", parseInt(e.target.value) || 0)} />
        <select className="cp-input cp-tinput" value={form.windowUnit} onChange={(e) => set("windowUnit", e.target.value)}>
          {["seconds", "minutes", "hours"].map((o) => <option key={o}>{o}</option>)}
        </select>
        <span className="cp-tt">from</span>
        <select className="cp-input cp-tinput" value={form.source} onChange={(e) => set("source", e.target.value)}>
          {["Authorization engine", "Identity provider", "Runtime monitor", "Threat intelligence", "MCP runtime"].map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div className="cp-preview">
        <div className="cp-preview-lbl">Live preview</div>
        <div className="cp-preview-text">{sentence}</div>
      </div>
    </div>
  );
}

function CpStep3({ form, set, errors }) {
  const toggleSubject = (s) => { const has = form.subjects.includes(s); set("subjects", has ? form.subjects.filter((x) => x !== s) : [...form.subjects, s]); };
  const toggleChannel = (c) => { const has = form.channels.includes(c); set("channels", has ? form.channels.filter((x) => x !== c) : [...form.channels, c]); };
  const subjects = ["User", "Agent", "NHI", "MCP server"];
  const resolutions = [
    { id: "Auto-Restore", desc: "System automatically reinstates access after timer", icon: "shuffle" },
    { id: "HITL", desc: "Requires reviewer approval to reinstate", icon: "users" },
    { id: "Manual Admin Grant", desc: "Only security admin can reinstate", icon: "lock" },
    { id: "Launch Certification", desc: "Formal certification campaign to resolve", icon: "rocket" },
  ];
  const toneVar = { "Auto-Restore": "green", "HITL": "amber", "Manual Admin Grant": "red", "Launch Certification": "purple" };
  return (
    <div className="cp-pane">
      <h2 className="cp-title">Enforcement</h2>
      <p className="cp-desc">Choose who's affected and how access is restored.</p>
      <CpField label="Subject type" sublabel="Which identities does this policy clip?" error={errors.subjects}>
        <div className="cp-chips">
          {subjects.map((s) => (
            <button key={s} type="button" className={`cp-chip ${form.subjects.includes(s) ? "on" : ""}`} onClick={() => toggleSubject(s)}>
              {form.subjects.includes(s) && <Icon name="check" size={11} />} {s}
            </button>
          ))}
        </div>
      </CpField>
      <CpField label="Target scope">
        <div className="cp-radios">
          <label className={`cp-radio ${form.targetScope === "full" ? "on" : ""}`} onClick={() => set("targetScope", "full")}>
            <div><div className="cp-rt">Full</div><div className="cp-rs">Clip all access for matched principals</div></div>
          </label>
          <label className={`cp-radio ${form.targetScope === "targeted" ? "on" : ""}`} onClick={() => set("targetScope", "targeted")}>
            <div><div className="cp-rt">Targeted</div><div className="cp-rs">Clip only specific resource type</div></div>
          </label>
        </div>
        {form.targetScope === "targeted" && (
          <select className="cp-input" style={{ marginTop: 12, maxWidth: 240 }} value={form.targetType} onChange={(e) => set("targetType", e.target.value)}>
            {["App", "MCP server", "Tool", "Sub-agent"].map((o) => <option key={o}>{o}</option>)}
          </select>
        )}
      </CpField>
      <CpField label="Resolution path">
        <div className="cp-resgrid">
          {resolutions.map((r) => (
            <label key={r.id} className={`cp-res ${form.resolution === r.id ? "on" : ""}`} onClick={() => set("resolution", r.id)}>
              <div className="cp-res-ic" style={{ background: `var(--${toneVar[r.id]}-tint)`, color: `var(--${toneVar[r.id]}-ink, var(--${toneVar[r.id]}))` }}><Icon name={r.icon} size={16} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 4 }}><Pill tone={RESOLUTION_PILL[r.id]}>{r.id}</Pill></div>
                <div className="cp-rs">{r.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </CpField>
      {(form.resolution === "Auto-Restore" || form.resolution === "HITL") && (
        <CpField label="Time-to-live" sublabel="How long before access is automatically reinstated">
          <div style={{ display: "flex", gap: 8, maxWidth: 320 }}>
            <input className="cp-input" type="number" value={form.ttl} min={1} style={{ flex: 1 }} onChange={(e) => set("ttl", parseInt(e.target.value) || 0)} />
            <select className="cp-input" value={form.ttlUnit} onChange={(e) => set("ttlUnit", e.target.value)} style={{ flex: 1 }}>
              {["minutes", "hours", "days"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </CpField>
      )}
      {(form.resolution === "HITL" || form.resolution === "Manual Admin Grant") && (
        <CpField label="Notification channels">
          <div className="cp-chips">
            {["Console", "Email", "Slack", "Push notification"].map((c) => (
              <button key={c} type="button" className={`cp-chip ${form.channels.includes(c) ? "on" : ""}`} onClick={() => toggleChannel(c)}>
                {form.channels.includes(c) && <Icon name="check" size={11} />} {c}
              </button>
            ))}
          </div>
        </CpField>
      )}
      {form.resolution === "Launch Certification" && (
        <CpField label="Default certifier" sublabel="Who reviews the campaign?">
          <input className="cp-input" placeholder="Search by name or team…" value={form.certifier} onChange={(e) => set("certifier", e.target.value)} style={{ maxWidth: 320 }} />
        </CpField>
      )}
    </div>
  );
}

function CpSumRow({ label, value }) { return <div className="cp-sumrow"><span className="cp-sumlbl">{label}</span><span className="cp-sumval">{value}</span></div>; }

function CpStep4({ form, policyId }) {
  return (
    <div className="cp-pane">
      <h2 className="cp-title">Review and activate</h2>
      <p className="cp-desc">Confirm settings. Once activated, this policy begins monitoring immediately.</p>
      <div className="cp-summary">
        <CpSumRow label="Policy ID" value={<span className="mono-id">{policyId}</span>} />
        <CpSumRow label="Name" value={form.name || <em style={{ color: "var(--ink-4)" }}>Unnamed</em>} />
        <CpSumRow label="Category" value={CATEGORIES[form.category].label} />
        <CpSumRow label="Description" value={form.description || <em style={{ color: "var(--ink-4)" }}>—</em>} />
        <div className="cp-sumdiv" />
        <CpSumRow label="Trigger" value={<span style={{ color: "var(--ink-2)" }}>When <b>{form.metric.toLowerCase()}</b> is <b>{form.operator.toLowerCase()}</b> <b>{form.threshold}</b> within <b>{form.windowVal} {form.windowUnit}</b> from <b>{form.source.toLowerCase()}</b></span>} />
        <div className="cp-sumdiv" />
        <CpSumRow label="Subjects" value={<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{form.subjects.map((s) => <Pill key={s} tone={IDENTITY_PILL[s.replace(" server", "")] || "gray"}>{s}</Pill>)}</div>} />
        <CpSumRow label="Scope" value={form.targetScope === "full" ? "Full — all targets" : `Targeted — ${form.targetType}`} />
        <CpSumRow label="Resolution" value={<Pill tone={RESOLUTION_PILL[form.resolution]}>{form.resolution}</Pill>} />
        {(form.resolution === "Auto-Restore" || form.resolution === "HITL") && <CpSumRow label="TTL" value={`${form.ttl} ${form.ttlUnit}`} />}
        {(form.resolution === "HITL" || form.resolution === "Manual Admin Grant") && <CpSumRow label="Notify via" value={form.channels.join(", ") || "—"} />}
      </div>
      <div className="cp-preview" style={{ marginTop: 24 }}>
        <div className="cp-preview-lbl">Appears in policies table as</div>
        <div className="cp-table-preview">
          <span className="mono-id">{policyId}</span>
          <span style={{ flex: 1, fontWeight: 600, color: "var(--ink)" }}>{form.name || "Unnamed policy"}</span>
          <span className="cat-code">{CATEGORIES[form.category].short}</span>
          <Pill tone={RESOLUTION_PILL[form.resolution]}>{form.resolution}</Pill>
          <span className="pcount zero">0</span>
        </div>
      </div>
      <div className="cp-warn"><Icon name="alert" size={14} /><span>Once activated, this policy begins monitoring immediately. Policies cannot be deleted — only deprecated.</span></div>
    </div>
  );
}

Object.assign(window, { IsolationPolicies, CreatePolicy });
