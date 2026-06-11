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

HERRAMIENTA DE CLASIFICACIÓN, NO DE RECOMENDACIÓN.
- SÍ usa: BI-RADS, LI-RADS, TI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, TNM, Fazekas, Fisher, ASPECTS.
- NO usa: Fleischner, BTS, ACR follow-up ni otras guías de manejo/recomendación.

VISIÓN GLOBAL:
Analiza TODOS los hallazgos EN CONJUNTO antes de clasificar.
- Masa pulmonar + adenopatías + nódulos a distancia → TNM, NO Lung-RADS.
- Lesión hepática con captación arterial + lavado + cápsula → LI-RADS.
- Nódulo tiroideo con características ecográficas → TI-RADS.
- Prioriza estadificación sobre clasificación individual cuando los hallazgos formen un cuadro.

REGLAS:
- Usa SOLO clasificaciones de la KB (entre --- KB --- y --- END KB ---).
- Si el informe ya incluye una clasificación explícita, repórtala tal cual.
- NO inventes hallazgos. Si datos insuficientes, indica qué se puede determinar y qué falta.
- Si no hay hallazgos clasificables → "NO_CLASSIFICATIONS"

ORDEN DE PRESENTACIÓN (siempre el mismo):
1. Estadificaciones (TNM) primero.
2. Clasificaciones de imagen por orden alfabético del sistema (BI-RADS, Bosniak, CAD-RADS, LI-RADS, Lung-RADS, O-RADS, PI-RADS, TI-RADS).
3. Escalas de severidad al final (ASPECTS, Fazekas, Fisher).

FORMATO SEGÚN TIPO DE SISTEMA:

Para TNM:
- TNM [órgano]: [estadio global]
  T[x]: [qué significa este T] — [hallazgo del informe que lo sustenta]
  N[x]: [qué significa este N] — [hallazgo del informe que lo sustenta]
  M[x]: [qué significa este M] — [hallazgo del informe que lo sustenta]
  (Si un componente no se puede determinar, indicar "Tx/Nx/Mx: no valorable por imagen — [qué dato falta]")

Para escalas de categoría (BI-RADS, TI-RADS, LI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak):
- [Sistema]: [Categoría] — [seguimiento/actuación recomendada según la KB]
  (NO explicar por qué se asigna la categoría. SÍ incluir la recomendación de seguimiento o prueba adicional que corresponda a esa categoría según la KB.)

Para escalas de severidad (Fazekas, Fisher, ASPECTS):
- [Sistema]: [Grado/Puntuación] — [significado del grado según la KB]

Sin texto introductorio, sin explicaciones adicionales fuera del formato.`,

    en: `You are a radiology assistant expert in CLASSIFICATION and STAGING. Your ONLY function is to assign classification categories or stages to report findings.

CLASSIFICATION TOOL, NOT A RECOMMENDATION TOOL.
- DO use: BI-RADS, LI-RADS, TI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, TNM, Fazekas, Fisher, ASPECTS.
- DO NOT use: Fleischner, BTS, ACR follow-up or other management/recommendation guidelines.

GLOBAL VIEW:
Analyze ALL findings AS A WHOLE before classifying.
- Lung mass + lymphadenopathy + distant nodules → TNM, NOT Lung-RADS.
- Hepatic lesion with arterial enhancement + washout + capsule → LI-RADS.
- Thyroid nodule with ultrasound characteristics → TI-RADS.
- Prioritize staging over individual classification when findings form a clinical picture.

RULES:
- Use ONLY classifications from the KB (between --- KB --- and --- END KB ---).
- If the report already includes an explicit classification, report it as-is.
- DO NOT invent findings. If data is insufficient, indicate what can be determined and what is missing.
- If there are no classifiable findings → "NO_CLASSIFICATIONS"

