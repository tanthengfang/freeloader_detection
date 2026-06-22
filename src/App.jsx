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

const now = () => {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const seedRequests = [
  { id: "REQ-1048", userId: "U-1A0F8", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    pointsDelta: -280, source: "MANUAL", proposer: "alice",
    reason: "客服核实疑似多人共享账号，先降级观察。",
    reasonEn: "Customer service confirmed suspected account sharing; downgrading for observation.",
    evidence: null, createdAt: "2026-06-17 16:40" },

  { id: "REQ-1049", userId: "U-6T3W8", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    pointsDelta: -520, source: "MANUAL", proposer: "bob",
    reason: "退款套利：连续申请退款后仍持续使用积分兑换的会员权益。",
    reasonEn: "Refund arbitrage: continued using membership benefits via points after repeated refund requests.",
    evidence: null, createdAt: "2026-06-17 15:22" },

  { id: "REQ-1050", userId: "U-2C9Y4", changeType: "RESTORE", fromRole: "BASE", toRole: "VIP",
    pointsDelta: 150, source: "MANUAL", proposer: "carol",
    reason: "误降级申诉成立，用户已补充付费凭证，申请恢复 VIP。",
    reasonEn: "Appeal upheld: user provided payment proof for wrongful downgrade, requesting VIP restoration.",
    evidence: null, createdAt: "2026-06-17 11:08" },

  { id: "REQ-1061", userId: "U-4X8Z2", changeType: "BAN", fromRole: "SVIP", toRole: "封禁",
    source: "MANUAL", proposer: "alice",
    reason: "用户大量注册小号刷取推荐奖励，确认为恶意刷量，申请永久封号。",
    reasonEn: "User created mass fake accounts to farm referral rewards; confirmed malicious activity, requesting permanent ban.",
    evidence: null, createdAt: "2026-06-18 10:05" },

  { id: "REQ-1062", userId: "U-7Q3R5", changeType: "BAN", fromRole: "VIP", toRole: "封禁",
    source: "MANUAL", proposer: "bob",
    reason: "多次申诉同一笔退款并成功套现，经财务核实为欺诈行为，建议封号。",
    reasonEn: "Repeatedly disputed the same transaction to cash out; confirmed fraud by finance team, recommending ban.",
    evidence: null, createdAt: "2026-06-18 09:48" },

  { id: "REQ-1063", userId: "U-5N2M8", changeType: "POINTS_CHANGE", pointsDelta: -800,
    source: "MANUAL", proposer: "carol",
    reason: "积分兑换异常：连续利用漏洞以低价兑换高额商品，扣除违规所得积分。",
    reasonEn: "Points abuse: repeatedly exploited a loophole to redeem high-value items at low cost; deducting fraudulent points.",
    evidence: null, createdAt: "2026-06-17 17:30" },

  { id: "REQ-1064", userId: "U-1K6J3", changeType: "POINTS_CHANGE", pointsDelta: 500,
    source: "MANUAL", proposer: "alice",
    reason: "系统故障导致用户积分错误扣减，客服核实后补发差额积分。",
    reasonEn: "System error caused incorrect points deduction; customer service confirmed and requesting top-up of the difference.",
    evidence: null, createdAt: "2026-06-17 14:15" },

  { id: "REQ-1065", userId: "U-6B2C8", changeType: "REFUND", fromRole: "SVIP", toRole: "BASE",
    refundAmount: 299, pointsDeducted: 450, source: "MANUAL", proposer: "alice",
    reason: "用户申请全额退款，已核实消费记录，SVIP 套餐未满一个月。",
    reasonEn: "User requested full refund; verified purchase history — SVIP plan used less than one month.",
    evidence: null, createdAt: "2026-06-18 11:30" },

  { id: "REQ-1066", userId: "U-9D4E7", changeType: "REFUND", fromRole: "VIP", toRole: "BASE",
    refundAmount: 98, pointsDeducted: 120, source: "MANUAL", proposer: "bob",
    reason: "用户投诉服务质量问题，客服协商部分退款。",
    reasonEn: "User complained about service quality; customer service negotiated a partial refund.",
    evidence: null, createdAt: "2026-06-18 10:50" },
];

const seedHistory = [
  { id: "REQ-1051", userId: "U-8F3A2", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    pointsDelta: -380, source: "SYSTEM", proposer: "system",
    reason: "系统自动 · 命中待转化用户规则", reasonEn: "Auto · Matched at-risk user rule",
    evidence: { rules: ["referral_abuse"], snap: { referralCount: 8, activeRate: 6 } },
    action: "APPROVED", actor: "系统 (自动审批)", decidedAt: "2026-06-18 09:12", note: "", applied: "SVIP → BASE" },
  { id: "REQ-1052", userId: "U-5D9E4", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    pointsDelta: -210, source: "SYSTEM", proposer: "system",
    reason: "系统自动 · 命中待转化用户规则", reasonEn: "Auto · Matched at-risk user rule",
    evidence: { rules: ["low_tr"], snap: { tr: 0.62 } },
    action: "APPROVED", actor: "系统 (自动审批)", decidedAt: "2026-06-18 09:12", note: "", applied: "VIP → BASE" },
  { id: "REQ-1053", userId: "U-2B7C1", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    pointsDelta: -510, source: "SYSTEM", proposer: "system",
    reason: "系统自动 · 命中待转化用户规则", reasonEn: "Auto · Matched at-risk user rule",
    evidence: { rules: ["referral_abuse", "low_tr"], snap: { referralCount: 14, activeRate: 4, tr: 0.41 } },
    action: "APPROVED", actor: "系统 (自动审批)", decidedAt: "2026-06-18 09:12", note: "", applied: "SVIP → BASE" },
  { id: "REQ-1057", userId: "U-7H4K2", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    pointsDelta: -290, source: "SYSTEM", proposer: "system",
    reason: "系统自动 · 命中待转化用户规则", reasonEn: "Auto · Matched at-risk user rule",
    evidence: { rules: ["referral_abuse"], snap: { referralCount: 21, activeRate: 2 } },
    action: "APPROVED", actor: "系统 (自动审批)", decidedAt: "2026-06-18 09:12", note: "", applied: "SVIP → BASE" },
  { id: "REQ-1058", userId: "U-9X1V5", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    pointsDelta: -175, source: "SYSTEM", proposer: "system",
    reason: "系统自动 · 命中待转化用户规则", reasonEn: "Auto · Matched at-risk user rule",
    evidence: { rules: ["referral_abuse"], snap: { referralCount: 7, activeRate: 9 } },
    action: "APPROVED", actor: "系统 (自动审批)", decidedAt: "2026-06-18 09:12", note: "", applied: "VIP → BASE" },
  { id: "REQ-1039", userId: "U-7K2P1", changeType: "DOWNGRADE", fromRole: "SVIP", toRole: "BASE",
    pointsDelta: -340, source: "SYSTEM", proposer: "system",
    reason: "系统自动 · 命中待转化用户规则", reasonEn: "Auto · Matched at-risk user rule",
    evidence: { rules: ["low_tr"], snap: { tr: 0.55 } },
    action: "APPROVED", actor: "系统 (自动审批)", decidedAt: "2026-06-16 11:20", note: "", applied: "SVIP → BASE" },
  { id: "REQ-1041", userId: "U-3F8Q1", changeType: "RESTORE", fromRole: "BASE", toRole: "VIP",
    pointsDelta: 200, source: "MANUAL", proposer: "carol",
    reason: "凭证核实，恢复角色。", reasonEn: "Credentials verified, role restored.",
    action: "APPROVED", actor: "alice", decidedAt: "2026-06-16 09:15",
    note: "凭证齐全，同意恢复。", noteEn: "Credentials complete, restoration approved.", applied: "BASE → VIP" },
  { id: "REQ-1037", userId: "U-8L2M6", changeType: "DOWNGRADE", fromRole: "VIP", toRole: "BASE",
    pointsDelta: -190, source: "MANUAL", proposer: "carol",
    reason: "疑似异常流量。", reasonEn: "Suspected abnormal traffic.",
    action: "REJECTED", actor: "bob", decidedAt: "2026-06-15 14:30",
    note: "未达流量透支阈值，证据不足，退回。", noteEn: "Below the traffic abuse threshold; insufficient evidence, returned.", applied: "无变更" },
  { id: "REQ-1055", userId: "U-5P2Q9", changeType: "BAN", fromRole: "SVIP", toRole: "封禁",
    source: "MANUAL", proposer: "alice",
    reason: "确认恶意刷量，申请封号。", reasonEn: "Confirmed malicious activity, requesting ban.",
    action: "APPROVED", actor: "bob", decidedAt: "2026-06-15 11:20",
    note: "证据充分，已封禁。", noteEn: "Sufficient evidence; ban applied.", applied: "已封禁" },
  { id: "REQ-1056", userId: "U-8N4K1", changeType: "POINTS_CHANGE", pointsDelta: -1200,
    source: "MANUAL", proposer: "bob",
    reason: "利用积分兑换漏洞套利，扣除违规积分。", reasonEn: "Exploited points redemption loophole for arbitrage; deducting fraudulent points.",
    action: "APPROVED", actor: "alice", decidedAt: "2026-06-14 16:00",
    note: "核实属实，扣除。", noteEn: "Verified; points deducted.", applied: "积分 -1200" },
  { id: "REQ-1054", userId: "U-3W7V2", changeType: "POINTS_CHANGE", pointsDelta: 300,
    source: "MANUAL", proposer: "carol",
    reason: "活动奖励补发，系统漏发。", reasonEn: "Missed campaign reward reissue due to system error.",
    action: "REJECTED", actor: "alice", decidedAt: "2026-06-13 10:45",
    note: "活动已截止，不予补发。", noteEn: "Campaign has ended; reissue denied.", applied: "无变更" },
  { id: "REQ-1060", userId: "U-3A5B9", changeType: "REFUND", fromRole: "VIP", toRole: "BASE",
    refundAmount: 198, pointsDeducted: 300, source: "MANUAL", proposer: "carol",
    reason: "用户申请退款，核实有效，VIP 套餐未使用满 7 天。", reasonEn: "User requested refund; verified valid — VIP plan used less than 7 days.",
    action: "APPROVED", actor: "alice", decidedAt: "2026-06-17 15:00",
    note: "退款审核通过。", noteEn: "Refund approved.", applied: "退款 ¥198" },
  { id: "REQ-1059", userId: "U-7G1H4", changeType: "REFUND", fromRole: "SVIP", toRole: "BASE",
    refundAmount: 388, pointsDeducted: 600, source: "MANUAL", proposer: "bob",
    reason: "用户申请全额退款，已超出退款有效期。", reasonEn: "User requested full refund; exceeded the refund eligibility window.",
    action: "REJECTED", actor: "bob", decidedAt: "2026-06-16 14:20",
    note: "超出退款期限，不予受理。", noteEn: "Exceeded refund period; request declined.", applied: "无变更" },
];

function Pill({ children, fg, bg, ln, mono }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
      color: fg, background: bg, border: `1px solid ${ln}`, borderRadius: 999, padding: "2px 9px",
      whiteSpace: "nowrap", fontVariantNumeric: mono ? "tabular-nums" : "normal" }}>{children}</span>
  );
}

