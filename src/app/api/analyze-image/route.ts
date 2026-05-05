export const maxDuration = 120;

/* ── Image Analysis API (Experimental) ────────────────────────
   Sends captured screen frames to a vision-capable LLM to
   generate structured radiology findings.

   To remove this module: delete this file.
   ─────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";

const PROVIDER_URLS: Record<string, string> = {
  openai: "https://api.openai.com",
  deepseek: "https://api.deepseek.com",
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { images, template, modality, studyType, outputLanguage } = await req.json();
    if (!images?.length) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const globalConfig = await getGlobalAIConfig();

    const taskModel = globalConfig.taskOverrides?.image_analysis;
    const provider = taskModel?.provider || "openai";
    const model = taskModel?.modelName || "gpt-4o-mini";
    const apiKey = resolveApiKey(globalConfig, provider);

    if (!apiKey) {
      return NextResponse.json(
        { error: `No API key for provider "${provider}". Configure it in Admin > AI Config.` },
        { status: 500 },
      );
    }

    const baseUrl = globalConfig.customBaseUrl || PROVIDER_URLS[provider] || PROVIDER_URLS.openai;
    const lang = outputLanguage || "es";

    const systemPrompt = lang === "es"
      ? `Eres un radiólogo experto analizando imágenes médicas de un estudio de ${modality || "imagen"}${studyType ? ` (${studyType})` : ""}.
Se te proporcionan capturas de múltiples cortes del estudio. Genera hallazgos estructurados usando las secciones del template.

REGLAS:
1. Describe SOLO lo que observas en las imágenes. No inventes hallazgos que no sean visibles.
2. Si una sección del template no muestra hallazgos, describe normalidad.
3. Incluye localizaciones, tamaños estimados y características de señal/densidad cuando sean visibles.
4. Usa terminología radiológica apropiada para ${modality || "la modalidad"}.
5. Este es un PRE-INFORME de ayuda al radiólogo. NO emitas diagnósticos.
6. IGNORA textos superpuestos (nombre de paciente, parámetros técnicos, overlays DICOM) — solo analiza la imagen médica.
7. NO describas elementos de la interfaz del visor.

FORMATO: Cada sección en una línea: "Sección: Descripción."
Sin asteriscos, sin markdown, sin encabezados extra. Sin la sección "CONCLUSIÓN".`
      : `You are an expert radiologist analyzing medical images from a ${modality || "imaging"} study${studyType ? ` (${studyType})` : ""}.
You are provided captures from multiple slices of the study. Generate structured findings using the template sections.

RULES:
1. Describe ONLY what you observe in the images. Do not invent findings not visible.
2. If a template section shows no findings, describe normality.
3. Include locations, estimated sizes, and signal/density characteristics when visible.
4. Use appropriate radiological terminology for ${modality || "the modality"}.
5. This is a DRAFT pre-report to assist the radiologist. Do NOT issue diagnoses.
6. IGNORE overlaid text (patient name, technical parameters, DICOM overlays) — only analyze the medical image.
7. Do NOT describe viewer interface elements.

FORMAT: Each section on one line: "Section: Description."
No asterisks, no markdown, no extra headings. No "CONCLUSION" section.`;

    const userContent: Array<Record<string, unknown>> = [
      { type: "text", text: `Template:\n${template}\n\nAnalyze the following ${images.length} image(s):` },
    ];

    const selectedImages = images.slice(0, 20);
    for (const img of selectedImages) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${img}`, detail: "auto" },
      });
    }

    const apiRes = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 4096,
        temperature: 0.2,
      }),
    });

    if (!apiRes.ok) {
      const errData = await apiRes.json().catch(() => ({}));
      const msg = errData.error?.message || `Vision API error (${apiRes.status}). Make sure the model "${model}" supports image input.`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const data = await apiRes.json();
    const findings = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ findings: findings.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
