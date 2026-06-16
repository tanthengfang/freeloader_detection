import { useState, useMemo, Fragment } from "react";
import {
  ChevronRight, Search, RefreshCw, AlertTriangle, ShieldCheck,
  ArrowDownCircle, Ban, Clock, Flag, PlusCircle, RotateCcw,
  Layers, ScrollText, Check, User, Info, XCircle,
} from "lucide-react";

const FONT = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif';
const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace';

/* 规则元信息（命中明细/chip 用，权重统一为 1 → 分 = 命中规则数） */
const RULES = {
  redeem_abuse: { name: "兑换透支" },
  low_tr: { name: "流量透支" },
  chargeback_abuse: { name: "拒付滥用" },
};

const RISK = {
  critical: { label: "高风险", bg: "#FCEBEB", fg: "#A32D2D", dot: "#E24B4A" },
  observe: { label: "观察", bg: "#E6F1FB", fg: "#185FA5", dot: "#378ADD" },
};
const scoreToRisk = (s) => (s >= 2 ? "critical" : "observe");

const STATUS = {
  pending: { label: "待审核", bg: "#F1EFE8", fg: "#5F5E5A" },
  recurred: { label: "复发", bg: "#FAECE7", fg: "#993C1D" },
  approved: { label: "白名单", bg: "#E1F5EE", fg: "#0F6E56" },
  actioned: { label: "已处置", bg: "#F3E9E9", fg: "#791F1F" },
};

const EVT = {
  approved: { fg: "#0F6E56", bg: "#E1F5EE", icon: ShieldCheck, label: "通过" },
  approved_temp: { fg: "#0F6E56", bg: "#E1F5EE", icon: Clock, label: "暂时白名单" },
  approved_perm: { fg: "#0a5240", bg: "#d6f0e8", icon: ShieldCheck, label: "永久白名单" },
  recurred: { fg: "#993C1D", bg: "#FAECE7", icon: RotateCcw, label: "复发" },
  actioned_downgrade: { fg: "#854F0B", bg: "#FAEEDA", icon: ArrowDownCircle, label: "降级" },
  actioned_ban: { fg: "#A32D2D", bg: "#FCEBEB", icon: Ban, label: "封号" },
  actioned: { fg: "#A32D2D", bg: "#FCEBEB", icon: Ban, label: "处置" },
};

