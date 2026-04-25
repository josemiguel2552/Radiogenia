"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, FileText, Calendar } from "lucide-react";
import { useT } from "@/lib/i18n";

interface ReportStat {
  modality: string;
  study_type: string;
  created_at: string;
}

const PERIOD_KEYS: Record<string, string> = {
  today: "stats.today", week: "stats.week", month: "stats.month", all: "stats.all_time",
};

export function StatsPanel() {
  const t = useT();
  const [reports, setReports] = useState<ReportStat[]>([]);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("month");

  useEffect(() => {
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
  }, [period]);

  // Calculate stats
  const totalReports = reports.length;
  const modalityCounts: Record<string, number> = {};
  reports.forEach((r) => {
    modalityCounts[r.modality] = (modalityCounts[r.modality] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(modalityCounts), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
          <BarChart3 className="h-5 w-5 text-brand" />
          {t("stats.title")}
        </h2>
        <div className="flex gap-1">
          {(["today", "week", "month", "all"] as const).map((p) => (
            <Button key={p} variant={period === p ? "default" : "ghost"} size="sm" onClick={() => setPeriod(p)} className="text-xs">
              {t(PERIOD_KEYS[p])}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-brand-soft">
              <FileText className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalReports}</p>
              <p className="text-xs text-gray-500">{t("stats.total_reports")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Modality breakdown */}
        {Object.entries(modalityCounts).slice(0, 3).map(([mod, count]) => (
          <Card key={mod}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{mod}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{count}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-brand h-2 rounded-full transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}

        {Object.keys(modalityCounts).length === 0 && (
          <Card className="col-span-3">
            <CardContent className="p-4 text-center text-gray-400 text-sm">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {t("stats.no_reports")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
