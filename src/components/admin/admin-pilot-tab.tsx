"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Download, Clock, FileText, Users, Pencil, Star, Mic, CheckSquare } from "lucide-react";
import { useT } from "@/lib/i18n";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface PilotOrg {
  id: string;
  name: string;
}

interface MetricRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  staff_type: string;
  section: string;
  report_start_at: string;
  report_end_at: string;
  duration_seconds: number;
  dictation_chars: number;
  manual_chars: number;
  total_chars: number;
  template_sections_total: number;
  template_sections_filled: number;
  ai_draft_length: number;
  final_length: number;
  edit_distance: number;
  created_at: string;
}

interface SurveyRow {
  user_name: string;
  score: number;
  feedback_text: string;
  created_at: string;
}

export function AdminPilotTab() {
  const t = useT();
  const [pilotOrgs, setPilotOrgs] = useState<PilotOrg[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/pilot")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.pilot_orgs) {
          setPilotOrgs(data.pilot_orgs);
          if (data.pilot_orgs.length === 1) setSelectedOrgId(data.pilot_orgs[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  const loadMetrics = useCallback(async () => {
    if (!selectedOrgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ org_id: selectedOrgId });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/admin/pilot?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || []);
        setSurveys(data.surveys || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedOrgId, fromDate, toDate]);

  useEffect(() => {
    if (selectedOrgId) loadMetrics();
  }, [selectedOrgId, loadMetrics]);

  const validMetrics = useMemo(() => metrics.filter((m) => m.duration_seconds > 0 && m.duration_seconds < 7200), [metrics]);

  const summary = useMemo(() => {
    if (validMetrics.length === 0) return null;
    const avgDuration = validMetrics.reduce((s, m) => s + m.duration_seconds, 0) / validMetrics.length;
    const totalReports = metrics.length;
    const activeUsers = new Set(metrics.map((m) => m.user_id)).size;

    const withEdits = validMetrics.filter((m) => m.ai_draft_length > 0);
    const avgEditRate = withEdits.length > 0
      ? withEdits.reduce((s, m) => s + Math.min(1, m.edit_distance / m.ai_draft_length), 0) / withEdits.length
      : 0;

    const withSections = validMetrics.filter((m) => m.template_sections_total > 0);
    const avgCompleteness = withSections.length > 0
      ? withSections.reduce((s, m) => s + m.template_sections_filled / m.template_sections_total, 0) / withSections.length
      : 0;

    const totalDictation = metrics.reduce((s, m) => s + m.dictation_chars, 0);
    const totalAll = metrics.reduce((s, m) => s + Math.max(1, m.total_chars), 0);
    const adoptionRate = totalDictation / totalAll;

    return { avgDuration, totalReports, activeUsers, avgEditRate, avgCompleteness, adoptionRate };
  }, [validMetrics, metrics]);

  const dailyData = useMemo(() => {
    const map = new Map<string, { durations: number[]; count: number }>();
    for (const m of validMetrics) {
      const day = m.created_at.slice(0, 10);
      if (!map.has(day)) map.set(day, { durations: [], count: 0 });
      const entry = map.get(day)!;
      entry.durations.push(m.duration_seconds);
      entry.count++;
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, { durations, count }]) => ({
        day: day.slice(5),
        avgMin: Math.round(durations.reduce((s, d) => s + d, 0) / durations.length / 60 * 10) / 10,
        count,
      }));
  }, [validMetrics]);

  const userBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; email: string; staff: string; section: string; durations: number[]; dictChars: number; totalChars: number; editDists: number[]; draftLens: number[]; sectionsFilled: number; sectionsTotal: number; lastAt: string }>();
    for (const m of metrics) {
      if (!map.has(m.user_id)) {
        map.set(m.user_id, { name: m.user_name, email: m.user_email, staff: m.staff_type, section: m.section, durations: [], dictChars: 0, totalChars: 0, editDists: [], draftLens: [], sectionsFilled: 0, sectionsTotal: 0, lastAt: m.created_at });
      }
      const u = map.get(m.user_id)!;
      if (m.duration_seconds > 0 && m.duration_seconds < 7200) u.durations.push(m.duration_seconds);
      u.dictChars += m.dictation_chars;
      u.totalChars += Math.max(1, m.total_chars);
      if (m.ai_draft_length > 0) { u.editDists.push(m.edit_distance); u.draftLens.push(m.ai_draft_length); }
      u.sectionsFilled += m.template_sections_filled;
      u.sectionsTotal += m.template_sections_total;
      if (m.created_at > u.lastAt) u.lastAt = m.created_at;
    }
    return Array.from(map.values())
      .map((u) => ({
        name: u.name,
        email: u.email,
        staff: u.staff,
        section: u.section,
        reports: u.durations.length || 1,
        avgMin: u.durations.length > 0 ? Math.round(u.durations.reduce((s, d) => s + d, 0) / u.durations.length / 60 * 10) / 10 : 0,
        dictPct: Math.round(u.dictChars / u.totalChars * 100),
        editPct: u.draftLens.length > 0 ? Math.round(u.editDists.reduce((s, d, i) => s + Math.min(1, d / u.draftLens[i]), 0) / u.draftLens.length * 100) : 0,
        completePct: u.sectionsTotal > 0 ? Math.round(u.sectionsFilled / u.sectionsTotal * 100) : 0,
        lastAt: u.lastAt.slice(0, 10),
      }))
      .sort((a, b) => b.reports - a.reports);
  }, [metrics]);

  const npsAvg = useMemo(() => {
    if (surveys.length === 0) return 0;
    return Math.round(surveys.reduce((s, r) => s + r.score, 0) / surveys.length * 10) / 10;
  }, [surveys]);

  const exportCsv = useCallback(() => {
    const headers = ["Usuario", "Email", "Tipo", "Sección", "Informes", "Tiempo medio (min)", "Dictado %", "Edición %", "Completitud %", "Última actividad"];
    const rows = userBreakdown.map((u) => [u.name, u.email, u.staff, u.section, u.reports, u.avgMin, u.dictPct, u.editPct, u.completePct, u.lastAt].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pilot_metrics_${selectedOrgId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [userBreakdown, selectedOrgId]);

  const fmtMin = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (initialLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>;
  }

  if (pilotOrgs.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-gray-500">{t("pilot.no_pilot_orgs")}</p>
        <p className="text-xs text-gray-400 mt-1">{t("pilot.mark_pilot_hint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[200px]">
          <label className="text-[11px] font-medium text-gray-500 mb-1 block">{t("pilot.select_org")}</label>
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={t("pilot.select_org")} /></SelectTrigger>
            <SelectContent>
              {pilotOrgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-gray-500 mb-1 block">{t("pilot.from")}</label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 text-xs w-[140px]" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-gray-500 mb-1 block">{t("pilot.to")}</label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 text-xs w-[140px]" />
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9" onClick={exportCsv} disabled={userBreakdown.length === 0}>
          <Download className="h-3.5 w-3.5" />
          {t("pilot.export_csv")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-brand" /></div>
      ) : !selectedOrgId ? null : metrics.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">{t("pilot.no_data")}</div>
      ) : (
        <>
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1"><Clock className="h-3.5 w-3.5" /><span className="text-[10px]">{t("pilot.avg_time")}</span></div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{fmtMin(summary.avgDuration)}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1"><FileText className="h-3.5 w-3.5" /><span className="text-[10px]">{t("pilot.total_reports")}</span></div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.totalReports}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1"><Users className="h-3.5 w-3.5" /><span className="text-[10px]">{t("pilot.active_users")}</span></div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.activeUsers}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1"><Mic className="h-3.5 w-3.5" /><span className="text-[10px]">{t("pilot.adoption_rate")}</span></div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(summary.adoptionRate * 100)}%</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1"><CheckSquare className="h-3.5 w-3.5" /><span className="text-[10px]">{t("pilot.completeness")}</span></div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(summary.avgCompleteness * 100)}%</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1"><Pencil className="h-3.5 w-3.5" /><span className="text-[10px]">{t("pilot.edit_rate")}</span></div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(summary.avgEditRate * 100)}%</p>
              </div>
            </div>
          )}

          {/* Charts */}
          {dailyData.length > 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">{t("pilot.time_per_report")}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit=" min" />
                    <Tooltip formatter={(v) => [`${v} min`, t("pilot.avg_time")]} />
                    <Line type="monotone" dataKey="avgMin" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">{t("pilot.reports_per_day")}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [v, t("pilot.total_reports")]} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Per-user table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t("pilot.user_breakdown")}</h3>
            </div>
            <ScrollArea className="max-h-[400px]">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">{t("pilot.col_user")}</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">{t("pilot.col_type")}</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-500">{t("pilot.col_reports")}</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-500">{t("pilot.col_avg_time")}</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-500">{t("pilot.col_dictation")}</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-500">{t("pilot.col_completeness")}</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-500">{t("pilot.col_edit_rate")}</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-500">{t("pilot.col_last")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {userBreakdown.map((u, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                        {u.section && <p className="text-[10px] text-gray-400">{u.section}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`text-[9px] ${u.staff === "resident" ? "border-emerald-400/50 text-emerald-600" : "border-gray-300 text-gray-500"}`}>
                          {u.staff === "resident" ? t("admin.org.staff_resident") : t("admin.org.staff_attending")}
                        </Badge>
                      </td>
                      <td className="text-center px-3 py-2 font-medium">{u.reports}</td>
                      <td className="text-center px-3 py-2">{u.avgMin} min</td>
                      <td className="text-center px-3 py-2">{u.dictPct}%</td>
                      <td className="text-center px-3 py-2">{u.completePct}%</td>
                      <td className="text-center px-3 py-2">{u.editPct}%</td>
                      <td className="text-center px-3 py-2 text-gray-400">{u.lastAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>

          {/* NPS results */}
          {surveys.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t("pilot.nps_results")}</h3>
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{npsAvg}</span>
                  <span className="text-xs text-gray-400">/ 5 ({surveys.length})</span>
                </div>
              </div>
              <div className="space-y-2">
                {surveys.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`h-3 w-3 ${n <= s.score ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{s.user_name}</span>
                      {s.feedback_text && <p className="text-[11px] text-gray-500 mt-0.5">{s.feedback_text}</p>}
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{s.created_at.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
