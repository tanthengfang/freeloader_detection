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
  { id: "REQ-1048", userId: "U-1A0F8", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    source: "MANUAL", proposer: "alice", reason: "客服核实疑似多人共享账号，先降级观察。",
    evidence: null, createdAt: "2026-06-17 16:40" },

  { id: "REQ-1049", userId: "U-6T3W8", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    source: "MANUAL", proposer: "bob", reason: "退款套利：连续申请退款后仍持续使用积分兑换的会员权益。",
    evidence: null, createdAt: "2026-06-17 15:22" },

  { id: "REQ-1050", userId: "U-2C9Y4", changeType: "RESTORE", fromRole: "BASE", toRole: "VIP",
    source: "MANUAL", proposer: "carol", reason: "误降级申诉成立，用户已补充付费凭证，申请恢复 VIP。",
    evidence: null, createdAt: "2026-06-17 11:08" },

  { id: "REQ-1061", userId: "U-4X8Z2", changeType: "BAN", fromRole: "SVIP", toRole: "封禁",
    source: "MANUAL", proposer: "alice", reason: "用户大量注册小号刷取推荐奖励，确认为恶意刷量，申请永久封号。",
    evidence: null, createdAt: "2026-06-18 10:05" },

  { id: "REQ-1062", userId: "U-7Q3R5", changeType: "BAN", fromRole: "VIP", toRole: "封禁",
    source: "MANUAL", proposer: "bob", reason: "多次申诉同一笔退款并成功套现，经财务核实为欺诈行为，建议封号。",
    evidence: null, createdAt: "2026-06-18 09:48" },

  { id: "REQ-1063", userId: "U-5N2M8", changeType: "POINTS_CHANGE", pointsDelta: -800,
    source: "MANUAL", proposer: "carol", reason: "积分兑换异常：连续利用漏洞以低价兑换高额商品，扣除违规所得积分。",
    evidence: null, createdAt: "2026-06-17 17:30" },

  { id: "REQ-1064", userId: "U-1K6J3", changeType: "POINTS_CHANGE", pointsDelta: 500,
    source: "MANUAL", proposer: "alice", reason: "系统故障导致用户积分错误扣减，客服核实后补发差额积分。",
    evidence: null, createdAt: "2026-06-17 14:15" },
];

