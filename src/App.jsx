import React, { useState, useMemo } from "react";

/* ------------------------------------------------------------------ *
 * Role Changes Approval & Audit — Model A (propose-only)
 * Review-only console. A role change never takes effect until approved.
 * Bans are handled in a separate disposition flow.
 * ------------------------------------------------------------------ */

const C = {
  page: "#fafafa", card: "#ffffff", ink: "#1f2328", sub: "#6b7280", muted: "#9ca3af",
  line: "#ededf0", line2: "#e5e7eb",
  green: "#15803d", greenBg: "#ecfdf5", greenLn: "#bbf7d0",
  amber: "#b45309", amberBg: "#fffbeb", amberLn: "#fde68a",
  red: "#b91c1c", redBg: "#fef2f2", redLn: "#fecaca",
  blue: "#1d4ed8", blueBg: "#eff6ff", blueLn: "#bfdbfe",
  slate: "#475569", slateBg: "#f1f5f9", slateLn: "#e2e8f0",
  violet: "#6d28d9", violetBg: "#f5f3ff", violetLn: "#ddd6fe",
  teal: "#0f766e", tealBg: "#f0fdfa", tealLn: "#99f6e4",
};

const FONT = '-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Segoe UI",Roboto,sans-serif';
const RULE_LABEL = { referral_abuse: "推荐滥用", low_tr: "流量透支" };

const now = () => {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const seedRequests = [
  { id: "REQ-1051", userId: "U-8F3A2", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    evidence: { rules: ["referral_abuse"], snap: { referralCount: 8, activeRate: 6 } },
    createdAt: "2026-06-18 09:12" },

  { id: "REQ-1052", userId: "U-5D9E4", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    evidence: { rules: ["low_tr"], snap: { tr: 0.62, netRecharge: 6, trafficGB: 96.8 } },
    createdAt: "2026-06-18 09:12" },

  { id: "REQ-1053", userId: "U-2B7C1", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    evidence: { rules: ["referral_abuse", "low_tr"], snap: { referralCount: 14, activeRate: 4, tr: 0.41, trafficGB: 152 } },
    createdAt: "2026-06-18 09:12" },

  { id: "REQ-1057", userId: "U-7H4K2", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    evidence: { rules: ["referral_abuse"], snap: { referralCount: 21, activeRate: 2 } },
    createdAt: "2026-06-18 09:12" },

  { id: "REQ-1058", userId: "U-9X1V5", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    evidence: { rules: ["referral_abuse"], snap: { referralCount: 7, activeRate: 9 } },
    createdAt: "2026-06-18 09:12" },

  { id: "REQ-1048", userId: "U-1A0F8", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    source: "MANUAL", proposer: "alice", reason: "客服核实疑似多人共享账号，先降级观察。",
    evidence: null, createdAt: "2026-06-17 16:40" },

  { id: "REQ-1049", userId: "U-6T3W8", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    source: "MANUAL", proposer: "bob", reason: "退款套利：连续申请退款后仍持续使用积分兑换的会员权益。",
    evidence: null, createdAt: "2026-06-17 15:22" },

  { id: "REQ-1050", userId: "U-2C9Y4", changeType: "RESTORE", fromRole: "BASE", toRole: "VIP",
    source: "MANUAL", proposer: "carol", reason: "误降级申诉成立，用户已补充付费凭证，申请恢复 VIP。",
    evidence: null, createdAt: "2026-06-17 11:08" },
];

const seedHistory = [
  { id: "REQ-1039", userId: "U-7K2P1", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    action: "APPROVED", actor: "alice", decidedAt: "2026-06-16 11:20", note: "证据明确，降级。", applied: "SVIP → BASE" },
  { id: "REQ-1035", userId: "U-4M8N3", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    action: "WHITELISTED", actor: "bob", decidedAt: "2026-06-15 18:02", note: "确认企业客户，规则误判，加白。", applied: "无变更 · 永久白名单" },
  { id: "REQ-1028", userId: "U-2P9Q7", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    action: "WHITELISTED", actor: "alice", decidedAt: "2026-06-14 10:35", note: "团队账号，流量用于多设备共享，属正常使用，永久加白。", applied: "无变更 · 永久白名单" },
  { id: "REQ-1022", userId: "U-5R1T4", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    action: "WHITELISTED", actor: "alice", decidedAt: "2026-06-13 16:50", note: "用户为长期高价值客户，单次兑换差额偏高属促销活动期间行为，加白。", applied: "无变更 · 永久白名单" },
  { id: "REQ-1018", userId: "U-9K3W2", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    action: "WHITELISTED", actor: "bob", decidedAt: "2026-06-12 09:18", note: "核实为内部测试账号，加白。", applied: "无变更 · 永久白名单" },
  { id: "REQ-1011", userId: "U-6F7D0", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    source: "MANUAL", proposer: "carol", reason: "用户申诉：流量高峰属家庭宽带共享，非套利行为。",
    action: "WHITELISTED", actor: "alice", decidedAt: "2026-06-10 14:22", note: "申诉材料充分，用户历史付费记录良好，永久加白。", applied: "无变更 · 永久白名单" },
  { id: "REQ-1041", userId: "U-3F8Q1", changeType: "RESTORE", fromRole: "BASE", toRole: "VIP",
    source: "MANUAL", proposer: "carol", reason: "凭证核实，恢复角色。",
    action: "APPROVED", actor: "alice", decidedAt: "2026-06-16 09:15", note: "凭证齐全，同意恢复。", applied: "BASE → VIP" },
  { id: "REQ-1037", userId: "U-8L2M6", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    source: "MANUAL", proposer: "carol", reason: "疑似异常流量。",
    action: "REJECTED", actor: "bob", decidedAt: "2026-06-15 14:30", note: "未达流量透支阈值，证据不足，退回。", applied: "无变更" },
];

function Pill({ children, fg, bg, ln, mono }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
      color: fg, background: bg, border: `1px solid ${ln}`, borderRadius: 999, padding: "2px 9px",
      whiteSpace: "nowrap", fontVariantNumeric: mono ? "tabular-nums" : "normal" }}>{children}</span>
  );
}
const typePill = (t) => t === "RESTORE"
  ? <Pill fg={C.teal} bg={C.tealBg} ln={C.tealLn}>恢复</Pill>
  : <Pill fg={C.amber} bg={C.amberBg} ln={C.amberLn}>降级</Pill>;
