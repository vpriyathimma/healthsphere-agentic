/* global React, Icon, Pill, AwsNhiSection, AwsInboundAuth */
/* Agent Passport — full-page detail view (replaces the right-hand slider for Agents).
   Renders governance metadata for checkpoint 1.1:
   unique identifier, owner, business/application context, environment,
   associated model (declared vs observed), version, risk tier, approval state, lifecycle status. */

const { useState: adUseState } = React;

/* ─────────────── primitives ─────────────── */

function AdSection({ title, right }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "var(--blue-tint)", borderRadius: 8,
      padding: "11px 16px", margin: "26px 0 18px",
    }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{title}</div>
      {right ? <div style={{ marginLeft: "auto" }}>{right}</div> : null}
    </div>
  );
}

function AdField({ label, children, mono, span }) {
  return (
    <div style={{ gridColumn: span ? "span " + span : "auto", minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginBottom: 5 }}>{label}</div>
      <div className={mono ? "mono" : ""} style={{
        fontSize: mono ? 12 : 13, color: "var(--ink)", lineHeight: 1.55,
        wordBreak: mono ? "break-all" : "normal",
      }}>{children != null && children !== "" ? children : <span style={{ color: "var(--ink-4)" }}>—</span>}</div>
    </div>
  );
}

function AdGrid({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "22px 32px" }}>{children}</div>;
}

