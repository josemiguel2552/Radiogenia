"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Download, Clock, FileText, Users, Pencil, Star, Mic, CheckSquare, Printer } from "lucide-react";
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

  const printReport = useCallback(() => {
    if (!summary) return;
    const orgName = pilotOrgs.find((o) => o.id === selectedOrgId)?.name || "";
    const genDate = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    const rangeFrom = fromDate || "inicio";
    const rangeTo = toDate || "hoy";
    const fmtMinPrint = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = Math.round(sec % 60);
      return `${m}:${s.toString().padStart(2, "0")}`;
    };
    const adoptionPct = Math.round(summary.adoptionRate * 100);
    const completenessPct = Math.round(summary.avgCompleteness * 100);
    const editPct = Math.round(summary.avgEditRate * 100);

    // Generate insights
    const insights: string[] = [];
    if (adoptionPct >= 70) insights.push(`La tasa de adopción del dictado es alta (${adoptionPct}%), lo que indica buena aceptación de la herramienta.`);
    else if (adoptionPct >= 40) insights.push(`La tasa de adopción del dictado es moderada (${adoptionPct}%). Hay margen de mejora en el uso de la funcionalidad de dictado.`);
    else insights.push(`La tasa de adopción del dictado es baja (${adoptionPct}%). Se recomienda formación adicional sobre la funcionalidad de dictado.`);

    if (completenessPct >= 80) insights.push(`La completitud de secciones es excelente (${completenessPct}%), los informes se rellenan de forma exhaustiva.`);
    else if (completenessPct >= 50) insights.push(`La completitud de secciones es aceptable (${completenessPct}%), aunque algunas secciones quedan sin rellenar.`);
    else insights.push(`La completitud de secciones es baja (${completenessPct}%). Muchas secciones de los informes quedan vacías.`);

    if (editPct <= 20) insights.push(`La tasa de edición sobre el borrador de IA es muy baja (${editPct}%), lo que indica alta calidad del borrador automático.`);
    else if (editPct <= 50) insights.push(`La tasa de edición sobre el borrador de IA es moderada (${editPct}%), los médicos realizan ajustes razonables.`);
    else insights.push(`La tasa de edición sobre el borrador de IA es alta (${editPct}%). Se recomienda revisar la calidad de las plantillas de IA.`);

    if (dailyData.length >= 2) {
      const firstAvg = dailyData[0].avgMin;
      const lastAvg = dailyData[dailyData.length - 1].avgMin;
      if (lastAvg < firstAvg) insights.push(`El tiempo medio por informe ha disminuido de ${firstAvg} min a ${lastAvg} min, mostrando mejora en eficiencia.`);
      else if (lastAvg > firstAvg) insights.push(`El tiempo medio por informe ha aumentado de ${firstAvg} min a ${lastAvg} min. Puede requerir atención.`);
    }

    if (surveys.length > 0) {
      if (npsAvg >= 4) insights.push(`La satisfacción de los usuarios es alta con una puntuación media de ${npsAvg}/5.`);
      else if (npsAvg >= 3) insights.push(`La satisfacción de los usuarios es aceptable (${npsAvg}/5), con margen de mejora.`);
      else insights.push(`La satisfacción de los usuarios es baja (${npsAvg}/5). Se recomienda recoger feedback cualitativo adicional.`);
    }

    // Executive summary
    const execSummary = `Durante el periodo analizado (${rangeFrom} - ${rangeTo}), ${summary.activeUsers} usuarios activos generaron ${summary.totalReports} informes con un tiempo medio de ${fmtMinPrint(summary.avgDuration)} por informe. La tasa de adopción del dictado alcanzó el ${adoptionPct}% y la completitud media de secciones fue del ${completenessPct}%.`;

    // Daily trend bars
    const maxCount = Math.max(...dailyData.map((d) => d.count), 1);
    const maxAvg = Math.max(...dailyData.map((d) => d.avgMin), 1);

    const dailyRowsHtml = dailyData.map((d) => {
      const countBarW = Math.round((d.count / maxCount) * 100);
      const avgBarW = Math.round((d.avgMin / maxAvg) * 100);
      return `<tr>
        <td style="padding:3px 8px;border:1px solid #e5e7eb;font-size:10px;white-space:nowrap;">${d.day}</td>
        <td style="padding:3px 8px;border:1px solid #e5e7eb;font-size:10px;text-align:right;">${d.count}</td>
        <td style="padding:3px 4px;border:1px solid #e5e7eb;width:120px;"><div style="background:#6366f1;height:12px;width:${countBarW}%;border-radius:2px;"></div></td>
        <td style="padding:3px 8px;border:1px solid #e5e7eb;font-size:10px;text-align:right;">${d.avgMin}</td>
        <td style="padding:3px 4px;border:1px solid #e5e7eb;width:120px;"><div style="background:#10b981;height:12px;width:${avgBarW}%;border-radius:2px;"></div></td>
      </tr>`;
    }).join("");

    // User breakdown rows
    const userRowsHtml = userBreakdown.map((u) =>
      `<tr>
        <td style="padding:3px 6px;border:1px solid #e5e7eb;font-size:10px;">${u.name}</td>
        <td style="padding:3px 6px;border:1px solid #e5e7eb;font-size:10px;">${u.staff === "resident" ? "Residente" : "Adjunto"}</td>
        <td style="padding:3px 6px;border:1px solid #e5e7eb;font-size:10px;text-align:center;">${u.reports}</td>
        <td style="padding:3px 6px;border:1px solid #e5e7eb;font-size:10px;text-align:center;">${u.avgMin} min</td>
        <td style="padding:3px 6px;border:1px solid #e5e7eb;font-size:10px;text-align:center;">${u.dictPct}%</td>
        <td style="padding:3px 6px;border:1px solid #e5e7eb;font-size:10px;text-align:center;">${u.completePct}%</td>
        <td style="padding:3px 6px;border:1px solid #e5e7eb;font-size:10px;text-align:center;">${u.editPct}%</td>
      </tr>`
    ).join("");

    // NPS rows
    const npsRowsHtml = surveys.map((s) =>
      `<tr>
        <td style="padding:3px 6px;border:1px solid #e5e7eb;font-size:10px;">${s.user_name}</td>
        <td style="padding:3px 6px;border:1px solid #e5e7eb;font-size:10px;text-align:center;">${"★".repeat(s.score)}${"☆".repeat(5 - s.score)}</td>
        <td style="padding:3px 6px;border:1px solid #e5e7eb;font-size:10px;">${s.feedback_text || "-"}</td>
        <td style="padding:3px 6px;border:1px solid #e5e7eb;font-size:10px;white-space:nowrap;">${s.created_at.slice(0, 10)}</td>
      </tr>`
    ).join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Informe de Métricas del Piloto - Radiogenia</title>
<style>
  @page { size: A4; margin: 15mm 15mm 15mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; font-size: 11px; line-height: 1.4; }
  .page { page-break-after: always; padding: 0; }
  .page:last-child { page-break-after: auto; }
  .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 16px; }
  .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .header p { font-size: 11px; opacity: 0.9; }
  .section { margin-bottom: 14px; }
  .section h2 { font-size: 13px; font-weight: 700; color: #4f46e5; border-bottom: 2px solid #6366f1; padding-bottom: 4px; margin-bottom: 8px; }
  .section h3 { font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 6px; }
  .summary-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; font-size: 11px; line-height: 1.6; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f3f4f6; padding: 4px 6px; text-align: left; font-size: 10px; font-weight: 600; border: 1px solid #e5e7eb; color: #374151; }
  .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
  .metric-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; text-align: center; }
  .metric-card .value { font-size: 20px; font-weight: 700; color: #4f46e5; }
  .metric-card .label { font-size: 9px; color: #6b7280; margin-top: 2px; }
  .insight { padding: 4px 0; font-size: 10px; line-height: 1.5; }
  .insight::before { content: "\\2022"; color: #6366f1; font-weight: bold; margin-right: 6px; }
  .footer { text-align: center; font-size: 9px; color: #9ca3af; margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
  @media screen {
    body { max-width: 210mm; margin: 0 auto; padding: 10mm; background: #f3f4f6; }
    .page { background: white; padding: 15mm; margin-bottom: 10mm; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px; }
  }
</style>
</head>
<body>
<!-- PAGE 1 -->
<div class="page">
  <div class="header">
    <h1>Informe de Métricas del Piloto - Radiogenia</h1>
    <p><strong>${orgName}</strong> &nbsp;|&nbsp; Periodo: ${rangeFrom} a ${rangeTo} &nbsp;|&nbsp; Generado: ${genDate}</p>
  </div>

  <div class="section">
    <h2>Resumen ejecutivo</h2>
    <div class="summary-box">${execSummary}</div>
  </div>

  <div class="section">
    <h2>Estadísticas generales</h2>
    <div class="metrics-grid">
      <div class="metric-card"><div class="value">${fmtMinPrint(summary.avgDuration)}</div><div class="label">Tiempo medio / informe</div></div>
      <div class="metric-card"><div class="value">${summary.totalReports}</div><div class="label">Total de informes</div></div>
      <div class="metric-card"><div class="value">${summary.activeUsers}</div><div class="label">Usuarios activos</div></div>
      <div class="metric-card"><div class="value">${adoptionPct}%</div><div class="label">Tasa de adopción dictado</div></div>
      <div class="metric-card"><div class="value">${completenessPct}%</div><div class="label">Completitud secciones</div></div>
      <div class="metric-card"><div class="value">${editPct}%</div><div class="label">Tasa de edición IA</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Tendencias diarias</h2>
    <table>
      <thead><tr>
        <th>Día</th><th style="text-align:right">Informes</th><th>Vol.</th><th style="text-align:right">Tiempo (min)</th><th>Tiempo</th>
      </tr></thead>
      <tbody>${dailyRowsHtml}</tbody>
    </table>
  </div>
</div>

<!-- PAGE 2 -->
<div class="page">
  <div class="section">
    <h2>Desglose por usuario</h2>
    <table>
      <thead><tr>
        <th>Usuario</th><th>Tipo</th><th style="text-align:center">Informes</th><th style="text-align:center">T. medio</th><th style="text-align:center">Dictado</th><th style="text-align:center">Completitud</th><th style="text-align:center">Edición</th>
      </tr></thead>
      <tbody>${userRowsHtml}</tbody>
    </table>
  </div>

  ${surveys.length > 0 ? `
  <div class="section" style="margin-top:18px;">
    <h2>Resultados NPS</h2>
    <p style="font-size:11px;margin-bottom:8px;">Puntuación media: <strong style="color:#4f46e5;font-size:14px;">${npsAvg}</strong> / 5 &nbsp;(${surveys.length} respuestas)</p>
    <table>
      <thead><tr>
        <th>Usuario</th><th style="text-align:center">Puntuación</th><th>Comentario</th><th>Fecha</th>
      </tr></thead>
      <tbody>${npsRowsHtml}</tbody>
    </table>
  </div>` : ""}
</div>

<!-- PAGE 3 -->
<div class="page">
  <div class="section">
    <h2>Análisis e insights</h2>
    <div class="summary-box">
      ${insights.map((ins) => `<div class="insight">${ins}</div>`).join("")}
    </div>
  </div>

  <div class="footer">
    <p>Informe generado automáticamente por Radiogenia &mdash; ${genDate}</p>
    <p style="margin-top:2px;">Este documento es confidencial y para uso interno del hospital.</p>
  </div>
</div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }, [summary, dailyData, userBreakdown, surveys, npsAvg, pilotOrgs, selectedOrgId, fromDate, toDate]);

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
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9" onClick={printReport} disabled={!summary}>
          <Printer className="h-3.5 w-3.5" />
          {t("pilot.print_report")}
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
