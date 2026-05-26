"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText } from "lucide-react";
import { useT } from "@/lib/i18n";

function getManualHTML(): string {
  return `
<div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a2e; line-height: 1.6; max-width: 100%;">

<div style="text-align: center; padding: 40px 0 20px; border-bottom: 3px solid #2563eb;">
  <h1 style="font-size: 28px; font-weight: 700; color: #2563eb; margin: 0;">Radiogen.AI</h1>
  <p style="font-size: 18px; color: #475569; margin: 8px 0 0;">Manual para Hospitales y Radiólogos</p>
  <p style="font-size: 12px; color: #94a3b8; margin: 8px 0 0;">Versión 2.0 — Mayo 2025</p>
</div>

<div style="page-break-after: always;"></div>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">Índice</h2>
<ol style="font-size: 13px; color: #334155; columns: 2; column-gap: 40px;">
  <li>Introducción</li>
  <li>Requisitos del sistema</li>
  <li>Registro y acceso</li>
  <li>Panel principal — Generación de informes</li>
  <li>Dictado por voz</li>
  <li>Plantillas</li>
  <li>Recomendaciones clínicas</li>
  <li>Calculadoras y guías de referencia</li>
  <li>Aprendizaje de estilo</li>
  <li>Frases de normalidad</li>
  <li>Firmas</li>
  <li>Configuración del modelo IA</li>
  <li>Gestión de organización</li>
  <li>Métricas y productividad</li>
  <li>Planes y suscripciones</li>
  <li>Idiomas soportados</li>
  <li>Seguridad y privacidad</li>
  <li>Soporte técnico</li>
  <li>Preguntas frecuentes</li>
</ol>

<div style="page-break-after: always;"></div>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">1. Introducción</h2>
<p style="font-size: 13px;"><strong>Radiogen.AI</strong> es un asistente de informes radiológicos basado en inteligencia artificial. Permite a los radiólogos generar borradores de informes estructurados a partir de dictado por voz o texto libre, utilizando modelos de IA de última generación.</p>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">Propuesta de valor</h3>
<ul style="font-size: 13px; color: #334155;">
  <li><strong>Reducción de tiempo</strong>: Genera borradores completos en segundos.</li>
  <li><strong>Consistencia</strong>: Plantillas estandarizadas garantizan informes homogéneos.</li>
  <li><strong>Aprendizaje continuo</strong>: El sistema aprende el estilo de escritura de cada radiólogo.</li>
  <li><strong>Zero-install</strong>: Funciona desde cualquier navegador web moderno.</li>
  <li><strong>Multi-idioma</strong>: Informes en español, inglés y portugués.</li>
</ul>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">Flujo de trabajo típico</h3>
<div style="background: #f1f5f9; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #475569;">
  Dictado/texto → IA genera hallazgos → Radiólogo revisa → IA genera conclusión → Radiólogo valida → Copiar al RIS/PACS
</div>

<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 12px; margin-top: 12px;">
  <strong>⚠️ Importante:</strong> Los textos generados por IA son <strong>borradores</strong> que deben ser revisados y validados por el radiólogo antes de su uso clínico.
</div>

<div style="page-break-after: always;"></div>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">2. Requisitos del sistema</h2>
<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
  <tr style="background: #f8fafc;"><th style="text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0;">Requisito</th><th style="text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0;">Especificación</th></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Navegador</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Chrome 90+, Firefox 90+, Safari 15+, Edge 90+</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Conexión</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Internet estable (mínimo 1 Mbps)</td></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Micrófono</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Necesario para dictado por voz</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Resolución</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Mínimo 1280×720 px (recomendado 1920×1080)</td></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Dispositivos</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">PC, Mac, tablet</td></tr>
</table>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">3. Registro y acceso</h2>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">3.1 Crear cuenta</h3>
<ol style="font-size: 13px; color: #334155;">
  <li>Acceda a la página de registro.</li>
  <li>Complete los campos: correo electrónico, contraseña (mín. 6 caracteres), nombre completo, país, hospital/centro, rol profesional.</li>
  <li>Si dispone de un <strong>código de invitación</strong>, introdúzcalo para acceder al plan Starter gratuito durante 30 días.</li>
  <li>Acepte los términos de uso.</li>
  <li>Su cuenta será revisada y aprobada por el equipo de Radiogen.AI.</li>
</ol>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">3.2 Plan para residentes</h3>
<p style="font-size: 13px;">Los residentes pueden acceder a un plan especial a $4.99/mes (150 informes, 120 min de dictado). Se requiere verificación mediante documento acreditativo.</p>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">3.3 Recuperación de contraseña</h3>
<p style="font-size: 13px;">Use la opción "¿Olvidó su contraseña?" para recibir un enlace de restablecimiento por correo electrónico.</p>

<div style="page-break-after: always;"></div>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">4. Panel principal — Generación de informes</h2>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">4.1 Barra lateral</h3>
<p style="font-size: 13px;">Contiene las pestañas principales: <strong>Plantillas</strong>, <strong>Calculadoras</strong>, <strong>Recomendaciones</strong> y <strong>Preferencias</strong>.</p>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">4.2 Flujo de generación</h3>
<ol style="font-size: 13px; color: #334155;">
  <li><strong>Seleccione modalidad y plantilla</strong> según el estudio a informar.</li>
  <li><strong>Dicte o escriba</strong> la descripción de los hallazgos.</li>
  <li>Pulse <strong>"Generar hallazgos"</strong> — la IA produce un borrador estructurado.</li>
  <li><strong>Revise y edite</strong> los hallazgos generados.</li>
  <li>Pulse <strong>"Generar conclusión"</strong> — la IA sintetiza los hallazgos.</li>
  <li><strong>Añada recomendaciones</strong> si procede.</li>
  <li>Pulse <strong>"Copiar"</strong> para transferir al RIS/PACS.</li>
</ol>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">4.3 Opciones de generación</h3>
<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
  <tr style="background: #f8fafc;"><th style="text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0;">Parámetro</th><th style="text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0;">Opciones</th><th style="text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0;">Descripción</th></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Longitud</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Concisa / Estándar / Detallada</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Extensión del texto</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Verbosidad normal</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Mínima / Estándar / Explícita</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Detalle en hallazgos normales</td></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Paráfrasis</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Ninguna / Ligera / Libre</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Reformulación del dictado</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Conclusión</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Concisa / Agrupada</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Formato de conclusión</td></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Idioma</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Español / Inglés / Portugués</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Idioma del informe</td></tr>
</table>

<div style="page-break-after: always;"></div>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">5. Dictado por voz</h2>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">5.1 Cómo usar el dictado</h3>
<ol style="font-size: 13px; color: #334155;">
  <li>Asegúrese de que su navegador tiene permiso para acceder al micrófono.</li>
  <li>Pulse el <strong>botón de micrófono</strong>.</li>
  <li>Hable de manera clara, describiendo los hallazgos.</li>
  <li>Pulse nuevamente para detener (máximo 120 segundos por clip).</li>
  <li>El audio se transcribirá automáticamente.</li>
  <li>Puede dictar múltiples clips que se concatenarán.</li>
</ol>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">5.2 Idiomas de dictado</h3>
<p style="font-size: 13px;">Español, inglés, portugués (brasileño), o detección automática.</p>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">5.3 Cuota mensual de dictado</h3>
<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
  <tr style="background: #f8fafc;"><th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Plan</th><th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Free</th><th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Residente</th><th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Starter</th><th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Professional</th></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600;">Minutos</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: center;">30</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: center;">120</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: center;">120</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: center;">300</td></tr>
</table>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">6. Plantillas</h2>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">6.1 Plantillas predefinidas (190+)</h3>
<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
  <tr style="background: #f8fafc;"><th style="text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0;">Modalidad</th><th style="text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0;">N.° plantillas</th><th style="text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0;">Ejemplos</th></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">CT</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">~60</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Cráneo, tórax, abdomen-pelvis, columna</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">MRI</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">~40</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Cerebro, columna, rodilla, hombro, cardíaca</td></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Ecografía</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">~25</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Abdominal, tiroides, mama, vascular</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Radiografía</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">~35</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Tórax, abdomen, columna, extremidades</td></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Mamografía</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">~10</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Screening, diagnóstica</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">RECIST</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">~12</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Seguimiento oncológico multi-región</td></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Procedimientos</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">~8</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Intervencionismo, biopsias</td></tr>
</table>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">6.2 Plantillas personalizadas</h3>
<p style="font-size: 13px;">Cree sus propias plantillas desde la pestaña Plantillas: nombre, modalidad, estructura con secciones (<code>**Nombre de sección**</code>). Son privadas para su cuenta.</p>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">6.3 Plantillas de organización</h3>
<p style="font-size: 13px;">El jefe de sección puede crear plantillas compartidas para todo el servicio, organizadas por secciones (tórax, abdomen, neurología, etc.). Los miembros pueden importarlas a su perfil.</p>

<div style="page-break-after: always;"></div>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">7. Recomendaciones clínicas</h2>
<p style="font-size: 13px;">Radiogen.AI incluye <strong>más de 50 recomendaciones</strong> basadas en guías de sociedades médicas:</p>
<ul style="font-size: 13px; color: #334155; columns: 2; column-gap: 30px;">
  <li>Fleischner 2017 (nódulos pulmonares)</li>
  <li>LI-RADS v2018 (lesiones hepáticas)</li>
  <li>TI-RADS (nódulos tiroideos)</li>
  <li>Bosniak 2019 (quistes renales)</li>
  <li>BI-RADS v5 (mama)</li>
  <li>Lung-RADS v2022 (screening pulmonar)</li>
  <li>Incidentalomas ACR (adrenal, pancreático, hepático)</li>
  <li>O-RADS (hallazgos ováricos)</li>
  <li>Aneurismas aórticos</li>
  <li>Pólipos vesiculares</li>
</ul>
<p style="font-size: 13px; margin-top: 12px;">También puede crear recomendaciones personalizadas y compartir recomendaciones a nivel de organización.</p>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">8. Calculadoras y guías de referencia</h2>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">11 Calculadoras interactivas</h3>
<table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px;">
  <tr style="background: #f8fafc;"><th style="text-align: left; padding: 6px 10px; border: 1px solid #e2e8f0;">Calculadora</th><th style="text-align: left; padding: 6px 10px; border: 1px solid #e2e8f0;">Descripción</th></tr>
  <tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600;">Washout adrenal CT</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">APW/RPW para adenoma</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600;">Volumen tiroideo</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">Lóbulos y total (cm³)</td></tr>
  <tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600;">Vol. prostático + PSA</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">Volumen y densidad PSA</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600;">ACR TI-RADS</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">Riesgo nódulos tiroideos (TR1-TR5)</td></tr>
  <tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600;">PI-RADS v2.1</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">Riesgo cáncer próstata (1-5)</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600;">Bosniak 2019</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">Clasificación quistes renales</td></tr>
  <tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600;">ASPECTS</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">Severidad ictus agudo (0-10)</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600;">On-Track / Off-Track</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">Inestabilidad Hill-Sachs</td></tr>
  <tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600;">Lesión renal</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">Análisis multifásico HU</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600;">TNM Pulmonar 9.ª ed.</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">Estadificación cáncer de pulmón</td></tr>
  <tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600;">TNM Laríngeo 8.ª ed.</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">Estadificación cabeza y cuello</td></tr>
</table>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">20+ Guías de referencia rápida</h3>
<p style="font-size: 13px;">Incluyen: Fleischner 2017, LI-RADS v2018, Lung-RADS v2022, BI-RADS v5, O-RADS, PI-RADS, BTS, hallazgos incidentales ACR, nomenclatura de columna NASS/ASSR, grados de estenosis foraminal/canal central, anatomía RM de hombro, rodilla y tobillo.</p>

<div style="page-break-after: always;"></div>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">9. Aprendizaje de estilo</h2>
<p style="font-size: 13px;">Radiogen.AI aprende su estilo de escritura personal analizando informes previos:</p>
<ul style="font-size: 13px; color: #334155;">
  <li>Detecta sus <strong>frases de normalidad</strong> preferidas.</li>
  <li>Captura su <strong>estilo de conclusión</strong> (estructura, tono, longitud).</li>
  <li>Almacena <strong>patrones de redacción</strong> por modalidad y tipo de estudio.</li>
  <li>Active el aprendizaje en Preferencias y configure el número de muestras (2-5 recomendado).</li>
  <li>La IA usará sus informes previos como referencia (<em>few-shot learning</em>).</li>
</ul>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">10. Frases de normalidad</h2>
<p style="font-size: 13px;">Descripciones predefinidas para hallazgos dentro de la normalidad, personalizables por modalidad y sección. Las organizaciones pueden definir frases estándar para todo el servicio.</p>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">11. Firmas</h2>
<p style="font-size: 13px;">Configure una o más firmas (nombre, especialidad, número de colegiado). Marque una como activa para que se adjunte automáticamente al copiar el informe. Útil si trabaja en varios centros.</p>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">12. Configuración del modelo IA</h2>
<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
  <tr style="background: #f8fafc;"><th style="text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0;">Proveedor</th><th style="text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0;">Modelos</th></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600;">Claude (Anthropic)</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">claude-sonnet-4-6, claude-haiku-4-5</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600;">GPT (OpenAI)</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">gpt-4o, gpt-4o-mini</td></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600;">DeepSeek</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">deepseek-v4-pro, deepseek-v4-flash, deepseek-chat</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600;">Gemini (Google)</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">gemini-1.5-pro, gemini-2.0-flash</td></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600;">Custom</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Cualquier endpoint compatible con OpenAI API</td></tr>
</table>
<p style="font-size: 13px; margin-top: 10px;">Cada usuario puede usar su propia clave API (cifrada en reposo) y configurar URL personalizada para modelos locales (Ollama, etc.).</p>

<div style="page-break-after: always;"></div>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">13. Gestión de organización (hospitales)</h2>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">13.1 Estructura organizativa</h3>
<div style="background: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 12px; font-family: monospace; color: #334155;">
  Organización (Hospital)<br>
  ├── Sección: Tórax<br>
  │&nbsp;&nbsp;&nbsp;├── Jefe de sección<br>
  │&nbsp;&nbsp;&nbsp;├── Radiólogos<br>
  │&nbsp;&nbsp;&nbsp;└── Residentes<br>
  ├── Sección: Abdomen<br>
  │&nbsp;&nbsp;&nbsp;└── Radiólogos<br>
  ├── Sección: Neurología<br>
  └── Sección: Musculoesquelético
</div>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">13.2 Roles y permisos</h3>
<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
  <tr style="background: #f8fafc;"><th style="text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0;">Rol</th><th style="text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0;">Permisos</th></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600;">Jefe de organización</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Administración total: miembros, secciones, plantillas, métricas</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600;">Jefe de sección</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Gestionar su sección: plantillas, frases, miembros</td></tr>
  <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600;">Editor de sección</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Editar plantillas y frases de su sección</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600;">Radiólogo</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Uso estándar: generar informes, acceder a recursos</td></tr>
</table>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">13.3 Recursos compartidos</h3>
<p style="font-size: 13px;">Las organizaciones comparten: plantillas estandarizadas, frases de normalidad unificadas y recomendaciones institucionales. Los miembros importan estos recursos a su perfil.</p>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">14. Métricas y productividad</h2>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">14.1 Métricas individuales</h3>
<p style="font-size: 13px;">Cada radiólogo ve: informes utilizados vs. límite del plan, minutos de dictado, plan actual y fecha de renovación.</p>

<h3 style="color: #1e40af; font-size: 15px; margin-top: 20px;">14.2 Métricas de la organización</h3>
<p style="font-size: 13px;">El jefe de servicio tiene acceso a: volumen de informes por miembro, distribución por modalidad, tendencias temporales, uso de IA, costes agregados y registro de auditoría.</p>

<div style="page-break-after: always;"></div>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">15. Planes y suscripciones</h2>
<table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px;">
  <tr style="background: #2563eb; color: white;"><th style="padding: 8px 10px; border: 1px solid #1d4ed8;">Característica</th><th style="padding: 8px 10px; border: 1px solid #1d4ed8;">Free</th><th style="padding: 8px 10px; border: 1px solid #1d4ed8;">Residente</th><th style="padding: 8px 10px; border: 1px solid #1d4ed8;">Starter</th><th style="padding: 8px 10px; border: 1px solid #1d4ed8;">Professional</th></tr>
  <tr><td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: 600;">Precio</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">$0</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">$4.99</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">$7.99</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">$15.99</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: 600;">Informes/mes</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">30</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">150</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">150</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">400</td></tr>
  <tr><td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: 600;">Dictado</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">30 min</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">120 min</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">120 min</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">300 min</td></tr>
  <tr style="background: #f8fafc;"><td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: 600;">Soporte prioritario</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">—</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">—</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">✓</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">✓</td></tr>
  <tr><td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: 600;">API + Export</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">—</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">—</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">—</td><td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">✓</td></tr>
</table>

<p style="font-size: 13px; margin-top: 12px;"><strong>Programa de referidos:</strong> Invite a un colega con su código personal — ambos reciben 30 días de plan Starter gratuito.</p>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">16. Idiomas soportados</h2>
<ul style="font-size: 13px; color: #334155;">
  <li><strong>Interfaz</strong>: Español, inglés, portugués — completamente traducida.</li>
  <li><strong>Informes</strong>: Idioma independiente de la interfaz.</li>
  <li><strong>Dictado</strong>: Configurable — puede dictar en un idioma y generar en otro.</li>
</ul>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">17. Seguridad y privacidad</h2>
<ul style="font-size: 13px; color: #334155;">
  <li><strong>Cifrado</strong>: HTTPS/TLS en tránsito, AES en reposo para claves API.</li>
  <li><strong>Detección PII</strong>: Elimina automáticamente nombres, MRN, UIDs antes de enviar a IA.</li>
  <li><strong>Claves temporales</strong>: Transcripción de voz con claves de 120s de vida útil.</li>
  <li><strong>Cabeceras seguras</strong>: HSTS, X-Frame-Options, Content-Type-Options, Referrer-Policy.</li>
  <li><strong>Control de acceso</strong>: RBAC, rate limiting, aprobación manual de cuentas.</li>
  <li><strong>GDPR</strong>: Residencia de datos en la UE, registro de auditoría completo.</li>
</ul>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">18. Soporte técnico</h2>
<p style="font-size: 13px;">Envíe tickets desde la plataforma (error, pregunta, queja, general). Planes Starter/Professional: soporte prioritario (24h). Plan Free: soporte estándar (48-72h).</p>

<div style="page-break-after: always;"></div>

<h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 20px; margin-top: 30px;">19. Preguntas frecuentes</h2>

<div style="margin-bottom: 16px;">
  <p style="font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">¿Puedo usar Radiogen.AI para diagnóstico clínico?</p>
  <p style="font-size: 13px; color: #475569; margin: 0;">No. Los borradores deben ser revisados y validados por un radiólogo cualificado antes de su uso clínico.</p>
</div>

<div style="margin-bottom: 16px;">
  <p style="font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">¿Los datos de mis pacientes se envían a servidores externos?</p>
  <p style="font-size: 13px; color: #475569; margin: 0;">El sistema detecta y elimina datos personales (nombres, MRN, UIDs) antes de enviar texto a los modelos de IA.</p>
</div>

<div style="margin-bottom: 16px;">
  <p style="font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">¿Puedo usar la plataforma sin conexión a internet?</p>
  <p style="font-size: 13px; color: #475569; margin: 0;">No. Es una aplicación web que requiere conexión a internet.</p>
</div>

<div style="margin-bottom: 16px;">
  <p style="font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">¿Qué tipo de micrófono necesito?</p>
  <p style="font-size: 13px; color: #475569; margin: 0;">Cualquier micrófono compatible con su navegador. Se recomienda USB de escritorio para mejor calidad.</p>
</div>

<div style="margin-bottom: 16px;">
  <p style="font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">¿El jefe de servicio puede ver los informes individuales?</p>
  <p style="font-size: 13px; color: #475569; margin: 0;">No. El jefe tiene acceso a métricas agregadas de productividad, pero no al contenido de informes individuales.</p>
</div>

<div style="margin-bottom: 16px;">
  <p style="font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">¿Puedo cancelar mi suscripción en cualquier momento?</p>
  <p style="font-size: 13px; color: #475569; margin: 0;">Sí, sin penalización. Mantendrá acceso hasta el final del período facturado.</p>
</div>

<div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
  <p style="font-size: 14px; font-weight: 600; color: #2563eb;">Radiogen.AI</p>
  <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Asistente de informes radiológicos con IA</p>
  <p style="font-size: 10px; color: #cbd5e1; margin-top: 8px;">Los textos generados son borradores que deben ser validados antes de su uso clínico.</p>
  <p style="font-size: 10px; color: #cbd5e1; margin-top: 4px;">Documento confidencial — Para uso exclusivo del personal del centro hospitalario.</p>
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
          margin: [15, 15, 15, 15],
          filename: "Radiogen_AI_Manual_Hospital.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "li"] },
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
