export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey, hasPlatformAccess } from "@/lib/auth-helpers";
import { generateAIWithUsage } from "@/lib/ai-provider";
import { logAICost } from "@/lib/log-ai-cost";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";

type Lang = "es" | "en" | "pt";

function buildPreflightPrompt(
  lang: Lang,
  conclusion: string,
  findings: string,
  systems: string[],
): string {
  const systemsList = systems.join(", ");

  const instructions: Record<Lang, string> = {
    es: `Eres un asistente radiológico. Analiza el informe y los sistemas de clasificación seleccionados (${systemsList}) para determinar si falta algún dato CLÍNICAMENTE NECESARIO para aplicar la clasificación correctamente.

REGLAS:
- Pregunta SOLO por datos que (a) el RADIÓLOGO PUEDA APORTAR (determinables por imagen o que suelen constar en la petición) y (b) sean IMPRESCINDIBLES porque cambian la categoría final.
- NUNCA preguntes por datos que el radiólogo NO puede conocer desde la imagen: tipo o subtipo HISTOLÓGICO, grado tumoral, receptores o estado molecular, ni la naturaleza CITOLÓGICA/ANATOMOPATOLÓGICA definitiva de un hallazgo (p. ej. si un derrame pleural o una lesión indeterminada es benigno o maligno). Estos datos NO se preguntan: el estadiaje se propone de forma CONDICIONAL en la herramienta de clasificación.
- NO preguntes por datos que ya están en el informe (hallazgos o conclusión).
- NO preguntes por datos opcionales o de "buena práctica" — solo los IMPRESCINDIBLES.
- Máximo 3 preguntas. Solo las más importantes. Si dudas de si es imprescindible o si el radiólogo lo sabrá, NO lo preguntes.
- Cada pregunta debe tener opciones predefinidas que el radiólogo pueda seleccionar rápidamente.

DATOS QUE SÍ PUEDES PREGUNTAR (solo si faltan y son imprescindibles):
- LI-RADS: ¿El paciente tiene factores de riesgo de CHC (cirrosis, hepatitis B/C crónica)? — suele constar en la petición.
- BI-RADS: ¿Estudio de screening o diagnóstico?
- PI-RADS: ¿Volumen prostático / PSA, si son necesarios?
- TNM: la LOCALIZACIÓN del tumor primario, solo si es imprescindible para elegir la tabla TNM correcta y no consta.

DATOS QUE NO DEBES PREGUNTAR (se resuelven con estadiaje condicional, no preguntando):
- Tipo o subtipo histológico del tumor.
- Si un derrame pleural/pericárdico es maligno o benigno.
- Si una lesión indeterminada es metastásica.
- Grado, receptores o marcadores.

Si TODOS los datos que el radiólogo puede aportar ya están presentes, responde EXACTAMENTE: NO_QUESTIONS

Si faltan datos, responde con este formato JSON (sin bloques de código, sin explicaciones):
[
  {
    "id": "identificador_unico",
    "question": "Texto de la pregunta",
    "options": ["Opción 1", "Opción 2", "Opción 3"]
  }
]

Las opciones deben cubrir los escenarios más comunes. Incluye siempre una opción de "No disponible" o "Desconocido" como última opción.`,

    en: `You are a radiology assistant. Analyze the report and selected classification systems (${systemsList}) to determine if any CLINICALLY NECESSARY data is missing to apply the classification correctly.

RULES:
- Ask ONLY about data that (a) the RADIOLOGIST CAN PROVIDE (determinable from imaging or usually stated in the request) and (b) is ESSENTIAL because it changes the final category.
- NEVER ask about data the radiologist CANNOT know from imaging: HISTOLOGICAL type or subtype, tumor grade, receptor or molecular status, or the definitive CYTOLOGICAL/PATHOLOGICAL nature of a finding (e.g., whether a pleural effusion or an indeterminate lesion is benign or malignant). These are NOT asked: staging is proposed CONDITIONALLY in the classification tool.
- DO NOT ask about data already present in the report (findings or conclusion).
- DO NOT ask about optional or "nice to have" data — only the ESSENTIAL ones.
- Maximum 3 questions. Only the most important ones. If unsure whether it is essential or whether the radiologist will know it, DO NOT ask.
- Each question must have predefined options the radiologist can quickly select.

DATA YOU MAY ASK (only if missing and essential):
- LI-RADS: Does the patient have HCC risk factors (cirrhosis, chronic hepatitis B/C)? — usually in the request.
- BI-RADS: Screening or diagnostic study?
- PI-RADS: Prostate volume / PSA, if needed?
- TNM: the LOCATION of the primary tumor, only if essential to choose the correct TNM table and not stated.

DATA YOU MUST NOT ASK (resolved via conditional staging, not by asking):
- Histological type or subtype of the tumor.
- Whether a pleural/pericardial effusion is malignant or benign.
- Whether an indeterminate lesion is metastatic.
- Grade, receptors, or markers.

If ALL data the radiologist can provide is already present, respond EXACTLY: NO_QUESTIONS

If data is missing, respond in this JSON format (no code blocks, no explanations):
[
  {
    "id": "unique_identifier",
    "question": "Question text",
    "options": ["Option 1", "Option 2", "Option 3"]
  }
]

Options should cover the most common scenarios. Always include "Not available" or "Unknown" as the last option.`,

    pt: `Você é um assistente radiológico. Analise o relatório e os sistemas de classificação selecionados (${systemsList}) para determinar se falta algum dado CLINICAMENTE NECESSÁRIO para aplicar a classificação corretamente.

REGRAS:
- Pergunte SOMENTE sobre dados que (a) o RADIOLOGISTA POSSA FORNECER (determináveis por imagem ou que costumam constar na solicitação) e (b) sejam IMPRESCINDÍVEIS porque mudam a categoria final.
- NUNCA pergunte sobre dados que o radiologista NÃO pode saber pela imagem: tipo ou subtipo HISTOLÓGICO, grau tumoral, receptores ou estado molecular, nem a natureza CITOLÓGICA/ANATOMOPATOLÓGICA definitiva de um achado (ex.: se um derrame pleural ou uma lesão indeterminada é benigno ou maligno). Estes dados NÃO são perguntados: o estadiamento é proposto de forma CONDICIONAL na ferramenta de classificação.
- NÃO pergunte sobre dados que já estão no relatório (achados ou conclusão).
- NÃO pergunte sobre dados opcionais ou de "boa prática" — apenas os IMPRESCINDÍVEIS.
- Máximo 3 perguntas. Apenas as mais importantes. Se estiver em dúvida se é imprescindível ou se o radiologista saberá, NÃO pergunte.
- Cada pergunta deve ter opções predefinidas que o radiologista possa selecionar rapidamente.

DADOS QUE VOCÊ PODE PERGUNTAR (somente se faltarem e forem imprescindíveis):
- LI-RADS: O paciente tem fatores de risco de CHC (cirrose, hepatite B/C crônica)? — costuma constar na solicitação.
- BI-RADS: Estudo de screening ou diagnóstico?
- PI-RADS: Volume prostático / PSA, se necessários?
- TNM: a LOCALIZAÇÃO do tumor primário, apenas se imprescindível para escolher a tabela TNM correta e não constar.

DADOS QUE VOCÊ NÃO DEVE PERGUNTAR (resolvidos com estadiamento condicional, não perguntando):
- Tipo ou subtipo histológico do tumor.
- Se um derrame pleural/pericárdico é maligno ou benigno.
- Se uma lesão indeterminada é metastática.
- Grau, receptores ou marcadores.

Se TODOS os dados que o radiologista pode fornecer já estão presentes, responda EXATAMENTE: NO_QUESTIONS

Se faltam dados, responda neste formato JSON (sem blocos de código, sem explicações):
[
  {
    "id": "identificador_unico",
    "question": "Texto da pergunta",
    "options": ["Opção 1", "Opção 2", "Opção 3"]
  }
]

As opções devem cobrir os cenários mais comuns. Inclua sempre "Não disponível" ou "Desconhecido" como última opção.`,
  };

  return `${instructions[lang]}

--- REPORT ---
${findings ? `FINDINGS:\n${findings}\n\n` : ""}CONCLUSION:
${conclusion}
--- END REPORT ---`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`classify-preflight:${user.id}`, RATE_LIMITS.generate);
    if (!rl.allowed) return rl.errorResponse!;

    // Card-first billing: no AI usage without an active subscription, even
    // via direct API calls with a live session.
    if (!(await hasPlatformAccess(user.id))) {
      return NextResponse.json({ error: "Subscription required", code: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
    }


    const { conclusion, findings, language, systems } = (await req.json()) as {
      conclusion: string;
      findings?: string;
      language?: string;
      systems: string[];
    };

    if (!conclusion?.trim() || !systems?.length) {
      return NextResponse.json(
        { error: "Missing conclusion or systems" },
        { status: 400 },
      );
    }

    const lang = (
      language === "en" || language === "pt" ? language : "es"
    ) as Lang;
    const globalConfig = await getGlobalAIConfig();
    const taskModel = globalConfig.taskOverrides?.classify;
    const effectiveProvider = taskModel?.provider || globalConfig.provider;
    const effectiveKey = resolveApiKey(globalConfig, effectiveProvider);

    if (!effectiveKey) {
      return NextResponse.json(
        { error: `No API key for "${effectiveProvider}".` },
        { status: 500 },
      );
    }

    const effectiveModel = taskModel?.modelName || globalConfig.modelName;
    const prompt = buildPreflightPrompt(
      lang,
      conclusion,
      findings || "",
      systems,
    );

    const { text, usage } = await generateAIWithUsage({
      provider: effectiveProvider,
      modelName: effectiveModel,
      apiKey: effectiveKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system: prompt,
      user: conclusion + (findings ? `\n\n${findings}` : ""),
      maxTokens: 512,
    });

    if (usage) {
      logAICost({
        userId: user.id,
        action: "classify_preflight",
        provider: effectiveProvider,
        model: effectiveModel,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
    }

    const raw = text.trim();
    if (raw === "NO_QUESTIONS") {
      return NextResponse.json({ questions: [] });
    }

    try {
      const jsonStr = raw.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
      const questions = JSON.parse(jsonStr) as {
        id: string;
        question: string;
        options: string[];
      }[];
      if (Array.isArray(questions)) {
        return NextResponse.json({ questions: questions.slice(0, 3) });
      }
    } catch {
      // AI didn't return valid JSON — treat as no questions
    }

    return NextResponse.json({ questions: [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}
