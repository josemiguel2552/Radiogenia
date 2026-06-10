export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateAIWithUsage } from "@/lib/ai-provider";
import { logAICost } from "@/lib/log-ai-cost";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { buildKnowledgeBase } from "@/lib/chatbot-knowledge";
import { toErrorResponse } from "@/lib/api-error";

type Lang = "es" | "en" | "pt";

function buildClassifyPrompt(lang: Lang, kb: string, conclusion: string, findings: string): string {
  const instructions: Record<Lang, string> = {
    es: `Eres un asistente radiológico experto en clasificaciones y estadiaje. Tu tarea es analizar el informe radiológico proporcionado e identificar hallazgos que puedan clasificarse o estadificarse según los sistemas de clasificación disponibles en la base de conocimiento.

REGLAS:
1. Usa SOLO clasificaciones que existan en la base de conocimiento (entre --- KB --- y --- END KB ---).
2. Solo clasifica hallazgos que estén CLARAMENTE descritos en el informe. No inventes hallazgos.
3. Si no hay hallazgos clasificables, responde exactamente: "NO_CLASSIFICATIONS"
4. Responde SOLO con las clasificaciones, sin texto introductorio ni explicativo.

FORMATO DE RESPUESTA (una línea por clasificación):
- [Sistema]: [Categoría/Estadio] — [breve justificación basada en el hallazgo del informe]

Ejemplos de clasificaciones posibles: LI-RADS, TI-RADS, BI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, Fleischner, BTS, TNM pulmón, TNM laringe, Fazekas, Fisher, ASPECTS, etc.

IMPORTANTE: Solo incluye clasificaciones cuando los datos del informe sean SUFICIENTES para determinar la categoría. Si faltan datos clave, no clasifiques.`,

    en: `You are a radiology assistant expert in classifications and staging. Your task is to analyze the provided radiology report and identify findings that can be classified or staged using the classification systems available in the knowledge base.

RULES:
1. Use ONLY classifications that exist in the knowledge base (between --- KB --- and --- END KB ---).
2. Only classify findings that are CLEARLY described in the report. Do not invent findings.
3. If there are no classifiable findings, respond exactly: "NO_CLASSIFICATIONS"
4. Respond ONLY with the classifications, no introductory or explanatory text.

RESPONSE FORMAT (one line per classification):
- [System]: [Category/Stage] — [brief justification based on the report finding]

Examples of possible classifications: LI-RADS, TI-RADS, BI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, Fleischner, BTS, Lung TNM, Larynx TNM, Fazekas, Fisher, ASPECTS, etc.

IMPORTANT: Only include classifications when the report data is SUFFICIENT to determine the category. If key data is missing, do not classify.`,

    pt: `Você é um assistente radiológico especialista em classificações e estadiamento. Sua tarefa é analisar o relatório radiológico fornecido e identificar achados que possam ser classificados ou estadiados usando os sistemas de classificação disponíveis na base de conhecimento.

REGRAS:
1. Use SOMENTE classificações que existam na base de conhecimento (entre --- KB --- e --- END KB ---).
2. Só classifique achados que estejam CLARAMENTE descritos no relatório. Não invente achados.
3. Se não houver achados classificáveis, responda exatamente: "NO_CLASSIFICATIONS"
4. Responda SOMENTE com as classificações, sem texto introdutório ou explicativo.

FORMATO DE RESPOSTA (uma linha por classificação):
- [Sistema]: [Categoria/Estádio] — [breve justificativa baseada no achado do relatório]

Exemplos de classificações possíveis: LI-RADS, TI-RADS, BI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, Fleischner, BTS, TNM pulmão, TNM laringe, Fazekas, Fisher, ASPECTS, etc.

IMPORTANTE: Só inclua classificações quando os dados do relatório forem SUFICIENTES para determinar a categoria. Se faltarem dados-chave, não classifique.`,
  };

  const reportLabel: Record<Lang, { findings: string; conclusion: string }> = {
    es: { findings: "HALLAZGOS", conclusion: "CONCLUSIÓN" },
    en: { findings: "FINDINGS", conclusion: "CONCLUSION" },
    pt: { findings: "ACHADOS", conclusion: "CONCLUSÃO" },
  };
  const labels = reportLabel[lang];

  return `${instructions[lang]}

--- KB ---
${kb}
--- END KB ---

--- REPORT ---
${findings ? `${labels.findings}:\n${findings}\n\n` : ""}${labels.conclusion}:
${conclusion}
--- END REPORT ---`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`classify:${user.id}`, RATE_LIMITS.generate);
    if (!rl.allowed) return rl.errorResponse!;

    const { conclusion, findings, language } = await req.json() as {
      conclusion: string;
      findings?: string;
      language?: string;
    };

    if (!conclusion?.trim()) {
      return NextResponse.json({ error: "No conclusion" }, { status: 400 });
    }

    const lang = (language === "en" || language === "pt" ? language : "es") as Lang;
    const globalConfig = await getGlobalAIConfig();
    const taskModel = globalConfig.taskOverrides?.conclusion;
    const effectiveProvider = taskModel?.provider || globalConfig.provider;
    const effectiveKey = resolveApiKey(globalConfig, effectiveProvider);

    if (!effectiveKey) {
      return NextResponse.json(
        { error: `No API key configured for provider "${effectiveProvider}".` },
        { status: 500 },
      );
    }

    const effectiveModel = taskModel?.modelName || globalConfig.modelName;
    const kb = buildKnowledgeBase(lang);
    const system = buildClassifyPrompt(lang, kb, conclusion, findings || "");

    const { text, usage } = await generateAIWithUsage({
      provider: effectiveProvider,
      modelName: effectiveModel,
      apiKey: effectiveKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: conclusion + (findings ? `\n\n${findings}` : ""),
      maxTokens: 1024,
    });

    if (usage) {
      logAICost({
        userId: user.id,
        action: "classify",
        provider: effectiveProvider,
        model: effectiveModel,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
    }

    const trimmed = text.trim();
    if (trimmed === "NO_CLASSIFICATIONS" || !trimmed) {
      return NextResponse.json({ classifications: null });
    }

    return NextResponse.json({ classifications: trimmed });
  } catch (error) {
    return toErrorResponse(error);
  }
}
