export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey, hasPlatformAccess } from "@/lib/auth-helpers";
import { generateAIWithUsage } from "@/lib/ai-provider";
import { logAICost } from "@/lib/log-ai-cost";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";

type Lang = "es" | "en" | "pt";

const SYSTEMS_LIST = [
  { id: "BI-RADS", label: { es: "BI-RADS (mama)", en: "BI-RADS (breast)", pt: "BI-RADS (mama)" } },
  { id: "Bosniak", label: { es: "Bosniak (quistes renales)", en: "Bosniak (renal cysts)", pt: "Bosniak (cistos renais)" } },
  { id: "CAD-RADS", label: { es: "CAD-RADS (coronarias)", en: "CAD-RADS (coronary)", pt: "CAD-RADS (coronárias)" } },
  { id: "LI-RADS", label: { es: "LI-RADS (hígado)", en: "LI-RADS (liver)", pt: "LI-RADS (fígado)" } },
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
    es: `Analiza los hallazgos y conclusión de este informe radiológico y determina qué sistemas de CLASIFICACIÓN o ESTADIFICACIÓN son APLICABLES.

Sistemas disponibles: ${systemIds}

IMPORTANTE: Esta herramienta es SOLO para clasificaciones y estadificaciones (BI-RADS, Bosniak, TNM, TI-RADS, etc.), NO para recomendaciones de seguimiento de nódulos ni guías de manejo.

REGLAS:
- Un sistema es aplicable SOLO si el informe contiene los datos específicos necesarios para aplicarlo.
- Para TNM: requiere hallazgos sugestivos de neoplasia con datos suficientes para estadificar.
- Para BI-RADS: requiere hallazgos mamarios. Para TI-RADS: características ecográficas tiroideas. Para PI-RADS: hallazgos de RM de próstata.
- Para LI-RADS: requiere datos de captación arterial, lavado, cápsula en paciente con riesgo de CHC.
- Para Bosniak: requiere quiste renal con características descritas.
- NO incluyas sistemas cuyos datos no estén en el informe.

Responde SOLO con los IDs de los sistemas aplicables, uno por línea. Sin explicaciones.
Si ninguno aplica, responde: NONE`,

    en: `Analyze the findings and conclusion of this radiology report and determine which CLASSIFICATION or STAGING systems are APPLICABLE.

Available systems: ${systemIds}

IMPORTANT: This tool is ONLY for classifications and staging (BI-RADS, Bosniak, TNM, TI-RADS, etc.), NOT for nodule follow-up recommendations or management guidelines.

RULES:
- A system is applicable ONLY if the report contains the specific data needed to apply it.
- For TNM: requires findings suggestive of neoplasia with sufficient data for staging.
- For BI-RADS: requires breast findings. For TI-RADS: thyroid ultrasound features. For PI-RADS: prostate MRI findings.
- For LI-RADS: requires arterial enhancement, washout, capsule data in a patient at risk for HCC.
- For Bosniak: requires renal cyst with described characteristics.
- DO NOT include systems whose required data is not in the report.

Respond ONLY with the IDs of applicable systems, one per line. No explanations.
If none apply, respond: NONE`,

    pt: `Analise os achados e conclusão deste relatório radiológico e determine quais sistemas de CLASSIFICAÇÃO ou ESTADIAMENTO são APLICÁVEIS.

Sistemas disponíveis: ${systemIds}

IMPORTANTE: Esta ferramenta é SOMENTE para classificações e estadiamentos (BI-RADS, Bosniak, TNM, TI-RADS, etc.), NÃO para recomendações de seguimento de nódulos nem guias de manejo.

REGRAS:
- Um sistema é aplicável SOMENTE se o relatório contém os dados específicos necessários para aplicá-lo.
- Para TNM: requer achados sugestivos de neoplasia com dados suficientes para estadiamento.
- Para BI-RADS: requer achados mamários. Para TI-RADS: características ecográficas tireoidianas. Para PI-RADS: achados de RM de próstata.
- Para LI-RADS: requer dados de captação arterial, lavagem, cápsula em paciente com risco de CHC.
- Para Bosniak: requer cisto renal com características descritas.
- NÃO inclua sistemas cujos dados não estejam no relatório.

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

    // Card-first billing: no AI usage without an active subscription, even
    // via direct API calls with a live session.
    if (!(await hasPlatformAccess(user.id))) {
      return NextResponse.json({ error: "Subscription required", code: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
    }


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
