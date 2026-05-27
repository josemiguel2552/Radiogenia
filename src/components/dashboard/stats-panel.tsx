"use client";

import { useState, useEffect } from "react";
import { FileText, Mic, ChevronDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n";

interface ReportStat {
  modality: string;
  study_type: string;
  created_at: string;
}

interface SubInfo {
  used: number;
  limit: number;
  plan: string;
  dictationUsedMin: number;
  dictationLimitMin: number;
}

const PERIOD_KEYS: Record<string, string> = {
  today: "stats.today", week: "stats.week", month: "stats.month", all: "stats.all_time",
};

export function StatsPanel() {
  const t = useT();
  const [reports, setReports] = useState<ReportStat[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("month");
  const [expanded, setExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setSub({
          used: data.used,
          limit: data.limit,
          plan: data.plan,
          dictationUsedMin: data.dictation?.usedMinutes ?? 0,
          dictationLimitMin: data.dictation?.limitMinutes ?? 0,
        });
      })
      .catch(() => {});

    fetch("/api/reports?count_only=true")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && typeof data.count === "number") setTotalCount(data.count);
      })
      .catch(() => {});
  }, [refreshKey]);

  // Refresh stats when a report is generated or saved
  useEffect(() => {
    const refresh = () => setRefreshKey((k) => k + 1);
    window.addEventListener("radiogenai:report-saved", refresh);
    window.addEventListener("radiogenai:report-generated", refresh);
    return () => {
      window.removeEventListener("radiogenai:report-saved", refresh);
      window.removeEventListener("radiogenai:report-generated", refresh);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    async function load() {
      const now = new Date();
      let from = "";
      if (period === "today") {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (period === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        from = weekAgo.toISOString();
      } else if (period === "month") {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        from = monthAgo.toISOString();
      }
      const params = from ? `?from=${from}` : "";
      const res = await fetch(`/api/reports${params}`);
      if (res.ok) setReports(await res.json());
    }
    load();
  }, [period, expanded]);

  const modalityCounts: Record<string, number> = {};
  reports.forEach((r) => {
    modalityCounts[r.modality] = (modalityCounts[r.modality] || 0) + 1;
  });
  const maxCount = Math.max(...Object.values(modalityCounts), 1);
  const usagePct = sub ? Math.min(100, Math.round((sub.used / sub.limit) * 100)) : 0;
  const dictPct = sub && sub.dictationLimitMin > 0 ? Math.min(100, Math.round((sub.dictationUsedMin / sub.dictationLimitMin) * 100)) : 0;

  return (
    <div>
      {/* Compact summary row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex flex-col gap-1.5 px-1 py-1.5 text-sm group text-left"
      >
        {sub && (
          <>
            {/* Plan badge */}
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{t("stats.plan")}: <span className="text-gray-700 dark:text-gray-200">{sub.plan}</span></span>
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </div>
            {/* Reports usage */}
            <div className="flex items-center gap-2 w-full">
              <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${usagePct >= 90 ? "text-red-500" : usagePct >= 70 ? "text-amber-500" : "text-brand"}`} />
              <span className="text-xs font-semibold text-gray-900 dark:text-white">{sub.used}<span className="font-normal text-gray-400">/{sub.limit}</span></span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-brand"}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0">{t("stats.this_month")}</span>
            </div>
            {/* Dictation usage */}
            <div className="flex items-center gap-2 w-full">
              <Mic className={`h-3.5 w-3.5 flex-shrink-0 ${dictPct >= 90 ? "text-red-500" : dictPct >= 70 ? "text-amber-500" : "text-violet-500"}`} />
              <span className="text-xs font-semibold text-gray-900 dark:text-white">{sub.dictationUsedMin}<span className="font-normal text-gray-400">/{sub.dictationLimitMin} min</span></span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${dictPct >= 90 ? "bg-red-500" : dictPct >= 70 ? "bg-amber-500" : "bg-violet-500"}`}
                  style={{ width: `${dictPct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0">{t("stats.dictation_used")}</span>
            </div>
          </>
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <Card className="mt-2">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-1">
              {(["today", "week", "month", "all"] as const).map((p) => (
                <Button key={p} variant={period === p ? "default" : "ghost"} size="sm" onClick={() => setPeriod(p)} className="text-xs h-7">
                  {t(PERIOD_KEYS[p])}
                </Button>
              ))}
            </div>

            {Object.keys(modalityCounts).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(modalityCounts).map(([mod, count]) => (
                  <div key={mod}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{mod}</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div className="bg-brand h-1.5 rounded-full transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 text-xs">
                <Calendar className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
                {t("stats.no_reports")}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