const seedHistory = [
  { id: "REQ-1051", userId: "U-8F3A2", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    evidence: { rules: ["referral_abuse"], snap: { referralCount: 8, activeRate: 6 } },
    action: "APPROVED", actor: "系统 (自动审批)", decidedAt: "2026-06-18 09:12", note: "", applied: "SVIP → BASE" },
  { id: "REQ-1052", userId: "U-5D9E4", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    evidence: { rules: ["low_tr"], snap: { tr: 0.62 } },
    action: "APPROVED", actor: "系统 (自动审批)", decidedAt: "2026-06-18 09:12", note: "", applied: "VIP → BASE" },
  { id: "REQ-1053", userId: "U-2B7C1", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    evidence: { rules: ["referral_abuse", "low_tr"], snap: { referralCount: 14, activeRate: 4, tr: 0.41 } },
    action: "APPROVED", actor: "系统 (自动审批)", decidedAt: "2026-06-18 09:12", note: "", applied: "SVIP → BASE" },
  { id: "REQ-1057", userId: "U-7H4K2", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    evidence: { rules: ["referral_abuse"], snap: { referralCount: 21, activeRate: 2 } },
    action: "APPROVED", actor: "系统 (自动审批)", decidedAt: "2026-06-18 09:12", note: "", applied: "SVIP → BASE" },
  { id: "REQ-1058", userId: "U-9X1V5", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    evidence: { rules: ["referral_abuse"], snap: { referralCount: 7, activeRate: 9 } },
    action: "APPROVED", actor: "系统 (自动审批)", decidedAt: "2026-06-18 09:12", note: "", applied: "VIP → BASE" },
  { id: "REQ-1039", userId: "U-7K2P1", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    source: "SYSTEM", proposer: "system", reason: "系统自动 · 命中待转化用户规则",
    evidence: { rules: ["low_tr"], snap: { tr: 0.55 } },
    action: "APPROVED", actor: "系统 (自动审批)", decidedAt: "2026-06-16 11:20", note: "", applied: "SVIP → BASE" },
  { id: "REQ-1041", userId: "U-3F8Q1", changeType: "RESTORE", fromRole: "BASE", toRole: "VIP",
    source: "MANUAL", proposer: "carol", reason: "凭证核实，恢复角色。",
    action: "APPROVED", actor: "alice", decidedAt: "2026-06-16 09:15", note: "凭证齐全，同意恢复。", applied: "BASE → VIP" },
  { id: "REQ-1037", userId: "U-8L2M6", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    source: "MANUAL", proposer: "carol", reason: "疑似异常流量。",
    action: "REJECTED", actor: "bob", decidedAt: "2026-06-15 14:30", note: "未达流量透支阈值，证据不足，退回。", applied: "无变更" },
  { id: "REQ-1055", userId: "U-5P2Q9", changeType: "BAN", fromRole: "SVIP", toRole: "封禁",
    source: "MANUAL", proposer: "alice", reason: "确认恶意刷量，申请封号。",
    action: "APPROVED", actor: "bob", decidedAt: "2026-06-15 11:20", note: "证据充分，已封禁。", applied: "已封禁" },
  { id: "REQ-1056", userId: "U-8N4K1", changeType: "POINTS_CHANGE", pointsDelta: -1200,
    source: "MANUAL", proposer: "bob", reason: "利用积分兑换漏洞套利，扣除违规积分。",
    action: "APPROVED", actor: "alice", decidedAt: "2026-06-14 16:00", note: "核实属实，扣除。", applied: "积分 -1200" },
  { id: "REQ-1054", userId: "U-3W7V2", changeType: "POINTS_CHANGE", pointsDelta: 300,
    source: "MANUAL", proposer: "carol", reason: "活动奖励补发，系统漏发。",
    action: "REJECTED", actor: "alice", decidedAt: "2026-06-13 10:45", note: "活动已截止，不予补发。", applied: "无变更" },
];

function Pill({ children, fg, bg, ln, mono }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
      color: fg, background: bg, border: `1px solid ${ln}`, borderRadius: 999, padding: "2px 9px",
      whiteSpace: "nowrap", fontVariantNumeric: mono ? "tabular-nums" : "normal" }}>{children}</span>
  );
}
const typePill = (t) =>
  (t === "DOWNGRADE" || t === "RESTORE") ? <Pill fg={C.amber} bg={C.amberBg} ln={C.amberLn}>等级更换</Pill>
  : t === "BAN" ? <Pill fg={C.red} bg={C.redBg} ln={C.redLn}>封禁</Pill>
  : t === "POINTS_CHANGE" ? <Pill fg={C.blue} bg={C.blueBg} ln={C.blueLn}>积分更换</Pill>
  : <Pill fg={C.slate} bg={C.slateBg} ln={C.slateLn}>{t}</Pill>;
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
      <b style={{ fontWeight: 600, color: to === "BASE" ? C.muted : to === "封禁" ? C.red : C.ink }}>{to}</b>
    </span>
  );
}

const COLS = "28px 110px 182px 78px minmax(140px,1fr) 126px 196px";

