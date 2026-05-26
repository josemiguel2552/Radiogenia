"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText } from "lucide-react";
import { useT } from "@/lib/i18n";

const S = {
  h2: 'color:#2563eb;border-bottom:2px solid #e2e8f0;padding-bottom:4px;font-size:14px;margin:18px 0 6px;',
  h3: 'color:#1e40af;font-size:12px;margin:10px 0 4px;',
  p: 'font-size:10px;margin:0 0 6px;line-height:1.5;',
  ul: 'font-size:10px;margin:0 0 6px;padding-left:16px;line-height:1.5;',
  th: 'text-align:left;padding:4px 6px;border:1px solid #e2e8f0;font-size:9px;background:#f8fafc;',
  td: 'padding:4px 6px;border:1px solid #e2e8f0;font-size:9px;',
  tbl: 'width:100%;border-collapse:collapse;margin:4px 0 8px;',
};

function getManualHTML(): string {
  return `
<div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;line-height:1.5;max-width:100%;">

<div style="text-align:center;padding:20px 0 12px;border-bottom:3px solid #2563eb;">
  <h1 style="font-size:22px;font-weight:700;color:#2563eb;margin:0;">Radiogen.AI</h1>
  <p style="font-size:13px;color:#475569;margin:4px 0 0;">Manual para Hospitales y Radiólogos</p>
  <p style="font-size:9px;color:#94a3b8;margin:4px 0 0;">Versión 2.0 — 2025 | Documento confidencial</p>
</div>

<h2 style="${S.h2}">1. Introducción</h2>
<p style="${S.p}"><strong>Radiogen.AI</strong> es un asistente de informes radiológicos con IA que genera borradores estructurados a partir de dictado por voz o texto libre. Funciona desde cualquier navegador, sin instalación. Soporta informes en español, inglés y portugués.</p>
<div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:6px 10px;border-radius:3px;font-size:9px;margin:0 0 8px;">
  <strong>Importante:</strong> Los textos generados son <strong>borradores</strong> que deben ser validados por el radiólogo antes de su uso clínico.
</div>

<h2 style="${S.h2}">2. Flujo de trabajo</h2>
<div style="background:#f1f5f9;border-left:3px solid #2563eb;padding:6px 10px;border-radius:3px;font-size:9px;margin:0 0 8px;">
  1. Seleccionar modalidad y plantilla &rarr; 2. Dictar o escribir hallazgos &rarr; 3. Generar hallazgos (IA) &rarr; 4. Revisar y editar &rarr; 5. Generar conclusión (IA) &rarr; 6. Añadir recomendaciones &rarr; 7. Copiar al RIS/PACS
</div>

<div style="display:flex;gap:12px;">
<div style="flex:1;">
<h2 style="${S.h2}">3. Dictado por voz</h2>
<ul style="${S.ul}">
  <li>Pulse el micrófono, dicte (máx. 120s/clip) y pulse para detener.</li>
  <li>Idiomas: español, inglés, portugués o auto-detección.</li>
  <li>Corrección automática de terminología médica.</li>
  <li>Cuota mensual: Free 30 min | Residente/Starter 120 min | Pro 300 min.</li>
</ul>
</div>
<div style="flex:1;">
<h2 style="${S.h2}">4. Opciones de generación</h2>
<table style="${S.tbl}">
  <tr><th style="${S.th}">Parámetro</th><th style="${S.th}">Opciones</th></tr>
  <tr><td style="${S.td}">Longitud hallazgos</td><td style="${S.td}">Concisa / Estándar / Detallada</td></tr>
  <tr><td style="${S.td}">Verbosidad normal</td><td style="${S.td}">Mínima / Estándar / Explícita</td></tr>
  <tr><td style="${S.td}">Paráfrasis</td><td style="${S.td}">Ninguna / Ligera / Libre</td></tr>
  <tr><td style="${S.td}">Conclusión</td><td style="${S.td}">Concisa / Agrupada</td></tr>
  <tr><td style="${S.td}">Idioma informe</td><td style="${S.td}">Español / Inglés / Portugués</td></tr>
</table>
</div>
</div>

<h2 style="${S.h2}">5. Plantillas (198 predefinidas)</h2>
<table style="${S.tbl}">
  <tr><th style="${S.th}">Modalidad</th><th style="${S.th}">Plantillas</th><th style="${S.th}">Ejemplos</th></tr>
  <tr><td style="${S.td}"><strong>TC</strong></td><td style="${S.td}">~50</td><td style="${S.td}">Cráneo, tórax, abdomen, politrauma, código ictus, AngioTC, TACAR</td></tr>
  <tr><td style="${S.td}"><strong>RM</strong></td><td style="${S.td}">~40</td><td style="${S.td}">Cerebral, columna, rodilla, hombro, cardíaca, próstata, mama</td></tr>
  <tr><td style="${S.td}"><strong>Ecografía</strong></td><td style="${S.td}">~25</td><td style="${S.td}">Abdominal, tiroides, mama, vascular, obstétrica, musculoesquelética</td></tr>
  <tr><td style="${S.td}"><strong>Radiografía</strong></td><td style="${S.td}">~35</td><td style="${S.td}">Tórax, abdomen, columna, extremidades</td></tr>
  <tr><td style="${S.td}"><strong>Mamografía</strong></td><td style="${S.td}">~10</td><td style="${S.td}">Screening, diagnóstica</td></tr>
  <tr><td style="${S.td}"><strong>RECIST</strong></td><td style="${S.td}">~12</td><td style="${S.td}">Seguimiento oncológico multi-región</td></tr>
  <tr><td style="${S.td}"><strong>Procedimientos</strong></td><td style="${S.td}">~8</td><td style="${S.td}">Biopsias, drenajes, arteriografías</td></tr>
</table>
<p style="${S.p}">También puede crear <strong>plantillas personalizadas</strong> y compartir plantillas a nivel de organización por sección.</p>

<h2 style="${S.h2}">6. Calculadoras y guías de referencia</h2>
<div style="display:flex;gap:12px;">
<div style="flex:1;">
<h3 style="${S.h3}">11 Calculadoras interactivas</h3>
<p style="${S.p}">Washout adrenal, volumen tiroideo, volumen prostático + PSA, ACR TI-RADS, PI-RADS v2.1, Bosniak 2019, ASPECTS, On-Track/Off-Track (hombro), lesión renal, TNM pulmonar 9.ª ed., TNM laríngeo 8.ª ed.</p>
</div>
<div style="flex:1;">
<h3 style="${S.h3}">20+ Guías de referencia</h3>
<p style="${S.p}">Fleischner 2017, LI-RADS v2018, Lung-RADS v2022, BI-RADS v5, O-RADS, PI-RADS, BTS, hallazgos incidentales ACR (hígado, adrenal, páncreas, ovario, vesícula), nomenclatura de columna, anatomía RM.</p>
</div>
</div>

<h2 style="${S.h2}">7. Recomendaciones clínicas (50+)</h2>
<p style="${S.p}">Recomendaciones basadas en guías de sociedades médicas (Fleischner, ACR, Bosniak, LI-RADS, BI-RADS, O-RADS, Lung-RADS). Incluye seguimiento de nódulos, lesiones hepáticas, renales, tiroideas, mamarias, aneurismas aórticos y más. Puede crear recomendaciones personalizadas y compartir a nivel de organización.</p>

<div style="display:flex;gap:12px;">
<div style="flex:1;">
<h2 style="${S.h2}">8. Aprendizaje de estilo</h2>
<p style="${S.p}">La IA aprende su estilo analizando informes previos: frases de normalidad preferidas, estilo de conclusión y patrones por modalidad. Active en Preferencias y configure 2-5 muestras de referencia (<em>few-shot learning</em>).</p>
</div>
<div style="flex:1;">
<h2 style="${S.h2}">9. Firmas</h2>
<p style="${S.p}">Configure una o más firmas (nombre, especialidad, colegiado). La firma activa se adjunta automáticamente al copiar el informe.</p>
</div>
</div>

<h2 style="${S.h2}">10. Gestión de organización (hospitales)</h2>
<div style="display:flex;gap:12px;">
<div style="flex:1;">
<div style="background:#f1f5f9;padding:8px;border-radius:6px;font-size:9px;font-family:monospace;color:#334155;">
  Organización (Hospital)<br>
  ├── Sección: Tórax<br>
  │&nbsp;&nbsp;├── Jefe de sección<br>
  │&nbsp;&nbsp;├── Radiólogos / Residentes<br>
  ├── Sección: Abdomen<br>
  ├── Sección: Neurología<br>
  └── Sección: MSK
</div>
</div>
<div style="flex:1;">
<table style="${S.tbl}">
  <tr><th style="${S.th}">Rol</th><th style="${S.th}">Permisos</th></tr>
  <tr><td style="${S.td}"><strong>Jefe de org.</strong></td><td style="${S.td}">Admin total: miembros, secciones, plantillas, métricas</td></tr>
  <tr><td style="${S.td}"><strong>Jefe de sección</strong></td><td style="${S.td}">Gestionar su sección</td></tr>
  <tr><td style="${S.td}"><strong>Editor</strong></td><td style="${S.td}">Editar plantillas y frases</td></tr>
  <tr><td style="${S.td}"><strong>Radiólogo</strong></td><td style="${S.td}">Uso estándar</td></tr>
</table>
<p style="${S.p}">Recursos compartidos: plantillas, frases de normalidad y recomendaciones por sección. Invitación por enlace con código.</p>
</div>
</div>

<h2 style="${S.h2}">11. Planes y suscripciones</h2>
<table style="${S.tbl}">
  <tr style="background:#2563eb;color:white;"><th style="padding:4px 6px;border:1px solid #1d4ed8;font-size:9px;">Plan</th><th style="padding:4px 6px;border:1px solid #1d4ed8;font-size:9px;">Precio</th><th style="padding:4px 6px;border:1px solid #1d4ed8;font-size:9px;">Informes</th><th style="padding:4px 6px;border:1px solid #1d4ed8;font-size:9px;">Dictado</th><th style="padding:4px 6px;border:1px solid #1d4ed8;font-size:9px;">Soporte</th></tr>
  <tr><td style="${S.td}"><strong>Free</strong></td><td style="${S.td}">$0</td><td style="${S.td}">30/mes</td><td style="${S.td}">30 min</td><td style="${S.td}">Estándar</td></tr>
  <tr><td style="${S.td}"><strong>Residente</strong></td><td style="${S.td}">$4.99</td><td style="${S.td}">150/mes</td><td style="${S.td}">120 min</td><td style="${S.td}">Estándar</td></tr>
  <tr><td style="${S.td}"><strong>Starter</strong></td><td style="${S.td}">$7.99</td><td style="${S.td}">150/mes</td><td style="${S.td}">120 min</td><td style="${S.td}">Prioritario</td></tr>
  <tr><td style="${S.td}"><strong>Professional</strong></td><td style="${S.td}">$15.99</td><td style="${S.td}">400/mes</td><td style="${S.td}">300 min</td><td style="${S.td}">Prioritario + API</td></tr>
</table>
<p style="${S.p}"><strong>Referidos:</strong> Invite a un colega — ambos reciben 30 días de Starter gratis. Pagos y facturación vía Stripe.</p>

<h2 style="${S.h2}">12. Seguridad y privacidad</h2>
<ul style="${S.ul}">
  <li><strong>Cifrado:</strong> HTTPS/TLS en tránsito, AES en reposo para claves API. Claves temporales de 120s para transcripción.</li>
  <li><strong>Detección PII:</strong> Elimina automáticamente nombres de pacientes, MRN, UIDs DICOM antes de enviar a IA.</li>
  <li><strong>Cabeceras seguras:</strong> HSTS, X-Frame-Options, Content-Type-Options, Referrer-Policy, Permissions-Policy.</li>
  <li><strong>Control de acceso:</strong> RBAC, rate limiting, aprobación manual de cuentas, verificación de email.</li>
  <li><strong>GDPR:</strong> Residencia de datos en la UE, registro de auditoría completo.</li>
</ul>

<h2 style="${S.h2}">13. Preguntas frecuentes</h2>
<table style="${S.tbl}">
  <tr><td style="${S.td}"><strong>¿Es un sistema de diagnóstico?</strong></td><td style="${S.td}">No. Genera borradores que deben ser validados por el radiólogo.</td></tr>
  <tr><td style="${S.td}"><strong>¿Se envían datos de pacientes?</strong></td><td style="${S.td}">No. El sistema detecta y elimina PII antes de enviar a la IA.</td></tr>
  <tr><td style="${S.td}"><strong>¿Funciona sin internet?</strong></td><td style="${S.td}">No. Es una aplicación web.</td></tr>
  <tr><td style="${S.td}"><strong>¿Qué micrófono necesito?</strong></td><td style="${S.td}">Cualquier micrófono compatible con el navegador. Recomendado: USB de escritorio.</td></tr>
  <tr><td style="${S.td}"><strong>¿El jefe ve los informes?</strong></td><td style="${S.td}">No. Solo métricas agregadas de productividad, nunca contenido individual.</td></tr>
  <tr><td style="${S.td}"><strong>¿Puedo cancelar?</strong></td><td style="${S.td}">Sí, en cualquier momento sin penalización.</td></tr>
  <tr><td style="${S.td}"><strong>Navegadores soportados</strong></td><td style="${S.td}">Chrome 90+, Firefox 90+, Safari 15+, Edge 90+.</td></tr>
  <tr><td style="${S.td}"><strong>Idiomas</strong></td><td style="${S.td}">Interfaz, informes y dictado en ES/EN/PT independientes entre sí.</td></tr>
</table>

<div style="text-align:center;margin-top:20px;padding-top:12px;border-top:2px solid #e2e8f0;">
  <p style="font-size:12px;font-weight:600;color:#2563eb;margin:0;">Radiogen.AI</p>
  <p style="font-size:9px;color:#94a3b8;margin:4px 0 0;">Asistente de informes radiológicos con IA</p>
  <p style="font-size:8px;color:#cbd5e1;margin:4px 0 0;">Los textos generados son borradores que deben ser validados antes de su uso clínico.</p>
</div>

</div>`;
}

export function AdminManualDownload() {
  const t = useT();
  const [generating, setGenerating] = useState(false);

  const handleDownload = useCallback(async () => {
    setGenerating(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const container = document.createElement("div");
      container.innerHTML = getManualHTML();
      document.body.appendChild(container);

      await html2pdf()
        .set({
          margin: [10, 12, 10, 12],
          filename: "Radiogen_AI_Manual_Hospital.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css"], avoid: ["tr", "table", "div"] },
        } as Record<string, unknown>)
        .from(container)
        .save();

      document.body.removeChild(container);
    } catch (err) {
      console.error("[admin] PDF generation error:", err);
    } finally {
      setGenerating(false);
    }
  }, []);

  return (
    <div className="flex items-center gap-4 p-5">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {t("admin.manual_title")}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {t("admin.manual_desc")}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={generating}
        className="text-xs gap-1.5 shrink-0"
      >
        {generating ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("admin.manual_generating")}
          </>
        ) : (
          <>
            <Download className="h-3 w-3" />
            {t("admin.manual_download")}
          </>
        )}
      </Button>
    </div>
  );
}