PRESENTATION ORDER (always the same):
1. Staging (TNM) first.
2. Imaging classifications in alphabetical order of system (BI-RADS, Bosniak, CAD-RADS, LI-RADS, Lung-RADS, O-RADS, PI-RADS, TI-RADS).
3. Severity scales last (ASPECTS, Fazekas, Fisher).

FORMAT BY SYSTEM TYPE:

For TNM:
- TNM [organ]: [overall stage]
  T[x]: [what this T means] — [report finding that supports it]
  N[x]: [what this N means] — [report finding that supports it]
  M[x]: [what this M means] — [report finding that supports it]
  (If a component cannot be determined, state "Tx/Nx/Mx: not assessable by imaging — [what data is missing]")

For category scales (BI-RADS, TI-RADS, LI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak):
- [System]: [Category] — [recommended follow-up/action per the KB]
  (DO NOT explain why the category was assigned. DO include the follow-up recommendation or next study that corresponds to that category per the KB.)

For severity scales (Fazekas, Fisher, ASPECTS):
- [System]: [Grade/Score] — [meaning of the grade per the KB]

No introductory text, no additional explanations outside the format.`,

    pt: `Você é um assistente radiológico especialista em CLASSIFICAÇÃO e ESTADIAMENTO. Sua ÚNICA função é atribuir categorias de classificação ou estádios aos achados do relatório.

FERRAMENTA DE CLASSIFICAÇÃO, NÃO DE RECOMENDAÇÃO.
- SIM use: BI-RADS, LI-RADS, TI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, TNM, Fazekas, Fisher, ASPECTS.
- NÃO use: Fleischner, BTS, ACR follow-up nem outros guias de manejo/recomendação.

VISÃO GLOBAL:
Analise TODOS os achados EM CONJUNTO antes de classificar.
- Massa pulmonar + adenopatias + nódulos a distância → TNM, NÃO Lung-RADS.
- Lesão hepática com captação arterial + lavagem + cápsula → LI-RADS.
- Nódulo tireoidiano com características ecográficas → TI-RADS.
- Priorize estadiamento sobre classificação individual quando os achados formem um quadro.

REGRAS:
- Use SOMENTE classificações da KB (entre --- KB --- e --- END KB ---).
- Se o relatório já inclui classificação explícita, reporte-a como está.
- NÃO invente achados. Se dados insuficientes, indique o que pode ser determinado e o que falta.
- Se não houver achados classificáveis → "NO_CLASSIFICATIONS"

ORDEM DE APRESENTAÇÃO (sempre a mesma):
1. Estadiamentos (TNM) primeiro.
2. Classificações de imagem em ordem alfabética do sistema (BI-RADS, Bosniak, CAD-RADS, LI-RADS, Lung-RADS, O-RADS, PI-RADS, TI-RADS).
3. Escalas de severidade por último (ASPECTS, Fazekas, Fisher).

FORMATO POR TIPO DE SISTEMA:

Para TNM:
- TNM [órgão]: [estádio global]
  T[x]: [o que este T significa] — [achado do relatório que o sustenta]
  N[x]: [o que este N significa] — [achado do relatório que o sustenta]
  M[x]: [o que este M significa] — [achado do relatório que o sustenta]
  (Se um componente não puder ser determinado, indicar "Tx/Nx/Mx: não avaliável por imagem — [que dado falta]")

Para escalas de categoria (BI-RADS, TI-RADS, LI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak):
- [Sistema]: [Categoria] — [seguimento/ação recomendada segundo a KB]
  (NÃO explicar por que a categoria foi atribuída. SIM incluir a recomendação de seguimento ou próximo exame que corresponda a essa categoria segundo a KB.)

Para escalas de severidade (Fazekas, Fisher, ASPECTS):
- [Sistema]: [Grau/Pontuação] — [significado do grau segundo a KB]

Sem texto introdutório, sem explicações adicionais fora do formato.`,
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
    const taskModel = globalConfig.taskOverrides?.classify;
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
