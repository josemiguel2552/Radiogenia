"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText } from "lucide-react";
import { useT } from "@/lib/i18n";

const LOGO_SVG = `<svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="7" fill="url(#lg)"/>
  <path d="M10 8h7a5 5 0 0 1 0 10h-3l5 6" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="10" y1="13" x2="17" y2="13" stroke="rgba(255,255,255,0.5)" stroke-width="1.2" stroke-linecap="round"/>
  <circle cx="24" cy="24" r="2.2" fill="#c4b5fd"/>
  <defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#7c3aed"/>
  </linearGradient></defs>
</svg>`;

const C = {
  navy: "#1e1b4b",
  teal: "#7c3aed",
  lteal: "#c4b5fd",
  dark: "#0f172a",
  bg: "#f8fafc",
  bdr: "#e2e8f0",
  txt: "#334155",
  sub: "#64748b",
  muted: "#94a3b8",
};

function card(borderColor: string) {
  return `background:white;border:1px solid ${C.bdr};border-left:3px solid ${borderColor};border-radius:8px;padding:10px 12px;margin:0 0 8px;`;
}

function numCircle(color: string) {
  return `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${color};color:white;font-size:9px;font-weight:700;margin-right:6px;flex-shrink:0;`;
}

function sectionTitle(num: string) {
  return `<div style="display:flex;align-items:center;margin:14px 0 6px;">
    <span style="${numCircle(C.teal)}">${num}</span>
    <span style="font-size:12px;font-weight:700;color:${C.navy};letter-spacing:0.3px;">`;
}

const LOGO_SM = LOGO_SVG.replace('width="40" height="40"', 'width="22" height="22"');