const sourcePill = (s) => s === "SYSTEM"
  ? <Pill fg={C.violet} bg={C.violetBg} ln={C.violetLn}>系统自动</Pill>
  : <Pill fg={C.slate} bg={C.slateBg} ln={C.slateLn}>人工</Pill>;
const actionPill = (a) => a === "APPROVED"
  ? <Pill fg={C.green} bg={C.greenBg} ln={C.greenLn}>已通过</Pill>
  : a === "REJECTED" ? <Pill fg={C.amber} bg={C.amberBg} ln={C.amberLn}>已驳回</Pill>
  : <Pill fg={C.blue} bg={C.blueBg} ln={C.blueLn}>已加白</Pill>;

function RoleArrow({ from, to }) {
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 13, color: C.ink }}>
      <b style={{ fontWeight: 600, color: from === "BASE" ? C.muted : C.ink }}>{from}</b>
      <span style={{ color: C.muted, margin: "0 5px" }}>→</span>
      <b style={{ fontWeight: 600, color: to === "BASE" ? C.muted : C.ink }}>{to}</b>
    </span>
  );
}

const COLS = "28px 110px 182px 82px 78px minmax(140px,1fr) 126px 196px";

export default function RoleChangeApproval() {
  const [requests, setRequests] = useState(seedRequests);
  const [history, setHistory] = useState(seedHistory);
  const [tab, setTab] = useState("pending");
  const [src, setSrc] = useState("ALL");
  const [typ, setTyp] = useState("ALL");
  const [q, setQ] = useState("");
  const [hAction, setHAction] = useState("ALL");
  const [hQ, setHQ] = useState("");
  const [open, setOpen] = useState({});
  const [modal, setModal] = useState(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState(null);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const pending = useMemo(() => requests.filter((r) =>
    (src === "ALL" || r.source === src) &&
    (typ === "ALL" || r.changeType === typ) &&
    (!q || r.userId.toLowerCase().includes(q.toLowerCase()))
  ), [requests, src, typ, q]);

  const hist = useMemo(() => history.filter((h) =>
    (hAction === "ALL" || h.action === hAction) &&
    (!hQ || h.userId.toLowerCase().includes(hQ.toLowerCase()))
  ), [history, hAction, hQ]);

  const counts = useMemo(() => ({
    total: requests.length,
    system: requests.filter((r) => r.source === "SYSTEM").length,
    manual: requests.filter((r) => r.source === "MANUAL").length,
  }), [requests]);

  const whitelisted = useMemo(() => history.filter((h) => h.action === "WHITELISTED"), [history]);
  const [showWL, setShowWL] = useState(false);

  function ask(action, req) { setNote(""); setModal({ action, req }); }

  function confirm() {
    const { action, req } = modal;
    const applied = action === "APPROVED" ? `${req.fromRole} → ${req.toRole}`
      : action === "WHITELISTED" ? "无变更 · 永久白名单" : "无变更";
    setHistory((h) => [{ ...req, action, actor: "你 (当前管理员)", decidedAt: now(), note: note.trim(), applied }, ...h]);
    setRequests((rs) => rs.filter((r) => r.id !== req.id));
    setModal(null);
    flash(action === "APPROVED"
      ? `已通过 · ${req.userId} ${req.changeType === "RESTORE" ? "已恢复至" : "已降级至"} ${req.toRole}`
      : action === "WHITELISTED" ? `已加白 · ${req.userId} 不再自动标记` : `已驳回 · ${req.userId} 角色不变`);
  }

  const Seg = ({ value, set, opts }) => (
    <div style={{ display: "inline-flex", background: "#f3f4f6", borderRadius: 8, padding: 2 }}>
      {opts.map((o) => (
        <button key={o.v} onClick={() => set(o.v)} style={{
          border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, padding: "5px 12px",
          borderRadius: 6, fontFamily: FONT, color: value === o.v ? C.ink : C.sub,
          background: value === o.v ? C.card : "transparent",
          boxShadow: value === o.v ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>{o.l}</button>
      ))}
    </div>
  );
  const ActBtn = ({ onClick, fg, bg, ln, children }) => (
    <button className="act" onClick={onClick} style={{ cursor: "pointer", fontFamily: FONT, fontSize: 12.5,
      fontWeight: 600, color: fg, background: bg, border: `1px solid ${ln}`, borderRadius: 7,
      padding: "5px 11px", whiteSpace: "nowrap" }}>{children}</button>
  );

  return (
    <div style={{ fontFamily: FONT, background: C.page, color: C.ink, padding: 18, flex: 1 }}>
      <style>{`
        .act{transition:filter .12s ease}.act:hover{filter:brightness(.97)}
        .row:hover{background:#fbfbfc}.lk{cursor:pointer}
        input,textarea{font-family:${FONT}}::placeholder{color:${C.muted}}
      `}</style>

      <div style={{ width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", boxSizing: "border-box" }}>
        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>角色变更审批台</div>
            </div>
            <button onClick={() => setShowWL(true)} style={{ cursor: "pointer", fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: C.blue, background: C.blueBg, border: `1px solid ${C.blueLn}`, borderRadius: 8, padding: "6px 14px", whiteSpace: "nowrap", flexShrink: 0 }}>
              白名单用户 ({whitelisted.length})
            </button>
          </div>
          <div style={{ display: "flex", gap: 22, marginTop: 16, borderBottom: `1px solid ${C.line}` }}>
            {[["pending", `待审批 (${counts.total})`], ["history", "历史日志"]].map(([k, l]) => (
              <div key={k} className="lk" onClick={() => setTab(k)} style={{ paddingBottom: 10, fontSize: 13.5,
                fontWeight: 600, color: tab === k ? C.ink : C.muted,
                borderBottom: tab === k ? `2px solid ${C.ink}` : "2px solid transparent", marginBottom: -1 }}>{l}</div>
            ))}
          </div>
        </div>

        {tab === "pending" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", padding: "14px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.muted }}>来源</span>
                <Seg value={src} set={setSrc} opts={[{ v: "ALL", l: "全部" }, { v: "SYSTEM", l: "系统自动" }, { v: "MANUAL", l: "人工" }]} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.muted }}>类型</span>
                <Seg value={typ} set={setTyp} opts={[{ v: "ALL", l: "全部" }, { v: "DOWNGRADE", l: "降级" }, { v: "RESTORE", l: "恢复" }]} />
              </div>
              <div style={{ marginLeft: "auto" }}>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索用户名"
                  style={{ fontSize: 13, padding: "7px 11px", border: `1px solid ${C.line2}`, borderRadius: 8,background:"white", width: 160, outline: "none", color: C.ink }} />
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 880 }}>
                <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 10, padding: "9px 20px",
                  borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, fontSize: 11.5, color: C.muted, fontWeight: 600 }}>
                  <div></div><div>用户</div><div>变更</div><div>来源</div><div>发起人</div><div>原因</div><div>发起时间</div><div style={{ textAlign: "center" }}>操作</div>
                </div>

                {pending.length === 0 && (
                  <div style={{ padding: "44px 20px", textAlign: "center", color: C.muted, fontSize: 13 }}>
                    没有待审批的变更。系统检测到 <b style={{ color: C.sub }}>待转化用户</b> 时会在此生成降级申请。
                  </div>
                )}

                {pending.map((r) => {
                  const ev = r.evidence;
                  return (
                    <div key={r.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <div className="row" style={{ display: "grid", gridTemplateColumns: COLS, gap: 10, padding: "13px 20px", alignItems: "center" }}>
                        <div className="lk" onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}
                          style={{ color: C.muted, fontSize: 12, userSelect: "none", transform: open[r.id] ? "rotate(90deg)" : "none", transition: "transform .12s" }}></div>
                        <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.userId}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{typePill(r.changeType)}<RoleArrow from={r.fromRole} to={r.toRole} /></div>
                        <div>{sourcePill(r.source)}</div>
                        <div style={{ fontSize: 12.5, color: C.sub }}>{r.proposer}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", overflow: "hidden" }}>
                          <span style={{ fontSize: 12.5, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 1, minWidth: 0 }} title={r.reason}>{r.reason}</span>
                          {r.source === "SYSTEM" && r.evidence && r.evidence.rules.map((rule) => {
                            const metric = rule === "referral_abuse"
                              ? `推荐 ${r.evidence.snap.referralCount} · 活跃率 ${r.evidence.snap.activeRate}%`
                              : rule === "low_tr" ? `TR ${r.evidence.snap.tr}` : null;
                            return (
                              <span key={rule} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, flexShrink: 0,
                                background: rule === "referral_abuse" ? C.amberBg : C.blueBg,
                                color: rule === "referral_abuse" ? C.amber : C.blue,
                                border: `1px solid ${rule === "referral_abuse" ? C.amberLn : C.blueLn}`,
                                borderRadius: 6, padding: "2px 9px", whiteSpace: "nowrap" }}>
                                {RULE_LABEL[rule]}
                                {metric && <><span style={{ color: C.muted, margin: "0 2px" }}>·</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{metric}</span></>}
                              </span>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, fontVariantNumeric: "tabular-nums"}}>{r.createdAt}</div>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                          <ActBtn onClick={() => ask("APPROVED", r)} fg={C.green} bg={C.greenBg} ln={C.greenLn}>通过</ActBtn>
                          <ActBtn onClick={() => ask("REJECTED", r)} fg={C.amber} bg={C.amberBg} ln={C.amberLn}>驳回</ActBtn>
                          {r.source === "SYSTEM" && <ActBtn onClick={() => ask("WHITELISTED", r)} fg={C.blue} bg={C.blueBg} ln={C.blueLn}>加白</ActBtn>}
                          <button style={{ border: `1px solid ${C.line2}`, background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 13, color: C.sub, padding: "1px 7px", lineHeight: 1.4 }}>···</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : tab === "history" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", padding: "14px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.muted }}>动作</span>
                <Seg value={hAction} set={setHAction} opts={[{ v: "ALL", l: "全部" }, { v: "APPROVED", l: "通过" }, { v: "REJECTED", l: "驳回" }, { v: "WHITELISTED", l: "加白" }]} />
              </div>
              <div style={{ marginLeft: "auto" }}>
                <input value={hQ} onChange={(e) => setHQ(e.target.value)} placeholder="搜索用户名"
                  style={{ fontSize: 13, padding: "7px 11px", border: `1px solid ${C.line2}`, borderRadius: 8,background:"white", width: 160, outline: "none", color: C.ink }} />
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${C.line}`, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr style={{ background: "#fafafa", borderBottom: `1px solid ${C.line}` }}>
                    {["时间", "用户", "变更", "动作", "审批人 · 备注"].map((h) => (
                      <th key={h} style={{ textAlign: "left", fontSize: 11.5, fontWeight: 600, color: C.muted, padding: "9px 16px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hist.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: "44px 20px", textAlign: "center", color: C.muted, fontSize: 13 }}>暂无记录。</td></tr>
                  )}
                  {hist.map((h) => (
                    <tr key={h.id + h.decidedAt} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <div style={{ fontSize: 12, color: C.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{h.decidedAt}</div>
                      </td>
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{h.userId}</div>
                        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>发起：{h.proposer}</div>
                      </td>
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <RoleArrow from={h.fromRole} to={h.toRole} />
                      </td>
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        {actionPill(h.action)}
                      </td>
                      <td style={{ padding: "12px 16px", verticalAlign: "middle", maxWidth: 260 }}>
                        <div style={{ fontSize: 12.5, color: C.ink, fontWeight: 500 }}>{h.actor}</div>
                        {h.note && <div style={{ fontSize: 12, color: C.sub, marginTop: 3, lineHeight: 1.5 }}>{h.note}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 20px", fontSize: 11.5, color: C.muted }}>仅追加日志 · 记录每一次审批动作与最终生效结果，不可编辑或删除。</div>
          </>
        ) : null}
      </div>

      {showWL && (
        <Overlay onClose={() => setShowWL(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>白名单用户 ({whitelisted.length})</div>
            <button onClick={() => setShowWL(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, color: C.muted, lineHeight: 1 }}>×</button>
          </div>
          {whitelisted.length === 0
            ? <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "24px 0" }}>暂无白名单用户。</div>
            : <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                    {["用户", "加白时间", "加白人", ""].map((h) => (
                      <th key={h} style={{ textAlign: "left", fontSize: 11.5, fontWeight: 600, color: C.muted, padding: "6px 10px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {whitelisted.map((h) => (
                    <tr key={h.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td style={{ padding: "10px 10px", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", verticalAlign: "middle" }}>{h.userId}</td>
                      <td style={{ padding: "10px 10px", fontSize: 12, color: C.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", verticalAlign: "middle" }}>{h.decidedAt}</td>
                      <td style={{ padding: "10px 10px", fontSize: 12.5, fontWeight: 500, verticalAlign: "middle" }}>{h.actor}</td>
                      <td style={{ padding: "10px 10px", textAlign: "right", verticalAlign: "middle" }}>
                        <button style={{ border: `1px solid ${C.line2}`, background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 13, color: C.sub, padding: "1px 7px", lineHeight: 1.4 }}>···</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
          <div style={{ marginTop: 14, fontSize: 11.5, color: C.muted }}>加白用户不再被系统自动标记，如需移除请联系系统管理员。</div>
        </Overlay>
      )}

      {modal && (
        <Overlay onClose={() => setModal(null)}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            {modal.action === "APPROVED" ? "通过此变更？" : modal.action === "REJECTED" ? "驳回此变更？" : "加白此用户？"}
          </div>
          <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 14, lineHeight: 1.6 }}>
            <b style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>{modal.req.userId}</b>
            {modal.action === "APPROVED"
              ? <> · 将从 <b>{modal.req.fromRole}</b> {modal.req.changeType === "RESTORE" ? "恢复" : "降级"}至 <b>{modal.req.toRole}</b>，立即生效。</>
              : modal.action === "REJECTED" ? " · 申请将被驳回，用户角色保持不变。"
              : " · 申请被驳回，且加入永久白名单，今后不再被自动标记。"}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={modal.action === "REJECTED" ? "驳回原因（必填）" : "备注（可选）"}
            style={{ width: "100%", boxSizing: "border-box", minHeight: 64,background: "#fff",resize: "vertical", fontSize: 13, padding: 10, border: `1px solid ${C.line2}`, borderRadius: 8, outline: "none", color: C.ink }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
            <button className="act" onClick={() => setModal(null)} style={ghostBtn}>取消</button>
            <button className="act" disabled={modal.action === "REJECTED" && !note.trim()} onClick={confirm}
              style={{ ...solidBtn, opacity: modal.action === "REJECTED" && !note.trim() ? 0.45 : 1,
                cursor: modal.action === "REJECTED" && !note.trim() ? "not-allowed" : "pointer",
                background: modal.action === "APPROVED" ? C.green : modal.action === "REJECTED" ? C.amber : C.blue }}>
              确认{modal.action === "APPROVED" ? "通过" : modal.action === "REJECTED" ? "驳回" : "加白"}
            </button>
          </div>
        </Overlay>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: C.ink,
          color: "#fff", fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,.18)", zIndex: 60 }}>{toast}</div>
      )}
    </div>
  );
}

const ghostBtn = { cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.sub, background: "#fff", border: `1px solid ${C.line2}`, borderRadius: 8, padding: "8px 16px" };
const solidBtn = { fontFamily: FONT, fontSize: 13, fontWeight: 600, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px" };

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,20,24,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: "100%", background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>{children}</div>
    </div>
  );
}