const SEED = [
  {
    id: "U-8F3A2", status: "actioned", resolution: "封号", firstHit: "2026-06-09", recur: 0, reviewer: "alice", reviewedAt: "2026-06-09",
    hits: [{ rule: "redeem_abuse", at: "2026-06-09", snap: { 兑换成本: "¥78", 净充值: "¥50", 差额: "+¥28" } }],
    events: [
      { kind: "actioned_ban", at: "2026-06-09 09:12", by: "alice", desc: "封号 · 理由：历史多次套利记录，情节严重" },
    ],
  },
  {
    id: "U-5D9E4", status: "pending", firstHit: "2026-06-08", recur: 0, reviewer: null, reviewedAt: null,
    hits: [
      { rule: "redeem_abuse", at: "2026-06-08", snap: { 兑换成本: "¥45", 净充值: "¥30", 差额: "+¥15" } },
      { rule: "low_tr", at: "2026-06-09", snap: { TR: "0.62", 累计流量: "480 GB", 净充值: "¥30" } },
    ],
    events: [
      { kind: "flagged", at: "2026-06-08 09:12", by: "系统", desc: "命中 兑换透支 · 分 1 · 观察" },
      { kind: "hit_added", at: "2026-06-09 03:00", by: "系统", desc: "新增命中 流量透支 · 分 1→2 · 观察→风险 · 同一案例原地更新，未新增案例行", hot: true },
    ],
  },
  {
    id: "U-2B7C1", status: "recurred", firstHit: "2026-03-01", recur: 2, reviewer: "alice", reviewedAt: "2026-03-05",
    baseline: { at: "2026-04-22", score: 2, hitsLabel: "兑换透支 + 流量透支", until: "2026-07-21" },
    hits: [
      { rule: "redeem_abuse", at: "2026-03-01", snap: { 兑换成本: "¥120", 净充值: "¥60", 差额: "+¥60" } },
      { rule: "low_tr", at: "2026-04-19", snap: { TR: "0.58", 累计流量: "540 GB", 净充值: "¥60" } },
    ],
    events: [
      { kind: "approved_temp", at: "2026-03-05 10:02", by: "alice", desc: "白名单 90 天 · 至 2026-06-03 · 理由：初次违规，给予观察期" },
      { kind: "approved_temp", at: "2026-04-22 11:30", by: "bob", desc: "白名单 90 天 · 至 2026-07-21 · 理由：用户申诉，暂时保留会员资格" },
      { kind: "actioned_downgrade", at: "2026-06-10 08:30", by: "alice", desc: "降级至BASE · 理由：持续套利，降至最低档" },
      { kind: "actioned_ban", at: "2026-06-12 14:00", by: "alice", desc: "封号 · 理由：多次复发且降级后仍持续套利" },
    ],
  },
  {
    id: "U-1A0F8", status: "recurred", firstHit: "2026-05-12", recur: 1, reviewer: "bob", reviewedAt: "2026-05-15",
    baseline: { at: "2026-05-15", score: 1, hitsLabel: "流量透支 · TR 0.95", until: "2026-08-13" },
    hits: [{ rule: "low_tr", at: "2026-06-04", snap: { TR: "0.81", 累计流量: "310 GB", 净充值: "¥25" } }],
    events: [
      { kind: "approved_temp", at: "2026-05-15 16:40", by: "bob", desc: "白名单 90 天 · 至 2026-08-13 · 理由：首次发现，给予观察" },
      { kind: "actioned_downgrade", at: "2026-06-05 09:00", by: "bob", desc: "降级至BASE · 理由：流量消耗异常，降至最低档" },
    ],
  },
  {
    id: "U-9C4B6", status: "pending", firstHit: "2026-06-10", recur: 0, reviewer: null, reviewedAt: null,
    hits: [
      { rule: "redeem_abuse", at: "2026-06-10", snap: { 兑换成本: "¥96", 净充值: "¥40", 差额: "+¥56" } },
      { rule: "low_tr", at: "2026-06-10", snap: { TR: "0.55", 累计流量: "620 GB", 净充值: "¥40" } },
    ],
    events: [
      { kind: "flagged", at: "2026-06-10 02:10", by: "系统", desc: "命中 兑换透支 · 分 1 · 观察" },
      { kind: "hit_added", at: "2026-06-10 04:00", by: "系统", desc: "新增命中 流量透支 · 分 1→2 · 观察→高风险" },
    ],
  },
  {
    id: "U-3E8D7", status: "approved", whitelistType: "perm", firstHit: "2026-05-20", recur: 0, reviewer: "alice", reviewedAt: "2026-06-01", whitelistUntil: null,
    baseline: { at: "2026-06-01", score: 2, hitsLabel: "兑换透支 + 流量透支", until: null },
    hits: [
      { rule: "redeem_abuse", at: "2026-05-20", snap: { 兑换成本: "¥52", 净充值: "¥38", 差额: "+¥14" } },
      { rule: "low_tr", at: "2026-05-20", snap: { TR: "0.88", 累计流量: "260 GB", 净充值: "¥38" } },
    ],
    events: [
      { kind: "approved_temp", at: "2026-05-25 10:00", by: "bob", desc: "白名单 90 天 · 至 2026-08-23 · 理由：历史记录良好，暂时观察" },
      { kind: "approved_perm", at: "2026-06-01 09:15", by: "alice", desc: "永久白名单 · 理由：长期优质用户，人工核实后无套利行为" },
    ],
  },
  // 待审核
  {
    id: "U-0L5W3", status: "pending", firstHit: "2026-06-13", recur: 0, reviewer: null, reviewedAt: null,
    hits: [{ rule: "redeem_abuse", at: "2026-06-13", snap: { 兑换成本: "¥102", 净充值: "¥55", 差额: "+¥47" } }],
    events: [
      { kind: "flagged", at: "2026-06-13 06:00", by: "系统", desc: "命中 兑换透支 · 分 1 · 观察" },
    ],
  },
  {
    id: "U-8T4Y2", status: "pending", firstHit: "2026-06-14", recur: 0, reviewer: null, reviewedAt: null,
    hits: [{ rule: "low_tr", at: "2026-06-14", snap: { TR: "0.47", 累计流量: "810 GB", 净充值: "¥38" } }],
    events: [
      { kind: "flagged", at: "2026-06-14 03:30", by: "系统", desc: "命中 流量透支 · 分 1 · 观察" },
    ],
  },
  // 复发
  {
    id: "U-6H3T8", status: "recurred", firstHit: "2026-04-10", recur: 1, reviewer: "bob", reviewedAt: "2026-04-15",
    baseline: { at: "2026-04-15", score: 1, hitsLabel: "兑换透支", until: "2026-07-14" },
    hits: [{ rule: "redeem_abuse", at: "2026-06-11", snap: { 兑换成本: "¥65", 净充值: "¥35", 差额: "+¥30" } }],
    events: [
      { kind: "approved_temp", at: "2026-04-15 11:00", by: "bob", desc: "白名单 90 天 · 至 2026-07-14 · 理由：首次违规，给予改正机会" },
      { kind: "recurred", at: "2026-06-11 03:00", by: "系统", desc: "白名单期内新增命中 兑换透支" },
    ],
  },
  {
    id: "U-5R2K0", status: "recurred", firstHit: "2026-05-02", recur: 1, reviewer: "alice", reviewedAt: "2026-05-06",
    baseline: { at: "2026-05-06", score: 2, hitsLabel: "兑换透支 + 流量透支", until: "2026-08-04" },
    hits: [
      { rule: "redeem_abuse", at: "2026-05-02", snap: { 兑换成本: "¥77", 净充值: "¥40", 差额: "+¥37" } },
      { rule: "low_tr", at: "2026-06-09", snap: { TR: "0.69", 累计流量: "430 GB", 净充值: "¥40" } },
    ],
    events: [
      { kind: "approved_temp", at: "2026-05-06 14:15", by: "alice", desc: "白名单 90 天 · 至 2026-08-04 · 理由：差额在容忍范围内，先观察" },
      { kind: "recurred", at: "2026-06-09 04:00", by: "系统", desc: "白名单期内新增命中 流量透支" },
    ],
  },
  // 暂时白名单
  {
    id: "U-7K2P5", status: "approved", whitelistType: "temp", firstHit: "2026-06-01", recur: 0, reviewer: "bob", reviewedAt: "2026-06-03", whitelistUntil: "2026-09-01",
    hits: [{ rule: "low_tr", at: "2026-06-01", snap: { TR: "0.79", 累计流量: "380 GB", 净充值: "¥30" } }],
    events: [
      { kind: "approved_temp", at: "2026-06-03 14:20", by: "bob", desc: "白名单 90 天 · 至 2026-09-01 · 理由：单次异常，历史付费记录正常" },
    ],
  },
  {
    id: "U-2N8F6", status: "approved", whitelistType: "temp", firstHit: "2026-05-30", recur: 0, reviewer: "alice", reviewedAt: "2026-06-02", whitelistUntil: "2026-08-31",
    hits: [{ rule: "redeem_abuse", at: "2026-05-30", snap: { 兑换成本: "¥42", 净充值: "¥28", 差额: "+¥14" } }],
    events: [
      { kind: "approved_temp", at: "2026-06-02 10:30", by: "alice", desc: "白名单 90 天 · 至 2026-08-31 · 理由：差额较小，给予观察期" },
    ],
  },
  // 永久白名单
  {
    id: "U-5P1Q9", status: "approved", whitelistType: "perm", firstHit: "2026-04-05", recur: 0, reviewer: "alice", reviewedAt: "2026-04-20", whitelistUntil: null,
    hits: [{ rule: "low_tr", at: "2026-04-05", snap: { TR: "0.92", 累计流量: "290 GB", 净充值: "¥27" } }],
    events: [
      { kind: "approved_temp", at: "2026-04-08 09:00", by: "bob", desc: "白名单 90 天 · 至 2026-07-07 · 理由：TR偏低但差距不大，先观察" },
      { kind: "approved_perm", at: "2026-04-20 11:45", by: "alice", desc: "永久白名单 · 理由：企业用户，大流量属正常业务需求，已核实" },
    ],
  },
  // 已降级
  {
    id: "U-4M9R1", status: "actioned", resolution: "降级", firstHit: "2026-05-28", recur: 1, reviewer: "alice", reviewedAt: "2026-06-08",
    hits: [
      { rule: "redeem_abuse", at: "2026-05-28", snap: { 兑换成本: "¥88", 净充值: "¥45", 差额: "+¥43" } },
      { rule: "low_tr", at: "2026-05-28", snap: { TR: "0.61", 累计流量: "520 GB", 净充值: "¥45" } },
    ],
    events: [
      { kind: "approved_temp", at: "2026-05-30 09:15", by: "alice", desc: "白名单 90 天 · 至 2026-08-28 · 理由：首次双规则命中，给予观察期" },
      { kind: "actioned_downgrade", at: "2026-06-08 10:45", by: "alice", desc: "降级至BASE · 理由：观察期内持续套利行为未改善" },
    ],
  },
  {
    id: "U-9V3C7", status: "actioned", resolution: "降级", firstHit: "2026-06-04", recur: 0, reviewer: "bob", reviewedAt: "2026-06-06",
    hits: [{ rule: "redeem_abuse", at: "2026-06-04", snap: { 兑换成本: "¥135", 净充值: "¥50", 差额: "+¥85" } }],
    events: [
      { kind: "actioned_downgrade", at: "2026-06-06 15:30", by: "bob", desc: "降级至BASE · 理由：兑换差额过大，套利金额显著" },
    ],
  },
  // 已封禁
  {
    id: "U-3G7B4", status: "actioned", resolution: "封号", firstHit: "2026-05-05", recur: 2, reviewer: "alice", reviewedAt: "2026-06-07",
    hits: [
      { rule: "redeem_abuse", at: "2026-05-05", snap: { 兑换成本: "¥210", 净充值: "¥80", 差额: "+¥130" } },
      { rule: "low_tr", at: "2026-05-06", snap: { TR: "0.41", 累计流量: "750 GB", 净充值: "¥80" } },
    ],
    events: [
      { kind: "approved_temp", at: "2026-05-08 10:00", by: "bob", desc: "白名单 90 天 · 至 2026-08-06 · 理由：等待进一步核实" },
      { kind: "actioned_ban", at: "2026-06-07 09:30", by: "alice", desc: "封号 · 理由：双规则命中且拒付记录坐实恶意套利" },
    ],
  },
  {
    id: "U-1W6X9", status: "actioned", resolution: "封号", firstHit: "2026-04-18", recur: 3, reviewer: "alice", reviewedAt: "2026-06-11",
    hits: [
      { rule: "redeem_abuse", at: "2026-04-18", snap: { 兑换成本: "¥175", 净充值: "¥60", 差额: "+¥115" } },
      { rule: "low_tr", at: "2026-04-20", snap: { TR: "0.33", 累计流量: "920 GB", 净充值: "¥60" } },
    ],
    events: [
      { kind: "approved_temp", at: "2026-04-20 08:30", by: "bob", desc: "白名单 90 天 · 至 2026-07-19 · 理由：首次记录，给予观察" },
      { kind: "approved_temp", at: "2026-05-10 11:00", by: "alice", desc: "白名单 90 天 · 至 2026-08-08 · 理由：申诉通过，延长观察期" },
      { kind: "actioned_downgrade", at: "2026-06-01 09:00", by: "alice", desc: "降级至BASE · 理由：多次复发，先降级再观察" },
      { kind: "actioned_ban", at: "2026-06-11 16:45", by: "alice", desc: "封号 · 理由：降级后仍持续套利，情节严重" },
    ],
  },
];

