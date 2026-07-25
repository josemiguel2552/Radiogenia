export const maxDuration = 45;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey, checkDictationLimit, incrementDictationUsage } from "@/lib/auth-helpers";
import { getWhisperPrompt } from "@/lib/whisper-prompts";
import { postprocessWhisper } from "@/lib/whisper-postprocess";
import { generateAIWithUsage } from "@/lib/ai-provider";
import { logAudioCost, logAICost } from "@/lib/log-ai-cost";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";

function buildCorrectionPrompt(modality: string, studyType: string, isEs: boolean): string {
  const ctx = modality || studyType
    ? isEs
      ? `CONTEXTO: ${modality ? `Modalidad: ${modality}.` : ""} ${studyType ? `Estudio: ${studyType}.` : ""}`
      : `CONTEXT: ${modality ? `Modality: ${modality}.` : ""} ${studyType ? `Study: ${studyType}.` : ""}`
    : "";

  return isEs
    ? `Eres un corrector de dictados radiológicos transcritos por voz. Corrige errores de transcripción fonética, ortográfica y de puntuación. NO cambies contenido clínico, NO añadas ni elimines hallazgos, NO reformules, NO reordenes.

${ctx}
CORRECCIONES OBLIGATORIAS:
1. PUNTUACIÓN (MUY IMPORTANTE — prioridad máxima):
   - Cada hallazgo/oración DEBE terminar con punto.
   - Si el texto es un flujo continuo sin puntuación, segméntalo en oraciones correctas manteniendo el orden exacto.
   - Añade comas donde sean necesarias para enumeraciones, aposiciones y cláusulas.
   - Primera letra después de punto en mayúscula.
2. ARTEFACTOS DE COMANDOS DE VOZ: "línea peritoneal" o "peritoneal line" al final de un hallazgo es un comando de voz mal reconocido ("nueva línea") — elimínalo y pon punto + salto de línea. NO es un hallazgo clínico.
3. Términos mal separados: "hipo intenso"→"hipointenso", "hiper denso"→"hiperdenso", "neumo tórax"→"neumotórax", "hepato megalia"→"hepatomegalia", "retro peritoneal"→"retroperitoneal", "atelec tasia"→"atelectasia", "eco estructura"→"ecoestructura", etc.
4. Homófonos: "no dura"→"nódulo", "laburo"→"lóbulo", "floral/plural"→"pleural", "iliar"→"hilar"
5. Acentos: "parenquima"→"parénquima", "nodulo"→"nódulo", "lobulo"→"lóbulo"
6. Unidades: "5 milímetros"→"5 mm", "3 centímetros"→"3 cm"

Mantén la estructura y saltos de línea. Responde SOLO con el texto corregido.`
    : `You are a radiology dictation corrector. Fix speech-to-text errors (phonetic, spelling, misrecognized medical terms) AND punctuation. Do NOT change clinical content, add/remove findings, rephrase, or reorder.

${ctx}
MANDATORY FIXES:
1. PUNCTUATION (HIGHEST PRIORITY):
   - Every finding/sentence MUST end with a period.
   - If text is a continuous flow without punctuation, segment it into proper sentences keeping exact order.
   - Add commas where needed for enumerations, appositions, and clauses.
   - Capitalize first letter after periods.
2. VOICE COMMAND ARTIFACTS: "peritoneal line" at the end of a finding is a misheard voice command "new line" — remove it entirely and add a period + line break. It is NOT a clinical finding. "high laryn pharynopathy/laryngeal apathy"→"hilar lymphadenopathy".
3. Rejoin split terms: "hypo intense"→"hypointense", "hyper dense"→"hyperdense", "pneumo thorax"→"pneumothorax", "atel ectasis"→"atelectasis", etc.
4. Fix STT misrecognitions: "consultative"→"consolidative", "internal increase"→"interval increase", "plural"→"pleural"
5. Fix word fusion: "lymph nodesThe"→"lymph nodes. The"
6. Units: "5 millimeters"→"5 mm", "3 centimeters"→"3 cm"
7. Complete truncated medical terms.

Keep exact structure and line breaks. Respond ONLY with corrected text.`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`transcribe:${user.id}`, RATE_LIMITS.transcribe);
    if (!rl.allowed) return rl.errorResponse!;

    const globalConfig = await getGlobalAIConfig();

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const language = (formData.get("language") as string) || "";
    const studyContext = (formData.get("study_context") as string) || "";
    const templateSections = (formData.get("template_sections") as string) || "";
    const context = (formData.get("context") as string) || "";
    const modality = (formData.get("modality") as string) || "";
    const studyType = (formData.get("study_type") as string) || "";
    const durationSeconds = Math.max(0, Math.min(120, Number(formData.get("duration_seconds")) || 0));

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    const quota = await checkDictationLimit(user.id);
    if (!quota.allowed) {
      return NextResponse.json({ error: "Dictation limit reached" }, { status: 429 });
    }

    const whisperKey = globalConfig.whisperApiKey
      || (globalConfig.provider === "openai" ? globalConfig.apiKey : "");

    if (!whisperKey) {
      return NextResponse.json({ error: "Whisper API key not configured" }, { status: 400 });
    }

    const baseUrl = (globalConfig.provider === "custom" && globalConfig.customBaseUrl)
      ? globalConfig.customBaseUrl.replace(/\/+$/, "")
      : "https://api.openai.com/v1";

    // ── Step 1: Whisper transcription ──
    const mimeToExt: Record<string, string> = {
      "audio/webm": "webm", "audio/webm;codecs=opus": "webm",
      "audio/ogg": "ogg", "audio/ogg;codecs=opus": "ogg",
      "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav",
      "audio/x-m4a": "m4a", "audio/flac": "flac",
    };
    const ext = mimeToExt[audioFile.type] || "webm";

    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, `dictation.${ext}`);
    whisperForm.append("model", "whisper-1");
    whisperForm.append("response_format", "text");
    whisperForm.append("temperature", "0");
    if (language) whisperForm.append("language", language);

    const domainPrompt = getWhisperPrompt(language || "es", templateSections || undefined);
    const priorContext = context ? context.slice(-200) : "";
    const parts: string[] = [];
    if (priorContext) parts.push(priorContext);
    if (studyContext) parts.push(studyContext);
    parts.push(domainPrompt);
    whisperForm.append("prompt", parts.join("\n"));

    const whisperRes = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${whisperKey}` },
      body: whisperForm,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      return NextResponse.json({ error: `Whisper error: ${err}` }, { status: whisperRes.status });
    }

    let newUsedSeconds = quota.usedSeconds;
    if (durationSeconds > 0) {
      const roundedSeconds = Math.ceil(durationSeconds);
      newUsedSeconds = await incrementDictationUsage(user.id, roundedSeconds);
      logAudioCost({ userId: user.id, action: "transcription", provider: "openai", model: "whisper-1", durationSeconds: roundedSeconds });
    }

    const rawText = await whisperRes.text();
    const whisperText = postprocessWhisper(rawText);

    if (!whisperText || whisperText.trim().length < 3) {
      return NextResponse.json({ text: whisperText || "", corrected: false });
    }

    // ── Step 2: Correction with gpt-4o-mini (fast, Whisper text is already high quality) ──
    const taskModel = globalConfig.taskOverrides?.dictation_correction;
    const effectiveProvider = taskModel?.provider || "openai";
    const effectiveModel = taskModel?.modelName || "gpt-4o-mini";
    const apiKey = resolveApiKey(globalConfig, effectiveProvider);

    const isEs = !language || language.startsWith("es");
    const system = buildCorrectionPrompt(modality, studyType, isEs);

    try {
      const result = await generateAIWithUsage({
        provider: effectiveProvider,
        modelName: effectiveModel,
        apiKey,
        system,
        user: whisperText,
        maxTokens: Math.max(512, Math.ceil(whisperText.length * 1.2)),
      });

      logAICost({ userId: user.id, action: "refine_correction", provider: effectiveProvider, model: effectiveModel, inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens });

      const correctedText = result.text.trim();
      return NextResponse.json({
        text: correctedText || whisperText,
        raw: whisperText,
        corrected: correctedText !== whisperText,
        dictation: { usedSeconds: newUsedSeconds, limitSeconds: quota.limitSeconds },
      });
    } catch {
      return NextResponse.json({
        text: whisperText,
        raw: whisperText,
        corrected: false,
        dictation: { usedSeconds: newUsedSeconds, limitSeconds: quota.limitSeconds },
      });
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