function RoleArrow({ from, to, lang }) {
  const displayTo = to === "封禁" && lang === "en" ? "Banned" : to;
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 13, color: C.ink }}>
      <b style={{ fontWeight: 600, color: from === "BASE" ? C.muted : C.ink }}>{from}</b>
      <span style={{ color: C.muted, margin: "0 5px" }}>→</span>
      <b style={{ fontWeight: 600, color: to === "BASE" ? C.muted : to === "封禁" ? C.red : C.ink }}>{displayTo}</b>
    </span>
  );
}

const COLS_BASE  = "28px 110px 220px 120px minmax(140px,1fr) 126px 196px";
const COLS_BATCH = "20px 28px 110px 220px 120px minmax(140px,1fr) 126px 196px";

export default function RoleChangeApproval() {
  const [requests, setRequests] = useState(seedRequests);
  const [history, setHistory] = useState(seedHistory);
  const [tab, setTab] = useState("pending");
  const [typ, setTyp] = useState("ALL");
  const [q, setQ] = useState("");
  const [hTyp, setHTyp] = useState("ALL");
  const [hAction, setHAction] = useState("ALL");
  const [hActor, setHActor] = useState("ALL");
  const [hQ, setHQ] = useState("");
  const [open, setOpen] = useState({});
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [batchModal, setBatchModal] = useState(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState(null);
  const [lang, setLang] = useState("zh");

  const t = (zh, en) => lang === "en" ? en : zh;

  const RULE_LABEL = {
    referral_abuse: t("推荐滥用", "Referral Abuse"),
    low_tr: t("流量透支", "Low TR"),
  };

  const typePill = (type) =>
    (type === "DOWNGRADE" || type === "RESTORE") ? <Pill fg={C.amber} bg={C.amberBg} ln={C.amberLn}>{t("等级更换", "Level Change")}</Pill>
    : type === "BAN" ? <Pill fg={C.red} bg={C.redBg} ln={C.redLn}>{t("封禁", "Ban")}</Pill>
    : type === "POINTS_CHANGE" ? <Pill fg={C.blue} bg={C.blueBg} ln={C.blueLn}>{t("积分更换", "Points Change")}</Pill>
    : type === "REFUND" ? <Pill fg={C.violet} bg={C.violetBg} ln={C.violetLn}>{t("退款", "Refund")}</Pill>
    : <Pill fg={C.slate} bg={C.slateBg} ln={C.slateLn}>{type}</Pill>;

  const actionPill = (a) => a === "APPROVED"
    ? <Pill fg={C.green} bg={C.greenBg} ln={C.greenLn}>{t("已通过", "Approved")}</Pill>
    : a === "REJECTED" ? <Pill fg={C.amber} bg={C.amberBg} ln={C.amberLn}>{t("已驳回", "Rejected")}</Pill>
    : <Pill fg={C.blue} bg={C.blueBg} ln={C.blueLn}>{t("已加白", "Whitelisted")}</Pill>;

  const keyLabel = {
    LEVEL: t("等级更换", "Level Change"),
    BAN: t("封禁", "Ban"),
    POINTS_CHANGE: t("积分更换", "Points Change"),
    REFUND: t("退款", "Refund"),
  };

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const pending = useMemo(() => requests.filter((r) =>
    (typ === "ALL" ||
     (typ === "LEVEL_CHANGE" && (r.changeType === "DOWNGRADE" || r.changeType === "RESTORE")) ||
     r.changeType === typ) &&
    (!q || r.userId.toLowerCase().includes(q.toLowerCase()))
  ), [requests, typ, q]);

  const hist = useMemo(() => history.filter((h) =>
    (hTyp === "ALL" ||
     (hTyp === "LEVEL_CHANGE" && (h.changeType === "DOWNGRADE" || h.changeType === "RESTORE")) ||
     h.changeType === hTyp) &&
    (hAction === "ALL" || h.action === hAction) &&
    (hActor === "ALL" ||
     (hActor === "SYSTEM" && h.actor === "系统 (自动审批)") ||
     (hActor === "HUMAN" && h.actor !== "系统 (自动审批)")) &&
    (!hQ || h.userId.toLowerCase().includes(hQ.toLowerCase()))
  ), [history, hTyp, hAction, hActor, hQ]);

  const counts = useMemo(() => ({ total: requests.length }), [requests]);

  function ask(action, req) { setNote(""); setModal({ action, req }); }

  function confirmBatch() {
    const { action } = batchModal;
    const ts = now();
    const toProcess = requests.filter((r) => selected.has(r.id));
    const entries = toProcess.map((req) => {
      const applied = action !== "APPROVED" ? t("无变更", "No change")
        : req.changeType === "POINTS_CHANGE" ? `${t("积分", "Pts")} ${req.pointsDelta > 0 ? "+" : ""}${req.pointsDelta}`
        : req.changeType === "BAN" ? t("已封禁", "Banned")
        : req.changeType === "REFUND" ? `${t("退款", "Refund")} ¥${req.refundAmount}`
        : `${req.fromRole} → ${req.toRole}`;
      return { ...req, action, actor: t("你 (当前管理员)", "You (current admin)"), decidedAt: ts, note: note.trim(), applied };
    });
    setHistory((h) => [...entries, ...h]);
    setRequests((rs) => rs.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
    setBatchModal(null);
    setNote("");
    flash(action === "APPROVED"
      ? t(`已批量通过 ${entries.length} 项变更`, `${entries.length} changes batch approved`)
      : t(`已批量驳回 ${entries.length} 项变更`, `${entries.length} changes batch rejected`));
  }

  function confirm() {
    const { action, req } = modal;
    const applied = action !== "APPROVED" ? t("无变更", "No change")
      : req.changeType === "POINTS_CHANGE" ? `${t("积分", "Pts")} ${req.pointsDelta > 0 ? "+" : ""}${req.pointsDelta}`
      : req.changeType === "BAN" ? t("已封禁", "Banned")
      : req.changeType === "REFUND" ? `${t("退款", "Refund")} ¥${req.refundAmount}`
      : `${req.fromRole} → ${req.toRole}`;
    setHistory((h) => [{ ...req, action, actor: t("你 (当前管理员)", "You (current admin)"), decidedAt: now(), note: note.trim(), applied }, ...h]);
    setRequests((rs) => rs.filter((r) => r.id !== req.id));
    setModal(null);
    flash(action !== "APPROVED"
      ? t(`已驳回 · ${req.userId} 无变更`, `Rejected · ${req.userId} no change`)
      : req.changeType === "POINTS_CHANGE"
        ? t(`已通过 · ${req.userId} 积分 ${req.pointsDelta > 0 ? "+" : ""}${req.pointsDelta}`, `Approved · ${req.userId} pts ${req.pointsDelta > 0 ? "+" : ""}${req.pointsDelta}`)
      : req.changeType === "BAN"
        ? t(`已通过 · ${req.userId} 已封禁`, `Approved · ${req.userId} banned`)
      : req.changeType === "REFUND"
        ? t(`已通过 · ${req.userId} 退款 ¥${req.refundAmount}，已降级至 BASE`, `Approved · ${req.userId} refund ¥${req.refundAmount}, downgraded to BASE`)
      : t(`已通过 · ${req.userId} ${req.changeType === "RESTORE" ? "已恢复至" : "已降级至"} ${req.toRole}`,
          `Approved · ${req.userId} ${req.changeType === "RESTORE" ? "restored to" : "downgraded to"} ${req.toRole}`));
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
        input[type=checkbox]{appearance:none;-webkit-appearance:none;width:14px;height:14px;border:1.5px solid #d1d5db;border-radius:3px;background:#fff;cursor:pointer;position:relative;flex-shrink:0;vertical-align:middle}
        input[type=checkbox]:checked{background:${C.blue};border-color:${C.blue}}
        input[type=checkbox]:checked::after{content:'';position:absolute;left:3.5px;top:0.5px;width:4px;height:8px;border:2px solid #fff;border-left:none;border-top:none;transform:rotate(45deg)}
      `}</style>

      <div style={{ width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", boxSizing: "border-box" }}>
        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {t("角色变更审批台", "Role Change Console")}
            </div>
            <button
              onClick={() => setLang((l) => l === "zh" ? "en" : "zh")}
              style={{ cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: "5px 12px",
                borderRadius: 7, border: `1px solid ${C.line2}`, background: "#fff", color: C.sub,
                whiteSpace: "nowrap", flexShrink: 0, marginTop: 2, transition: "all .15s" }}>
              {lang === "zh" ? "EN" : "中文"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 22, marginTop: 16, borderBottom: `1px solid ${C.line}` }}>
            {[
              ["pending", t(`待审批 (${counts.total})`, `Pending (${counts.total})`)],
              ["history", t("历史日志", "History Log")]
            ].map(([k, l]) => (
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
                <span style={{ fontSize: 12, color: C.muted }}>{t("类型", "Type")}</span>
                <Seg value={typ} set={setTyp} opts={[
                  { v: "ALL", l: t("全部", "All") },
                  { v: "LEVEL_CHANGE", l: t("等级更换", "Level Change") },
                  { v: "BAN", l: t("封禁", "Ban") },
                  { v: "POINTS_CHANGE", l: t("积分更换", "Points Change") },
                  { v: "REFUND", l: t("退款", "Refund") }
                ]} />
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("搜索用户名", "Search user")}
                  style={{ fontSize: 13, padding: "7px 11px", border: `1px solid ${C.line2}`, borderRadius: 8, background: "white", width: 160, outline: "none", color: C.ink }} />
                <button onClick={() => { setBatchMode((b) => { if (b) setSelected(new Set()); return !b; }); }}
                  style={{ cursor: "pointer", fontFamily: FONT, fontSize: 12.5, fontWeight: 600, padding: "7px 13px", borderRadius: 8,
                    border: `1px solid ${batchMode ? C.blue : C.line2}`, background: batchMode ? C.blue : "#fff",
                    color: batchMode ? "#fff" : C.sub, whiteSpace: "nowrap", transition: "all .15s" }}>
                  {t("批量操作", "Batch")}
                </button>
              </div>
            </div>

            {batchMode && selected.size > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", background: C.blueBg, borderTop: `1px solid ${C.blueLn}`, borderBottom: `1px solid ${C.blueLn}` }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.blue }}>
                  {t(`已选 ${selected.size} 项`, `${selected.size} selected`)}
                </span>
                <ActBtn onClick={() => { setNote(""); setBatchModal({ action: "APPROVED" }); }} fg={C.green} bg={C.greenBg} ln={C.greenLn}>
                  {t("批量通过", "Batch Approve")}
                </ActBtn>
                <ActBtn onClick={() => { setNote(""); setBatchModal({ action: "REJECTED" }); }} fg={C.amber} bg={C.amberBg} ln={C.amberLn}>
                  {t("批量驳回", "Batch Reject")}
                </ActBtn>
                <button onClick={() => setSelected(new Set())} style={{ marginLeft: "auto", border: "none", background: "none", cursor: "pointer", fontSize: 12.5, color: C.muted }}>
                  {t("取消选择", "Deselect all")}
                </button>
              </div>
            )}

            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: batchMode ? 920 : 900 }}>
                <div style={{ display: "grid", gridTemplateColumns: batchMode ? COLS_BATCH : COLS_BASE, gap: 10, padding: "9px 20px",
                  borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, fontSize: 11.5, color: C.muted, fontWeight: 600 }}>
                  {batchMode && (
                    <div>
                      <input type="checkbox"
                        checked={pending.length > 0 && pending.every((r) => selected.has(r.id))}
                        onChange={(e) => setSelected(e.target.checked ? new Set(pending.map((r) => r.id)) : new Set())} />
                    </div>
                  )}
                  <div></div>
                  <div>{t("用户", "User")}</div>
                  <div>{t("变更", "Change")}</div>
                  <div>{t("发起人", "Proposer")}</div>
                  <div>{t("原因", "Reason")}</div>
                  <div>{t("发起时间", "Time")}</div>
                  <div style={{ textAlign: "center" }}>{t("操作", "Action")}</div>
                </div>

                {pending.length === 0 && (
                  <div style={{ padding: "44px 20px", textAlign: "center", color: C.muted, fontSize: 13 }}>
                    {t(
                      <span>没有待审批的变更。系统检测到 <b style={{ color: C.sub }}>待转化用户</b> 时会在此生成降级申请。</span>,
                      <span>No pending changes. Downgrade requests are auto-generated when <b style={{ color: C.sub }}>at-risk users</b> are detected.</span>
                    )}
                  </div>
                )}

                {pending.map((r) => {
                  return (
                    <div key={r.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <div className="row" style={{ display: "grid", gridTemplateColumns: batchMode ? COLS_BATCH : COLS_BASE, gap: 10, padding: "13px 20px", alignItems: "center", background: selected.has(r.id) ? "#f0f7ff" : undefined }}>
                        {batchMode && (
                          <div>
                            <input type="checkbox"
                              checked={selected.has(r.id)}
                              onChange={(e) => setSelected((s) => { const n = new Set(s); e.target.checked ? n.add(r.id) : n.delete(r.id); return n; })} />
                          </div>
                        )}
                        <div className="lk" onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}
                          style={{ color: C.muted, fontSize: 12, userSelect: "none", transform: open[r.id] ? "rotate(90deg)" : "none", transition: "transform .12s" }}></div>
                        <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.userId}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {typePill(r.changeType)}
                          {r.changeType === "POINTS_CHANGE"
                            ? <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: r.pointsDelta > 0 ? C.green : C.red }}>{r.pointsDelta > 0 ? `+${r.pointsDelta}` : r.pointsDelta} {t("积分", "pts")}</span>
                            : r.changeType === "REFUND"
                              ? <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: C.violet }}>¥{r.refundAmount}</span>
                              : <RoleArrow from={r.fromRole} to={r.toRole} lang={lang} />}
                        </div>
                        <div style={{ fontSize: 12.5, color: C.sub }}>{r.proposer}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", overflow: "hidden" }}>
                          <span style={{ fontSize: 12.5, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 1, minWidth: 0 }} title={lang === "en" ? (r.reasonEn || r.reason) : r.reason}>{lang === "en" ? (r.reasonEn || r.reason) : r.reason}</span>
                          {r.source === "SYSTEM" && r.evidence && r.evidence.rules.map((rule) => {
                            const metric = rule === "referral_abuse"
                              ? t(`推荐 ${r.evidence.snap.referralCount} · 活跃率 ${r.evidence.snap.activeRate}%`, `Ref ${r.evidence.snap.referralCount} · Act.Rate ${r.evidence.snap.activeRate}%`)
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
                          <ActBtn onClick={() => ask("APPROVED", r)} fg={C.green} bg={C.greenBg} ln={C.greenLn}>{t("通过", "Approve")}</ActBtn>
                          <ActBtn onClick={() => ask("REJECTED", r)} fg={C.amber} bg={C.amberBg} ln={C.amberLn}>{t("驳回", "Reject")}</ActBtn>
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
                <span style={{ fontSize: 12, color: C.muted }}>{t("类型", "Type")}</span>
                <Seg value={hTyp} set={setHTyp} opts={[
                  { v: "ALL", l: t("全部", "All") },
                  { v: "LEVEL_CHANGE", l: t("等级更换", "Level Change") },
                  { v: "BAN", l: t("封禁", "Ban") },
                  { v: "POINTS_CHANGE", l: t("积分更换", "Points Change") },
                  { v: "REFUND", l: t("退款", "Refund") }
                ]} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.muted }}>{t("动作", "Action")}</span>
                <Seg value={hAction} set={setHAction} opts={[
                  { v: "ALL", l: t("全部", "All") },
                  { v: "APPROVED", l: t("通过", "Approved") },
                  { v: "REJECTED", l: t("驳回", "Rejected") }
                ]} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.muted }}>{t("审批人", "Approver")}</span>
                <Seg value={hActor} set={setHActor} opts={[
                  { v: "ALL", l: t("全部", "All") },
                  { v: "SYSTEM", l: t("系统", "System") },
                  { v: "HUMAN", l: t("人工", "Human") }
                ]} />
              </div>
              <div style={{ marginLeft: "auto" }}>
                <input value={hQ} onChange={(e) => setHQ(e.target.value)} placeholder={t("搜索用户名", "Search user")}
                  style={{ fontSize: 13, padding: "7px 11px", border: `1px solid ${C.line2}`, borderRadius: 8, background: "white", width: 160, outline: "none", color: C.ink }} />
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${C.line}`, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr style={{ background: "#fafafa", borderBottom: `1px solid ${C.line}` }}>
                    {[t("时间","Time"), t("用户","User"), t("变更","Change"), t("动作","Action"), t("审批人","Approver"), ""].map((h, i) => (
                      <th key={i} style={{ textAlign: "left", fontSize: 11.5, fontWeight: 600, color: C.muted, padding: "9px 16px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hist.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: "44px 20px", textAlign: "center", color: C.muted, fontSize: 13 }}>{t("暂无记录。", "No records.")}</td></tr>
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
                          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>{t("发起：", "By:")} {h.proposer}</div>
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                          {h.changeType === "POINTS_CHANGE"
                            ? <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: h.pointsDelta > 0 ? C.green : C.red }}>{h.pointsDelta > 0 ? `+${h.pointsDelta}` : h.pointsDelta} {t("积分", "pts")}</span>
                            : h.changeType === "REFUND" && h.action === "APPROVED"
                              ? <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                  <span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: C.violet }}>{t("退款", "Refund")} ¥{h.refundAmount}</span>
                                  <RoleArrow from={h.fromRole} to={h.toRole} lang={lang} />
                                  <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: C.red }}>−{h.pointsDeducted} {t("积分", "pts")}</span>
                                </div>
                              : (h.changeType === "DOWNGRADE" || h.changeType === "RESTORE") && h.pointsDelta != null
                                ? <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                    <RoleArrow from={h.fromRole} to={h.toRole} lang={lang} />
                                    <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: h.pointsDelta > 0 ? C.green : C.red }}>
                                      {h.pointsDelta > 0 ? `+${h.pointsDelta}` : h.pointsDelta} {t("积分", "pts")}
                                    </span>
                                  </div>
                                : <RoleArrow from={h.fromRole} to={h.toRole} lang={lang} />}
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                          {actionPill(h.action)}
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "middle", maxWidth: 280 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12.5, fontWeight: isAuto ? 400 : 500, color: isAuto ? C.muted : C.ink, whiteSpace: "nowrap" }}>
                              {isAuto ? t("系统自动", "Auto") : h.actor}
                            </span>
                            {h.evidence && h.evidence.rules.map((rule) => {
                              const metric = rule === "referral_abuse"
                                ? t(`推荐 ${h.evidence.snap.referralCount} · 活跃率 ${h.evidence.snap.activeRate}%`, `Ref ${h.evidence.snap.referralCount} · Act.Rate ${h.evidence.snap.activeRate}%`)
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
                          {!isAuto && h.note && <div style={{ fontSize: 12, color: C.sub, marginTop: 3, lineHeight: 1.5 }}>{lang === "en" ? (h.noteEn || h.note) : h.note}</div>}
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
            <div style={{ padding: "12px 20px", fontSize: 11.5, color: C.muted }}>
              {t("仅追加日志 · 记录每一次审批动作与最终生效结果，不可编辑或删除。", "Append-only log · Records every approval action and final outcome. Cannot be edited or deleted.")}
            </div>
          </>
        ) : null}
      </div>

      {batchModal && (() => {
        const toProcess = requests.filter((r) => selected.has(r.id));
        const breakdown = toProcess.reduce((acc, r) => {
          const key = (r.changeType === "DOWNGRADE" || r.changeType === "RESTORE") ? "LEVEL" : r.changeType;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        const colMap = { LEVEL: { fg: C.amber, bg: C.amberBg, ln: C.amberLn }, BAN: { fg: C.red, bg: C.redBg, ln: C.redLn }, POINTS_CHANGE: { fg: C.blue, bg: C.blueBg, ln: C.blueLn }, REFUND: { fg: C.violet, bg: C.violetBg, ln: C.violetLn } };
        const hasBan = !!breakdown.BAN;
        return (
          <Overlay onClose={() => setBatchModal(null)}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
              {batchModal.action === "APPROVED" ? t("批量通过变更？", "Batch approve changes?") : t("批量驳回变更？", "Batch reject changes?")}
            </div>
            <div style={{ background: "#f9fafb", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 600 }}>
                {t(`共 ${toProcess.length} 项`, `${toProcess.length} items total`)}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(breakdown).map(([key, count]) => {
                  const col = colMap[key] || { fg: C.slate, bg: C.slateBg, ln: C.slateLn };
                  return (
                    <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600,
                      color: col.fg, background: col.bg, border: `1px solid ${col.ln}`, borderRadius: 8, padding: "4px 10px" }}>
                      {count} {keyLabel[key] || key}
                    </span>
                  );
                })}
              </div>
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={batchModal.action === "REJECTED" ? t("驳回原因（必填）", "Rejection reason (required)") : t("备注（可选）", "Note (optional)")}
              style={{ width: "100%", boxSizing: "border-box", minHeight: 64, background: "#fff", resize: "vertical", fontSize: 13, padding: 10, border: `1px solid ${C.line2}`, borderRadius: 8, outline: "none", color: C.ink }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button className="act" onClick={() => setBatchModal(null)} style={ghostBtn}>{t("取消", "Cancel")}</button>
              <button className="act" disabled={batchModal.action === "REJECTED" && !note.trim()} onClick={confirmBatch}
                style={{ ...solidBtn, opacity: batchModal.action === "REJECTED" && !note.trim() ? 0.45 : 1,
                  cursor: batchModal.action === "REJECTED" && !note.trim() ? "not-allowed" : "pointer",
                  background: batchModal.action === "APPROVED" ? C.green : C.amber }}>
                {batchModal.action === "APPROVED" ? t("确认通过", "Confirm Approve") : t("确认驳回", "Confirm Reject")}
              </button>
            </div>
          </Overlay>
        );
      })()}

      {modal && (
        <Overlay onClose={() => setModal(null)}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            {modal.action === "APPROVED" ? t("通过此变更？", "Approve this change?") : t("驳回此变更？", "Reject this change?")}
          </div>
          <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 14, lineHeight: 1.6 }}>
            <b style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>{modal.req.userId}</b>
            {modal.action !== "APPROVED"
              ? t(" · 申请将被驳回，无变更。", " · Request will be rejected, no change.")
              : modal.req.changeType === "POINTS_CHANGE"
                ? <> · {t("将调整积分", "Points will be adjusted")} <b style={{ color: modal.req.pointsDelta > 0 ? C.green : C.red }}>{modal.req.pointsDelta > 0 ? `+${modal.req.pointsDelta}` : modal.req.pointsDelta}</b>{t("，立即生效。", ", effective immediately.")}</>
              : modal.req.changeType === "BAN"
                ? <> · {t("将封禁用户，当前角色", "User will be banned, current role")} <b>{modal.req.fromRole}</b>{t("，立即生效。", ", effective immediately.")}</>
              : modal.req.changeType === "REFUND"
                ? <> · {t("退款", "Refund")} <b style={{ color: C.violet }}>¥{modal.req.refundAmount}</b>{t("，同时扣除", ", deduct")} <b>{modal.req.pointsDeducted} {t("积分", "pts")}</b>{t("，角色降至", ", role downgraded to")} <b>BASE</b>{t("，立即生效。", ", effective immediately.")}</>
              : <> · {t("将从", "Role will change from")} <b>{modal.req.fromRole}</b> {modal.req.changeType === "RESTORE" ? t("恢复至", "restored to") : t("降级至", "downgraded to")} <b>{modal.req.toRole}</b>{t("，立即生效。", ", effective immediately.")}</>}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={modal.action === "REJECTED" ? t("驳回原因（必填）", "Rejection reason (required)") : t("备注（可选）", "Note (optional)")}
            style={{ width: "100%", boxSizing: "border-box", minHeight: 64, background: "#fff", resize: "vertical", fontSize: 13, padding: 10, border: `1px solid ${C.line2}`, borderRadius: 8, outline: "none", color: C.ink }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
            <button className="act" onClick={() => setModal(null)} style={ghostBtn}>{t("取消", "Cancel")}</button>
            <button className="act" disabled={modal.action === "REJECTED" && !note.trim()} onClick={confirm}
              style={{ ...solidBtn, opacity: modal.action === "REJECTED" && !note.trim() ? 0.45 : 1,
                cursor: modal.action === "REJECTED" && !note.trim() ? "not-allowed" : "pointer",
                background: modal.action === "APPROVED" ? C.green : C.amber }}>
              {modal.action === "APPROVED" ? t("确认通过", "Confirm Approve") : t("确认驳回", "Confirm Reject")}
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
