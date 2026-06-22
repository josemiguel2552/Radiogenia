export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
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
- Pregunta SOLO por datos que sean IMPRESCINDIBLES para elegir la categoría o recomendación correcta del sistema.
- NO preguntes por datos que ya están en el informe (hallazgos o conclusión).
- NO preguntes por datos opcionales o de "buena práctica" — solo por los que cambien la clasificación final.
- Máximo 3 preguntas. Solo las más importantes.
- Cada pregunta debe tener opciones predefinidas que el radiólogo pueda seleccionar rápidamente.

DATOS TÍPICAMENTE NECESARIOS (solo si NO están en el informe):
- LI-RADS: ¿El paciente tiene riesgo de CHC (cirrosis, hepatitis B/C crónica)?
- TNM: ¿Se conoce el tipo histológico? ¿Hay datos de extensión local o a distancia?
- BI-RADS: ¿Screening vs diagnóstico?
- PI-RADS: ¿Volumen prostático? ¿PSA?

Si TODOS los datos necesarios están en el informe, responde EXACTAMENTE: NO_QUESTIONS

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
- Ask ONLY about data that is ESSENTIAL to choose the correct category or recommendation for the system.
- DO NOT ask about data already present in the report (findings or conclusion).
- DO NOT ask about optional or "nice to have" data — only data that would change the final classification.
- Maximum 3 questions. Only the most important ones.
- Each question must have predefined options the radiologist can quickly select.

TYPICALLY NEEDED DATA (only if NOT in the report):
- LI-RADS: Is the patient at risk for HCC (cirrhosis, chronic hepatitis B/C)?
- TNM: Is the histological type known? Is there data on local or distant extension?
- BI-RADS: Screening vs diagnostic?
- PI-RADS: Prostate volume? PSA?

If ALL necessary data is present in the report, respond EXACTLY: NO_QUESTIONS

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
- Pergunte SOMENTE sobre dados que são IMPRESCINDÍVEIS para escolher a categoria ou recomendação correta do sistema.
- NÃO pergunte sobre dados que já estão no relatório (achados ou conclusão).
- NÃO pergunte sobre dados opcionais ou de "boa prática" — apenas dados que mudariam a classificação final.
- Máximo 3 perguntas. Apenas as mais importantes.
- Cada pergunta deve ter opções predefinidas que o radiologista possa selecionar rapidamente.

DADOS TIPICAMENTE NECESSÁRIOS (somente se NÃO estiverem no relatório):
- LI-RADS: O paciente tem risco de CHC (cirrose, hepatite B/C crônica)?
- TNM: O tipo histológico é conhecido? Há dados de extensão local ou a distância?
- BI-RADS: Screening vs diagnóstico?
- PI-RADS: Volume prostático? PSA?

Se TODOS os dados necessários estão no relatório, responda EXATAMENTE: NO_QUESTIONS

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
