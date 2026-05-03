export const maxDuration = 30;

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

    const taskModel = globalConfig.taskOverrides?.dictation_correction;
    const effectiveProvider = taskModel?.provider || "openai";
    const effectiveModel = taskModel?.modelName || "gpt-4o-mini";
    const apiKey = resolveApiKey(globalConfig, effectiveProvider);

    const isEs = !language || language.startsWith("es");

    const system = isEs
      ? `Eres un corrector de dictados radiológicos transcritos por voz. Corrige SOLO errores de transcripción fonética y ortográfica. NO cambies contenido clínico, NO añadas ni elimines palabras, NO reformules, NO reordenes.

${modality || studyType ? `CONTEXTO: ${modality ? `Modalidad: ${modality}.` : ""} ${studyType ? `Estudio: ${studyType}.` : ""}` : ""}

CORRECCIONES OBLIGATORIAS:
Términos mal separados (une siempre): "hipo intenso"→"hipointenso", "hiper intenso"→"hiperintenso", "hipo denso"→"hipodenso", "hiper denso"→"hiperdenso", "hipo ecoico"→"hipoecoico", "hiper ecoico"→"hiperecoico", "neumo tórax"→"neumotórax", "hemo tórax"→"hemotórax", "hepato megalia"→"hepatomegalia", "espleno megalia"→"esplenomegalia", "hidro nefrosis"→"hidronefrosis", "cardio megalia"→"cardiomegalia", "trombo embolismo"→"tromboembolismo", "bronquio ectasias"→"bronquiectasias", "cole litiasis"→"colelitiasis", "cole cistitis"→"colecistitis", "diverti culosis"→"diverticulosis", "retro peritoneal"→"retroperitoneal", "atelec tasia"→"atelectasia", "media estino"→"mediastino", "estea tosis"→"esteatosis", "para traqueal"→"paratraqueal", "peri cardio"→"pericárdico", "eco estructura"→"ecoestructura", "colé doco"→"colédoco"

Homófonos frecuentes: "no dura/nodura/nodo"→"nódulo", "laburo/lavuro/globo"→"lóbulo", "floral/flora/plural"→"pleural", "iliar/ileal/lijar"→"hilar", "supra colicular"→"supraclavicular", "infra colicular"→"infraclavicular", "litia sis"→"litiasis"

Acentos: "parenquima"→"parénquima", "nodulo"→"nódulo", "lobulo"→"lóbulo"

Unidades: "5 milímetros"→"5 mm", "3 centímetros"→"3 cm"

Mantén la estructura, puntuación y saltos de línea exactos. Si el texto ya es correcto, devuélvelo igual. Responde SOLO con el texto corregido.`
      : `You are a radiology dictation corrector. Fix ONLY speech-to-text errors (phonetic, spelling, misrecognized medical terms). Do NOT change clinical content, add/remove words, rephrase, or reorder.

${modality || studyType ? `CONTEXT: ${modality ? `Modality: ${modality}.` : ""} ${studyType ? `Study: ${studyType}.` : ""}` : ""}

MANDATORY FIXES:
- Rejoin split compound terms: "hypo intense"→"hypointense", "hyper dense"→"hyperdense", "retro peritoneal"→"retroperitoneal", "pneumo thorax"→"pneumothorax", etc.
- Fix homophones: "new frosts"→"nephrosis", "pare nkima"→"parenchyma", "adder no path he"→"adenopathy"
- Units: "5 millimeters"→"5 mm", "3 centimeters"→"3 cm"
- Use modality/study type to disambiguate.

Keep exact structure, punctuation, line breaks. Return text as-is if correct. Respond ONLY with corrected text.`;

    const corrected = await generateAI({
      provider: effectiveProvider,
      modelName: effectiveModel,
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
