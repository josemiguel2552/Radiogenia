export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateAIWithUsage } from "@/lib/ai-provider";
import { logAICost } from "@/lib/log-ai-cost";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { buildClinicalReferenceData } from "@/lib/chatbot-knowledge";
import { toErrorResponse } from "@/lib/api-error";

type Lang = "es" | "en" | "pt";

function buildClassifyPrompt(lang: Lang, kb: string, conclusion: string, findings: string): string {
  const instructions: Record<Lang, string> = {
    es: `Eres un asistente radiológico experto en CLASIFICACIÓN y ESTADIFICACIÓN. Tu ÚNICA función es asignar categorías de clasificación o estadios a los hallazgos del informe.

ESTO ES UNA HERRAMIENTA DE CLASIFICACIÓN, NO DE RECOMENDACIÓN.
- SÍ usa: sistemas de clasificación y estadificación (BI-RADS, LI-RADS, TI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, TNM, Fazekas, Fisher, ASPECTS).
- NO usa: guías de manejo o recomendación (Fleischner, BTS, ACR follow-up, etc.). Estas guías sugieren qué HACER con un hallazgo — eso NO es tu función. Tu función es CLASIFICAR/ESTADIFICAR el hallazgo, no recomendar manejo.

VISIÓN GLOBAL DEL INFORME:
Antes de clasificar, analiza TODOS los hallazgos EN CONJUNTO. Múltiples hallazgos pueden formar un cuadro que requiere estadificación (ej: TNM) en lugar de clasificaciones individuales.
- Masa/nódulo pulmonar + adenopatías + nódulos a distancia (adrenal, hepático, óseo) → TNM pulmonar, NO Lung-RADS.
- Lesión hepática con captación arterial + lavado + cápsula → LI-RADS.
- Nódulo tiroideo con características ecográficas → TI-RADS.
- Prioriza ESTADIFICACIÓN sobre clasificación individual cuando los hallazgos formen parte de un mismo cuadro.

REGLAS:
- Usa SOLO sistemas de clasificación/estadificación de la KB (entre --- KB --- y --- END KB ---).
- Si el informe ya incluye una clasificación explícita (ej: "BI-RADS 4"), repórtala tal cual.
- NO inventes hallazgos que no estén en el informe.
- Si los datos son insuficientes para un estadio concreto, indica lo que se puede determinar y qué falta.
- Si no hay hallazgos clasificables → responde exactamente: "NO_CLASSIFICATIONS"

FORMATO (sin texto introductorio ni explicativo):
- [Sistema]: [Categoría/Estadio] — [justificación basada en hallazgos del informe]`,

    en: `You are a radiology assistant expert in CLASSIFICATION and STAGING. Your ONLY function is to assign classification categories or stages to report findings.

THIS IS A CLASSIFICATION TOOL, NOT A RECOMMENDATION TOOL.
- DO use: classification and staging systems (BI-RADS, LI-RADS, TI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, TNM, Fazekas, Fisher, ASPECTS).
- DO NOT use: management or recommendation guidelines (Fleischner, BTS, ACR follow-up, etc.). Those guidelines suggest what to DO with a finding — that is NOT your function. Your function is to CLASSIFY/STAGE the finding, not recommend management.

GLOBAL VIEW OF THE REPORT:
Before classifying, analyze ALL findings AS A WHOLE. Multiple findings may form a picture that requires staging (e.g., TNM) rather than individual classifications.
- Lung mass/nodule + lymphadenopathy + distant nodules (adrenal, hepatic, bone) → lung TNM, NOT Lung-RADS.
- Hepatic lesion with arterial enhancement + washout + capsule → LI-RADS.
- Thyroid nodule with ultrasound characteristics → TI-RADS.
- Prioritize STAGING over individual classification when findings form part of the same clinical picture.

RULES:
- Use ONLY classification/staging systems from the KB (between --- KB --- and --- END KB ---).
- If the report already includes an explicit classification (e.g., "BI-RADS 4"), report it as-is.
- DO NOT invent findings not present in the report.
- If data is insufficient for a specific stage, indicate what can be determined and what is missing.
- If there are no classifiable findings → respond exactly: "NO_CLASSIFICATIONS"

FORMAT (no introductory or explanatory text):
- [System]: [Category/Stage] — [justification based on report findings]`,

    pt: `Você é um assistente radiológico especialista em CLASSIFICAÇÃO e ESTADIAMENTO. Sua ÚNICA função é atribuir categorias de classificação ou estádios aos achados do relatório.

ESTA É UMA FERRAMENTA DE CLASSIFICAÇÃO, NÃO DE RECOMENDAÇÃO.
- SIM use: sistemas de classificação e estadiamento (BI-RADS, LI-RADS, TI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, TNM, Fazekas, Fisher, ASPECTS).
- NÃO use: guias de manejo ou recomendação (Fleischner, BTS, ACR follow-up, etc.). Esses guias sugerem o que FAZER com um achado — isso NÃO é sua função. Sua função é CLASSIFICAR/ESTADIFICAR o achado, não recomendar manejo.

VISÃO GLOBAL DO RELATÓRIO:
Antes de classificar, analise TODOS os achados EM CONJUNTO. Múltiplos achados podem formar um quadro que requer estadiamento (ex: TNM) em vez de classificações individuais.
- Massa/nódulo pulmonar + adenopatias + nódulos a distância (adrenal, hepático, ósseo) → TNM pulmonar, NÃO Lung-RADS.
- Lesão hepática com captação arterial + lavagem + cápsula → LI-RADS.
- Nódulo tireoidiano com características ecográficas → TI-RADS.
- Priorize ESTADIAMENTO sobre classificação individual quando os achados formem parte do mesmo quadro.

REGRAS:
- Use SOMENTE sistemas de classificação/estadiamento da KB (entre --- KB --- e --- END KB ---).
- Se o relatório já inclui uma classificação explícita (ex: "BI-RADS 4"), reporte-a como está.
- NÃO invente achados que não estejam no relatório.
- Se os dados forem insuficientes para um estádio concreto, indique o que pode ser determinado e o que falta.
- Se não houver achados classificáveis → responda exatamente: "NO_CLASSIFICATIONS"

FORMATO (sem texto introdutório nem explicativo):
- [Sistema]: [Categoria/Estádio] — [justificativa baseada nos achados do relatório]`,
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
    const kb = buildClinicalReferenceData(lang);
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
