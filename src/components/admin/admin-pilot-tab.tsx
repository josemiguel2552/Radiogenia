"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Download, Clock, FileText, Users, Pencil, Star, Mic, CheckSquare, Printer, ChevronDown, ChevronUp, Eye } from "lucide-react";
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
  ai_findings_text: string;
  final_findings_text: string;
  ai_conclusion_text: string;
  final_conclusion_text: string;
  recommendations_text: string;
  study_type: string;
  created_at: string;
}

interface SurveyRow {
  user_name: string;
  score: number;
  feedback_text: string;
  created_at: string;
}

export function AdminPilotTab({ fixedOrgId }: { fixedOrgId?: string } = {}) {
  const t = useT();
  const [pilotOrgs, setPilotOrgs] = useState<PilotOrg[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState(fixedOrgId || "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  useEffect(() => {
    // Embedded in the Hospitals tab: lock to one hospital, skip the org picker.
    if (fixedOrgId) { setSelectedOrgId(fixedOrgId); setInitialLoading(false); return; }
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
  }, [fixedOrgId]);

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

  const reportsWithTexts = useMemo(() => {
    return metrics
      .filter((m) => m.ai_findings_text || m.final_findings_text)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [metrics]);

  const exportCsv = useCallback(() => {
    const headers = [t("pilot.col_user"), t("pilot.col_email"), t("pilot.col_type"), t("pilot.col_section"), t("pilot.col_reports"), t("pilot.col_avg_time_long"), t("pilot.col_dictation"), t("pilot.col_edit_rate"), t("pilot.col_completeness"), t("pilot.col_last")];
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

  const guideStyles = `@page{size:A4;margin:14mm 15mm;}*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1f2937;font-size:11px;line-height:1.5;}.page{page-break-after:always;}.page:last-child{page-break-after:auto;}.hdr{background:linear-gradient(135deg,#1e1b4b,#7c3aed);color:#fff;padding:16px 22px;border-radius:8px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;}.hdr h1{font-size:18px;font-weight:700;}.hdr .sub{font-size:10px;opacity:.85;margin-top:2px;}.hdr .logo{font-size:22px;font-weight:800;letter-spacing:-.5px;}h2{font-size:12.5px;font-weight:700;color:#1e1b4b;border-bottom:2px solid #7c3aed;padding-bottom:3px;margin:12px 0 7px;}h3{font-size:11px;font-weight:600;color:#374151;margin:7px 0 3px;}p{font-size:10.5px;line-height:1.5;margin-bottom:5px;}.step{display:flex;gap:9px;margin-bottom:7px;}.sn{background:#7c3aed;color:#fff;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;margin-top:1px;}.sc{flex:1;}.sc strong{font-size:10.5px;}.sc p{font-size:10px;margin-top:1px;}.tip{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:7px 11px;margin:7px 0;font-size:10px;}.tip strong{color:#166534;}.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}.cd{border:1px solid #e5e7eb;border-radius:6px;padding:7px 9px;}.cd h3{margin:0 0 3px;font-size:10px;color:#1e1b4b;}.cd p{font-size:9.5px;margin:0;}ul{padding-left:14px;margin:3px 0 7px;}li{font-size:10px;margin-bottom:2px;}.ft{text-align:center;font-size:9px;color:#9ca3af;margin-top:14px;padding-top:7px;border-top:1px solid #e5e7eb;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}@media screen{body{max-width:210mm;margin:0 auto;padding:10mm;background:#f3f4f6;}.page{background:#fff;padding:15mm;margin-bottom:10mm;box-shadow:0 1px 3px rgba(0,0,0,.1);border-radius:4px;}}`;

  const downloadRadiologistGuide = useCallback(() => {
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Radiogenia — Guía de inicio rápido</title><style>${guideStyles}</style></head><body>
<div class="page">
  <div class="hdr"><div><h1>Guía de inicio rápido</h1><div class="sub">Para radiólogos y jefes de sección</div></div><div class="logo">Radiogenia</div></div>

  <h2>¿Qué es Radiogenia?</h2>
  <p>Radiogenia es una plataforma de informes radiológicos asistida por inteligencia artificial. Permite dictar hallazgos por voz y generar automáticamente informes estructurados y completos, reduciendo el tiempo de informado y mejorando la consistencia.</p>

  <h2>Acceso a la plataforma</h2>
  <p>Accede desde cualquier navegador (Chrome, Safari, Firefox) en ordenador, tablet o móvil. Introduce tu email y contraseña, o usa tu cuenta de Google. Si es tu primera vez, recibirás una invitación por email.</p>

  <h2>Cómo crear un informe</h2>
  <div class="step"><div class="sn">1</div><div class="sc"><strong>Selecciona modalidad y región</strong><p>Elige el tipo de estudio (Rx, TC, RM, Ecografía, Mamografía, Procedimientos) y la región anatómica.</p></div></div>
  <div class="step"><div class="sn">2</div><div class="sc"><strong>Elige la plantilla</strong><p>Selecciona la plantilla que mejor se ajuste. Hay más de 180 plantillas disponibles cubriendo todas las combinaciones de modalidad y región.</p></div></div>
  <div class="step"><div class="sn">3</div><div class="sc"><strong>Dicta los hallazgos</strong><p>Pulsa el botón de micrófono y dicta de forma natural. Puedes dictar sección por sección o de forma libre — la IA organizará la información en los campos correspondientes.</p></div></div>
  <div class="step"><div class="sn">4</div><div class="sc"><strong>Revisa el informe generado</strong><p>La IA genera hallazgos estructurados y conclusión automáticamente. Revisa el texto y edita lo que consideres necesario.</p></div></div>
  <div class="step"><div class="sn">5</div><div class="sc"><strong>Copia o exporta</strong><p>Cuando el informe esté listo, cópialo al portapapeles para pegarlo en tu sistema RIS/PACS habitual.</p></div></div>

  <div class="tip"><strong>Consejo:</strong> No necesitas seguir un orden estricto al dictar. Habla de forma natural — la IA se encarga de organizar y estructurar la información en el formato correcto de la plantilla.</div>
</div>

<div class="page">
  <h2>Dictado por voz — Consejos</h2>
  <ul>
    <li>Habla con naturalidad, como si dictaras a un transcriptor humano.</li>
    <li>No es necesario deletrear ni usar comandos especiales.</li>
    <li>Puedes indicar medidas directamente: «nódulo de 12 milímetros en LSD».</li>
    <li>Para referirte a un campo, simplemente nómbralo: «en parénquima pulmonar...».</li>
    <li>El sistema funciona mejor con frases completas que con palabras sueltas.</li>
    <li>Si te equivocas, simplemente corrige editando el texto generado.</li>
  </ul>

  <h2>Plantillas disponibles</h2>
  <p>El sistema incluye plantillas predefinidas para todas las modalidades y regiones anatómicas:</p>
  <div class="g2">
    <div class="cd"><h3>Radiología convencional</h3><p>Tórax, abdomen, columna, extremidades, cráneo, senos paranasales, parrilla costal, etc.</p></div>
    <div class="cd"><h3>Tomografía computarizada</h3><p>Cráneo, cuello, tórax, abdomen, TAP, angioTC, TACAR, coronario, politraumatismo, ictus, etc.</p></div>
    <div class="cd"><h3>Resonancia magnética</h3><p>Cerebral, columna, articulaciones, abdomen, pelvis, cardíaca, mama, próstata, etc.</p></div>
    <div class="cd"><h3>Ecografía y Doppler</h3><p>Abdominal, tiroidea, mamaria, MSK, obstétrica, vascular, transfontanelar, etc.</p></div>
  </div>
  <p style="margin-top:5px;">También incluye plantillas de mamografía (tomosíntesis, CEM, galactografía) y procedimientos intervencionistas (biopsias, drenajes, infiltraciones, vertebroplastia, TACE, etc.).</p>

  <h2>RECIST 1.1 — Seguimiento oncológico</h2>
  <p>Para seguimiento oncológico, selecciona la plantilla RECIST 1.1. Permite:</p>
  <ul>
    <li>Dictar lesiones diana (máximo 5) y no diana con sus medidas.</li>
    <li>Pegar el informe RECIST previo para comparación automática.</li>
    <li>Cálculo automático: suma de diámetros, % cambio vs. basal/nadir y categoría de respuesta (RC, RP, EE, PE).</li>
  </ul>

  <h2>Plantillas personalizadas</h2>
  <p>Si necesitas una plantilla que no existe, puedes crear una personalizada desde el menú de plantillas. Quedan guardadas en tu perfil y pueden compartirse con tu sección.</p>

  <h2>Resolución de problemas</h2>
  <ul>
    <li><strong>El micrófono no funciona:</strong> da permisos de micrófono al navegador. Usa Chrome para mejor compatibilidad.</li>
    <li><strong>No genera conclusión:</strong> verifica que has dictado hallazgos en al menos un campo.</li>
    <li><strong>No encuentro mi plantilla:</strong> revisa los filtros de modalidad y región, o usa el buscador.</li>
  </ul>

  <div class="ft">
    <p>Radiogenia — Informes radiológicos inteligentes</p>
    <p>Para soporte técnico, contacta con el administrador de tu centro.</p>
  </div>
</div></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }, []);

  const downloadChiefGuide = useCallback(() => {
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Radiogenia — Guía del jefe de servicio</title><style>${guideStyles}</style></head><body>
<div class="page">
  <div class="hdr"><div><h1>Guía del jefe de servicio</h1><div class="sub">Funciones de gestión y administración</div></div><div class="logo">Radiogenia</div></div>

  <h2>¿Qué es Radiogenia?</h2>
  <p>Radiogenia es una plataforma de informes radiológicos asistida por IA. Los radiólogos dictan hallazgos por voz y la IA genera informes estructurados completos, mejorando la eficiencia y la consistencia del informado. El uso clínico sigue un flujo sencillo: seleccionar plantilla, dictar hallazgos, revisar borrador de IA, editar si es necesario y copiar al RIS.</p>
  <p>Para una guía detallada del flujo de dictado, consulte el documento <em>«Guía de inicio rápido para radiólogos»</em>, que se distribuye a todo el equipo.</p>

  <h2>Tu perfil como jefe de servicio</h2>
  <p>Como jefe de servicio, tienes acceso a funciones de gestión adicionales no disponibles para el resto de radiólogos.</p>

  <h3>1. Gestión de secciones</h3>
  <p>Desde la configuración de tu organización puedes ver y gestionar las secciones del servicio (neurorradiología, abdomen, MSK, tórax, mama, etc.). Cada sección puede tener un jefe de sección que gestiona sus propios miembros y plantillas.</p>

  <h3>2. Gestión de usuarios</h3>
  <p>Puedes invitar nuevos miembros al servicio mediante email. Cada usuario se asigna a una o más secciones con su rol correspondiente (radiólogo o jefe de sección). Tú como jefe de servicio tienes visibilidad sobre todas las secciones.</p>

  <h3>3. Plantillas del servicio</h3>
  <p>Además de las +180 plantillas globales, puedes crear plantillas personalizadas a nivel de servicio disponibles para todos los radiólogos de tu hospital. Esto permite estandarizar el formato de informes según los protocolos de tu centro.</p>

  <h3>4. Panel de actividad del servicio</h3>
  <p>Tienes acceso a un panel con estadísticas del uso de la plataforma en tu servicio:</p>
  <ul>
    <li>Número total de informes generados y volumen diario.</li>
    <li>Tiempo medio de informado por estudio.</li>
    <li>Tasa de uso del dictado por voz frente a escritura manual.</li>
    <li>Grado de completitud de las secciones de las plantillas.</li>
    <li>Porcentaje de edición sobre el borrador generado por la IA.</li>
    <li>Tendencias de uso a lo largo del tiempo.</li>
  </ul>
  <p>Esta información permite evaluar la adopción de la herramienta, detectar áreas de mejora y justificar la inversión con datos objetivos.</p>
</div>

<div class="page">
  <h2>Métricas durante el periodo piloto</h2>
  <p>Durante la fase de prueba, se recopilan métricas de uso para evaluar el impacto de la herramienta. Como jefe de servicio podrás acceder a un informe detallado que incluye:</p>
  <ul>
    <li><strong>Resumen ejecutivo:</strong> visión general del periodo con datos clave de uso.</li>
    <li><strong>Tendencias diarias:</strong> evolución del volumen y tiempos de informado.</li>
    <li><strong>Desglose por usuario:</strong> actividad individualizada de cada radiólogo (informes, tiempos, tasa de dictado y edición).</li>
    <li><strong>Encuesta de satisfacción:</strong> valoración del equipo sobre la herramienta (1-5).</li>
    <li><strong>Análisis automático:</strong> insights generados sobre adopción, calidad y eficiencia.</li>
  </ul>
  <p>Este informe puede exportarse en CSV o imprimirse en PDF desde el panel de administración.</p>

  <h2>Cómo invitar nuevos usuarios</h2>
  <div class="step"><div class="sn">1</div><div class="sc"><p>Accede a la configuración de tu organización desde el menú lateral.</p></div></div>
  <div class="step"><div class="sn">2</div><div class="sc"><p>En la sección de miembros, introduce el email del nuevo radiólogo.</p></div></div>
  <div class="step"><div class="sn">3</div><div class="sc"><p>Selecciona su sección y rol. El usuario recibirá un email de invitación automático.</p></div></div>

  <h2>Buenas prácticas para el piloto</h2>
  <ul>
    <li>Anima al equipo a empezar con estudios rutinarios antes de pasar a casos complejos.</li>
    <li>Recoge feedback informal de los radiólogos durante las primeras semanas.</li>
    <li>Revisa las métricas semanalmente para detectar patrones de uso y posibles problemas.</li>
    <li>Si la tasa de edición es alta en alguna plantilla concreta, puede necesitar ajustes — contacta con soporte.</li>
    <li>Aprovecha la encuesta de satisfacción integrada para medir la percepción del equipo.</li>
  </ul>

  <h2>Resolución de problemas</h2>
  <ul>
    <li><strong>Un usuario no puede acceder:</strong> verifica que la invitación se envió correctamente y que aceptó el email.</li>
    <li><strong>Plantillas no visibles:</strong> comprueba que están publicadas y asignadas a las secciones correctas.</li>
    <li><strong>Problemas con el micrófono:</strong> recomienda Chrome y verificar permisos del navegador.</li>
  </ul>

  <div class="ft">
    <p>Radiogenia — Informes radiológicos inteligentes</p>
    <p>Para soporte técnico, contacta con soporte@radiogen.ai</p>
    <p style="margin-top:2px;font-style:italic;">Documento confidencial — Uso exclusivo del jefe de servicio.</p>
  </div>
</div></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }, []);

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

  // When embedded for a specific hospital (fixedOrgId), we intentionally don't
  // load the pilot-orgs list — so an empty pilotOrgs must NOT be treated as
  // "no org selected", or the render would force the zeroed empty state even
  // when metrics have loaded.
  const noPilotOrgs = !fixedOrgId && pilotOrgs.length === 0;

  return (
    <div className="space-y-6">
      {noPilotOrgs && !fixedOrgId && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">{t("pilot.no_pilot_orgs")} — {t("pilot.mark_pilot_hint")}</p>
        </div>
      )}

      {/* Downloadable pilot guides */}
      <div className={`rounded-lg border border-white/10 bg-white/5 dark:bg-gray-900/50 p-3 ${fixedOrgId ? "hidden" : ""}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t("pilot.guides")}:</span>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={downloadRadiologistGuide}>
            <FileText className="h-3.5 w-3.5" />
            {t("pilot.guide_radiologist")}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={downloadChiefGuide}>
            <FileText className="h-3.5 w-3.5" />
            {t("pilot.guide_chief")}
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">{t("pilot.guides_hint")}</p>
      </div>

      {/* Controls */}
      {(!noPilotOrgs || fixedOrgId) && (
        <div className="flex flex-wrap gap-3 items-end">
          {!fixedOrgId && (
          <div className="min-w-[200px]">
            <label className="text-[11px] font-medium text-gray-500 mb-1 block">{t("pilot.select_org")}</label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={t("pilot.select_org")} /></SelectTrigger>
              <SelectContent>
                {pilotOrgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          )}
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
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-brand" /></div>
      ) : (!noPilotOrgs && !selectedOrgId) ? null : (noPilotOrgs || metrics.length === 0) ? (
        <>
          {/* Summary cards — zeroed when no data */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1"><Clock className="h-3.5 w-3.5" /><span className="text-[10px]">{t("pilot.avg_time")}</span></div>
              <p className="text-xl font-bold text-gray-300 dark:text-gray-600">0:00</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1"><FileText className="h-3.5 w-3.5" /><span className="text-[10px]">{t("pilot.total_reports")}</span></div>
              <p className="text-xl font-bold text-gray-300 dark:text-gray-600">0</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1"><Users className="h-3.5 w-3.5" /><span className="text-[10px]">{t("pilot.active_users")}</span></div>
              <p className="text-xl font-bold text-gray-300 dark:text-gray-600">0</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1"><Mic className="h-3.5 w-3.5" /><span className="text-[10px]">{t("pilot.adoption_rate")}</span></div>
              <p className="text-xl font-bold text-gray-300 dark:text-gray-600">0%</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1"><CheckSquare className="h-3.5 w-3.5" /><span className="text-[10px]">{t("pilot.completeness")}</span></div>
              <p className="text-xl font-bold text-gray-300 dark:text-gray-600">0%</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1"><Pencil className="h-3.5 w-3.5" /><span className="text-[10px]">{t("pilot.edit_rate")}</span></div>
              <p className="text-xl font-bold text-gray-300 dark:text-gray-600">0%</p>
            </div>
          </div>

          {/* Empty chart placeholders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">{t("pilot.time_per_report")}</h3>
              <div className="h-[200px] flex items-center justify-center text-xs text-gray-300 dark:text-gray-600">{t("pilot.no_data")}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">{t("pilot.reports_per_day")}</h3>
              <div className="h-[200px] flex items-center justify-center text-xs text-gray-300 dark:text-gray-600">{t("pilot.no_data")}</div>
            </div>
          </div>

          {/* Empty user table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t("pilot.user_breakdown")}</h3>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800">
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
              <tbody>
                <tr><td colSpan={8} className="text-center py-8 text-gray-300 dark:text-gray-600">{t("pilot.no_data")}</td></tr>
              </tbody>
            </table>
          </div>

          {/* NPS placeholder */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t("pilot.nps_results")}</h3>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                <span className="text-lg font-bold text-gray-300 dark:text-gray-600">0</span>
                <span className="text-xs text-gray-400">/ 5 (0)</span>
              </div>
            </div>
            <p className="text-xs text-gray-300 dark:text-gray-600 text-center py-4">{t("pilot.no_data")}</p>
          </div>
        </>
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
                        <Badge variant="outline" className={`text-[9px] ${u.staff === "resident" ? "border-violet-400/50 text-violet-600" : "border-gray-300 text-gray-500"}`}>
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

          {/* Report detail — original vs edited */}
          {reportsWithTexts.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  {t("pilot.report_detail")}
                </h3>
                <span className="text-[10px] text-gray-400">{reportsWithTexts.length}</span>
              </div>
              <ScrollArea className="max-h-[600px]">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {reportsWithTexts.map((m) => {
                    const isExpanded = expandedReport === m.id;
                    const findingsChanged = m.final_findings_text && m.ai_findings_text && m.final_findings_text !== m.ai_findings_text;
                    const conclusionChanged = m.final_conclusion_text && m.ai_conclusion_text && m.final_conclusion_text !== m.ai_conclusion_text;
                    const hasChanges = findingsChanged || conclusionChanged;
                    const editPct = m.ai_draft_length > 0 ? Math.round(Math.min(1, m.edit_distance / m.ai_draft_length) * 100) : 0;
                    return (
                      <div key={m.id}>
                        <button
                          type="button"
                          onClick={() => setExpandedReport(isExpanded ? null : m.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-gray-900 dark:text-white">{m.user_name}</span>
                              {m.study_type && <span className="text-[10px] text-gray-400 truncate">{m.study_type}</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[10px] text-gray-400">{m.created_at.slice(0, 16).replace("T", " ")}</span>
                              {hasChanges ? (
                                <Badge variant="outline" className="text-[9px] border-amber-400/50 text-amber-600">{editPct}% {t("pilot.edit_rate").toLowerCase()}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] border-violet-400/50 text-violet-600">{t("pilot.no_changes")}</Badge>
                              )}
                              {m.recommendations_text && (
                                <Badge variant="outline" className="text-[9px] border-blue-400/50 text-blue-600">{t("pilot.recommendations")}</Badge>
                              )}
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3">
                            {/* Findings comparison */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              <div>
                                <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1">{t("pilot.ai_findings")}</p>
                                <div className="rounded-md bg-gray-50 dark:bg-gray-800 p-2.5 text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                                  {m.ai_findings_text || "—"}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold mb-1" style={{ color: findingsChanged ? "#d97706" : "#059669" }}>
                                  {t("pilot.final_findings")} {findingsChanged ? "✎" : "✓"}
                                </p>
                                <div className={`rounded-md p-2.5 text-[11px] leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto ${findingsChanged ? "bg-amber-50 dark:bg-amber-950/20 text-gray-700 dark:text-gray-300" : "bg-violet-50 dark:bg-violet-950/20 text-gray-700 dark:text-gray-300"}`}>
                                  {m.final_findings_text || m.ai_findings_text || "—"}
                                </div>
                              </div>
                            </div>
                            {/* Conclusion comparison */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              <div>
                                <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1">{t("pilot.ai_conclusion")}</p>
                                <div className="rounded-md bg-gray-50 dark:bg-gray-800 p-2.5 text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                  {m.ai_conclusion_text || "—"}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold mb-1" style={{ color: conclusionChanged ? "#d97706" : "#059669" }}>
                                  {t("pilot.final_conclusion")} {conclusionChanged ? "✎" : "✓"}
                                </p>
                                <div className={`rounded-md p-2.5 text-[11px] leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto ${conclusionChanged ? "bg-amber-50 dark:bg-amber-950/20 text-gray-700 dark:text-gray-300" : "bg-violet-50 dark:bg-violet-950/20 text-gray-700 dark:text-gray-300"}`}>
                                  {m.final_conclusion_text || m.ai_conclusion_text || "—"}
                                </div>
                              </div>
                            </div>
                            {/* Recommendations */}
                            {m.recommendations_text && (
                              <div>
                                <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1">{t("pilot.recommendations")}</p>
                                <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-2.5 text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {m.recommendations_text}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </>
      )}
    </div>
  );
}