function AdChip({ tone, children, title }) {
  const T = {
    gray: ["var(--surface-2)", "var(--ink-2)", "var(--border)"],
    blue: ["var(--blue-tint)", "var(--blue-700)", "rgba(37,99,235,.25)"],
    green: ["#ECFDF5", "#065F46", "#A7F3D0"],
    amber: ["#FEF3C7", "#92400E", "#FDE68A"],
    red: ["#FEE2E2", "#991B1B", "#FCA5A5"],
    purple: ["#F5F3FF", "#5B21B6", "#DDD6FE"],
  }[tone || "gray"];
  return (
    <span title={title} style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px",
      borderRadius: 6, background: T[0], color: T[1], border: "1px solid " + T[2],
      fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

/* Value that came from a resource tag — shows which tag key it was derived from. */
function AdTagged({ t, tone }) {
  if (!t || !t.value) return null;
  return <AdChip tone={tone || "gray"} title={"Derived from tag: " + t.tagKey}>{t.value}</AdChip>;
}

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : null);
const fmtNum = (n) => (n == null ? null : Number(n).toLocaleString());

/* ─────────────── owner provenance ─────────────── */

const OWNER_TONE = { Confirmed: "green", Declared: "green", High: "blue", Medium: "amber", Low: "amber", Unresolved: "red" };
const RUNG_LABEL = {
  1: "Assigned in Reva", 2: "Resource tag", 3: "CloudTrail create event",
  4: "CloudTrail deploy chain", 5: "Execution role tag",
};

function AdOwnerCell({ ro }) {
  if (!ro || !ro.owner) {
    return <span style={{ color: "var(--ink-4)", fontSize: 12.5 }}>Unresolved</span>;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
      <AdChip tone={OWNER_TONE[ro.confidence] || "gray"}>{ro.owner}</AdChip>
      <AdChip tone="gray" title={ro.note}>{ro.confidence}</AdChip>
      {ro.unconfirmed ? <AdChip tone="amber">Unconfirmed</AdChip> : null}
    </div>
  );
}

/** Full derivation trail — the chain IS the product. Never show a bare name. */
function AdOwnerSection({ agent }) {
  const ro = agent.resolvedOwner || null;
  const unresolved = !ro || !ro.owner;

  return (
    <div>
      <AdSection title="Ownership & Attribution" right={
        ro ? <AdChip tone={OWNER_TONE[ro.confidence] || "gray"}>{ro.confidence}</AdChip> : null
      } />

      {unresolved ? (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 11, padding: "13px 16px",
          borderRadius: 9, background: "#FEF2F2", border: "1px solid #FCA5A5", marginBottom: 18,
        }}>
          <Icon name="shield" size={17} color="#991B1B" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#991B1B" }}>No accountable owner</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.5 }}>
              {(ro && ro.note) || "No owner tag, and no create event found in the CloudTrail window."}
            </div>
          </div>
        </div>
      ) : null}

      <AdGrid>
        <AdField label="Owner"><AdOwnerCell ro={ro} /></AdField>
        <AdField label="Resolved via">{ro && ro.rung ? RUNG_LABEL[ro.rung] : null}</AdField>
        <AdField label="Source" mono>{ro ? ro.source : null}</AdField>
      </AdGrid>

      {ro && ro.owner ? (
        <div style={{ marginTop: 16 }}>
          <AdGrid>
            <AdField label="Attribution method">
              {ro.exactJoin
                ? <AdChip tone="green" title="Resolved by exact access-key join on the AssumeRole event">Exact key join</AdChip>
                : (ro.rung === 4 ? <AdChip tone="amber" title="Identity taken from the role session name">Session-name heuristic</AdChip> : null)}
            </AdField>
            <AdField label="IAM validation">
              {ro.iamValidated
                ? <AdChip tone="green">Resolved to IAM user</AdChip>
                : (ro.rung >= 3 ? <AdChip tone="amber">No matching IAM user</AdChip> : null)}
            </AdField>
            <AdField label="IAM principal" mono>{ro.iamUser ? ro.iamUser.arn : (ro.originPrincipalArn || null)}</AdField>
            <AdField label="Deploy credential" mono>
              {ro.originAccessKeyId
                ? <span>{ro.originAccessKeyId}{ro.originLongLivedCredential ? <span style={{ marginLeft: 6 }}><AdChip tone="red">Long-lived</AdChip></span> : null}</span>
                : null}
            </AdField>
            <AdField label="MFA / active keys">
              {ro.iamUser
                ? <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                    <AdChip tone={ro.iamUser.mfaEnabled ? "green" : "red"}>{ro.iamUser.mfaEnabled ? "MFA enabled" : "No MFA"}</AdChip>
                    <AdChip tone={ro.iamUser.activeKeyCount ? "amber" : "green"}>{(ro.iamUser.activeKeyCount || 0) + " active key(s)"}</AdChip>
                  </span>
                : null}
            </AdField>
          </AdGrid>
        </div>
      ) : null}

      {ro && ro.chain && ro.chain.length ? (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>
            Derivation chain
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 9, padding: "6px 0" }}>
            {ro.chain.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "9px 16px" }}>
                <span style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                  background: "var(--blue-tint)", color: "var(--blue-700)",
                  display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 700,
                }}>{i + 1}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
                    {c.step}{c.stack ? <span style={{ fontWeight: 400, color: "var(--ink-3)" }}> · {c.stack}</span> : null}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", wordBreak: "break-all", marginTop: 2 }}>
                    {c.principal || c.resource || ""}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{c.at ? fmtDate(c.at) : ""}</div>
              </div>
            ))}
          </div>
          {ro.originCredential && ro.originCredential.longLived ? (
            <div style={{
              marginTop: 14, padding: "12px 15px", borderRadius: 8,
              background: "#FEF2F2", border: "1px solid #FCA5A5",
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#991B1B", marginBottom: 4 }}>
                Deployed with a long-lived static credential
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55 }}>
                This agent was created using access key <span className="mono">{ro.originCredential.accessKeyId}</span>
                {ro.originCredential.ageDays != null ? ", " + ro.originCredential.ageDays + " days old" : ""}
                {ro.originCredential.status ? " (" + ro.originCredential.status + ")" : ""}.
                Permanent IAM user keys do not expire and are not bound to a session, so provenance for
                everything they create rests on a credential that should be rotated or replaced with
                short-lived federated access.
              </div>
            </div>
          ) : null}

          {ro.sessionName && !ro.exactJoin ? (
            <div style={{
              marginTop: 12, padding: "11px 14px", borderRadius: 8,
              background: "#FFFBEB", border: "1px solid #FDE68A",
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#92400E", marginBottom: 3 }}>
                Session name is not an AWS principal
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55 }}>
                The deploy used role session <span className="mono">{ro.sessionName}</span>. The AWS CDK sets this to the
                operator's local machine username, so it will not match an IAM user unless the two happen to coincide.
                No AssumeRole event was found in the window to resolve the true caller — enable a CloudTrail Lake data
                store, or set <span className="mono">sourceIdentity</span> on the deploy role, to make this attributable.
              </div>
            </div>
          ) : null}

          {ro.gapSeconds != null ? (
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 9, lineHeight: 1.5 }}>
              Correlated by time proximity ({ro.gapSeconds}s between deploy and resource creation).
              This is inference, not attestation — confirm before relying on it.
              {ro.ambiguous ? " Multiple deploy principals fall inside the window." : ""}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────── model configuration ─────────────── */

