"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, DollarSign, Users, Activity, ChevronDown, BarChart3, Server,
} from "lucide-react";
import { useT } from "@/lib/i18n";

/* ── Types ──────────────────────────────────────────────────── */

interface ActionBreakdown {
  count: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

interface UserCost {
  userId: string;
  name: string;
  email: string;
  plan: string;
  totalCost: number;
  breakdown: Record<string, ActionBreakdown>;
}

interface CostsResponse {
  month: string;
  totalCost: number;
  userCount: number;
  users: UserCost[];
  globalBreakdown: Record<string, { count: number; cost: number }>;
  providerBreakdown: Record<string, { count: number; cost: number }>;
}

/* ── Helpers ────────────────────────────────────────────────── */

const ACTION_KEYS = ["generate_findings", "generate_conclusion", "dictation_correction", "transcription", "generate_trace", "repair_findings"] as const;

function fmt(n: number): string {
  return `$${n.toFixed(4)}`;
}

function costColor(cost: number): string {
  if (cost <= 0.01) return "text-green-600 dark:text-violet-400";
  if (cost <= 0.1) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function costBadgeColor(cost: number): string {
  if (cost <= 0.5) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  if (cost <= 5) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
}

function planBadgeColor(plan: string): string {
  switch (plan) {
    case "professional": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "starter": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
    default: return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300";
  }
}

function actionCost(user: UserCost, action: string): number {
  return user.breakdown[action]?.cost || 0;
}

function totalCalls(user: UserCost): number {
  return Object.values(user.breakdown).reduce((sum, b) => sum + b.count, 0);
}

function otherCost(user: UserCost): number {
  const known = new Set<string>(ACTION_KEYS);
  return Object.entries(user.breakdown)
    .filter(([k]) => !known.has(k))
    .reduce((sum, [, v]) => sum + v.cost, 0);
}

function buildMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
    options.push({ value, label });
  }
  return options;
}

/* ── Component ──────────────────────────────────────────────── */

