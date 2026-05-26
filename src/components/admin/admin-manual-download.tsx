"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText } from "lucide-react";
import { useT } from "@/lib/i18n";

const LOGO_SVG = `<svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="7" fill="url(#lg)"/>
  <path d="M10 8h7a5 5 0 0 1 0 10h-3l5 6" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="10" y1="13" x2="17" y2="13" stroke="rgba(255,255,255,0.5)" stroke-width="1.2" stroke-linecap="round"/>
  <circle cx="24" cy="24" r="2.2" fill="#5EEAD4"/>
  <defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="#1E3A5F"/><stop offset="100%" stop-color="#0F766E"/>
  </linearGradient></defs>
</svg>`;

const LOGO_SM = LOGO_SVG.replace('width="36" height="36"', 'width="22" height="22"');

const C = {
  navy: "#1E3A5F",
  teal: "#0F766E",
  lteal: "#5EEAD4",
  dark: "#0f172a",
  bg: "#f8fafc",
  bdr: "#e2e8f0",
  txt: "#334155",
  sub: "#64748b",
  muted: "#94a3b8",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  pink: "#ec4899",
  sky: "#0ea5e9",
};

function card(bc: string) {
  return `background:white;border:1px solid ${C.bdr};border-left:3px solid ${bc};border-radius:8px;padding:10px 12px;margin:0 0 8px;`;
}

function nc(color: string) {
  return `display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:${color};color:white;font-size:8px;font-weight:700;margin-right:5px;flex-shrink:0;`;
}

function sh(num: string) {
  return `<div style="display:flex;align-items:center;margin:12px 0 5px;">
    <span style="${nc(C.teal)}">${num}</span>
    <span style="font-size:11px;font-weight:700;color:${C.navy};letter-spacing:0.2px;">`;
}

function pill(text: string, bg: string, fg: string) {
  return `<span style="display:inline-block;padding:2px 7px;border-radius:10px;font-size:7px;font-weight:600;background:${bg};color:${fg};margin:0 2px;">${text}</span>`;
}

function mockBar() {
  return `<div style="display:flex;align-items:center;gap:4px;padding:5px 8px;background:${C.dark};border-radius:6px 6px 0 0;">
    <span style="width:6px;height:6px;border-radius:50%;background:#ef4444;"></span>
    <span style="width:6px;height:6px;border-radius:50%;background:#f59e0b;"></span>
    <span style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></span>
    <span style="flex:1;text-align:center;font-size:7px;color:${C.muted};">radiogen.ai/dashboard</span>
  </div>`;
}

