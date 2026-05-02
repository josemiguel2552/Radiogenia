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
      ? `Eres un corrector de transcripciones de dictados radiológicos en español. El texto fue transcrito por reconocimiento de voz y contiene errores fonéticos frecuentes.

TU TAREA: Corrige SOLO errores de transcripción. NO cambies el contenido clínico, NO añadas palabras, NO reformules frases, NO cambies el orden.

CONTEXTO: ${modality ? `Modalidad: ${modality}.` : ""} ${studyType ? `Estudio: ${studyType}.` : ""}

ERRORES FRECUENTES DE VOZ→TEXTO EN RADIOLOGÍA (corrige siempre):
- "no dura/nodura/no duro/nodo" (en contexto pulmonar/hepático) → "nódulo"
- "laburo/lavuro/laboral/globo" (en contexto pulmonar) → "lóbulo"
- "floral/flora/florar/plural" (en contexto de derrame) → "pleural"
- "iliar/ileal/lijar/ileal" (en contexto de adenopatía/ganglio) → "hilar"
- "parenquima" → "parénquima"
- "ecostructura" → "ecoestructura"
- "hipo intenso/hipo intenso" → "hipointenso"
- "hiper intenso" → "hiperintenso"
- "hipo denso/hipo densa" → "hipodenso/hipodensa"
- "hiper denso/hiper densa" → "hiperdenso/hiperdensa"
- "hipo ecoico/hipo ecóica" → "hipoecoico/hipoecoica"
- "hiper ecoico" → "hiperecoico"
- "supra colicular/supracolicular" → "supraclavicular"
- "infra colicular/infracolicular" → "infraclavicular"
- "para colicular" → "paraclavicular"
- "para traqueal" → "paratraqueal"
- "media estino/mediaste no/media tino" → "mediastino"
- "peri cardio/pericardio" → "pericárdico"
- "retro peritoneal/retro peritonear" → "retroperitoneal"
- "neumo tórax" → "neumotórax"
- "hemo tórax" → "hemotórax"
- "atelec tasia/atelectasia" → "atelectasia"
- "hepato megalia" → "hepatomegalia"
- "espleno megalia" → "esplenomegalia"
- "hidro nefrosis" → "hidronefrosis"
- "colé doco/cole doco" → "colédoco"
- "cole litiasis" → "colelitiasis"
- "cole cistitis" → "colecistitis"
- "diverti culosis" → "diverticulosis"
- "bronquio ectasias" → "bronquiectasias"
- "estea tosis" → "esteatosis"
- "cardio megalia" → "cardiomegalia"
- "trombo embolismo" → "tromboembolismo"
- "media estino/media es tino" → "mediastino"
- "peri cardio/pericardio" → "pericárdico"
- "retro peritoneal/retro peritonear" → "retroperitoneal"
- "neumo tórax" → "neumotórax"
- "hemo tórax" → "hemotórax"
- "atelec tasia/atelectasia" → "atelectasia"
- "hepato megalia" → "hepatomegalia"
- "espleno megalia" → "esplenomegalia"
- "hidro nefrosis" → "hidronefrosis"
- "litia sis" → "litiasis"
- "diverti culosis" → "diverticulosis"

REGLAS:
- Usa la modalidad y tipo de estudio para desambiguar homófonos.
- Corrige unidades: "5 milímetros" → "5 mm", "3 centímetros" → "3 cm" si el contexto es medida radiológica.
- Mantén EXACTAMENTE la misma estructura, puntuación y saltos de línea.
- Si el texto ya está correcto, devuélvelo tal cual.
- Responde SOLO con el texto corregido.`
      : `You are a radiology dictation transcription corrector. The text was transcribed by speech recognition and may contain phonetic errors.

YOUR TASK: Fix ONLY transcription errors (phonetic, spelling, misrecognized medical terminology). Do NOT change clinical content, do NOT add words, do NOT rephrase, do NOT reorder.

CONTEXT: ${modality ? `Modality: ${modality}.` : ""} ${studyType ? `Study: ${studyType}.` : ""}

COMMON SPEECH-TO-TEXT ERRORS IN RADIOLOGY:
- "pare nkima/parenchyma" → "parenchyma"
- "hypo intense in T one" → "hypointense on T1"
- "new frosts" → "nephrosis"
- Fix compound medical terms split by speech recognition.
- Convert spelled-out measurements: "5 millimeters" → "5 mm", "3 centimeters" → "3 cm".

RULES:
- Use modality/study type to disambiguate homophone errors.
- Keep EXACTLY the same structure, punctuation, line breaks.
- If the text is already correct, return it as-is.
- Respond ONLY with the corrected text.`;

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
