/* global React, Icon, Pill */
/* Guardrail Enforcement Activity — vertical stacked bars for the Insights page.
   Each guardrail's enforcement actions this month, split Conditional Allow vs Block.
   Hover a colored segment to see that category's count. */

const { useState: geUseState } = React;

/* refined, desaturated enterprise palette */
const C_COND = "#6E8BD6";   // soft slate-blue — Conditional Allow
const C_BLK = "#D98C86";    // muted terracotta — Block
const C_COND_HI = "#4F73C9";
const C_BLK_HI = "#CC6B63";

const GE_DATA = [
  { name: "Destructive Command Control", short: "Destructive", cond: 0, block: 412 },
  { name: "Prompt Injection Protection", short: "Prompt Inj.", cond: 0, block: 256 },
  { name: "Intent Drift Validation", short: "Intent Drift", cond: 188, block: 64 },
  { name: "MCP Tool Governance", short: "MCP", cond: 142, block: 31 },
  { name: "ITSM Change Control", short: "ITSM", cond: 121, block: 18 },
  { name: "Conditional Access Grants", short: "Cond. Access", cond: 98, block: 22 },
  { name: "Protected Branch Control", short: "Branch", cond: 73, block: 76 },
  { name: "Sensitive File Access Control", short: "Sensitive", cond: 67, block: 12 },
  { name: "Ephemeral Agent Spawn Control", short: "Spawn", cond: 0, block: 54 },
  { name: "Environment Access Control", short: "Env", cond: 44, block: 39 },
];

function niceTicks(max) {
  const step = max > 400 ? 100 : max > 200 ? 50 : 25;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = top; v >= 0; v -= step) ticks.push(v);
  return { top, ticks };
}

function GuardrailEnforcementCard() {
  const rows = GE_DATA.map((d) => ({ ...d, total: d.cond + d.block })).sort((a, b) => b.total - a.total);
  const max = Math.max(...rows.map((r) => r.total));
  const { top, ticks } = niceTicks(max);
  const sumCond = rows.reduce((s, r) => s + r.cond, 0);
  const sumBlock = rows.reduce((s, r) => s + r.block, 0);
  const [hover, setHover] = geUseState(null); // {i, cat, value, name}

  const PLOT_H = 200;

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid var(--border)", gap: 12 }}>
        <div className="section-title">Guardrail Enforcement Activity</div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-3)" }}><span style={{ width: 9, height: 9, borderRadius: 3, background: C_COND }} /> Conditional Allow</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-3)" }}><span style={{ width: 9, height: 9, borderRadius: 3, background: C_BLK }} /> Block</span>
        </div>
      </div>

      <div style={{ padding: "20px 20px 14px" }}>
        <div style={{ display: "flex", gap: 10, position: "relative" }}>
          {/* y axis */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: PLOT_H, paddingBottom: 34 }}>
            {ticks.map((t) => <span key={t} className="mono" style={{ fontSize: 10, color: "var(--ink-4)", lineHeight: 1 }}>{t}</span>)}
          </div>

          {/* plot */}
          <div style={{ flex: 1, position: "relative" }}>
            {/* gridlines */}
            <div style={{ position: "absolute", inset: `0 0 34px 0`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              {ticks.map((t) => <div key={t} style={{ height: 1, background: "var(--border)" }} />)}
            </div>

            {/* bars */}
            <div style={{ position: "relative", height: PLOT_H, display: "flex", alignItems: "flex-end", gap: 0 }}>
              {rows.map((r, i) => {
                const dim = hover && hover.i !== i;
                const condH = (r.cond / top) * (PLOT_H - 34);
                const blockH = (r.block / top) * (PLOT_H - 34);
                const isHC = hover && hover.i === i && hover.cat === "cond";
                const isHB = hover && hover.i === i && hover.cat === "block";
                return (
                  <div key={r.name} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                    <div style={{ width: 22, display: "flex", flexDirection: "column", justifyContent: "flex-end", opacity: dim ? 0.4 : 1, transition: "opacity .12s" }}>
                      {r.cond > 0 && (
                        <div onMouseEnter={() => setHover({ i, cat: "cond", value: r.cond, name: r.name })} onMouseLeave={() => setHover(null)}
                          style={{ height: condH, background: isHC ? C_COND_HI : C_COND, borderRadius: r.block > 0 ? "4px 4px 0 0" : "4px 4px 0 0", cursor: "pointer", transition: "background .12s" }} />
                      )}
                      {r.block > 0 && (
                        <div onMouseEnter={() => setHover({ i, cat: "block", value: r.block, name: r.name })} onMouseLeave={() => setHover(null)}
                          style={{ height: blockH, background: isHB ? C_BLK_HI : C_BLK, borderRadius: r.cond > 0 ? "0 0 4px 4px" : "4px 4px 0 0", cursor: "pointer", transition: "background .12s", marginTop: r.cond > 0 ? 1 : 0 }} />
                      )}
                    </div>
                    <div style={{ height: 34, display: "flex", alignItems: "flex-start", paddingTop: 7 }}>
                      <span style={{ fontSize: 9.5, color: dim ? "var(--ink-4)" : "var(--ink-3)", transform: "rotate(-38deg)", transformOrigin: "center", whiteSpace: "nowrap", fontWeight: 500 }}>{r.short}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* tooltip */}
            {hover && (
              <div style={{
                position: "absolute", top: 4, left: `${((hover.i + 0.5) / rows.length) * 100}%`, transform: "translateX(-50%)",
                background: "#fff", border: "1px solid var(--border)", borderRadius: 9, boxShadow: "var(--shadow-pop)",
                padding: "8px 11px", pointerEvents: "none", zIndex: 5, whiteSpace: "nowrap",
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{hover.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: hover.cat === "cond" ? C_COND : C_BLK }} />
                  <span style={{ color: "var(--ink-3)" }}>{hover.cat === "cond" ? "Conditional Allow" : "Block"}</span>
                  <span className="mono" style={{ fontWeight: 700, color: "var(--ink)", marginLeft: 4 }}>{hover.value}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 28, padding: "13px 20px", background: "var(--surface-2)", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C_COND }} />
          <span className="mono" style={{ fontWeight: 700, color: "var(--ink)" }}>{sumCond.toLocaleString()}</span>
          <span style={{ color: "var(--ink-3)" }}>conditional allows</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C_BLK }} />
          <span className="mono" style={{ fontWeight: 700, color: "var(--ink)" }}>{sumBlock.toLocaleString()}</span>
          <span style={{ color: "var(--ink-3)" }}>blocks</span>
        </div>
        <span className="help" style={{ marginLeft: "auto", alignSelf: "center" }}>Last 30 days</span>
      </div>
    </div>
  );
}

window.GuardrailEnforcementCard = GuardrailEnforcementCard;