export function AdminCostsTab() {
  const t = useT();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<CostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<"totalCost" | "calls">("totalCost");
  const [sortAsc, setSortAsc] = useState(false);

  const monthOptions = buildMonthOptions();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/costs?month=${month}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(userId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  }

  function handleSort(field: "totalCost" | "calls") {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data || data.users.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("admin.costs.title")}
          </h2>
          <MonthSelector month={month} options={monthOptions} onChange={setMonth} label={t("admin.costs.month")} />
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <DollarSign className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">{t("admin.costs.no_data")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCalls_ = Object.values(data.globalBreakdown).reduce((s, b) => s + b.count, 0);
  const avgPerUser = data.userCount > 0 ? data.totalCost / data.userCount : 0;
  const findingsCount = data.globalBreakdown["generate_findings"]?.count || 0;
  const avgPerReport = findingsCount > 0 ? data.totalCost / findingsCount : 0;

  const sortedUsers = [...data.users].sort((a, b) => {
    const va = sortField === "totalCost" ? a.totalCost : totalCalls(a);
    const vb = sortField === "totalCost" ? b.totalCost : totalCalls(b);
    return sortAsc ? va - vb : vb - va;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          {t("admin.costs.title")}
          <Badge className={costBadgeColor(data.totalCost)}>
            {fmt(data.totalCost)}
          </Badge>
        </h2>
        <MonthSelector month={month} options={monthOptions} onChange={setMonth} label={t("admin.costs.month")} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<DollarSign className="h-4 w-4 text-violet-500" />}
          label={t("admin.costs.total_month")}
          value={fmt(data.totalCost)}
          valueClass={costColor(data.totalCost)}
        />
        <SummaryCard
          icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
          label={t("admin.costs.per_report")}
          value={fmt(avgPerReport)}
          valueClass={costColor(avgPerReport)}
        />
        <SummaryCard
          icon={<Users className="h-4 w-4 text-purple-500" />}
          label={t("admin.costs.per_user")}
          value={fmt(avgPerUser)}
          valueClass={costColor(avgPerUser)}
        />
        <SummaryCard
          icon={<Activity className="h-4 w-4 text-amber-500" />}
          label={t("admin.costs.api_calls")}
          value={totalCalls_.toLocaleString()}
          valueClass="text-gray-900 dark:text-white"
        />
      </div>

      {/* Breakdowns side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* By task */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              {t("admin.costs.by_task")}
            </h3>
            <div className="space-y-1">
              {Object.entries(data.globalBreakdown)
                .sort(([, a], [, b]) => b.cost - a.cost)
                .map(([action, { count, cost }]) => (
                  <div key={action} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                      {actionLabel(t, action)}
                    </span>
                    <span className="text-gray-400 mx-2">{count}x</span>
                    <span className={`font-mono font-medium ${costColor(cost)}`}>{fmt(cost)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* By provider */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5" />
              {t("admin.costs.by_provider")}
            </h3>
            <div className="space-y-1">
              {Object.entries(data.providerBreakdown)
                .sort(([, a], [, b]) => b.cost - a.cost)
                .map(([provider, { count, cost }]) => (
                  <div key={provider} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300 truncate flex-1 capitalize">
                      {provider}
                    </span>
                    <span className="text-gray-400 mx-2">{count}x</span>
                    <span className={`font-mono font-medium ${costColor(cost)}`}>{fmt(cost)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-user table */}
      <Card>
        <CardContent className="p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {t("admin.costs.by_user")}
            <Badge variant="secondary" className="text-[9px] ml-1">{data.userCount}</Badge>
          </h3>

          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto_auto] gap-x-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-1.5 border-b border-gray-100 dark:border-gray-800 mb-1">
            <span>{t("admin.costs.user")}</span>
            <span className="w-16 text-right">{t("admin.costs.plan")}</span>
            <SortHeader label={t("admin.costs.total")} field="totalCost" current={sortField} asc={sortAsc} onSort={handleSort} />
            <span className="w-16 text-right">{t("admin.costs.findings")}</span>
            <span className="w-16 text-right">{t("admin.costs.conclusion")}</span>
            <span className="w-16 text-right">{t("admin.costs.correction")}</span>
            <span className="w-16 text-right">{t("admin.costs.dictation")}</span>
            <span className="w-16 text-right">{t("admin.costs.other")}</span>
            <SortHeader label={t("admin.costs.calls")} field="calls" current={sortField} asc={sortAsc} onSort={handleSort} />
          </div>

          {/* Table rows */}
          <div className="space-y-0.5">
            {sortedUsers.map((user) => (
              <UserRow
                key={user.userId}
                user={user}
                expanded={expanded.has(user.userId)}
                onToggle={() => toggleExpand(user.userId)}
                t={t}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function MonthSelector({
  month,
  options,
  onChange,
  label,
}: {
  month: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <Select value={month} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-44 text-xs">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
        </div>
        <span className={`text-lg font-bold font-mono ${valueClass}`}>{value}</span>
      </CardContent>
    </Card>
  );
}

function SortHeader({
  label,
  field,
  current,
  asc,
  onSort,
}: {
  label: string;
  field: "totalCost" | "calls";
  current: string;
  asc: boolean;
  onSort: (f: "totalCost" | "calls") => void;
}) {
  const active = current === field;
  return (
    <button
      type="button"
      className={`w-16 text-right cursor-pointer select-none flex items-center justify-end gap-0.5 ${active ? "text-blue-500" : ""}`}
      onClick={() => onSort(field)}
    >
      {label}
      {active && (
        <ChevronDown className={`h-2.5 w-2.5 transition-transform ${asc ? "rotate-180" : ""}`} />
      )}
    </button>
  );
}

function UserRow({
  user,
  expanded,
  onToggle,
  t,
}: {
  user: UserCost;
  expanded: boolean;
  onToggle: () => void;
  t: (k: string) => string;
}) {
  const calls = totalCalls(user);
  const other = otherCost(user);

  return (
    <div>
      <button
        type="button"
        className="w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-md transition-colors"
        onClick={onToggle}
      >
        {/* Desktop row */}
        <div className="hidden md:grid md:grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto_auto] gap-x-2 items-center py-1.5 px-1 text-xs">
          <div className="min-w-0">
            <span className="font-medium text-gray-800 dark:text-gray-200 block truncate">
              {user.name}
            </span>
            <span className="text-[10px] text-gray-400 block truncate">{user.email}</span>
          </div>
          <span className="w-16 text-right">
            <Badge className={`text-[9px] ${planBadgeColor(user.plan)}`}>{user.plan}</Badge>
          </span>
          <span className={`w-16 text-right font-mono font-medium ${costColor(user.totalCost)}`}>
            {fmt(user.totalCost)}
          </span>
          <span className="w-16 text-right font-mono text-gray-600 dark:text-gray-400">
            {fmt(actionCost(user, "generate_findings"))}
          </span>
          <span className="w-16 text-right font-mono text-gray-600 dark:text-gray-400">
            {fmt(actionCost(user, "generate_conclusion"))}
          </span>
          <span className="w-16 text-right font-mono text-gray-600 dark:text-gray-400">
            {fmt(actionCost(user, "dictation_correction"))}
          </span>
          <span className="w-16 text-right font-mono text-gray-600 dark:text-gray-400">
            {fmt(actionCost(user, "transcription"))}
          </span>
          <span className="w-16 text-right font-mono text-gray-600 dark:text-gray-400">
            {fmt(other)}
          </span>
          <span className="w-16 text-right text-gray-500 flex items-center justify-end gap-0.5">
            {calls}
            <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </span>
        </div>

        {/* Mobile row */}
        <div className="md:hidden flex items-center justify-between py-2 px-1">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 block truncate">
              {user.name}
            </span>
            <span className="text-[10px] text-gray-400">{user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-[9px] ${planBadgeColor(user.plan)}`}>{user.plan}</Badge>
            <span className={`text-xs font-mono font-medium ${costColor(user.totalCost)}`}>
              {fmt(user.totalCost)}
            </span>
            <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="ml-2 mr-1 mb-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {t("admin.costs.details")}
          </h4>
          <div className="space-y-1">
            {Object.entries(user.breakdown)
              .sort(([, a], [, b]) => b.cost - a.cost)
              .map(([action, bd]) => (
                <div key={action} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 text-[11px] items-center">
                  <span className="text-gray-700 dark:text-gray-300">{actionLabel(t, action)}</span>
                  <span className="text-gray-400 text-right">{bd.count}x</span>
                  <span className="text-gray-400 text-right" title={t("admin.costs.tokens_in")}>
                    {bd.inputTokens.toLocaleString()} in
                  </span>
                  <span className="text-gray-400 text-right" title={t("admin.costs.tokens_out")}>
                    {bd.outputTokens.toLocaleString()} out
                  </span>
                  <span className={`font-mono font-medium text-right ${costColor(bd.cost)}`}>
                    {fmt(bd.cost)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Action label resolver ──────────────────────────────────── */

function actionLabel(t: (k: string) => string, action: string): string {
  const map: Record<string, string> = {
    generate_findings: t("admin.costs.findings"),
    generate_conclusion: t("admin.costs.conclusion"),
    dictation_correction: t("admin.costs.correction"),
    transcription: t("admin.costs.dictation"),
    generate_trace: t("admin.costs.trace"),
    repair_findings: t("admin.costs.other"),
  };
  return map[action] || action;
}
