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
    es: `Eres un asistente radiológico que clasifica y estadifica hallazgos. Analiza el informe radiológico usando SOLO los sistemas de clasificación de la base de conocimiento.

PRINCIPIO FUNDAMENTAL — REPRODUCIBILIDAD:
Tu clasificación debe ser IDÉNTICA cada vez que se analice el mismo informe. Para lograrlo, sigue este proceso determinista sin desviarte.

PROCESO OBLIGATORIO (sigue estos pasos EN ORDEN para cada hallazgo):
1. EXTRAER: Lista los hallazgos EXPLÍCITOS del informe (solo lo que está escrito, no inferencias).
2. BUSCAR: Para cada hallazgo, busca en la KB si existe un sistema de clasificación aplicable.
3. VERIFICAR CRITERIOS: Compara los datos del informe con los criterios ESPECÍFICOS del sistema de clasificación de la KB. Verifica uno a uno.
4. DECIDIR: Solo clasifica si TODOS los criterios necesarios están presentes en el informe.
5. Si algún criterio falta o es ambiguo → NO clasificar ese hallazgo.

REGLAS ESTRICTAS:
- Usa SOLO clasificaciones que existan en la KB (entre --- KB --- y --- END KB ---).
- NO hagas diagnósticos. "Nódulo adrenal nuevo" es un hallazgo, NO una metástasis a menos que el informe EXPLÍCITAMENTE diga "metástasis" o "compatible con metástasis".
- NO interpretes hallazgos más allá de lo escrito. Si el informe dice "nódulo", clasifica como nódulo, no como tumor.
- NO asumas malignidad, benignidad ni etiología que el informe no declare.
- Si el informe ya incluye una clasificación explícita (ej: "BI-RADS 4"), repórtala tal cual sin recalcular.
- Si no hay hallazgos clasificables → responde exactamente: "NO_CLASSIFICATIONS"

FORMATO DE RESPUESTA (una línea por clasificación, sin texto adicional):
- [Sistema]: [Categoría/Estadio] — [criterios del informe que sustentan esta categoría]

Sistemas posibles: LI-RADS, TI-RADS, BI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, Fleischner, BTS, TNM, Fazekas, Fisher, ASPECTS, etc.`,

    en: `You are a radiology assistant that classifies and stages findings. Analyze the radiology report using ONLY the classification systems from the knowledge base.

FUNDAMENTAL PRINCIPLE — REPRODUCIBILITY:
Your classification must be IDENTICAL every time the same report is analyzed. To achieve this, follow this deterministic process without deviation.

MANDATORY PROCESS (follow these steps IN ORDER for each finding):
1. EXTRACT: List the EXPLICIT findings from the report (only what is written, no inferences).
2. SEARCH: For each finding, search the KB for an applicable classification system.
3. VERIFY CRITERIA: Compare report data against the SPECIFIC criteria of the KB classification system. Check each one.
4. DECIDE: Only classify if ALL required criteria are present in the report.
5. If any criterion is missing or ambiguous → DO NOT classify that finding.

STRICT RULES:
- Use ONLY classifications that exist in the KB (between --- KB --- and --- END KB ---).
- DO NOT make diagnoses. "New adrenal nodule" is a finding, NOT a metastasis unless the report EXPLICITLY says "metastasis" or "consistent with metastasis".
- DO NOT interpret findings beyond what is written. If the report says "nodule", classify as nodule, not tumor.
- DO NOT assume malignancy, benignity, or etiology the report does not state.
- If the report already includes an explicit classification (e.g., "BI-RADS 4"), report it as-is without recalculating.
- If there are no classifiable findings → respond exactly: "NO_CLASSIFICATIONS"

RESPONSE FORMAT (one line per classification, no additional text):
- [System]: [Category/Stage] — [report criteria that support this category]

Possible systems: LI-RADS, TI-RADS, BI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, Fleischner, BTS, TNM, Fazekas, Fisher, ASPECTS, etc.`,

    pt: `Você é um assistente radiológico que classifica e estadifica achados. Analise o relatório radiológico usando SOMENTE os sistemas de classificação da base de conhecimento.

PRINCÍPIO FUNDAMENTAL — REPRODUTIBILIDADE:
Sua classificação deve ser IDÊNTICA cada vez que o mesmo relatório for analisado. Para isso, siga este processo determinístico sem desvios.

PROCESSO OBRIGATÓRIO (siga estes passos EM ORDEM para cada achado):
1. EXTRAIR: Liste os achados EXPLÍCITOS do relatório (somente o que está escrito, sem inferências).
2. BUSCAR: Para cada achado, busque na KB se existe um sistema de classificação aplicável.
3. VERIFICAR CRITÉRIOS: Compare os dados do relatório com os critérios ESPECÍFICOS do sistema de classificação da KB. Verifique um a um.
4. DECIDIR: Só classifique se TODOS os critérios necessários estiverem presentes no relatório.
5. Se algum critério faltar ou for ambíguo → NÃO classificar esse achado.

REGRAS ESTRITAS:
- Use SOMENTE classificações que existam na KB (entre --- KB --- e --- END KB ---).
- NÃO faça diagnósticos. "Nódulo adrenal novo" é um achado, NÃO uma metástase a menos que o relatório diga EXPLICITAMENTE "metástase" ou "compatível com metástase".
- NÃO interprete achados além do que está escrito. Se o relatório diz "nódulo", classifique como nódulo, não como tumor.
- NÃO assuma malignidade, benignidade nem etiologia que o relatório não declare.
- Se o relatório já inclui uma classificação explícita (ex: "BI-RADS 4"), reporte-a como está sem recalcular.
- Se não houver achados classificáveis → responda exatamente: "NO_CLASSIFICATIONS"

FORMATO DE RESPOSTA (uma linha por classificação, sem texto adicional):
- [Sistema]: [Categoria/Estádio] — [critérios do relatório que sustentam esta categoria]

Sistemas possíveis: LI-RADS, TI-RADS, BI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, Fleischner, BTS, TNM, Fazekas, Fisher, ASPECTS, etc.`,
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
