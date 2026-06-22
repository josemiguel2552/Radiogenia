export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateAIWithUsage } from "@/lib/ai-provider";
import { logAICost } from "@/lib/log-ai-cost";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";

type Lang = "es" | "en" | "pt";

const SYSTEMS_LIST = [
  { id: "BI-RADS", label: { es: "BI-RADS (mama)", en: "BI-RADS (breast)", pt: "BI-RADS (mama)" } },
  { id: "Bosniak", label: { es: "Bosniak (quistes renales)", en: "Bosniak (renal cysts)", pt: "Bosniak (cistos renais)" } },
  { id: "CAD-RADS", label: { es: "CAD-RADS (coronarias)", en: "CAD-RADS (coronary)", pt: "CAD-RADS (coronárias)" } },
  { id: "Fleischner", label: { es: "Fleischner 2017 (nódulos pulmonares)", en: "Fleischner 2017 (pulmonary nodules)", pt: "Fleischner 2017 (nódulos pulmonares)" } },
  { id: "BTS", label: { es: "BTS (nódulos pulmonares)", en: "BTS (pulmonary nodules)", pt: "BTS (nódulos pulmonares)" } },
  { id: "LI-RADS", label: { es: "LI-RADS (hígado)", en: "LI-RADS (liver)", pt: "LI-RADS (fígado)" } },
  { id: "Lung-RADS", label: { es: "Lung-RADS (screening pulmonar)", en: "Lung-RADS (lung screening)", pt: "Lung-RADS (screening pulmonar)" } },
  { id: "O-RADS", label: { es: "O-RADS (ovario)", en: "O-RADS (ovary)", pt: "O-RADS (ovário)" } },
  { id: "PI-RADS", label: { es: "PI-RADS (próstata)", en: "PI-RADS (prostate)", pt: "PI-RADS (próstata)" } },
  { id: "TI-RADS", label: { es: "TI-RADS (tiroides)", en: "TI-RADS (thyroid)", pt: "TI-RADS (tireoide)" } },
  { id: "TNM", label: { es: "TNM (estadificación tumoral)", en: "TNM (tumor staging)", pt: "TNM (estadiamento tumoral)" } },
  { id: "Fazekas", label: { es: "Fazekas (leucoaraiosis)", en: "Fazekas (leukoaraiosis)", pt: "Fazekas (leucoaraiose)" } },
  { id: "Fisher", label: { es: "Fisher (hemorragia subaracnoidea)", en: "Fisher (subarachnoid hemorrhage)", pt: "Fisher (hemorragia subaracnoidea)" } },
  { id: "ASPECTS", label: { es: "ASPECTS (ictus)", en: "ASPECTS (stroke)", pt: "ASPECTS (AVC)" } },
];

function buildDetectPrompt(lang: Lang, conclusion: string, findings: string): string {
  const systemIds = SYSTEMS_LIST.map((s) => s.id).join(", ");

  const instructions: Record<Lang, string> = {
    es: `Analiza los hallazgos y conclusión de este informe radiológico y determina qué sistemas de clasificación son APLICABLES.

Sistemas disponibles: ${systemIds}

REGLAS:
- Un sistema es aplicable SOLO si el informe contiene los datos específicos necesarios para aplicarlo.
- Para Fleischner/BTS: ambos aplican a nódulos pulmonares con tamaño. Si hay un nódulo pulmonar con tamaño, incluye AMBOS (Fleischner y BTS) para que el usuario elija.
- Para Lung-RADS: screening de cáncer de pulmón con nódulos.
- Para TNM: requiere hallazgos sugestivos de neoplasia con datos suficientes para estadificar.
- NO incluyas sistemas cuyos datos no estén en el informe.
- Si varios sistemas aplican al MISMO hallazgo (ej: nódulo pulmonar → Fleischner Y BTS Y Lung-RADS), incluye TODOS para que el usuario elija.

Responde SOLO con los IDs de los sistemas aplicables, uno por línea. Sin explicaciones.
Si ninguno aplica, responde: NONE`,

    en: `Analyze the findings and conclusion of this radiology report and determine which classification systems are APPLICABLE.

Available systems: ${systemIds}

RULES:
- A system is applicable ONLY if the report contains the specific data needed to apply it.
- For Fleischner/BTS: both apply to pulmonary nodules with size. If there is a pulmonary nodule with size, include BOTH (Fleischner and BTS) so the user can choose.
- For Lung-RADS: lung cancer screening with nodules.
- For TNM: requires findings suggestive of neoplasia with sufficient data for staging.
- DO NOT include systems whose required data is not in the report.
- If multiple systems apply to the SAME finding (e.g., lung nodule → Fleischner AND BTS AND Lung-RADS), include ALL so the user can choose.

Respond ONLY with the IDs of applicable systems, one per line. No explanations.
If none apply, respond: NONE`,

    pt: `Analise os achados e conclusão deste relatório radiológico e determine quais sistemas de classificação são APLICÁVEIS.

Sistemas disponíveis: ${systemIds}

REGRAS:
- Um sistema é aplicável SOMENTE se o relatório contém os dados específicos necessários para aplicá-lo.
- Para Fleischner/BTS: ambos se aplicam a nódulos pulmonares com tamanho. Se há nódulo pulmonar com tamanho, inclua AMBOS (Fleischner e BTS) para o usuário escolher.
- Para Lung-RADS: screening de câncer de pulmão com nódulos.
- Para TNM: requer achados sugestivos de neoplasia com dados suficientes para estadiamento.
- NÃO inclua sistemas cujos dados não estejam no relatório.
- Se vários sistemas se aplicam ao MESMO achado (ex: nódulo pulmonar → Fleischner E BTS E Lung-RADS), inclua TODOS para que o usuário escolha.

Responda SOMENTE com os IDs dos sistemas aplicáveis, um por linha. Sem explicações.
Se nenhum se aplica, responda: NONE`,
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`classify-detect:${user.id}`, RATE_LIMITS.generate);
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
    const taskModel = globalConfig.taskOverrides?.classify;
    const effectiveProvider = taskModel?.provider || globalConfig.provider;
    const effectiveKey = resolveApiKey(globalConfig, effectiveProvider);

    if (!effectiveKey) {
      return NextResponse.json({ error: `No API key for "${effectiveProvider}".` }, { status: 500 });
    }

    const effectiveModel = taskModel?.modelName || globalConfig.modelName;
    const prompt = buildDetectPrompt(lang, conclusion, findings || "");

    const { text, usage } = await generateAIWithUsage({
      provider: effectiveProvider,
      modelName: effectiveModel,
      apiKey: effectiveKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system: prompt,
      user: conclusion + (findings ? `\n\n${findings}` : ""),
      maxTokens: 256,
    });

    if (usage) {
      logAICost({
        userId: user.id,
        action: "classify_detect",
        provider: effectiveProvider,
        model: effectiveModel,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
    }

    const raw = text.trim();
    if (raw === "NONE") {
      return NextResponse.json({ systems: [] });
    }

    const validIds = new Set(SYSTEMS_LIST.map((s) => s.id));
    const detected = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => validIds.has(line));

    const systems = detected.map((id) => {
      const sys = SYSTEMS_LIST.find((s) => s.id === id)!;
      return { id: sys.id, label: sys.label[lang] || sys.label.es };
    });

    return NextResponse.json({ systems });
  } catch (error) {
    return toErrorResponse(error);
  }
}
