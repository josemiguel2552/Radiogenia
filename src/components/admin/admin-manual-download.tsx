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
  1. Seleccionar modalidad y plantilla &rarr; 2. Dictar o escribir hallazgos &rarr; 3. Generar hallazgos (IA) &rarr; 4. Revisar y editar &rarr; 5. Generar conclusión (IA) &rarr; 6. Seleccionar recomendaciones &rarr; 7. Copiar al RIS/PACS
</div>

<div style="display:flex;gap:12px;">
<div style="flex:1;">
<h2 style="${S.h2}">3. Dictado por voz</h2>
<ul style="${S.ul}">
  <li>Pulse el micrófono, dicte (máx. 120s/clip) y pulse para detener.</li>
  <li>Idiomas: español, inglés, portugués o auto-detección.</li>
  <li>Corrección automática de terminología médica radiológica.</li>
  <li>Puede dictar múltiples clips que se concatenan.</li>
</ul>
</div>
<div style="flex:1;">
<h2 style="${S.h2}">4. Configuración de informes</h2>
<p style="${S.p}">El radiólogo puede configurar:</p>
<ul style="${S.ul}">
  <li><strong>Idioma de salida:</strong> Español, inglés o portugués para el informe generado.</li>
  <li><strong>Idioma de dictado:</strong> Independiente del idioma del informe.</li>
  <li><strong>Estilo de conclusión:</strong> Concisa (párrafo) o agrupada (por categorías).</li>
</ul>
<p style="${S.p}">Los demás parámetros del modelo IA (longitud, verbosidad, paráfrasis) son gestionados de forma centralizada por el administrador.</p>
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
<p style="${S.p}">Puede crear <strong>plantillas personalizadas</strong> y compartir plantillas a nivel de organización por sección.</p>

<h2 style="${S.h2}">6. Calculadoras y guías de referencia</h2>
<div style="display:flex;gap:12px;">
<div style="flex:1;">
<h3 style="${S.h3}">13 Calculadoras interactivas</h3>
<p style="${S.p}">Washout adrenal, volumen tiroideo, volumen prostático + PSA, ACR TI-RADS, PI-RADS v2.1, Bosniak 2019, ASPECTS, On-Track/Off-Track (hombro), lesión renal, TNM pulmonar 9.ª ed., TNM laríngeo 8.ª ed., calculadora de tiempo de duplicación nodular, mapeo T1/T2 y VEC.</p>
</div>
<div style="flex:1;">
<h3 style="${S.h3}">30+ Guías de referencia</h3>
<p style="${S.p}">Fleischner 2017, LI-RADS v2018, Lung-RADS v2022, BI-RADS v5, O-RADS, PI-RADS, BTS, hallazgos incidentales ACR (hígado, adrenal, páncreas, ovario, vesícula), nomenclatura de columna NASS/ASSR, anatomía RM (hombro, rodilla, tobillo), guías pediátricas.</p>
</div>
</div>

<h2 style="${S.h2}">7. Recomendaciones clínicas (50+)</h2>
<p style="${S.p}">Biblioteca de recomendaciones basadas en guías de sociedades médicas (Fleischner, ACR, Bosniak, LI-RADS, BI-RADS, O-RADS, Lung-RADS). El radiólogo selecciona manualmente las recomendaciones que desea incluir en cada informe. El sistema las ordena por frecuencia de uso y relevancia con el texto de la conclusión. También puede crear recomendaciones personalizadas y compartirlas a nivel de organización.</p>

<div style="display:flex;gap:12px;">
<div style="flex:1;">
<h2 style="${S.h2}">8. Aprendizaje de estilo</h2>
<p style="${S.p}">Cuando el radiólogo edita un informe generado, el sistema registra las correcciones para adaptar futuras generaciones. Captura las frases de normalidad preferidas (cómo describe hallazgos normales) y muestras de conclusiones recientes como referencia de estilo. Se activa desde Preferencias.</p>
</div>
<div style="flex:1;">
<h2 style="${S.h2}">9. Firmas</h2>
<p style="${S.p}">Configure una o más firmas (nombre, especialidad, colegiado). La firma activa se adjunta automáticamente al copiar el informe. Útil si trabaja en varios centros.</p>
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

<h2 style="${S.h2}">11. Seguridad y privacidad</h2>
<ul style="${S.ul}">
  <li><strong>Detección PII:</strong> Elimina automáticamente nombres de pacientes, MRN, UIDs DICOM del texto antes de enviarlo al modelo de IA.</li>
  <li><strong>Cifrado:</strong> HTTPS/TLS en tránsito, AES en reposo para claves. Claves temporales de 120s para transcripción de voz.</li>
  <li><strong>Cabeceras seguras:</strong> HSTS, X-Frame-Options, Content-Type-Options, Referrer-Policy, Permissions-Policy.</li>
  <li><strong>Control de acceso:</strong> Roles y permisos (RBAC), rate limiting, aprobación manual de cuentas.</li>
  <li><strong>GDPR:</strong> Residencia de datos en la UE, registro de auditoría completo de todas las acciones.</li>
</ul>

<h2 style="${S.h2}">12. Preguntas frecuentes</h2>
<table style="${S.tbl}">
  <tr><td style="${S.td}"><strong>¿Es un sistema de diagnóstico?</strong></td><td style="${S.td}">No. Genera borradores que deben ser validados por el radiólogo.</td></tr>
  <tr><td style="${S.td}"><strong>¿Se envían datos de pacientes a la IA?</strong></td><td style="${S.td}">No. El sistema detecta y elimina datos personales (PII) antes de enviar el texto al modelo.</td></tr>
  <tr><td style="${S.td}"><strong>¿Funciona sin internet?</strong></td><td style="${S.td}">No. Es una aplicación web que requiere conexión.</td></tr>
  <tr><td style="${S.td}"><strong>¿Qué micrófono necesito?</strong></td><td style="${S.td}">Cualquier micrófono compatible con el navegador. Recomendado: USB de escritorio.</td></tr>
  <tr><td style="${S.td}"><strong>¿El jefe de servicio ve los informes?</strong></td><td style="${S.td}">No. Solo métricas agregadas de productividad, nunca contenido de informes individuales.</td></tr>
  <tr><td style="${S.td}"><strong>Navegadores soportados</strong></td><td style="${S.td}">Chrome 90+, Firefox 90+, Safari 15+, Edge 90+. No requiere instalación.</td></tr>
  <tr><td style="${S.td}"><strong>Idiomas</strong></td><td style="${S.td}">Interfaz, informes y dictado en ES/EN/PT, configurables de forma independiente.</td></tr>
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