const scoreOf = (c) => c.hits.length;

function Badge({ bg, fg, children, dot }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: bg, color: fg, fontSize: 12.5, fontWeight: 500, padding: "3px 9px", borderRadius: 7, whiteSpace: "nowrap" }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />}{children}
    </span>
  );
}
function RuleChip({ ruleId }) {
  const r = RULES[ruleId]; if (!r) return null;
  return <span style={{ display: "inline-flex", alignItems: "center", background: "#F4F2EC", color: "#56544E", border: "1px solid #E7E4DC", fontSize: 12, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{r.name}</span>;
}
function EvtBadge({ kind }) {
  const m = EVT[kind]; const I = m.icon;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: m.bg, color: m.fg, fontSize: 12.5, fontWeight: 500, padding: "3px 9px", borderRadius: 7, whiteSpace: "nowrap" }}><I size={12} />{m.label}</span>;
}

export default function RiskReviewConsole() {
  const [tab, setTab] = useState("cases");
  const [cases, setCases] = useState(SEED);
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusSel, setStatusSel] = useState([]);
  const [expanded, setExpanded] = useState("U-5D9E4");
  const [ruleFilter, setRuleFilter] = useState("all");
  const [ruleInfo, setRuleInfo] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [dialogReason, setDialogReason] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [recurSort, setRecurSort] = useState(null);
  const [minDiff, setMinDiff] = useState("");
  const [maxTR, setMaxTR] = useState("");

  let banSeq = 7341;
  const act = (id, label) => setCases((cs) => cs.map((c) => {
    if (c.id !== id) return c;
    const ref = "BAN-" + (banSeq++).toString(36).toUpperCase() + "K9";
    return { ...c, status: "actioned", resolution: label, reviewer: "我", reviewedAt: "2026-06-10",
      events: [...c.events, { kind: "actioned", at: "2026-06-10 11:42", by: "我", desc: "处置 · " + label + " · 决策已记录，执行写入处置活动历史", ref }] };
  }));
  const approveTmp = (id, reason) => setCases((cs) => cs.map((c) => c.id === id ? {
    ...c, status: "approved", whitelistType: "temp", reviewer: "我", reviewedAt: "2026-06-10", whitelistUntil: "2026-09-08",
    events: [...c.events, { kind: "approved_temp", at: "2026-06-10 11:42", by: "我", desc: `白名单 90 天 · 至 2026-09-08 · 理由：${reason}` }],
  } : c));
  const approvePerm = (id, reason) => setCases((cs) => cs.map((c) => c.id === id ? {
    ...c, status: "approved", whitelistType: "perm", reviewer: "我", reviewedAt: "2026-06-10", whitelistUntil: null,
    events: [...c.events, { kind: "approved_perm", at: "2026-06-10 11:42", by: "我", desc: `永久白名单 · 理由：${reason}` }],
  } : c));
  const revokeWhitelist = (id) => setCases((cs) => cs.map((c) => c.id === id ? {
    ...c, status: "pending", whitelistType: null, whitelistUntil: null,
    events: [...c.events, { kind: "recurred", at: "2026-06-10 11:42", by: "我", desc: "撤销白名单 · 状态重置为待审核" }],
  } : c));
  const confirmDialog = () => {
    const reason = dialogReason.trim();
    if (!reason) return;
    if (dialog.type === "temp") {
      approveTmp(dialog.id, reason);
    } else if (dialog.type === "perm") {
      approvePerm(dialog.id, reason);
    } else if (dialog.type === "downgrade") {
      setCases((cs) => cs.map((c) => c.id !== dialog.id ? c : {
        ...c, status: "actioned", resolution: "降级", reviewer: "我", reviewedAt: "2026-06-10",
        events: [...c.events, { kind: "actioned_downgrade", at: "2026-06-10 11:42", by: "我", desc: `降级至BASE · 理由：${reason}` }],
      }));
    } else if (dialog.type === "ban") {
      setCases((cs) => cs.map((c) => c.id !== dialog.id ? c : {
        ...c, status: "actioned", resolution: "封号", reviewer: "我", reviewedAt: "2026-06-10",
        events: [...c.events, { kind: "actioned_ban", at: "2026-06-10 11:42", by: "我", desc: `封号 · 理由：${reason}` }],
      }));
    }
    setDialog(null);
    setDialogReason("");
  };

  const rows = useMemo(() => cases
    .map((c) => ({ ...c, score: scoreOf(c), risk: scoreToRisk(scoreOf(c)) }))
    .filter((c) => riskFilter === "all" || c.risk === riskFilter)
    .filter((c) => {
      if (statusSel.length === 0) return true;
      return statusSel.some((sel) => {
        if (sel === "approved_temp") return c.status === "approved" && c.whitelistType !== "perm";
        if (sel === "approved_perm") return c.status === "approved" && c.whitelistType === "perm";
        if (sel === "actioned_downgrade") return c.status === "actioned" && c.resolution === "降级";
        if (sel === "actioned_ban") return c.status === "actioned" && c.resolution === "封号";
        return c.status === sel;
      });
    })
    .filter((c) => ruleFilter === "all" || c.hits.some((h) => h.rule === ruleFilter))
    .filter((c) => {
      if (!minDiff.trim()) return true;
      const threshold = parseFloat(minDiff);
      if (isNaN(threshold)) return true;
      return c.hits.some((h) => h.rule === "redeem_abuse" && parseFloat((h.snap["差额"] || "").replace(/[^0-9.]/g, "")) >= threshold);
    })
    .filter((c) => {
      if (!maxTR.trim()) return true;
      const threshold = parseFloat(maxTR);
      if (isNaN(threshold)) return true;
      return c.hits.some((h) => h.rule === "low_tr" && parseFloat(h.snap["TR"] || "") <= threshold);
    })
    .sort((a, b) => recurSort === "asc" ? a.recur - b.recur : recurSort === "desc" ? b.recur - a.recur : 0),
    [cases, riskFilter, statusSel, ruleFilter, recurSort, minDiff, maxTR]);

  const allEvents = useMemo(() => cases
    .flatMap((c) => c.events.map((e) => ({ ...e, user: c.id, hits: c.hits })))
    .filter((e) => ["approved", "approved_temp", "approved_perm", "actioned_downgrade", "actioned_ban", "actioned"].includes(e.kind))
    .sort((a, b) => (a.at < b.at ? 1 : -1)), [cases]);

  const logRows = logSearch.trim()
    ? allEvents.filter((e) => e.user.toLowerCase().includes(logSearch.trim().toLowerCase()))
    : allEvents;

  const pendingCount = cases.filter((c) => c.status === "pending" || c.status === "recurred").length;

  const Th = ({ children, style }) => <th style={{ textAlign: "left", fontWeight: 500, fontSize: 12, color: "#A3A199", padding: "10px 14px", whiteSpace: "nowrap", ...style }}>{children}</th>;
  const Td = ({ children, style, ...p }) => <td style={{ padding: "13px 14px", fontSize: 13.5, color: "#36342E", verticalAlign: "middle", ...style }} {...p}>{children}</td>;

  return (
    <div style={{ fontFamily: FONT, background: "#FAFAF8", color: "#26241F", padding: 24, flex: 1 }}>
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertTriangle size={20} color="#BA7517" />
              <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: -0.2, color: "#26241F" }}>风险案例审核台</h1>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#888780" }}><RefreshCw size={13} /> 离线扫描 · 每 6h · UTC+8</div>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "1px solid #EAE8E2" }}>
          {[{ k: "cases", label: "审核案例", icon: Layers }, { k: "log", label: "审核事件日志", icon: ScrollText }].map((t) => {
            const on = tab === t.k; const I = t.icon;
            return <button key={t.k} onClick={() => setTab(t.k)} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 600 : 400, color: on ? "#26241F" : "#A3A199", padding: "9px 12px", borderBottom: on ? "2px solid #BA7517" : "2px solid transparent", marginBottom: -1 }}><I size={15} />{t.label}</button>;
          })}
        </div>

        {tab === "cases" && (
          <>
            <div style={{ background: "#fff", border: "1px solid #EAE8E2", borderRadius: 12, padding: "14px 16px", marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 22, alignItems: "center" }}>
              <FilterGroup label="风险等级" value={riskFilter} onChange={setRiskFilter} tabs={[["all", "全部"], ["critical", "高风险"], ["observe", "观察"]]} />
              <div style={{ width: 1, height: 26, background: "#EAE8E2" }} />
              <MultiFilterGroup label="案例状态" sel={statusSel} onChange={setStatusSel} tabs={[["pending", "待审核"], ["recurred", "复发"], ["approved_temp", "暂时白名单"], ["approved_perm", "永久白名单"], ["actioned_downgrade", "已降级"], ["actioned_ban", "已封禁"]]} />
              <div style={{ width: 1, height: 26, background: "#EAE8E2" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
                <span style={{ fontSize: 12.5, color: "#A3A199", whiteSpace: "nowrap" }}>命中规则</span>
                <div style={{ display: "flex", gap: 4, background: "#F4F2EC", padding: 3, borderRadius: 9 }}>
                  {[["all", "全部", null], ["redeem_abuse", "兑换透支", "redeem_abuse"], ["low_tr", "流量透支", "low_tr"]].map(([k, lbl, infoKey]) => {
                    const on = ruleFilter === k;
                    return (
                      <span key={k} style={{ display: "inline-flex", alignItems: "center" }}>
                        <button onClick={() => setRuleFilter(k)} style={{ border: "none", cursor: "pointer", fontSize: 13, fontWeight: on ? 500 : 400, padding: "5px 11px", borderRadius: 6, background: on ? "#fff" : "transparent", color: on ? "#26241F" : "#78766E", boxShadow: on ? "0 1px 2px rgba(0,0,0,.06)" : "none", fontFamily: "inherit" }}>{lbl}</button>
                        {infoKey && <button onClick={(e) => { e.stopPropagation(); setRuleInfo(ruleInfo === infoKey ? null : infoKey); }} style={{ border: "none", background: "none", cursor: "pointer", padding: "0 6px 0 0", color: ruleInfo === infoKey ? "#185FA5" : "#B4B2A9", display: "inline-flex", alignItems: "center" }}><Info size={12} /></button>}
                      </span>
                    );
                  })}
                </div>
                {ruleInfo === "redeem_abuse" && (
                  <div style={{ position: "absolute", top: "calc(100% + 10px)", left: 0, zIndex: 200, background: "#fff", border: "1px solid #EAE8E2", borderRadius: 12, padding: "16px 20px", fontSize: 13, color: "#36342E", lineHeight: 1.7, minWidth: 340, boxShadow: "0 6px 20px rgba(0,0,0,.09)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>兑换会员成本</div>
                    <div style={{ background: "#F4F2EC", border: "1px solid #E7E4DC", borderRadius: 8, padding: "10px 14px", fontFamily: MONO, fontSize: 12.5, marginBottom: 12 }}>
                      兑换会员成本 = 0.5 × 累计SVIP兑换天数 + 0.3 × 累计VIP兑换天数
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ fontWeight: 500, color: "#78766E" }}>示例：</span><br />
                      用户A兑换 SVIP 120天 + VIP 60天<br />
                      兑换会员成本 = 0.5×120 + 0.3×60 = <span style={{ fontFamily: MONO, fontWeight: 600 }}>78 ¥</span>
                    </div>
                    <div style={{ color: "#A32D2D", marginBottom: 4 }}>兑换会员成本 ≤ 0 的用户不纳入本表</div>
                    <div style={{ color: "#78766E", fontSize: 12.5 }}>纳入阈值：兑换会员成本 &gt; 0 = 用户至少有一天兑换记录</div>
                  </div>
                )}
                {ruleInfo === "low_tr" && (
                  <div style={{ position: "absolute", top: "calc(100% + 10px)", left: 0, zIndex: 200, background: "#fff", border: "1px solid #EAE8E2", borderRadius: 12, padding: "16px 20px", fontSize: 13, color: "#36342E", lineHeight: 1.7, minWidth: 340, boxShadow: "0 6px 20px rgba(0,0,0,.09)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>流量付费密度（TR）</div>
                    <div style={{ background: "#F4F2EC", border: "1px solid #E7E4DC", borderRadius: 8, padding: "10px 14px", fontFamily: MONO, fontSize: 12.5, marginBottom: 6 }}>
                      TR = 累计净充值 ÷ (累计流量 GB × 0.1)
                    </div>
                    <div style={{ color: "#78766E", fontSize: 12.5, marginBottom: 12 }}>无量纲比值，≥ 1 为健康</div>
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ fontWeight: 500, color: "#78766E" }}>示例：</span><br />
                      用户 A 充值 ¥100，使用 500 GB<br />
                      分母 = 500 × 0.1 = 50<br />
                      → TR = <span style={{ fontFamily: MONO, fontWeight: 600 }}>2.00 ✓</span>
                    </div>
                    <div style={{ color: "#A32D2D", marginBottom: 4 }}>TR ≥ 1.00 的用户不纳入本表</div>
                    <div style={{ color: "#78766E", fontSize: 12.5 }}>
                      纳入比例 &lt; 1 = 流量成本超出预期<br />
                      TR 越低 = 流量成本超出用户付款；TR &lt; 1 意味着平台正在亏损
                    </div>
                  </div>
                )}
              </div>
              <div style={{ width: 1, height: 26, background: "#EAE8E2" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12.5, color: "#A3A199", whiteSpace: "nowrap" }}>差额 ≥</span>
                  <div style={{ display: "inline-flex", alignItems: "center", background: "#F4F2EC", border: "1px solid #EAE8E2", borderRadius: 7, padding: "4px 8px", gap: 3 }}>
                    <span style={{ fontSize: 12.5, color: "#A3A199" }}>¥</span>
                    <input value={minDiff} onChange={(e) => setMinDiff(e.target.value)} placeholder="不限" type="number" min="0" style={{ width: 54, border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: MONO, color: "#26241F" }} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12.5, color: "#A3A199", whiteSpace: "nowrap" }}>TR ≤</span>
                  <div style={{ display: "inline-flex", alignItems: "center", background: "#F4F2EC", border: "1px solid #EAE8E2", borderRadius: 7, padding: "4px 8px" }}>
                    <input value={maxTR} onChange={(e) => setMaxTR(e.target.value)} placeholder="不限" type="number" min="0" max="2" step="0.01" style={{ width: 54, border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: MONO, color: "#26241F" }} />
                  </div>
                </div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, color: "#B4B2A9", fontSize: 13 }}><Search size={15} /> 搜索 user_id</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #EAE8E2", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                  <thead><tr style={{ borderBottom: "1px solid #EFEDE7", background: "#FCFBF9" }}>
                    <Th style={{ width: 38 }} /><Th>用户</Th><Th>风险等级</Th><Th>案例状态</Th><Th>命中规则</Th><Th>首次命中</Th>
                    <Th>
                      <button onClick={() => setRecurSort((s) => s === null ? "desc" : s === "desc" ? "asc" : null)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit", fontSize: 12, fontWeight: 500, color: recurSort ? "#26241F" : "#A3A199", whiteSpace: "nowrap" }}>
                        复发 <span style={{ fontSize: 10, letterSpacing: -1 }}>{recurSort === "desc" ? "↓" : recurSort === "asc" ? "↑" : "↕"}</span>
                      </button>
                    </Th>
                    <Th>上次审核</Th><Th style={{ textAlign: "right" }}>操作</Th>
                  </tr></thead>
                  <tbody>
                    {rows.map((c) => {
                      const open = expanded === c.id; const r = RISK[c.risk];
                      const st = c.status === "actioned" && c.resolution === "降级"
                        ? { label: "已降级", bg: "#FAEEDA", fg: "#854F0B" }
                        : c.status === "actioned" && c.resolution === "封号"
                        ? { label: "已封禁", bg: "#FCEBEB", fg: "#A32D2D" }
                        : STATUS[c.status];
                      const pending = c.status === "pending" || c.status === "recurred";
                      return (
                        <Fragment key={c.id}>
                          <tr onClick={() => setExpanded(open ? null : c.id)} style={{ borderBottom: open ? "none" : "1px solid #F2F0EA", cursor: "pointer", background: open ? "#FCFBF8" : "#fff" }}>
                            <Td style={{ paddingRight: 0 }}><ChevronRight size={16} color="#A3A199" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} /></Td>
                            <Td><span style={{ fontFamily: MONO, fontSize: 13 }}>{c.id}</span></Td>
                            <Td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Badge bg={r.bg} fg={r.fg} dot={r.dot}>{r.label}</Badge><span style={{ fontFamily: MONO, fontSize: 12, color: "#A3A199" }}>分 {c.score}</span></div></Td>
                            <Td><Badge bg={st.bg} fg={st.fg}>{st.label}</Badge></Td>
                            <Td><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{c.hits.map((h, i) => <RuleChip key={i} ruleId={h.rule} />)}</div></Td>
                            <Td><span style={{ fontFamily: MONO, fontSize: 12.5, color: "#78766E" }}>{c.firstHit}</span></Td>
                            <Td>{c.recur > 0 ? <Badge bg="#FAECE7" fg="#993C1D">×{c.recur}</Badge> : <span style={{ color: "#C8C6BE" }}>—</span>}</Td>
                            <Td>
                              {c.reviewer ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                  <span style={{ fontSize: 12.5, color: "#78766E" }}>{c.reviewer} · <span style={{ fontFamily: MONO }}>{c.reviewedAt}</span></span>
                                  <button onClick={(e) => { e.stopPropagation(); setTab("log"); setLogSearch(c.id); }} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, fontSize: 12, color: "#185FA5", fontFamily: FONT, textAlign: "left", textDecoration: "underline", textUnderlineOffset: 2 }}>审批历史</button>
                                </div>
                              ) : <span style={{ color: "#C8C6BE" }}>—</span>}
                            </Td>
                            <Td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                                {pending ? (
                                  <>
                                    <ActionBtn icon={Clock} fg="#0F6E56" bd="#9FE1CB" hov="#E1F5EE" title="暂时白名单" onClick={() => { setDialog({ type: "temp", id: c.id }); setDialogReason(""); }} />
                                    <ActionBtn icon={ShieldCheck} fg="#0a5240" bd="#9FE1CB" hov="#E1F5EE" title="永久白名单" onClick={() => { setDialog({ type: "perm", id: c.id }); setDialogReason(""); }} />
                                    <ActionBtn icon={ArrowDownCircle} fg="#854F0B" bd="#FAC775" hov="#FAEEDA" title="降级" onClick={() => { setDialog({ type: "downgrade", id: c.id }); setDialogReason(""); }} />
                                    <ActionBtn icon={Ban} fg="#A32D2D" bd="#F09595" hov="#FCEBEB" title="封号" onClick={() => { setDialog({ type: "ban", id: c.id }); setDialogReason(""); }} />
                                  </>
                                ) : c.status === "approved" ? (
                                  <>
                                    {c.whitelistType === "perm"
                                      ? <span style={{ fontSize: 12, color: "#0a5240", display: "inline-flex", alignItems: "center", gap: 5 }}><ShieldCheck size={13} /> 永久白名单</span>
                                      : <span style={{ fontSize: 12, color: "#0F6E56", display: "inline-flex", alignItems: "center", gap: 5 }}><Clock size={13} /> 至 {c.whitelistUntil}</span>}
                                    <ActionBtn icon={XCircle} fg="#78766E" bd="#D9D7CF" hov="#F4F2EC" title="撤销白名单" onClick={() => revokeWhitelist(c.id)} />
                                  </>
                                ) : <span style={{ fontSize: 12.5, color: "#791F1F", fontWeight: 500 }}>{c.resolution}</span>}
                                <ActionBtn icon={User} fg="#185FA5" bd="#A3C9F1" hov="#E6F1FB" title="用户详情" onClick={() => {}} />
                              </div>
                            </Td>
                          </tr>
                          {open && (
                            <tr style={{ borderBottom: "1px solid #F2F0EA" }}>
                              <td colSpan={9} style={{ padding: "2px 18px 18px 48px", background: "#FCFBF8" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(238px, 1fr))", gap: 10 }}>
                                  {c.hits.map((h, i) => (
                                    <div key={i} style={{ background: "#fff", border: "1px solid #EAE8E2", borderRadius: 10, padding: "11px 13px" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                                        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{RULES[h.rule].name}</span>
                                        <span style={{ fontFamily: MONO, fontSize: 10.5, color: "#B4B2A9", background: "#F4F2EC", padding: "1px 6px", borderRadius: 5 }}>{h.rule}</span>
                                        <span style={{ marginLeft: "auto", fontSize: 11, color: "#A3A199" }}>{h.at}</span>
                                      </div>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        {Object.entries(h.snap).map(([k, v]) => (
                                          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                                            <span style={{ color: "#78766E" }}>{k}</span><span style={{ fontFamily: MONO, color: "#36342E", fontWeight: 500 }}>{v}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {rows.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#A3A199", fontSize: 13.5 }}>当前筛选下没有案例。</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#A3A199", marginTop: 12, lineHeight: 1.8 }}>一个 <b style={{ color: "#78766E" }}>user_id</b> 永远只占 <b style={{ color: "#78766E" }}>一行案例</b>（命中变多原地更新，不新增行）。命中 append 进规则命中表，动作 append 进审核事件日志。</p>
          </>
        )}

        {tab === "log" && (
          <>
            <div style={{ background: "#fff", border: "1px solid #EAE8E2", borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <Search size={14} color="#A3A199" style={{ flexShrink: 0 }} />
              <input
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="搜索 user_id…"
                style={{ border: "none", outline: "none", fontSize: 13, fontFamily: FONT, color: "#26241F", flex: 1, background: "transparent" }}
              />
              {logSearch && (
                <button onClick={() => setLogSearch("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#A3A199", display: "inline-flex", padding: 0 }}>
                  <XCircle size={14} />
                </button>
              )}
            </div>
            <div style={{ background: "#fff", border: "1px solid #EAE8E2", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead><tr style={{ borderBottom: "1px solid #EFEDE7", background: "#FCFBF9" }}>
                    <Th>时间</Th><Th>用户</Th><Th>规则</Th><Th>事件</Th><Th>操作者</Th><Th>理由</Th>
                  </tr></thead>
                  <tbody>
                    {logRows.map((e, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #F2F0EA", background: "#fff" }}>
                        <Td><span style={{ fontFamily: MONO, fontSize: 12.5, color: "#78766E", whiteSpace: "nowrap" }}>{e.at}</span></Td>
                        <Td><span style={{ fontFamily: MONO, fontSize: 13 }}>{e.user}</span></Td>
                        <Td><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{e.hits?.map((h, j) => <RuleChip key={j} ruleId={h.rule} />)}</div></Td>
                        <Td><EvtBadge kind={e.kind} /></Td>
                        <Td><span style={{ fontSize: 12.5, color: "#78766E" }}>{e.by}</span></Td>
                        <Td><span style={{ fontSize: 13 }}>{e.desc}</span></Td>
                      </tr>
                    ))}
                    {logRows.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#A3A199", fontSize: 13.5 }}>未找到 "{logSearch}" 的审批记录。</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#A3A199", marginTop: 12, lineHeight: 1.8 }}>
              全局 append-only 日志：每个动作（命中、新增命中、通过、复发、处置）都是一条<b style={{ color: "#78766E" }}>新行</b>，从不改旧行或删除。
              <b style={{ color: "#78766E" }}>处置</b>事件只记决策 + 引用 ID，真正执行落在<b style={{ color: "#78766E" }}>处置活动历史</b>，不重复存。（去案例台点一下「通过 / 封号」，这里会即时多出一行。）
            </p>
          </>
        )}


      </div>
      {dialog && (
        <div onClick={() => { setDialog(null); setDialogReason(""); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", width: 420, boxShadow: "0 8px 32px rgba(0,0,0,.16)", fontFamily: FONT }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
              {dialog.type === "temp" ? "暂时白名单" : dialog.type === "perm" ? "永久白名单" : dialog.type === "downgrade" ? "降级至BASE" : "封号"}
            </div>
            <div style={{ fontSize: 13, color: "#78766E", marginBottom: 16 }}>
              请填写{dialog.type === "temp" ? "加入暂时白名单（90天）" : dialog.type === "perm" ? "加入永久白名单" : dialog.type === "downgrade" ? "降级至BASE" : "封号"}的理由（必填）
            </div>
            <textarea
              value={dialogReason}
              onChange={(e) => setDialogReason(e.target.value)}
              placeholder="输入理由…"
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #D9D7CF", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: FONT, resize: "vertical", outline: "none", color: "#000000", background: "#FAFAF8" }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => { setDialog(null); setDialogReason(""); }} style={{ border: "1px solid #D9D7CF", background: "#fff", borderRadius: 8, padding: "7px 16px", fontSize: 13, cursor: "pointer", fontFamily: FONT, color: "#56544E" }}>取消</button>
              <button onClick={confirmDialog} disabled={!dialogReason.trim()} style={{ border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 500, cursor: dialogReason.trim() ? "pointer" : "not-allowed", fontFamily: FONT, background: dialog.type === "temp" ? "#0F6E56" : dialog.type === "perm" ? "#0a5240" : dialog.type === "downgrade" ? "#854F0B" : "#A32D2D", color: "#fff", opacity: dialogReason.trim() ? 1 : 0.45 }}>确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, tabs, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12.5, color: "#A3A199", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ display: "flex", gap: 4, background: "#F4F2EC", padding: 3, borderRadius: 9 }}>
        {tabs.map(([k, lbl]) => {
          const on = value === k;
          return <button key={k} onClick={() => onChange(k)} style={{ border: "none", cursor: "pointer", fontSize: 13, fontWeight: on ? 500 : 400, padding: "5px 11px", borderRadius: 6, background: on ? "#fff" : "transparent", color: on ? "#26241F" : "#78766E", boxShadow: on ? "0 1px 2px rgba(0,0,0,.06)" : "none", fontFamily: "inherit" }}>{lbl}</button>;
        })}
      </div>
    </div>
  );
}

function MultiFilterGroup({ label, tabs, sel, onChange }) {
  const toggle = (k) => onChange(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k]);
  const allOn = sel.length === 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12.5, color: "#A3A199", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ display: "flex", gap: 4, background: "#F4F2EC", padding: 3, borderRadius: 9 }}>
        <button onClick={() => onChange([])} style={{ border: "none", cursor: "pointer", fontSize: 13, fontWeight: allOn ? 500 : 400, padding: "5px 11px", borderRadius: 6, background: allOn ? "#fff" : "transparent", color: allOn ? "#26241F" : "#78766E", boxShadow: allOn ? "0 1px 2px rgba(0,0,0,.06)" : "none", fontFamily: "inherit" }}>全部</button>
        {tabs.map(([k, lbl]) => {
          const on = sel.includes(k);
          return <button key={k} onClick={() => toggle(k)} style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "none", cursor: "pointer", fontSize: 13, fontWeight: on ? 500 : 400, padding: "5px 11px", borderRadius: 6, background: on ? "#fff" : "transparent", color: on ? "#26241F" : "#78766E", boxShadow: on ? "0 1px 2px rgba(0,0,0,.06)" : "none", fontFamily: "inherit" }}>{on && <Check size={12} color="#0F6E56" />}{lbl}</button>;
        })}
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, fg, bd, hov, title, onClick }) {
  const [h, setH] = useState(false);
  return <button title={title} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "5px 7px", borderRadius: 7, color: fg, border: "1px solid " + bd, background: h ? hov : "#fff" }}><Icon size={14} /></button>;
}