function getManualHTML(editorB64: string, toolsB64: string): string {
  return `
<div style="font-family:Inter,'Segoe UI',system-ui,-apple-system,sans-serif;color:${C.txt};line-height:1.5;max-width:100%;">

<!-- ═══ HEADER ═══ -->
<div style="background:linear-gradient(135deg,${C.dark} 0%,${C.navy} 50%,${C.teal} 100%);border-radius:10px;padding:16px 20px;margin:0 0 12px;position:relative;overflow:hidden;">
  <div style="position:absolute;top:-15px;right:-15px;width:80px;height:80px;border-radius:50%;background:rgba(196,181,253,0.08);"></div>
  <div style="display:flex;align-items:center;gap:10px;">
    ${LOGO_SVG}
    <div>
      <div><span style="font-size:20px;font-weight:800;color:white;letter-spacing:-0.5px;">Radiogen</span><span style="font-size:20px;font-weight:800;color:${C.lteal};">.AI</span></div>
      <p style="font-size:11px;color:rgba(255,255,255,0.7);margin:2px 0 0;font-weight:500;">Manual para Hospitales y Radiólogos</p>
    </div>
    <div style="margin-left:auto;text-align:right;">
      <p style="font-size:8px;color:rgba(255,255,255,0.4);margin:0;">Versión 2.0 — 2025</p>
      <p style="font-size:7px;color:rgba(255,255,255,0.3);margin:2px 0 0;">Documento confidencial</p>
    </div>
  </div>
</div>

<!-- ═══ INTRO ═══ -->
${sectionTitle("1")}Introducción</span></div>
<div style="${card(C.teal)}">
  <p style="font-size:10px;margin:0 0 6px;line-height:1.6;color:${C.txt};"><strong style="color:${C.navy};">Radiogen.AI</strong> es un asistente de informes radiológicos con IA que genera borradores estructurados a partir de dictado por voz o texto libre. Funciona desde cualquier navegador, sin instalación. Soporta informes en español, inglés y portugués.</p>
  <div style="background:linear-gradient(135deg,#fef3c7,#fef9c3);border-left:3px solid #f59e0b;padding:5px 10px;border-radius:4px;font-size:9px;color:#92400e;">
    <strong>Importante:</strong> Los textos generados son <strong>borradores</strong> que deben ser validados por el radiólogo antes de su uso clínico.
  </div>
</div>

<!-- ═══ WORKFLOW ═══ -->
${sectionTitle("2")}Flujo de trabajo</span></div>
<div style="background:linear-gradient(135deg,${C.dark},${C.navy});border-radius:8px;padding:10px 14px;margin:0 0 10px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;">
  <span style="background:${C.teal};color:white;padding:3px 8px;border-radius:12px;font-size:8px;font-weight:600;">1. Modalidad</span>
  <span style="color:${C.lteal};font-size:10px;">&rarr;</span>
  <span style="background:rgba(196,181,253,0.15);color:${C.lteal};padding:3px 8px;border-radius:12px;font-size:8px;font-weight:600;">2. Dictar</span>
  <span style="color:${C.lteal};font-size:10px;">&rarr;</span>
  <span style="background:rgba(196,181,253,0.15);color:${C.lteal};padding:3px 8px;border-radius:12px;font-size:8px;font-weight:600;">3. Hallazgos IA</span>
  <span style="color:${C.lteal};font-size:10px;">&rarr;</span>
  <span style="background:rgba(196,181,253,0.15);color:${C.lteal};padding:3px 8px;border-radius:12px;font-size:8px;font-weight:600;">4. Revisar</span>
  <span style="color:${C.lteal};font-size:10px;">&rarr;</span>
  <span style="background:rgba(196,181,253,0.15);color:${C.lteal};padding:3px 8px;border-radius:12px;font-size:8px;font-weight:600;">5. Conclusión IA</span>
  <span style="color:${C.lteal};font-size:10px;">&rarr;</span>
  <span style="background:rgba(196,181,253,0.15);color:${C.lteal};padding:3px 8px;border-radius:12px;font-size:8px;font-weight:600;">6. Recomendaciones</span>
  <span style="color:${C.lteal};font-size:10px;">&rarr;</span>
  <span style="background:${C.teal};color:white;padding:3px 8px;border-radius:12px;font-size:8px;font-weight:600;">7. RIS/PACS</span>
</div>

<!-- ═══ VOICE + CONFIG (2 columns) ═══ -->
<div style="display:flex;gap:8px;">
<div style="flex:1;">
${sectionTitle("3")}Dictado por voz</span></div>
<div style="${card("#6366f1")}">
  <ul style="font-size:9px;margin:0;padding-left:14px;line-height:1.7;color:${C.txt};">
    <li>Pulse el micrófono, dicte (máx. 120s/clip) y pulse para detener.</li>
    <li>Idiomas: español, inglés, portugués o auto-detección.</li>
    <li>Corrección automática de terminología médica radiológica.</li>
    <li>Puede dictar múltiples clips que se concatenan.</li>
  </ul>
</div>
</div>
<div style="flex:1;">
${sectionTitle("4")}Configuración de informes</span></div>
<div style="${card("#8b5cf6")}">
  <ul style="font-size:9px;margin:0;padding-left:14px;line-height:1.7;color:${C.txt};">
    <li><strong style="color:${C.navy};">Idioma de salida:</strong> Español, inglés o portugués.</li>
    <li><strong style="color:${C.navy};">Idioma de dictado:</strong> Independiente del informe.</li>
    <li><strong style="color:${C.navy};">Estilo de conclusión:</strong> Concisa o agrupada.</li>
  </ul>
  <p style="font-size:8px;color:${C.muted};margin:4px 0 0;font-style:italic;">Otros parámetros (longitud, verbosidad, paráfrasis) son gestionados por el administrador.</p>
</div>
</div>
</div>

<!-- ═══ TEMPLATES ═══ -->
${sectionTitle("5")}Plantillas (198 predefinidas)</span></div>
<div style="${card(C.navy)}">
  <table style="width:100%;border-collapse:collapse;margin:2px 0;">
    <tr style="background:linear-gradient(135deg,${C.navy},${C.teal});">
      <th style="text-align:left;padding:4px 8px;font-size:8px;color:white;font-weight:600;">Modalidad</th>
      <th style="text-align:center;padding:4px 6px;font-size:8px;color:white;font-weight:600;">N.º</th>
      <th style="text-align:left;padding:4px 8px;font-size:8px;color:white;font-weight:600;">Ejemplos</th>
    </tr>
    <tr><td style="padding:3px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};"><strong>TC</strong></td><td style="text-align:center;padding:3px 6px;font-size:8px;border-bottom:1px solid ${C.bdr};">~50</td><td style="padding:3px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Cráneo, tórax, abdomen, politrauma, código ictus, AngioTC, TACAR</td></tr>
    <tr style="background:${C.bg};"><td style="padding:3px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};"><strong>RM</strong></td><td style="text-align:center;padding:3px 6px;font-size:8px;border-bottom:1px solid ${C.bdr};">~40</td><td style="padding:3px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Cerebral, columna, rodilla, hombro, cardíaca, próstata, mama</td></tr>
    <tr><td style="padding:3px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};"><strong>Ecografía</strong></td><td style="text-align:center;padding:3px 6px;font-size:8px;border-bottom:1px solid ${C.bdr};">~25</td><td style="padding:3px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Abdominal, tiroides, mama, vascular, obstétrica, MSK</td></tr>
    <tr style="background:${C.bg};"><td style="padding:3px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};"><strong>Radiografía</strong></td><td style="text-align:center;padding:3px 6px;font-size:8px;border-bottom:1px solid ${C.bdr};">~35</td><td style="padding:3px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Tórax, abdomen, columna, extremidades</td></tr>
    <tr><td style="padding:3px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};"><strong>Mamografía</strong></td><td style="text-align:center;padding:3px 6px;font-size:8px;border-bottom:1px solid ${C.bdr};">~10</td><td style="padding:3px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Screening, diagnóstica</td></tr>
    <tr style="background:${C.bg};"><td style="padding:3px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};"><strong>RECIST</strong></td><td style="text-align:center;padding:3px 6px;font-size:8px;border-bottom:1px solid ${C.bdr};">~12</td><td style="padding:3px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Seguimiento oncológico multi-región</td></tr>
    <tr><td style="padding:3px 8px;font-size:8px;"><strong>Procedimientos</strong></td><td style="text-align:center;padding:3px 6px;font-size:8px;">~8</td><td style="padding:3px 8px;font-size:8px;color:${C.sub};">Biopsias, drenajes, arteriografías</td></tr>
  </table>
  <p style="font-size:8px;color:${C.muted};margin:4px 0 0;font-style:italic;">Puede crear plantillas personalizadas y compartir a nivel de organización por sección.</p>
</div>

<!-- ═══ CALCULATORS + REFERENCES (2 columns) ═══ -->
${sectionTitle("6")}Calculadoras y guías de referencia</span></div>
<div style="display:flex;gap:8px;">
<div style="flex:1;">
  <div style="${card("#6366f1")}">
    <p style="font-size:9px;font-weight:700;color:#6366f1;margin:0 0 4px;">13 Calculadoras interactivas</p>
    <p style="font-size:8px;margin:0;line-height:1.6;color:${C.sub};">Washout adrenal, volumen tiroideo, volumen prostático + PSA, ACR TI-RADS, PI-RADS v2.1, Bosniak 2019, ASPECTS, On-Track/Off-Track, lesión renal, TNM pulmonar 9.ª ed., TNM laríngeo 8.ª ed., tiempo de duplicación nodular, mapeo T1/T2 y VEC.</p>
  </div>
</div>
<div style="flex:1;">
  <div style="${card("#0ea5e9")}">
    <p style="font-size:9px;font-weight:700;color:#0ea5e9;margin:0 0 4px;">30+ Guías de referencia</p>
    <p style="font-size:8px;margin:0;line-height:1.6;color:${C.sub};">Fleischner 2017, LI-RADS v2018, Lung-RADS v2022, BI-RADS v5, O-RADS, PI-RADS, BTS, incidentales ACR (hígado, adrenal, páncreas, ovario, vesícula), NASS/ASSR, anatomía RM, guías pediátricas.</p>
  </div>
</div>
</div>

<!-- ═══ RECOMMENDATIONS ═══ -->
${sectionTitle("7")}Recomendaciones clínicas (50+)</span></div>
<div style="${card(C.teal)}">
  <p style="font-size:9px;margin:0;line-height:1.6;color:${C.txt};">Biblioteca basada en guías de sociedades médicas (Fleischner, ACR, Bosniak, LI-RADS, BI-RADS, O-RADS, Lung-RADS). El radiólogo <strong>selecciona manualmente</strong> las recomendaciones a incluir en cada informe. El sistema las ordena por frecuencia de uso y relevancia. Puede crear recomendaciones personalizadas y compartirlas por organización.</p>
</div>

<!-- ═══ STYLE LEARNING + SIGNATURES (2 columns) ═══ -->
<div style="display:flex;gap:8px;">
<div style="flex:1;">
${sectionTitle("8")}Aprendizaje de estilo</span></div>
<div style="${card("#a855f7")}">
  <p style="font-size:9px;margin:0;line-height:1.6;color:${C.txt};">Cuando el radiólogo edita un informe generado, el sistema registra las correcciones para adaptar futuras generaciones. Captura las frases de normalidad preferidas y muestras de conclusiones recientes como referencia de estilo. Se activa desde Preferencias.</p>
</div>
</div>
<div style="flex:1;">
${sectionTitle("9")}Firmas</span></div>
<div style="${card("#ec4899")}">
  <p style="font-size:9px;margin:0;line-height:1.6;color:${C.txt};">Configure una o más firmas (nombre, especialidad, colegiado). La firma activa se adjunta automáticamente al copiar el informe. Útil si trabaja en varios centros.</p>
</div>
</div>
</div>

<!-- ═══ ORGANIZATION ═══ -->
${sectionTitle("10")}Gestión de organización (hospitales)</span></div>
<div style="display:flex;gap:8px;">
<div style="flex:1;">
  <div style="${card(C.navy)}">
    <div style="background:linear-gradient(135deg,${C.dark},${C.navy});border-radius:6px;padding:8px 10px;font-size:8px;font-family:'SF Mono',Monaco,Consolas,monospace;color:${C.lteal};line-height:1.8;">
      Organización (Hospital)<br>
      ├── Sección: Tórax<br>
      │&nbsp;&nbsp;├── Jefe de sección<br>
      │&nbsp;&nbsp;├── Radiólogos / Residentes<br>
      ├── Sección: Abdomen<br>
      ├── Sección: Neurología<br>
      └── Sección: MSK
    </div>
  </div>
</div>
<div style="flex:1;">
  <div style="${card(C.teal)}">
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:linear-gradient(135deg,${C.navy},${C.teal});">
        <th style="text-align:left;padding:3px 6px;font-size:8px;color:white;font-weight:600;">Rol</th>
        <th style="text-align:left;padding:3px 6px;font-size:8px;color:white;font-weight:600;">Permisos</th>
      </tr>
      <tr><td style="padding:3px 6px;font-size:8px;border-bottom:1px solid ${C.bdr};"><strong>Jefe de org.</strong></td><td style="padding:3px 6px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Admin total: miembros, secciones, plantillas, métricas</td></tr>
      <tr style="background:${C.bg};"><td style="padding:3px 6px;font-size:8px;border-bottom:1px solid ${C.bdr};"><strong>Jefe sección</strong></td><td style="padding:3px 6px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Gestionar su sección</td></tr>
      <tr><td style="padding:3px 6px;font-size:8px;border-bottom:1px solid ${C.bdr};"><strong>Editor</strong></td><td style="padding:3px 6px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Editar plantillas y frases</td></tr>
      <tr style="background:${C.bg};"><td style="padding:3px 6px;font-size:8px;"><strong>Radiólogo</strong></td><td style="padding:3px 6px;font-size:8px;color:${C.sub};">Uso estándar</td></tr>
    </table>
    <p style="font-size:8px;color:${C.muted};margin:4px 0 0;">Recursos compartidos por sección. Invitación por enlace con código.</p>
  </div>
</div>
</div>

<!-- ═══ SECURITY ═══ -->
${sectionTitle("11")}Seguridad y privacidad</span></div>
<div style="background:linear-gradient(135deg,${C.dark},${C.navy});border-radius:8px;padding:10px 14px;margin:0 0 10px;">
  <div style="display:flex;flex-wrap:wrap;gap:6px;">
    <div style="flex:1;min-width:45%;background:rgba(255,255,255,0.06);border-radius:6px;padding:6px 8px;">
      <p style="font-size:8px;font-weight:700;color:${C.lteal};margin:0 0 2px;">Detección PII</p>
      <p style="font-size:8px;color:rgba(255,255,255,0.7);margin:0;line-height:1.5;">Elimina nombres, MRN, UIDs DICOM antes de enviar a IA.</p>
    </div>
    <div style="flex:1;min-width:45%;background:rgba(255,255,255,0.06);border-radius:6px;padding:6px 8px;">
      <p style="font-size:8px;font-weight:700;color:${C.lteal};margin:0 0 2px;">Cifrado</p>
      <p style="font-size:8px;color:rgba(255,255,255,0.7);margin:0;line-height:1.5;">HTTPS/TLS en tránsito, AES en reposo. Claves temporales 120s.</p>
    </div>
    <div style="flex:1;min-width:45%;background:rgba(255,255,255,0.06);border-radius:6px;padding:6px 8px;">
      <p style="font-size:8px;font-weight:700;color:${C.lteal};margin:0 0 2px;">Control de acceso</p>
      <p style="font-size:8px;color:rgba(255,255,255,0.7);margin:0;line-height:1.5;">RBAC, rate limiting, aprobación manual, cabeceras seguras.</p>
    </div>
    <div style="flex:1;min-width:45%;background:rgba(255,255,255,0.06);border-radius:6px;padding:6px 8px;">
      <p style="font-size:8px;font-weight:700;color:${C.lteal};margin:0 0 2px;">LGPD</p>
      <p style="font-size:8px;color:rgba(255,255,255,0.7);margin:0;line-height:1.5;">Anonimización en origen, registro de auditoría completo.</p>
    </div>
  </div>
</div>

<!-- ═══ FAQ ═══ -->
${sectionTitle("12")}Preguntas frecuentes</span></div>
<div style="${card(C.navy)}">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:4px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};font-weight:600;color:${C.navy};width:35%;">¿Es un sistema de diagnóstico?</td><td style="padding:4px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">No. Genera borradores que debe validar el radiólogo.</td></tr>
    <tr style="background:${C.bg};"><td style="padding:4px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};font-weight:600;color:${C.navy};">¿Se envían datos de pacientes?</td><td style="padding:4px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">No. El sistema detecta y elimina PII antes de enviar al modelo.</td></tr>
    <tr><td style="padding:4px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};font-weight:600;color:${C.navy};">¿El jefe ve los informes?</td><td style="padding:4px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">No. Solo métricas agregadas, nunca contenido individual.</td></tr>
    <tr style="background:${C.bg};"><td style="padding:4px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};font-weight:600;color:${C.navy};">¿Funciona sin internet?</td><td style="padding:4px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">No. Es una aplicación web que requiere conexión.</td></tr>
    <tr><td style="padding:4px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};font-weight:600;color:${C.navy};">Navegadores soportados</td><td style="padding:4px 8px;font-size:8px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Chrome 90+, Firefox 90+, Safari 15+, Edge 90+.</td></tr>
    <tr style="background:${C.bg};"><td style="padding:4px 8px;font-size:8px;font-weight:600;color:${C.navy};">Idiomas</td><td style="padding:4px 8px;font-size:8px;color:${C.sub};">Interfaz, informes y dictado en ES/EN/PT independientes.</td></tr>
  </table>
</div>

<!-- ═══ FOOTER ═══ -->
<div style="background:linear-gradient(135deg,${C.dark},${C.navy});border-radius:8px;padding:14px 20px;margin:12px 0 0;text-align:center;">
  <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px;">
    ${LOGO_SM}
    <span style="font-size:16px;font-weight:800;color:white;">Radiogen</span><span style="font-size:16px;font-weight:800;color:${C.lteal};">.AI</span>
  </div>
  <p style="font-size:9px;color:rgba(255,255,255,0.6);margin:0 0 4px;">Asistente de informes radiológicos con IA</p>
  <p style="font-size:7px;color:rgba(255,255,255,0.3);margin:0;">Los textos generados son borradores que deben ser validados antes de su uso clínico.</p>
</div>

<!-- ═══ PAGE: SCREENSHOTS ═══ -->
<div style="page-break-before:always;"></div>

<div style="display:flex;align-items:center;gap:8px;margin:0 0 12px;">
  ${LOGO_SM}
  <span style="font-size:16px;font-weight:800;color:${C.navy};">Radiogen</span><span style="font-size:16px;font-weight:800;color:${C.teal};">.AI</span>
  <span style="font-size:11px;color:${C.muted};margin-left:6px;">— Interfaz de la plataforma</span>
</div>

<p style="font-size:10px;font-weight:700;color:${C.navy};margin:0 0 6px;">Editor principal de informes</p>
<p style="font-size:8px;color:${C.sub};margin:0 0 8px;">Interfaz del radiólogo: selección de modalidad y plantilla, dictado por voz, generación de hallazgos y conclusión con IA, y opciones de copia al RIS/PACS.</p>
<div style="border:1px solid ${C.bdr};border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);margin:0 0 16px;">
  <img src="${editorB64}" style="width:100%;display:block;" />
</div>

<p style="font-size:10px;font-weight:700;color:${C.navy};margin:0 0 6px;">Herramientas integradas</p>
<p style="font-size:8px;color:${C.sub};margin:0 0 8px;">Dictado por voz con transcripción en tiempo real, recomendaciones clínicas basadas en guías, calculadoras radiológicas interactivas y selector de plantillas con 198 estudios predefinidos.</p>
<div style="border:1px solid ${C.bdr};border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <img src="${toolsB64}" style="width:100%;display:block;" />
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

      const toB64 = async (url: string): Promise<string> => {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch {
          return "";
        }
      };

      const [editorB64, toolsB64] = await Promise.all([
        toB64("/manual/editor.png"),
        toB64("/manual/tools.png"),
      ]);

      const container = document.createElement("div");
      container.innerHTML = getManualHTML(editorB64, toolsB64);
      document.body.appendChild(container);

      await html2pdf()
        .set({
          margin: [8, 10, 8, 10],
          filename: "Radiogen_AI_Manual_Hospital.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"], before: ["[style*='page-break-before']"] },
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
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1e1b4b] to-[#7c3aed] flex items-center justify-center shrink-0">
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