export default function RoleChangeApproval() {
  const [requests, setRequests] = useState(seedRequests);
  const [history, setHistory] = useState(seedHistory);
  const [tab, setTab] = useState("pending");
  const [typ, setTyp] = useState("ALL");
  const [q, setQ] = useState("");
  const [hAction, setHAction] = useState("ALL");
  const [hActor, setHActor] = useState("ALL");
  const [hQ, setHQ] = useState("");
  const [open, setOpen] = useState({});
  const [modal, setModal] = useState(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState(null);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const pending = useMemo(() => requests.filter((r) =>
    (typ === "ALL" ||
     (typ === "LEVEL_CHANGE" && (r.changeType === "DOWNGRADE" || r.changeType === "RESTORE")) ||
     r.changeType === typ) &&
    (!q || r.userId.toLowerCase().includes(q.toLowerCase()))
  ), [requests, typ, q]);

  const hist = useMemo(() => history.filter((h) =>
    (hAction === "ALL" || h.action === hAction) &&
    (hActor === "ALL" ||
     (hActor === "SYSTEM" && h.actor === "系统 (自动审批)") ||
     (hActor === "HUMAN" && h.actor !== "系统 (自动审批)")) &&
    (!hQ || h.userId.toLowerCase().includes(hQ.toLowerCase()))
  ), [history, hAction, hActor, hQ]);

  const counts = useMemo(() => ({ total: requests.length }), [requests]);

  function ask(action, req) { setNote(""); setModal({ action, req }); }

  function confirm() {
    const { action, req } = modal;
    const applied = action !== "APPROVED" ? "无变更"
      : req.changeType === "POINTS_CHANGE" ? `积分 ${req.pointsDelta > 0 ? "+" : ""}${req.pointsDelta}`
      : req.changeType === "BAN" ? "已封禁"
      : `${req.fromRole} → ${req.toRole}`;
    setHistory((h) => [{ ...req, action, actor: "你 (当前管理员)", decidedAt: now(), note: note.trim(), applied }, ...h]);
    setRequests((rs) => rs.filter((r) => r.id !== req.id));
    setModal(null);
    flash(action !== "APPROVED" ? `已驳回 · ${req.userId} 无变更`
      : req.changeType === "POINTS_CHANGE" ? `已通过 · ${req.userId} 积分 ${req.pointsDelta > 0 ? "+" : ""}${req.pointsDelta}`
      : req.changeType === "BAN" ? `已通过 · ${req.userId} 已封禁`
      : `已通过 · ${req.userId} ${req.changeType === "RESTORE" ? "已恢复至" : "已降级至"} ${req.toRole}`);
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
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>角色变更审批台</div>
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
                <span style={{ fontSize: 12, color: C.muted }}>类型</span>
                <Seg value={typ} set={setTyp} opts={[{ v: "ALL", l: "全部" }, { v: "LEVEL_CHANGE", l: "等级更换" }, { v: "BAN", l: "封禁" }, { v: "POINTS_CHANGE", l: "积分更换" }]} />
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
                  <div></div><div>用户</div><div>变更</div><div>发起人</div><div>原因</div><div>发起时间</div><div style={{ textAlign: "center" }}>操作</div>
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
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {typePill(r.changeType)}
                          {r.changeType === "POINTS_CHANGE"
                            ? <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: r.pointsDelta > 0 ? C.green : C.red }}>{r.pointsDelta > 0 ? `+${r.pointsDelta}` : r.pointsDelta} 积分</span>
                            : <RoleArrow from={r.fromRole} to={r.toRole} />}
                        </div>
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
                <Seg value={hAction} set={setHAction} opts={[{ v: "ALL", l: "全部" }, { v: "APPROVED", l: "通过" }, { v: "REJECTED", l: "驳回" }]} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.muted }}>审批人</span>
                <Seg value={hActor} set={setHActor} opts={[{ v: "ALL", l: "全部" }, { v: "SYSTEM", l: "系统" }, { v: "HUMAN", l: "人工" }]} />
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
                    {["时间", "用户", "变更", "动作", "审批人", ""].map((h) => (
                      <th key={h} style={{ textAlign: "left", fontSize: 11.5, fontWeight: 600, color: C.muted, padding: "9px 16px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hist.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: "44px 20px", textAlign: "center", color: C.muted, fontSize: 13 }}>暂无记录。</td></tr>
                  )}
                  {hist.map((h) => {
                    const isAuto = h.actor === "系统 (自动审批)";
                    return (
                      <tr key={h.id + h.decidedAt} style={{ borderBottom: `1px solid ${C.line}` }}>
                        <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                          <div style={{ fontSize: 12, color: C.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{h.decidedAt}</div>
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{h.userId}</div>
                          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>发起：{h.proposer}</div>
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                          {h.changeType === "POINTS_CHANGE"
                            ? <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: h.pointsDelta > 0 ? C.green : C.red }}>{h.pointsDelta > 0 ? `+${h.pointsDelta}` : h.pointsDelta} 积分</span>
                            : <RoleArrow from={h.fromRole} to={h.toRole} />}
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                          {actionPill(h.action)}
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "middle", maxWidth: 280 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12.5, fontWeight: isAuto ? 400 : 500, color: isAuto ? C.muted : C.ink, whiteSpace: "nowrap" }}>
                              {isAuto ? "系统自动" : h.actor}
                            </span>
                            {h.evidence && h.evidence.rules.map((rule) => {
                              const metric = rule === "referral_abuse"
                                ? `推荐 ${h.evidence.snap.referralCount} · 活跃率 ${h.evidence.snap.activeRate}%`
                                : rule === "low_tr" ? `TR ${h.evidence.snap.tr}` : null;
                              return (
                                <span key={rule} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 500,
                                  background: rule === "referral_abuse" ? C.amberBg : C.blueBg,
                                  color: rule === "referral_abuse" ? C.amber : C.blue,
                                  border: `1px solid ${rule === "referral_abuse" ? C.amberLn : C.blueLn}`,
                                  borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>
                                  {RULE_LABEL[rule]}
                                  {metric && <><span style={{ color: C.muted, margin: "0 2px" }}>·</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{metric}</span></>}
                                </span>
                              );
                            })}
                          </div>
                          {!isAuto && h.note && <div style={{ fontSize: 12, color: C.sub, marginTop: 3, lineHeight: 1.5 }}>{h.note}</div>}
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "middle", textAlign: "right", whiteSpace: "nowrap" }}>
                          <button style={{ border: `1px solid ${C.line2}`, background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 13, color: C.sub, padding: "1px 7px", lineHeight: 1.4 }}>···</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 20px", fontSize: 11.5, color: C.muted }}>仅追加日志 · 记录每一次审批动作与最终生效结果，不可编辑或删除。</div>
          </>
        ) : null}
      </div>

      {modal && (
        <Overlay onClose={() => setModal(null)}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            {modal.action === "APPROVED" ? "通过此变更？" : "驳回此变更？"}
          </div>
          <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 14, lineHeight: 1.6 }}>
            <b style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>{modal.req.userId}</b>
            {modal.action !== "APPROVED" ? " · 申请将被驳回，无变更。"
              : modal.req.changeType === "POINTS_CHANGE"
                ? <> · 将调整积分 <b style={{ color: modal.req.pointsDelta > 0 ? C.green : C.red }}>{modal.req.pointsDelta > 0 ? `+${modal.req.pointsDelta}` : modal.req.pointsDelta}</b>，立即生效。</>
              : modal.req.changeType === "BAN"
                ? <> · 将封禁用户，当前角色 <b>{modal.req.fromRole}</b>，立即生效。</>
              : <> · 将从 <b>{modal.req.fromRole}</b> {modal.req.changeType === "RESTORE" ? "恢复" : "降级"}至 <b>{modal.req.toRole}</b>，立即生效。</>}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={modal.action === "REJECTED" ? "驳回原因（必填）" : "备注（可选）"}
            style={{ width: "100%", boxSizing: "border-box", minHeight: 64,background: "#fff",resize: "vertical", fontSize: 13, padding: 10, border: `1px solid ${C.line2}`, borderRadius: 8, outline: "none", color: C.ink }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
            <button className="act" onClick={() => setModal(null)} style={ghostBtn}>取消</button>
            <button className="act" disabled={modal.action === "REJECTED" && !note.trim()} onClick={confirm}
              style={{ ...solidBtn, opacity: modal.action === "REJECTED" && !note.trim() ? 0.45 : 1,
                cursor: modal.action === "REJECTED" && !note.trim() ? "not-allowed" : "pointer",
                background: modal.action === "APPROVED" ? C.green : C.amber }}>
              确认{modal.action === "APPROVED" ? "通过" : "驳回"}
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