function getManualHTML(): string {
  return `
<div style="font-family:Inter,'Segoe UI',system-ui,-apple-system,sans-serif;color:${C.txt};line-height:1.5;max-width:100%;">

<!-- ═══════════ PAGE 1: COVER + INTRO ═══════════ -->

<!-- HEADER -->
<div style="background:linear-gradient(135deg,${C.dark} 0%,${C.navy} 50%,${C.teal} 100%);border-radius:8px;padding:14px 18px;margin:0 0 10px;position:relative;overflow:hidden;">
  <div style="position:absolute;top:-15px;right:-15px;width:80px;height:80px;border-radius:50%;background:rgba(94,234,212,0.08);"></div>
  <div style="display:flex;align-items:center;gap:10px;">
    ${LOGO_SVG}
    <div>
      <div><span style="font-size:20px;font-weight:800;color:white;letter-spacing:-0.5px;">Radiogen</span><span style="font-size:20px;font-weight:800;color:${C.lteal};">.AI</span></div>
      <p style="font-size:10px;color:rgba(255,255,255,0.7);margin:2px 0 0;font-weight:500;">Manual para Hospitales y Radiólogos</p>
    </div>
    <div style="margin-left:auto;text-align:right;">
      <p style="font-size:8px;color:rgba(255,255,255,0.4);margin:0;">Versión 2.0 — 2025</p>
      <p style="font-size:7px;color:rgba(255,255,255,0.3);margin:2px 0 0;">Documento confidencial</p>
    </div>
  </div>
</div>

<!-- INTRO -->
${sh("1")}Introducción</span></div>
<div style="${card(C.teal)}">
  <p style="font-size:9px;margin:0 0 5px;line-height:1.6;"><strong style="color:${C.navy};">Radiogen.AI</strong> es un asistente de informes radiológicos con IA que genera borradores estructurados a partir de dictado por voz o texto libre. Funciona desde cualquier navegador, sin instalación. Soporta informes en español, inglés y portugués.</p>
  <div style="background:linear-gradient(135deg,#fef3c7,#fef9c3);border-left:3px solid #f59e0b;padding:4px 8px;border-radius:4px;font-size:8px;color:#92400e;">
    <strong>Importante:</strong> Los textos generados son <strong>borradores</strong> que deben ser validados por el radiólogo antes de su uso clínico.
  </div>
</div>

<!-- WORKFLOW -->
${sh("2")}Flujo de trabajo</span></div>
<div style="background:linear-gradient(135deg,${C.dark},${C.navy});border-radius:6px;padding:8px 10px;margin:0 0 8px;display:flex;flex-wrap:wrap;gap:3px;align-items:center;">
  ${pill("1. Modalidad", C.teal, "white")}
  <span style="color:${C.lteal};font-size:9px;">&rarr;</span>
  ${pill("2. Dictar", "rgba(94,234,212,0.15)", C.lteal)}
  <span style="color:${C.lteal};font-size:9px;">&rarr;</span>
  ${pill("3. Hallazgos IA", "rgba(94,234,212,0.15)", C.lteal)}
  <span style="color:${C.lteal};font-size:9px;">&rarr;</span>
  ${pill("4. Revisar", "rgba(94,234,212,0.15)", C.lteal)}
  <span style="color:${C.lteal};font-size:9px;">&rarr;</span>
  ${pill("5. Conclusión IA", "rgba(94,234,212,0.15)", C.lteal)}
  <span style="color:${C.lteal};font-size:9px;">&rarr;</span>
  ${pill("6. Recomendaciones", "rgba(94,234,212,0.15)", C.lteal)}
  <span style="color:${C.lteal};font-size:9px;">&rarr;</span>
  ${pill("7. RIS/PACS", C.teal, "white")}
</div>

<!-- VOICE + CONFIG -->
<div style="display:flex;gap:8px;">
<div style="flex:1;">
${sh("3")}Dictado por voz</span></div>
<div style="${card(C.indigo)}">
  <ul style="font-size:8px;margin:0;padding-left:12px;line-height:1.7;">
    <li>Pulse el micrófono, dicte (máx. 120s/clip) y pulse para detener.</li>
    <li>Idiomas: español, inglés, portugués o auto-detección.</li>
    <li>Corrección automática de terminología radiológica.</li>
    <li>Múltiples clips que se concatenan.</li>
  </ul>
</div>
</div>
<div style="flex:1;">
${sh("4")}Configuración de informes</span></div>
<div style="${card(C.violet)}">
  <ul style="font-size:8px;margin:0;padding-left:12px;line-height:1.7;">
    <li><strong style="color:${C.navy};">Idioma de salida:</strong> ES / EN / PT.</li>
    <li><strong style="color:${C.navy};">Idioma de dictado:</strong> Independiente del informe.</li>
    <li><strong style="color:${C.navy};">Conclusión:</strong> Concisa o agrupada.</li>
  </ul>
  <p style="font-size:7px;color:${C.muted};margin:3px 0 0;font-style:italic;">Otros parámetros gestionados por el administrador.</p>
</div>
</div>
</div>

<!-- TEMPLATES -->
${sh("5")}Plantillas (198 predefinidas)</span></div>
<div style="${card(C.navy)}">
  <table style="width:100%;border-collapse:collapse;">
    <tr style="background:linear-gradient(135deg,${C.navy},${C.teal});">
      <th style="text-align:left;padding:3px 6px;font-size:7px;color:white;font-weight:600;">Modalidad</th>
      <th style="text-align:center;padding:3px 4px;font-size:7px;color:white;font-weight:600;">N.º</th>
      <th style="text-align:left;padding:3px 6px;font-size:7px;color:white;font-weight:600;">Ejemplos</th>
    </tr>
    <tr><td style="padding:2px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};"><strong>TC</strong></td><td style="text-align:center;padding:2px 4px;font-size:7px;border-bottom:1px solid ${C.bdr};">~50</td><td style="padding:2px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Cráneo, tórax, abdomen, politrauma, AngioTC, TACAR</td></tr>
    <tr style="background:${C.bg};"><td style="padding:2px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};"><strong>RM</strong></td><td style="text-align:center;padding:2px 4px;font-size:7px;border-bottom:1px solid ${C.bdr};">~40</td><td style="padding:2px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Cerebral, columna, rodilla, hombro, cardíaca, próstata</td></tr>
    <tr><td style="padding:2px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};"><strong>Ecografía</strong></td><td style="text-align:center;padding:2px 4px;font-size:7px;border-bottom:1px solid ${C.bdr};">~25</td><td style="padding:2px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Abdominal, tiroides, mama, vascular, MSK</td></tr>
    <tr style="background:${C.bg};"><td style="padding:2px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};"><strong>Radiografía</strong></td><td style="text-align:center;padding:2px 4px;font-size:7px;border-bottom:1px solid ${C.bdr};">~35</td><td style="padding:2px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Tórax, abdomen, columna, extremidades</td></tr>
    <tr><td style="padding:2px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};"><strong>Mamografía / RECIST / Proc.</strong></td><td style="text-align:center;padding:2px 4px;font-size:7px;border-bottom:1px solid ${C.bdr};">~30</td><td style="padding:2px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Screening, seguimiento oncológico, biopsias, drenajes</td></tr>
  </table>
  <p style="font-size:7px;color:${C.muted};margin:3px 0 0;">Plantillas personalizadas y compartidas por organización/sección.</p>
</div>

<!-- CALCULATORS + REFERENCES -->
${sh("6")}Calculadoras y guías</span></div>
<div style="display:flex;gap:8px;">
<div style="flex:1;${card(C.indigo)}">
  <p style="font-size:8px;font-weight:700;color:${C.indigo};margin:0 0 3px;">13 Calculadoras</p>
  <p style="font-size:7px;margin:0;line-height:1.6;color:${C.sub};">Washout adrenal, vol. tiroideo, vol. prostático + PSA, TI-RADS, PI-RADS, Bosniak, ASPECTS, On-Track, lesión renal, TNM pulmonar 9.ª, TNM laríngeo 8.ª, duplicación nodular, T1/T2+VEC.</p>
</div>
<div style="flex:1;${card(C.sky)}">
  <p style="font-size:8px;font-weight:700;color:${C.sky};margin:0 0 3px;">30+ Guías de referencia</p>
  <p style="font-size:7px;margin:0;line-height:1.6;color:${C.sub};">Fleischner, LI-RADS, Lung-RADS, BI-RADS, O-RADS, PI-RADS, BTS, incidentales ACR, NASS/ASSR, anatomía RM, pediátricas.</p>
</div>
</div>

<!-- ═══════════ PAGE 2: SCREENSHOTS ═══════════ -->
<div style="page-break-before:always;"></div>

<div style="display:flex;align-items:center;gap:8px;margin:0 0 10px;">
  ${LOGO_SM}
  <span style="font-size:14px;font-weight:800;color:${C.navy};">Radiogen</span><span style="font-size:14px;font-weight:800;color:${C.teal};">.AI</span>
  <span style="font-size:10px;color:${C.muted};margin-left:4px;">— Interfaz de la plataforma</span>
</div>

<!-- SCREENSHOT 1: MAIN EDITOR -->
<p style="font-size:9px;font-weight:700;color:${C.navy};margin:0 0 4px;">Editor principal de informes</p>
<div style="border:1px solid ${C.bdr};border-radius:8px;overflow:hidden;margin:0 0 10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
  ${mockBar()}
  <div style="background:white;padding:8px;display:flex;gap:6px;">
    <!-- Left: Input area -->
    <div style="flex:1.2;display:flex;flex-direction:column;gap:5px;">
      <!-- Modality + Template row -->
      <div style="display:flex;gap:4px;align-items:center;">
        ${pill("TC", C.navy, "white")}
        ${pill("RM", "#e2e8f0", C.sub)}
        ${pill("ECO", "#e2e8f0", C.sub)}
        ${pill("RX", "#e2e8f0", C.sub)}
        ${pill("MAMA", "#e2e8f0", C.sub)}
        <div style="margin-left:auto;background:${C.bg};border:1px solid ${C.bdr};border-radius:4px;padding:2px 6px;font-size:7px;color:${C.sub};min-width:80px;">TC Cráneo simple ▾</div>
      </div>
      <!-- Dictation textarea -->
      <div style="border:1px solid ${C.bdr};border-radius:6px;padding:6px;background:${C.bg};min-height:50px;position:relative;">
        <p style="font-size:7px;color:${C.muted};margin:0;line-height:1.5;">Estudio de TC craneal sin contraste. Línea media centrada. No se observan colecciones extra-axiales ni hemorragias intracraneales agudas. Sistema ventricular de tamaño y morfología normales...</p>
        <div style="position:absolute;bottom:4px;right:4px;display:flex;gap:3px;align-items:center;">
          <span style="font-size:6px;color:${C.muted};">ES</span>
          <div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,${C.indigo},#818cf8);display:flex;align-items:center;justify-content:center;">
            <span style="color:white;font-size:8px;">🎤</span>
          </div>
        </div>
      </div>
      <!-- Generate button -->
      <div style="display:flex;gap:4px;">
        <div style="flex:1;background:linear-gradient(135deg,${C.indigo},${C.violet});color:white;text-align:center;padding:4px;border-radius:5px;font-size:8px;font-weight:600;">Generar hallazgos</div>
      </div>
    </div>
    <!-- Right: Output area -->
    <div style="flex:1;display:flex;flex-direction:column;gap:5px;">
      <div style="border:1px solid ${C.bdr};border-radius:6px;padding:6px;flex:1;background:white;">
        <p style="font-size:7px;font-weight:700;color:${C.navy};margin:0 0 3px;border-bottom:1px solid ${C.bdr};padding-bottom:2px;">Hallazgos</p>
        <p style="font-size:7px;color:${C.txt};margin:0;line-height:1.5;"><strong>Parénquima cerebral:</strong> Sin alteraciones de la densidad parenquimatosa. No se identifican lesiones focales.<br><strong>Sistema ventricular:</strong> De tamaño y configuración normal.<br><strong>Cisternas:</strong> Permeables.<br><strong>Calota:</strong> Sin hallazgos relevantes.</p>
      </div>
      <div style="border:1px solid ${C.bdr};border-radius:6px;padding:6px;background:white;">
        <p style="font-size:7px;font-weight:700;color:${C.navy};margin:0 0 3px;border-bottom:1px solid ${C.bdr};padding-bottom:2px;">Conclusión</p>
        <p style="font-size:7px;color:${C.txt};margin:0;line-height:1.5;">TC craneal sin hallazgos patológicos significativos.</p>
      </div>
      <div style="display:flex;gap:3px;">
        <div style="flex:1;background:${C.bg};border:1px solid ${C.bdr};text-align:center;padding:3px;border-radius:4px;font-size:7px;color:${C.sub};">📋 Copiar todo</div>
        <div style="flex:1;background:${C.bg};border:1px solid ${C.bdr};text-align:center;padding:3px;border-radius:4px;font-size:7px;color:${C.sub};">📋 + Firma</div>
      </div>
    </div>
  </div>
</div>

<!-- SCREENSHOT ROW 2: Voice + Recommendations -->
<div style="display:flex;gap:8px;margin:0 0 10px;">
  <!-- Voice Dictation -->
  <div style="flex:1;">
    <p style="font-size:9px;font-weight:700;color:${C.navy};margin:0 0 4px;">Dictado por voz</p>
    <div style="border:1px solid ${C.bdr};border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="background:${C.dark};padding:4px 8px;display:flex;align-items:center;gap:4px;">
        <span style="font-size:7px;font-weight:600;color:white;">Voice Dictation</span>
        ${pill("Beta", "rgba(245,158,11,0.2)", "#f59e0b")}
        <span style="margin-left:auto;font-size:6px;color:${C.muted};">Ctrl+A</span>
      </div>
      <div style="background:white;padding:8px;">
        <div style="border:1px solid ${C.bdr};border-radius:4px;padding:5px;min-height:35px;margin:0 0 6px;">
          <p style="font-size:7px;color:${C.txt};margin:0;line-height:1.4;">Estudio de TC craneal sin contraste intravenoso. No se observan colecciones extra-axiales...</p>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <div style="width:26px;height:26px;border-radius:50%;background:#ef4444;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px rgba(239,68,68,0.3);">
            <span style="color:white;font-size:10px;">🎤</span>
          </div>
          <div>
            <p style="font-size:7px;color:#ef4444;font-weight:600;margin:0;">● Grabando...</p>
            <p style="font-size:6px;color:${C.muted};margin:1px 0 0;">42 palabras</p>
          </div>
          <div style="margin-left:auto;background:linear-gradient(135deg,${C.navy},${C.teal});color:white;padding:3px 8px;border-radius:4px;font-size:7px;font-weight:600;">Enviar</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Recommendations -->
  <div style="flex:1;">
    <p style="font-size:9px;font-weight:700;color:${C.navy};margin:0 0 4px;">Recomendaciones clínicas</p>
    <div style="border:1px solid ${C.bdr};border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="background:${C.bg};padding:5px 8px;border-bottom:1px solid ${C.bdr};display:flex;align-items:center;gap:4px;">
        <span style="font-size:8px;">📋</span>
        <span style="font-size:8px;font-weight:600;color:${C.navy};">Recomendaciones</span>
        ${pill("3 sel.", "rgba(99,102,241,0.15)", C.indigo)}
      </div>
      <div style="background:white;padding:6px 8px;">
        <p style="font-size:7px;font-weight:600;color:#d97706;margin:0 0 3px;">⭐ Frecuentes</p>
        <div style="display:flex;flex-wrap:wrap;gap:3px;margin:0 0 5px;">
          <span style="display:inline-block;padding:2px 6px;border-radius:10px;font-size:6px;background:rgba(99,102,241,0.12);color:${C.indigo};border:1px solid rgba(99,102,241,0.3);">Fleischner nódulo &lt;6mm</span>
          <span style="display:inline-block;padding:2px 6px;border-radius:10px;font-size:6px;background:rgba(99,102,241,0.12);color:${C.indigo};border:1px solid rgba(99,102,241,0.3);">Eco follow-up 6 meses</span>
          <span style="display:inline-block;padding:2px 6px;border-radius:10px;font-size:6px;background:${C.bg};color:${C.sub};border:1px solid ${C.bdr};">ACR incidental renal</span>
        </div>
        <p style="font-size:7px;font-weight:600;color:#2563eb;margin:0 0 3px;">Sugeridas</p>
        <div style="display:flex;flex-wrap:wrap;gap:3px;">
          <span style="display:inline-block;padding:2px 6px;border-radius:10px;font-size:6px;background:rgba(99,102,241,0.12);color:${C.indigo};border:1px solid rgba(99,102,241,0.3);">Control TC 12 meses</span>
          <span style="display:inline-block;padding:2px 6px;border-radius:10px;font-size:6px;background:${C.bg};color:${C.sub};border:1px solid ${C.bdr};">Valorar RM</span>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- SCREENSHOT ROW 3: Calculator + Templates -->
<div style="display:flex;gap:8px;">
  <!-- Calculator -->
  <div style="flex:1;">
    <p style="font-size:9px;font-weight:700;color:${C.navy};margin:0 0 4px;">Calculadora — ACR TI-RADS</p>
    <div style="border:1px solid ${C.bdr};border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="background:linear-gradient(135deg,${C.navy},${C.teal});padding:4px 8px;">
        <span style="font-size:7px;font-weight:600;color:white;">ACR TI-RADS Calculator</span>
      </div>
      <div style="background:white;padding:8px;">
        <div style="display:flex;gap:4px;margin:0 0 4px;">
          <div style="flex:1;">
            <p style="font-size:6px;color:${C.muted};margin:0 0 2px;text-transform:uppercase;font-weight:600;">Composición</p>
            <div style="display:flex;gap:2px;">
              ${pill("Sólido", C.indigo, "white")}
              ${pill("Mixto", C.bg, C.sub)}
              ${pill("Quístico", C.bg, C.sub)}
            </div>
          </div>
          <div style="flex:1;">
            <p style="font-size:6px;color:${C.muted};margin:0 0 2px;text-transform:uppercase;font-weight:600;">Ecogenicidad</p>
            <div style="display:flex;gap:2px;">
              ${pill("Hipo", C.indigo, "white")}
              ${pill("Iso", C.bg, C.sub)}
              ${pill("Hiper", C.bg, C.sub)}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:4px;margin:0 0 5px;">
          <div style="flex:1;">
            <p style="font-size:6px;color:${C.muted};margin:0 0 2px;text-transform:uppercase;font-weight:600;">Forma</p>
            <div style="display:flex;gap:2px;">
              ${pill("Más alto", C.indigo, "white")}
              ${pill("Más ancho", C.bg, C.sub)}
            </div>
          </div>
          <div style="flex:1;">
            <p style="font-size:6px;color:${C.muted};margin:0 0 2px;text-transform:uppercase;font-weight:600;">Márgenes</p>
            <div style="display:flex;gap:2px;">
              ${pill("Regulares", C.bg, C.sub)}
              ${pill("Irregulares", C.indigo, "white")}
            </div>
          </div>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:4px;padding:4px 6px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <p style="font-size:7px;font-weight:700;color:#991b1b;margin:0;">TR5 — Altamente sospechoso</p>
            <p style="font-size:6px;color:#b91c1c;margin:1px 0 0;">Puntos: 9 | FNA si ≥ 10mm</p>
          </div>
          <span style="font-size:7px;color:${C.sub};cursor:pointer;">📋</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Template selector -->
  <div style="flex:1;">
    <p style="font-size:9px;font-weight:700;color:${C.navy};margin:0 0 4px;">Selector de plantillas</p>
    <div style="border:1px solid ${C.bdr};border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="background:${C.bg};padding:4px 8px;border-bottom:1px solid ${C.bdr};">
        <div style="background:white;border:1px solid ${C.bdr};border-radius:4px;padding:3px 6px;font-size:7px;color:${C.muted};">🔍 Buscar plantilla...</div>
      </div>
      <div style="background:white;padding:0;">
        <div style="padding:4px 8px;border-bottom:1px solid ${C.bdr};display:flex;align-items:center;gap:4px;background:rgba(99,102,241,0.06);">
          <span style="font-size:7px;font-weight:600;color:${C.navy};">TC Cráneo simple</span>
          ${pill("TC", C.navy, "white")}
          <span style="margin-left:auto;font-size:6px;color:${C.muted};">12 campos</span>
        </div>
        <div style="padding:4px 8px;border-bottom:1px solid ${C.bdr};display:flex;align-items:center;gap:4px;">
          <span style="font-size:7px;color:${C.txt};">TC Tórax con contraste</span>
          ${pill("TC", C.navy, "white")}
          <span style="margin-left:auto;font-size:6px;color:${C.muted};">18 campos</span>
        </div>
        <div style="padding:4px 8px;border-bottom:1px solid ${C.bdr};display:flex;align-items:center;gap:4px;">
          <span style="font-size:7px;color:${C.txt};">RM Cerebral</span>
          ${pill("RM", C.teal, "white")}
          <span style="margin-left:auto;font-size:6px;color:${C.muted};">15 campos</span>
        </div>
        <div style="padding:4px 8px;display:flex;align-items:center;gap:4px;">
          <span style="font-size:7px;color:${C.txt};">ECO Abdominal</span>
          ${pill("ECO", C.violet, "white")}
          <span style="margin-left:auto;font-size:6px;color:${C.muted};">10 campos</span>
        </div>
      </div>
    </div>
  </div>
</div>


<!-- ═══════════ PAGE 3: FEATURES + ORG + SECURITY ═══════════ -->
<div style="page-break-before:always;"></div>

<div style="display:flex;align-items:center;gap:8px;margin:0 0 8px;">
  ${LOGO_SM}
  <span style="font-size:14px;font-weight:800;color:${C.navy};">Radiogen</span><span style="font-size:14px;font-weight:800;color:${C.teal};">.AI</span>
  <span style="font-size:10px;color:${C.muted};margin-left:4px;">— Funcionalidades</span>
</div>

<!-- RECOMMENDATIONS -->
${sh("7")}Recomendaciones clínicas (50+)</span></div>
<div style="${card(C.teal)}">
  <p style="font-size:8px;margin:0;line-height:1.6;">Biblioteca basada en guías de sociedades médicas (Fleischner, ACR, Bosniak, LI-RADS, BI-RADS, O-RADS, Lung-RADS). El radiólogo <strong>selecciona manualmente</strong> las recomendaciones a incluir en cada informe. El sistema las ordena por frecuencia de uso y relevancia. Puede crear recomendaciones personalizadas y compartirlas por organización.</p>
</div>

<!-- STYLE LEARNING + SIGNATURES -->
<div style="display:flex;gap:8px;">
<div style="flex:1;">
${sh("8")}Aprendizaje de estilo</span></div>
<div style="${card("#a855f7")}">
  <p style="font-size:8px;margin:0;line-height:1.6;">Cuando el radiólogo edita un informe generado, el sistema registra las correcciones para adaptar futuras generaciones. Captura las frases de normalidad preferidas y muestras de conclusiones recientes como referencia de estilo. Se activa desde Preferencias.</p>
</div>
</div>
<div style="flex:1;">
${sh("9")}Firmas</span></div>
<div style="${card(C.pink)}">
  <p style="font-size:8px;margin:0;line-height:1.6;">Configure una o más firmas (nombre, especialidad, colegiado). La firma activa se adjunta automáticamente al copiar el informe. Útil si trabaja en varios centros.</p>
</div>
</div>
</div>

<!-- ORGANIZATION -->
${sh("10")}Gestión de organización (hospitales)</span></div>
<div style="display:flex;gap:8px;">
<div style="flex:1;">
  <div style="${card(C.navy)}">
    <div style="background:linear-gradient(135deg,${C.dark},${C.navy});border-radius:5px;padding:6px 8px;font-size:7px;font-family:'SF Mono',Monaco,Consolas,monospace;color:${C.lteal};line-height:1.8;">
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
        <th style="text-align:left;padding:2px 5px;font-size:7px;color:white;font-weight:600;">Rol</th>
        <th style="text-align:left;padding:2px 5px;font-size:7px;color:white;font-weight:600;">Permisos</th>
      </tr>
      <tr><td style="padding:2px 5px;font-size:7px;border-bottom:1px solid ${C.bdr};"><strong>Jefe de org.</strong></td><td style="padding:2px 5px;font-size:7px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Admin total: miembros, secciones, plantillas, métricas</td></tr>
      <tr style="background:${C.bg};"><td style="padding:2px 5px;font-size:7px;border-bottom:1px solid ${C.bdr};"><strong>Jefe sección</strong></td><td style="padding:2px 5px;font-size:7px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Gestionar su sección</td></tr>
      <tr><td style="padding:2px 5px;font-size:7px;border-bottom:1px solid ${C.bdr};"><strong>Editor</strong></td><td style="padding:2px 5px;font-size:7px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Editar plantillas y frases</td></tr>
      <tr style="background:${C.bg};"><td style="padding:2px 5px;font-size:7px;"><strong>Radiólogo</strong></td><td style="padding:2px 5px;font-size:7px;color:${C.sub};">Uso estándar</td></tr>
    </table>
    <p style="font-size:7px;color:${C.muted};margin:3px 0 0;">Recursos compartidos por sección. Invitación por enlace.</p>
  </div>
</div>
</div>

<!-- SECURITY -->
${sh("11")}Seguridad y privacidad</span></div>
<div style="background:linear-gradient(135deg,${C.dark},${C.navy});border-radius:8px;padding:8px 10px;margin:0 0 8px;">
  <div style="display:flex;flex-wrap:wrap;gap:5px;">
    <div style="flex:1;min-width:45%;background:rgba(255,255,255,0.06);border-radius:5px;padding:5px 7px;">
      <p style="font-size:7px;font-weight:700;color:${C.lteal};margin:0 0 2px;">🛡 Detección PII</p>
      <p style="font-size:7px;color:rgba(255,255,255,0.7);margin:0;line-height:1.4;">Elimina nombres, MRN, UIDs DICOM antes de enviar a IA.</p>
    </div>
    <div style="flex:1;min-width:45%;background:rgba(255,255,255,0.06);border-radius:5px;padding:5px 7px;">
      <p style="font-size:7px;font-weight:700;color:${C.lteal};margin:0 0 2px;">🔐 Cifrado</p>
      <p style="font-size:7px;color:rgba(255,255,255,0.7);margin:0;line-height:1.4;">HTTPS/TLS en tránsito, AES en reposo. Claves temporales 120s.</p>
    </div>
    <div style="flex:1;min-width:45%;background:rgba(255,255,255,0.06);border-radius:5px;padding:5px 7px;">
      <p style="font-size:7px;font-weight:700;color:${C.lteal};margin:0 0 2px;">🔑 Control de acceso</p>
      <p style="font-size:7px;color:rgba(255,255,255,0.7);margin:0;line-height:1.4;">RBAC, rate limiting, aprobación manual, cabeceras seguras.</p>
    </div>
    <div style="flex:1;min-width:45%;background:rgba(255,255,255,0.06);border-radius:5px;padding:5px 7px;">
      <p style="font-size:7px;font-weight:700;color:${C.lteal};margin:0 0 2px;">🇪🇺 GDPR</p>
      <p style="font-size:7px;color:rgba(255,255,255,0.7);margin:0;line-height:1.4;">Residencia UE, registro de auditoría completo.</p>
    </div>
  </div>
</div>

<!-- FAQ -->
${sh("12")}Preguntas frecuentes</span></div>
<div style="${card(C.navy)}">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:3px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};font-weight:600;color:${C.navy};width:35%;">¿Es un sistema de diagnóstico?</td><td style="padding:3px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};color:${C.sub};">No. Genera borradores que debe validar el radiólogo.</td></tr>
    <tr style="background:${C.bg};"><td style="padding:3px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};font-weight:600;color:${C.navy};">¿Se envían datos de pacientes?</td><td style="padding:3px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};color:${C.sub};">No. El sistema detecta y elimina PII antes de enviar al modelo.</td></tr>
    <tr><td style="padding:3px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};font-weight:600;color:${C.navy};">¿El jefe ve los informes?</td><td style="padding:3px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};color:${C.sub};">No. Solo métricas agregadas, nunca contenido individual.</td></tr>
    <tr style="background:${C.bg};"><td style="padding:3px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};font-weight:600;color:${C.navy};">¿Funciona sin internet?</td><td style="padding:3px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};color:${C.sub};">No. Es una aplicación web que requiere conexión.</td></tr>
    <tr><td style="padding:3px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};font-weight:600;color:${C.navy};">Navegadores</td><td style="padding:3px 6px;font-size:7px;border-bottom:1px solid ${C.bdr};color:${C.sub};">Chrome 90+, Firefox 90+, Safari 15+, Edge 90+.</td></tr>
    <tr style="background:${C.bg};"><td style="padding:3px 6px;font-size:7px;font-weight:600;color:${C.navy};">Idiomas</td><td style="padding:3px 6px;font-size:7px;color:${C.sub};">Interfaz, informes y dictado en ES/EN/PT independientes.</td></tr>
  </table>
</div>

<!-- FOOTER -->
<div style="background:linear-gradient(135deg,${C.dark},${C.navy});border-radius:8px;padding:12px 16px;margin:10px 0 0;text-align:center;">
  <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:4px;">
    ${LOGO_SM}
    <span style="font-size:14px;font-weight:800;color:white;">Radiogen</span><span style="font-size:14px;font-weight:800;color:${C.lteal};">.AI</span>
  </div>
  <p style="font-size:8px;color:rgba(255,255,255,0.6);margin:0 0 3px;">Asistente de informes radiológicos con IA</p>
  <p style="font-size:7px;color:rgba(255,255,255,0.3);margin:0;">Los textos generados son borradores que deben ser validados antes de su uso clínico.</p>
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
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#0F766E] flex items-center justify-center shrink-0">
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
