export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateAI } from "@/lib/ai-provider";

function buildModalityContext(modality: string | undefined, isEs: boolean): string {
  if (!modality) return "";
  const m = modality.toLowerCase();

  if (m === "mri" || m === "rm") {
    return isEs
      ? `TERMINOLOGÍA ESPERADA (RM): hiperintenso, hipointenso, isointenso, señal T1, señal T2, FLAIR, difusión, restricción, realce, gadolinio, secuencia, corte axial/sagital/coronal, sustancia blanca, sustancia gris, cuerpo calloso, hipocampo, ventrículo, surco, cisterna.
DESAMBIGUACIÓN: en RM "señal" es correcto, "densidad/atenuación" NO (son de TC). "Eco" aislado probablemente es "eco de gradiente", no "ecogenicidad" (que es de ecografía).\n`
      : `EXPECTED TERMINOLOGY (MRI): hyperintense, hypointense, isointense, T1 signal, T2 signal, FLAIR, diffusion, restriction, enhancement, gadolinium, sequence, axial/sagittal/coronal, white matter, gray matter, corpus callosum, hippocampus, ventricle, sulcus, cistern.
DISAMBIGUATION: in MRI "signal" is correct, "density/attenuation" is NOT (that's CT). "Echo" alone is likely "gradient echo", not "echogenicity" (that's ultrasound).\n`;
  }
  if (m === "ct" || m === "tc") {
    return isEs
      ? `TERMINOLOGÍA ESPERADA (TC): densidad, atenuación, hiperdenso, hipodenso, isodenso, realce, contraste yodado, ventana pulmonar/ósea/mediastínica, Hounsfield, corte axial, reconstrucción coronal/sagital, MPR, MIP.
DESAMBIGUACIÓN: en TC "densidad/atenuación" es correcto, "señal/intensidad de señal" NO (son de RM). "Eco" NO aplica en TC.\n`
      : `EXPECTED TERMINOLOGY (CT): density, attenuation, hyperdense, hypodense, isodense, enhancement, iodinated contrast, lung/bone/mediastinal window, Hounsfield, axial slice, coronal/sagittal reconstruction, MPR, MIP.
DISAMBIGUATION: in CT "density/attenuation" is correct, "signal/signal intensity" is NOT (that's MRI). "Echo" does NOT apply in CT.\n`;
  }
  if (m === "ultrasound" || m === "ecografía" || m === "us") {
    return isEs
      ? `TERMINOLOGÍA ESPERADA (Ecografía): ecogenicidad, ecoestructura, hipoecoico, hiperecoico, isoecoico, anecoico, sombra acústica, refuerzo posterior, Doppler, flujo, vascularización, transductor.
DESAMBIGUACIÓN: en ecografía "ecogenicidad/ecoestructura" es correcto, "señal/densidad/atenuación" NO (son de RM/TC). "Realce" NO aplica (no hay contraste IV habitual).\n`
      : `EXPECTED TERMINOLOGY (Ultrasound): echogenicity, echotexture, hypoechoic, hyperechoic, isoechoic, anechoic, acoustic shadow, posterior enhancement, Doppler, flow, vascularity, transducer.
DISAMBIGUATION: in ultrasound "echogenicity/echotexture" is correct, "signal/density/attenuation" is NOT (that's MRI/CT). "Enhancement" does NOT apply (no routine IV contrast).\n`;
  }
  if (m === "xray" || m === "rx" || m === "radiografía") {
    return isEs
      ? `TERMINOLOGÍA ESPERADA (Rx): radiopaco, radiolúcido, densidad, silueta, índice cardiotorácico, trama broncovascular, senos costofrénicos, mediastino, hilios, campos pulmonares.
DESAMBIGUACIÓN: en Rx NO se usa "señal" (RM), "ecogenicidad" (eco), ni "atenuación/Hounsfield" (TC).\n`
      : `EXPECTED TERMINOLOGY (XRay): radiopaque, radiolucent, density, silhouette, cardiothoracic ratio, bronchovascular markings, costophrenic angles, mediastinum, hila, lung fields.
DISAMBIGUATION: in XRay do NOT use "signal" (MRI), "echogenicity" (ultrasound), or "attenuation/Hounsfield" (CT).\n`;
  }
  if (m === "mammography" || m === "mamografía" || m === "mg") {
    return isEs
      ? `TERMINOLOGÍA ESPERADA (Mamografía): densidad mamaria, microcalcificaciones, nódulo, masa, distorsión arquitectural, asimetría, axila, ganglio, BI-RADS, espiculado, lobulado, redondeado.
DESAMBIGUACIÓN: en mamografía "densidad" es correcto. NO se usa "señal" (RM), "ecogenicidad" (eco).\n`
      : `EXPECTED TERMINOLOGY (Mammography): breast density, microcalcifications, nodule, mass, architectural distortion, asymmetry, axilla, lymph node, BI-RADS, spiculated, lobulated, round.
DISAMBIGUATION: in mammography "density" is correct. Do NOT use "signal" (MRI), "echogenicity" (ultrasound).\n`;
  }
  return "";
}

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

    const modalityContext = buildModalityContext(modality, isEs);

    const system = isEs
      ? `Eres un corrector de dictados radiológicos transcritos por voz. Corrige SOLO errores de transcripción fonética y ortográfica. NO cambies contenido clínico, NO añadas ni elimines palabras, NO reformules, NO reordenes.

${modality || studyType ? `CONTEXTO: ${modality ? `Modalidad: ${modality}.` : ""} ${studyType ? `Estudio: ${studyType}.` : ""}` : ""}
${modalityContext}
CORRECCIONES OBLIGATORIAS:
Términos mal separados (une siempre): "hipo intenso"→"hipointenso", "hiper intenso"→"hiperintenso", "hipo denso"→"hipodenso", "hiper denso"→"hiperdenso", "hipo ecoico"→"hipoecoico", "hiper ecoico"→"hiperecoico", "neumo tórax"→"neumotórax", "hemo tórax"→"hemotórax", "hepato megalia"→"hepatomegalia", "espleno megalia"→"esplenomegalia", "hidro nefrosis"→"hidronefrosis", "cardio megalia"→"cardiomegalia", "trombo embolismo"→"tromboembolismo", "bronquio ectasias"→"bronquiectasias", "cole litiasis"→"colelitiasis", "cole cistitis"→"colecistitis", "diverti culosis"→"diverticulosis", "retro peritoneal"→"retroperitoneal", "atelec tasia"→"atelectasia", "media estino"→"mediastino", "estea tosis"→"esteatosis", "para traqueal"→"paratraqueal", "peri cardio"→"pericárdico", "eco estructura"→"ecoestructura", "colé doco"→"colédoco"

Homófonos frecuentes: "no dura/nodura/nodo"→"nódulo", "laburo/lavuro/globo"→"lóbulo", "floral/flora/plural"→"pleural", "iliar/ileal/lijar"→"hilar", "supra colicular"→"supraclavicular", "infra colicular"→"infraclavicular", "litia sis"→"litiasis"

Acentos: "parenquima"→"parénquima", "nodulo"→"nódulo", "lobulo"→"lóbulo"

Unidades: "5 milímetros"→"5 mm", "3 centímetros"→"3 cm"

Mantén la estructura, puntuación y saltos de línea exactos. Si el texto ya es correcto, devuélvelo igual. Responde SOLO con el texto corregido.`
      : `You are a radiology dictation corrector. Fix ONLY speech-to-text errors (phonetic, spelling, misrecognized medical terms). Do NOT change clinical content, add/remove words, rephrase, or reorder.

${modality || studyType ? `CONTEXT: ${modality ? `Modality: ${modality}.` : ""} ${studyType ? `Study: ${studyType}.` : ""}` : ""}
${modalityContext}
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