const DRIFT_TONE = {
  Match: "green", Differs: "red", Changed: "amber",
  ObservedOnly: "blue", DeclaredOnly: "gray", Unknown: "gray",
};
const DRIFT_LABEL = {
  Match: "Declared matches observed", Differs: "Model differs",
  Changed: "Model changed", ObservedOnly: "Observed only",
  DeclaredOnly: "Declared only", Unknown: "Not available",
};

function AdModelBanner({ drift }) {
  if (!drift || !drift.highlight) return null;
  const red = drift.status === "Differs";
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 11, padding: "13px 16px",
      borderRadius: 9, marginBottom: 18,
      background: red ? "#FEF2F2" : "#FFFBEB",
      border: "1px solid " + (red ? "#FCA5A5" : "#FDE68A"),
    }}>
      <Icon name="shield" size={17} color={red ? "#991B1B" : "#92400E"} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: red ? "#991B1B" : "#92400E" }}>
          {DRIFT_LABEL[drift.status]}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.5 }}>{drift.detail}</div>
      </div>
    </div>
  );
}

function AdModelSection({ agent }) {
  const declared = agent.declaredModel || {};
  const observed = agent.observedModel || null;
  const drift = agent.modelDrift || {};
  const history = observed && observed.history ? observed.history : [];

  return (
    <div>
      <AdSection title="Model Configuration" right={
        drift.status ? <AdChip tone={DRIFT_TONE[drift.status]}>{DRIFT_LABEL[drift.status]}</AdChip> : null
      } />
      <AdModelBanner drift={drift} />

      <AdGrid>
        <AdField label="Declared model">
          {declared.modelId
            ? <span className="mono" style={{ fontWeight: 600, color: "var(--blue-700)" }}>{declared.modelId}</span>
            : <span style={{ color: "var(--ink-4)", fontSize: 12.5 }}>
                Not available — {declared.unavailableReason || "no declared source"}
              </span>}
        </AdField>
        <AdField label="Observed model">
          {observed
            ? <span className="mono" style={{ fontWeight: 600, color: drift.highlight ? "#991B1B" : "var(--blue-700)" }}>{observed.modelId}</span>
            : <span style={{ color: "var(--ink-4)", fontSize: 12.5 }}>No inference observed in window</span>}
        </AdField>
        <AdField label="Source">
          {declared.source ? <AdChip tone="gray">{declared.source}</AdChip> : null}
          {observed ? <span style={{ marginLeft: declared.source ? 6 : 0 }}><AdChip tone="blue">CloudTrail · {observed.source}</AdChip></span> : null}
        </AdField>

        <AdField label="Inference region">
          {observed && observed.inferenceRegion
            ? (agent.residencyDrift
                ? <AdChip tone="red" title="Inference executed outside the runtime's region">{observed.inferenceRegion} · differs from {agent.region}</AdChip>
                : <AdChip tone="green">{observed.inferenceRegion}</AdChip>)
            : null}
        </AdField>
        <AdField label="Invocations observed">{fmtNum(observed && observed.invocations)}</AdField>
        <AdField label="Tokens (in / out)">
          {observed ? fmtNum(observed.inputTokens) + " / " + fmtNum(observed.outputTokens) : null}
        </AdField>

        <AdField label="First observed">{fmtDate(observed && observed.firstSeen)}</AdField>
        <AdField label="Last observed">{fmtDate(observed && observed.lastSeen)}</AdField>
        <AdField label="Distinct models in window">
          {observed ? (observed.distinctModels > 1
            ? <AdChip tone="amber">{observed.distinctModels}</AdChip>
            : observed.distinctModels) : null}
        </AdField>
      </AdGrid>

      {history.length > 1 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 9 }}>
            Model history (observation window)
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 9, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead><tr style={{ background: "var(--surface)" }}>
                {["Model", "First seen", "Last seen", "Invocations", "Inference region"].map((h) => (
                  <th key={h} style={{ padding: "9px 13px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.modelId} style={{ borderTop: "1px solid var(--border)", background: i === 0 ? "var(--blue-tint)" : "transparent" }}>
                    <td className="mono" style={{ padding: "9px 13px", fontWeight: 600 }}>
                      {h.modelId}{i === 0 ? <span style={{ marginLeft: 7 }}><AdChip tone="blue">current</AdChip></span> : null}
                    </td>
                    <td style={{ padding: "9px 13px", color: "var(--ink-2)" }}>{fmtDate(h.firstSeen)}</td>
                    <td style={{ padding: "9px 13px", color: "var(--ink-2)" }}>{fmtDate(h.lastSeen)}</td>
                    <td style={{ padding: "9px 13px", color: "var(--ink-2)" }}>{fmtNum(h.invocations)}</td>
                    <td className="mono" style={{ padding: "9px 13px", color: "var(--ink-2)" }}>{h.inferenceRegion || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── tags ─────────────── */

function AdTagsSection({ tags }) {
  if (tags === null || tags === undefined) {
    return (<div><AdSection title="Tags" />
      <div style={{ fontSize: 12.5, color: "var(--ink-4)" }}>
        Tagging is not supported for this resource type on the AgentCore control plane.
      </div></div>);
  }
  const keys = Object.keys(tags);
  return (
    <div>
      <AdSection title="Tags" right={<AdChip tone="gray">{keys.length}</AdChip>} />
      {keys.length === 0
        ? <div style={{ fontSize: 12.5, color: "var(--ink-4)" }}>No tags applied. Environment, owner and risk tier cannot be derived from tags for this agent.</div>
        : <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {keys.map((k) => (
              <span key={k} className="mono" style={{
                fontSize: 11, padding: "4px 9px", borderRadius: 6,
                background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink-2)",
              }}>{k}: <b style={{ color: "var(--ink)" }}>{tags[k] || "—"}</b></span>
            ))}
          </div>}
    </div>
  );
}

/* ─────────────── credentials ─────────────── */

function AdSecretPosture({ prov, busy, onRotate }) {
  if (!prov || !prov.secret) return null;
  const sec = prov.secret;
  const managed = sec.ownership === "MANAGED";

  return (
    <div style={{ marginTop: 20, border: "1px solid var(--border)", borderRadius: 10, padding: "15px 17px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>Secret custody</div>
        <AdChip tone={managed ? "gray" : (sec.posture === "Governed" ? "green" : "amber")}>{sec.posture}</AdChip>
        <div style={{ marginLeft: "auto" }}>
          {sec.rotatable ? (
            <button disabled={busy} onClick={onRotate} style={{
              padding: "6px 13px", borderRadius: 16, border: "1px solid rgba(37,99,235,.4)",
              background: "#fff", color: "var(--blue-700)", fontSize: 12, fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
            }}>{busy ? "Rotating…" : "Rotate now"}</button>
          ) : null}
        </div>
      </div>

      {managed ? (
        <div>
          <AdGrid>
            <AdField label="Provider" mono>{prov.name}</AdField>
            <AdField label="Ownership"><AdChip tone="gray">Service-managed</AdChip></AdField>
            <AdField label="Managed by" mono>{sec.owningService}</AdField>
            <AdField label="Secret" mono span={2}>{sec.name}</AdField>
            <AdField label="Created">{fmtDate(sec.createdDate)}</AdField>
            <AdField label="Last changed">{fmtDate(sec.lastChangedDate)}</AdField>
          </AdGrid>
          <div style={{ marginTop: 13, padding: "11px 14px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55 }}>
            {sec.note} Rotation schedule, customer-managed key and tags are not applicable to this secret.
          </div>
        </div>
      ) : (
        <div>
          <AdGrid>
            <AdField label="Provider" mono>{prov.name}</AdField>
            <AdField label="Ownership"><AdChip tone="green">Customer-managed</AdChip></AdField>
            <AdField label="Secret" mono>{sec.name}</AdField>

            <AdField label="Rotation">
              <AdChip tone={sec.rotationEnabled ? "green" : "red"}>{sec.rotationEnabled ? "Enabled" : "Not configured"}</AdChip>
            </AdField>
            <AdField label="Schedule">
              {sec.rotationRules ? (sec.rotationRules.AutomaticallyAfterDays
                ? "Every " + sec.rotationRules.AutomaticallyAfterDays + " days"
                : (sec.rotationRules.ScheduleExpression || null)) : null}
            </AdField>
            <AdField label="Rotation function" mono>{sec.rotationLambdaArn ? sec.rotationLambdaArn.split(":").pop() : null}</AdField>

            <AdField label="Last rotated">
              {sec.lastRotatedDate ? fmtDate(sec.lastRotatedDate) : <AdChip tone="red">Never rotated</AdChip>}
            </AdField>
            <AdField label="Next rotation">{fmtDate(sec.nextRotationDate)}</AdField>
            <AdField label="Encryption key">
              {sec.customerManagedKey
                ? <AdChip tone="green" title={sec.kmsKeyId}>Customer-managed key</AdChip>
                : <AdChip tone="amber">AWS-managed key</AdChip>}
            </AdField>

            <AdField label="Created">{fmtDate(sec.createdDate)}</AdField>
            <AdField label="Last changed">{fmtDate(sec.lastChangedDate)}</AdField>
            <AdField label="Versions">
              {sec.versionStages
                ? Object.keys(sec.versionStages).map((v) => (sec.versionStages[v] || []).join("/")).join(" · ")
                : null}
            </AdField>
          </AdGrid>
          {sec.tags && Object.keys(sec.tags).length ? (
            <div style={{ marginTop: 13, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.keys(sec.tags).map((k) => (
                <span key={k} className="mono" style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 5, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink-2)" }}>
                  {k}: <b style={{ color: "var(--ink)" }}>{sec.tags[k]}</b>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function AdCredentialsSection({ agent, cred, busy, error, onAction }) {
  const tp = agent.tokenPosture || null;
  const unitOf = (k) => ((tp && tp.units && tp.units[k]) || "").toLowerCase() || "minutes";
  const validity = (v, k) => (v == null ? null : v + " " + unitOf(k));
  const state = cred ? cred.state : null;

  return (
    <div>
      <AdSection title="Credentials" right={
        state
          ? <AdChip tone={state === "active" ? "green" : "red"}>{state === "active" ? "Active" : "Inactive"}</AdChip>
          : <AdChip tone="gray">Checking…</AdChip>
      } />

      {error ? (
        <div style={{ padding: "11px 14px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FCA5A5", marginBottom: 16, fontSize: 12.5, color: "#991B1B" }}>{error}</div>
      ) : null}

      {state === "inactive" ? (
        <div style={{ padding: "12px 15px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FCA5A5", marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#991B1B", marginBottom: 3 }}>Credentials inactive</div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55 }}>
            This agent cannot obtain its gateway credential and cannot call any tool. Other agents are unaffected —
            the grant is scoped to this agent's own credential provider.
          </div>
        </div>
      ) : null}

      <AdGrid>
        <AdField label="Credential grant" mono>{cred ? (cred.policyName || "—") : null}</AdField>
        <AdField label="Execution role" mono>{cred ? cred.roleName : null}</AdField>
        <AdField label="Last changed">{cred && cred.lastChangedAt ? fmtDate(cred.lastChangedAt) : null}</AdField>

        <AdField label="Outbound client" mono>{tp ? tp.clientId : null}</AdField>
        <AdField label="Credential type">{tp ? <AdChip tone="blue">{tp.credentialType}</AdChip> : null}</AdField>
        <AdField label="Scopes">{tp && tp.scopes.length ? tp.scopes.join(", ") : null}</AdField>

        <AdField label="Access token validity">
          {tp && tp.accessTokenValidity != null
            ? <AdChip tone={tp.accessTokenValidity > 60 ? "amber" : "green"}>{validity(tp.accessTokenValidity, "AccessToken")}</AdChip>
            : null}
        </AdField>
        <AdField label="ID token validity">{tp ? validity(tp.idTokenValidity, "IdToken") : null}</AdField>
        <AdField label="Refresh token validity">{tp ? validity(tp.refreshTokenValidity, "RefreshToken") : null}</AdField>
      </AdGrid>

      <AdSecretPosture prov={agent._provider} busy={busy} onRotate={() => onAction("rotate")} />

      {tp && tp.accessTokenValidity != null ? (
        <div style={{ marginTop: 14, padding: "11px 14px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55 }}>
          A token already minted stays valid for up to {validity(tp.accessTokenValidity, "AccessToken")}. Inactivating the
          credential prevents new tokens being issued; it does not recall one already held.
        </div>
      ) : null}
    </div>
  );
}

function AdCredentialMenu({ cred, busy, onAction }) {
  // cred carries canRotate / rotateBlockedReason, merged from the provider below.
  const [open, setOpen] = adUseState(false);
  if (!cred) return null;
  const active = cred.state === "active";
  const disabled = busy || (active ? !cred.canInactivate : !cred.canActivate);

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} disabled={busy} style={{
        display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 15px", borderRadius: 20,
        border: "1px solid var(--border-strong)", background: "#fff", color: "var(--ink)",
        fontSize: 12.5, fontWeight: 600, cursor: busy ? "wait" : "pointer",
      }}>
        {busy ? "Working…" : "Actions"}
        <Icon name="chevronDown" size={13} />
      </button>
      {open && !busy ? (
        <div style={{
          position: "absolute", right: 0, top: 40, minWidth: 230, zIndex: 20,
          background: "#fff", border: "1px solid var(--border)", borderRadius: 10,
          boxShadow: "0 6px 20px rgba(0,0,0,.1)", overflow: "hidden",
        }}>
          <button
            disabled={disabled}
            onClick={() => { setOpen(false); onAction(active ? "inactivate" : "activate"); }}
            style={{
              display: "block", width: "100%", textAlign: "left", padding: "11px 15px",
              border: 0, background: "transparent", fontSize: 12.5, fontWeight: 600,
              color: disabled ? "var(--ink-4)" : (active ? "#B91C1C" : "#065F46"),
              cursor: disabled ? "not-allowed" : "pointer",
            }}>
            {active ? "Inactivate credentials" : "Activate credentials"}
          </button>
          {cred.canRotate ? (
            <button
              onClick={() => { setOpen(false); onAction("rotate"); }}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "11px 15px",
                border: 0, borderTop: "1px solid var(--border)", background: "transparent",
                fontSize: 12.5, fontWeight: 600, color: "var(--blue-700)", cursor: "pointer",
              }}>
              Rotate credentials
            </button>
          ) : (cred.rotateBlockedReason ? (
            <div style={{ padding: "10px 15px", borderTop: "1px solid var(--border)", fontSize: 11.5, color: "var(--ink-4)", lineHeight: 1.45 }}>
              <b style={{ color: "var(--ink-3)" }}>Rotate credentials</b><br />{cred.rotateBlockedReason}
            </div>
          ) : null)}

          {!active && !cred.canActivate ? (
            <div style={{ padding: "0 15px 11px", fontSize: 11, color: "var(--ink-4)", lineHeight: 1.45 }}>
              No saved policy document — cannot restore automatically.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────── page ─────────────── */

function AwsAgentDetailPage({ agent, discovery, onBack }) {
  if (!agent) return null;
  const isBedrock = agent.agentType === "Bedrock Agent";
  const tagged = agent.tagged || {};
  const nhis = (discovery && discovery.nhis) || [];
  const execNhi = nhis.find((n) => n.arn === agent.roleArn) || null;
  const [copied, setCopied] = adUseState(false);
  const [cred, setCred] = adUseState(null);
  const [credBusy, setCredBusy] = adUseState(false);
  const [credError, setCredError] = adUseState(null);

  const agentKey = isBedrock ? agent.agentId : agent.agentRuntimeId;

  const loadCred = React.useCallback(() => {
    if (!agentKey) return;
    fetch("/api/agents/" + encodeURIComponent(agentKey) + "/credentials")
      .then((r) => r.json())
      .then((d) => { if (d.error) { setCredError(d.error); setCred(null); } else { setCredError(null); setCred(d); } })
      .catch((e) => setCredError(e.message));
  }, [agentKey]);

  React.useEffect(loadCred, [loadCred]);

  // Attach the credential provider backing this agent, so secret custody renders
  // from the discovery snapshot without another round trip.
  const providerName = (agent.environmentVariables || {}).GATEWAY_PROVIDER_NAME
    || ((agent.outboundAuth || [])[0] || {}).providerName || null;
  agent._provider = providerName
    ? (((discovery || {}).oauthProviders || []).find((p) => p.name === providerName) || null)
    : null;

  const doCredAction = (action) => {
    setCredBusy(true); setCredError(null);

    if (action === "rotate") {
      const pn = agent._provider && agent._provider.name;
      if (!pn) { setCredError("No credential provider resolved for this agent."); setCredBusy(false); return; }
      fetch("/api/agents/credentials/providers/" + encodeURIComponent(pn) + "/rotate", { method: "POST" })
        .then((r) => r.json())
        .then((d) => { if (d.error) setCredError(d.error); })
        .catch((e) => setCredError(e.message))
        .finally(() => setCredBusy(false));
      return;
    }

    fetch("/api/agents/" + encodeURIComponent(agentKey) + "/credentials/" + action, { method: "POST" })
      .then((r) => r.json())
      .then((d) => { if (d.error) setCredError(d.error); })
      .catch((e) => setCredError(e.message))
      .finally(() => { setCredBusy(false); loadCred(); });
  };

  const agentId = isBedrock ? agent.agentId : agent.agentRuntimeId;
  const arn = isBedrock ? agent.agentArn : agent.agentRuntimeArn;
  const statusOk = agent.status === "READY" || agent.status === "PREPARED";

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(agent, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (agent.name || "agent") + "-passport.json";
    a.click();
    URL.revokeObjectURL(a.href);
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div style={{ background: "var(--surface)", minHeight: "100%" }}>
      {/* top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: "18px 30px",
        background: "#fff", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 4,
      }}>
        <button onClick={onBack} title="Back to identities" style={{
          border: 0, background: "transparent", cursor: "pointer", color: "var(--ink-2)",
          width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center",
        }}><Icon name="chevRight" size={19} /></button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>{agent.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
            <Icon name="bot" size={12} color="var(--blue-700)" />
            <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{isBedrock ? "Bedrock Agent" : "AgentCore Runtime"}</span>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
          <button style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 15px", borderRadius: 20,
            border: 0, background: "var(--blue-700)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
          }}><Icon name="sitemap" size={14} color="#fff" />Access Graph</button>
          <AdCredentialMenu
            cred={cred ? Object.assign({}, cred, {
              canRotate: !!(agent._provider && agent._provider.secret && agent._provider.secret.rotatable),
              rotateBlockedReason: !agent._provider ? "No credential provider resolved for this agent."
                : (!agent._provider.secret ? "No secret resolved for this provider."
                : (agent._provider.secret.ownership === "MANAGED"
                    ? "Controlled by AWS for service-managed secrets."
                    : (!agent._provider.secret.rotationLambdaArn ? "No rotation function attached." : null))),
            }) : null}
            busy={credBusy} onAction={doCredAction} />
          <button style={{
            padding: "8px 15px", borderRadius: 20, border: "1px solid #FCA5A5",
            background: "#fff", color: "#B91C1C", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
          }}>Quarantine</button>
        </div>
      </div>

      <div style={{ padding: "22px 30px 40px" }}>
        <div className="card" style={{ padding: "22px 26px 30px" }}>
          {/* card header */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, paddingBottom: 4 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)" }}>Agent Details</div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={exportJson} title="Export passport as JSON" style={{
                border: 0, background: "transparent", cursor: "pointer", color: "var(--ink-3)",
                width: 30, height: 30, borderRadius: 7, display: "grid", placeItems: "center",
              }}><Icon name={copied ? "check" : "download"} size={17} /></button>
              <button style={{
                padding: "7px 17px", borderRadius: 18, border: "1px solid rgba(37,99,235,.4)",
                background: "#fff", color: "var(--blue-700)", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}>Assign</button>
            </div>
          </div>

          {/* ── Identity ── */}
          <AdSection title="Identity" />
          <AdGrid>
            <AdField label="Name">{agent.name}</AdField>
            <AdField label="Agent ID" mono>{agentId}</AdField>
            <AdField label="Status"><Pill tone={statusOk ? "green" : "gray"} dot>{agent.status}</Pill></AdField>

            <AdField label="Owner"><AdOwnerCell ro={agent.resolvedOwner} /></AdField>
            <AdField label="Business / application context">
              {tagged.businessContext ? <AdTagged t={tagged.businessContext} tone="purple" /> : null}
            </AdField>
            <AdField label="Environment">
              {tagged.environment ? <AdTagged t={tagged.environment} tone="amber" /> : null}
            </AdField>

            <AdField label="Version">{isBedrock ? null : agent.agentRuntimeVersion}</AdField>
            <AdField label="Risk tier">
              {tagged.riskTier ? <AdTagged t={tagged.riskTier} tone="red" /> : null}
            </AdField>
            <AdField label="Approval state">
              {agent.approvalState ? <AdChip tone="green">{agent.approvalState}</AdChip> : <AdChip tone="gray">Not set</AdChip>}
            </AdField>

            <AdField label="Lifecycle status">
              <AdChip tone={agent.lifecycleState === "Governed" ? "green" : "amber"}>{agent.lifecycleState || "Discovered"}</AdChip>
            </AdField>
            <AdField label="Region" mono>{agent.region}</AdField>
            <AdField label="Team">{tagged.team ? <AdTagged t={tagged.team} /> : null}</AdField>

            <AdField label="Created">{fmtDate(agent.createdAt)}</AdField>
            <AdField label="Last updated">{fmtDate(agent.lastUpdatedAt || agent.updatedAt)}</AdField>
            <AdField label="Data sensitivity">
              {tagged.dataSensitivity ? <AdTagged t={tagged.dataSensitivity} tone="red" /> : null}
            </AdField>

            <AdField label="ARN" mono span={2}>{arn}</AdField>
            <AdField label="Execution role" mono>{agent.roleArn}</AdField>

            {agent.description ? <AdField label="Description" span={3}>{agent.description}</AdField> : null}
          </AdGrid>

          {/* ── Ownership ── */}
          <AdOwnerSection agent={agent} />

          {/* ── Credentials ── */}
          <AdCredentialsSection agent={agent} cred={cred} busy={credBusy} error={credError} onAction={doCredAction} />

          {/* ── Model ── */}
          <AdModelSection agent={agent} />

          {/* ── Auth & Connectivity ── */}
          <AdSection title="Authentication & Connectivity" />
          {!isBedrock && typeof AwsInboundAuth === "function"
            ? <AwsInboundAuth agent={agent} />
            : null}
          {!isBedrock && agent.workloadIdentityDetails ? (
            <AdGrid>
              <AdField label="Workload identity" mono span={3}>{agent.workloadIdentityDetails.workloadIdentityArn}</AdField>
            </AdGrid>
          ) : null}
          {agent.outboundAuth && agent.outboundAuth.length ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>
                Outbound auth ({agent.outboundAuth.length})
              </div>
              {agent.outboundAuth.map((o, i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 9, padding: "13px 16px", marginBottom: 9 }}>
                  <AdGrid>
                    <AdField label="Provider" mono>{o.providerName}</AdField>
                    <AdField label="Client ID" mono>{o.clientId}</AdField>
                    <AdField label="Vendor">{o.vendor}</AdField>
                  </AdGrid>
                </div>
              ))}
            </div>
          ) : null}
          {isBedrock && agent.guardrailConfiguration ? (
            <AdGrid>
              <AdField label="Guardrail" mono span={3}>{JSON.stringify(agent.guardrailConfiguration)}</AdField>
            </AdGrid>
          ) : null}

          {/* ── NHI ── */}
          <AdSection title="Non-Human Identity (execution role)" />
          {execNhi && typeof AwsNhiSection === "function"
            ? <AwsNhiSection nhi={execNhi} />
            : <div style={{ fontSize: 12.5, color: "var(--ink-4)" }}>No execution role resolved for this agent.</div>}

          {/* ── Tags ── */}
          <AdTagsSection tags={agent.tags !== undefined ? agent.tags : null} />
        </div>
      </div>
    </div>
  );
}

window.AwsAgentDetailPage = AwsAgentDetailPage;
