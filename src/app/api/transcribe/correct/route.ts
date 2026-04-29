import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateAI } from "@/lib/ai-provider";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { text, modality, studyType, language } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return NextResponse.json({ corrected: text || "" });
    }

    const globalConfig = await getGlobalAIConfig();

    const apiKey = resolveApiKey(globalConfig, "openai");

    const isEs = !language || language.startsWith("es");

    const system = isEs
      ? `Eres un corrector de transcripciones de dictados radiológicos. El texto fue transcrito por Whisper y puede contener errores fonéticos o de reconocimiento.

TU TAREA: Corrige SOLO errores de transcripción (fonéticos, ortográficos, terminología médica mal reconocida). NO cambies el contenido clínico, NO añadas palabras, NO reformules frases, NO cambies el orden.

CONTEXTO: ${modality ? `Modalidad: ${modality}.` : ""} ${studyType ? `Estudio: ${studyType}.` : ""}

REGLAS:
- Corrige términos médicos mal transcritos por su equivalente más probable según la modalidad y tipo de estudio (ej: "parenquima" → "parénquima", "ecostructura" → "ecoestructura", "hipointenso en T1" si dice "hipo intenso en T uno", "artrosis" en contexto abdominal → "hidronefrosis", "supracolicular" → "supraclavicular", "infra colicular" → "infraclavicular", "para colicular" → "paraclavicular").
- Usa la modalidad/tipo de estudio para desambiguar términos: ej. en TC abdominal, "artrosis" probablemente es "hidronefrosis".
- Corrige errores fonéticos obvios en contexto radiológico.
- Mantén EXACTAMENTE la misma estructura, puntuación, saltos de línea y comandos de voz.
- Si el texto ya está correcto, devuélvelo tal cual.
- Responde SOLO con el texto corregido, sin explicaciones ni comentarios.`
      : `You are a radiology dictation transcription corrector. The text was transcribed by Whisper and may contain phonetic or recognition errors.

YOUR TASK: Fix ONLY transcription errors (phonetic, spelling, misrecognized medical terminology). Do NOT change clinical content, do NOT add words, do NOT rephrase, do NOT reorder.

CONTEXT: ${modality ? `Modality: ${modality}.` : ""} ${studyType ? `Study: ${studyType}.` : ""}

RULES:
- Fix misrecognized medical terms to their most likely equivalent given the modality and study type (e.g. "pare nkima" → "parenchyma", "hypo intense in T one" → "hypointense on T1", "arthrosis" in abdomen context → "hydronephrosis", "new frosts" → "nephrosis", "supracolicular" → "supraclavicular", "infracolicular" → "infraclavicular").
- Use the modality/study type to disambiguate terms: e.g. in abdominal CT, "arthrosis" is likely "hydronephrosis"; "no arthritis" near kidney context is likely "no hydronephrosis".
- Fix obvious phonetic errors in radiology context.
- Keep EXACTLY the same structure, punctuation, line breaks and voice commands.
- If the text is already correct, return it as-is.
- Respond ONLY with the corrected text, no explanations or comments.`;

    const corrected = await generateAI({
      provider: "openai",
      modelName: "gpt-4o-mini",
      apiKey,
      system,
      user: text,
      maxTokens: Math.max(512, Math.ceil(text.length * 1.2)),
    });

    return NextResponse.json({ corrected: corrected.trim() || text });
  } catch {
    return NextResponse.json({ corrected: "" });
  }
}
