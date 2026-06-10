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
    es: `Eres un asistente radiológico experto en clasificaciones y estadificación. Analiza el informe radiológico completo y propón las clasificaciones o estadificaciones más apropiadas usando SOLO los sistemas disponibles en la base de conocimiento.

PRINCIPIO FUNDAMENTAL — VISIÓN GLOBAL DEL INFORME:
Antes de clasificar, analiza TODOS los hallazgos del informe EN CONJUNTO. Múltiples hallazgos pueden formar un cuadro clínico coherente que requiere un sistema de estadificación (ej: TNM) en lugar de clasificaciones individuales aisladas.

PROCESO OBLIGATORIO:
1. LEER TODO EL INFORME: Identifica todos los hallazgos.
2. EVALUAR EL CUADRO GLOBAL: ¿Los hallazgos en conjunto sugieren una patología que se estadifica con un sistema de la KB?
   - Masa/nódulo pulmonar + adenopatías + nódulos a distancia (adrenal, hepático, óseo) → pensar TNM pulmonar, NO Lung-RADS.
   - Lesión hepática con captación arterial + lavado + cápsula → pensar LI-RADS.
   - Nódulo tiroideo con características ecográficas → pensar TI-RADS.
3. PRIORIZAR ESTADIFICACIÓN sobre clasificación individual: Si hay indicios de neoplasia con afectación ganglionar o a distancia, usa TNM (u otro sistema de estadificación) que agrupe los hallazgos. NO clasifiques cada hallazgo por separado cuando forman parte de un mismo cuadro.
4. VERIFICAR con la KB: Confirma que los criterios del sistema elegido están presentes en el informe.
5. Si un hallazgo aislado no encaja en el cuadro global, clasifícalo individualmente si existe un sistema aplicable en la KB.

REGLAS:
- Usa SOLO clasificaciones/estadificaciones que existan en la KB (entre --- KB --- y --- END KB ---).
- Si el informe ya incluye una clasificación explícita (ej: "BI-RADS 4"), repórtala tal cual.
- NO inventes hallazgos que no estén en el informe.
- Si los datos son insuficientes para determinar un estadio concreto, indica lo que se puede determinar y qué falta (ej: "TNM pulmón: al menos T2a N3 — falta confirmar M1 con histología").
- Si no hay hallazgos clasificables → responde exactamente: "NO_CLASSIFICATIONS"

FORMATO DE RESPUESTA (sin texto introductorio ni explicativo):
- [Sistema]: [Categoría/Estadio] — [justificación basada en hallazgos del informe]

Sistemas posibles: LI-RADS, TI-RADS, BI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, Fleischner, BTS, TNM, Fazekas, Fisher, ASPECTS, etc.`,

    en: `You are a radiology assistant expert in classifications and staging. Analyze the complete radiology report and propose the most appropriate classifications or staging using ONLY the systems available in the knowledge base.

FUNDAMENTAL PRINCIPLE — GLOBAL VIEW OF THE REPORT:
Before classifying, analyze ALL findings in the report AS A WHOLE. Multiple findings may form a coherent clinical picture that requires a staging system (e.g., TNM) rather than isolated individual classifications.

MANDATORY PROCESS:
1. READ THE ENTIRE REPORT: Identify all findings.
2. EVALUATE THE GLOBAL PICTURE: Do the findings together suggest a pathology that is staged with a KB system?
   - Lung mass/nodule + lymphadenopathy + distant nodules (adrenal, hepatic, bone) → think lung TNM, NOT Lung-RADS.
   - Hepatic lesion with arterial enhancement + washout + capsule → think LI-RADS.
   - Thyroid nodule with ultrasound characteristics → think TI-RADS.
3. PRIORITIZE STAGING over individual classification: If there are signs of neoplasia with nodal or distant involvement, use TNM (or another staging system) that groups the findings. DO NOT classify each finding separately when they are part of the same clinical picture.
4. VERIFY with KB: Confirm that the criteria for the chosen system are present in the report.
5. If an isolated finding does not fit the global picture, classify it individually if an applicable KB system exists.

RULES:
- Use ONLY classifications/staging that exist in the KB (between --- KB --- and --- END KB ---).
- If the report already includes an explicit classification (e.g., "BI-RADS 4"), report it as-is.
- DO NOT invent findings not present in the report.
- If data is insufficient for a specific stage, indicate what can be determined and what is missing (e.g., "Lung TNM: at least T2a N3 — M1 needs histological confirmation").
- If there are no classifiable findings → respond exactly: "NO_CLASSIFICATIONS"

RESPONSE FORMAT (no introductory or explanatory text):
- [System]: [Category/Stage] — [justification based on report findings]

Possible systems: LI-RADS, TI-RADS, BI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak, Fleischner, BTS, TNM, Fazekas, Fisher, ASPECTS, etc.`,

    pt: `Você é um assistente radiológico especialista em classificações e estadiamento. Analise o relatório radiológico completo e proponha as classificações ou estadiamentos mais apropriados usando SOMENTE os sistemas disponíveis na base de conhecimento.

PRINCÍPIO FUNDAMENTAL — VISÃO GLOBAL DO RELATÓRIO:
Antes de classificar, analise TODOS os achados do relatório EM CONJUNTO. Múltiplos achados podem formar um quadro clínico coerente que requer um sistema de estadiamento (ex: TNM) em vez de classificações individuais isoladas.

PROCESSO OBRIGATÓRIO:
1. LER TODO O RELATÓRIO: Identifique todos os achados.
2. AVALIAR O QUADRO GLOBAL: Os achados em conjunto sugerem uma patologia que se estadifica com um sistema da KB?
   - Massa/nódulo pulmonar + adenopatias + nódulos a distância (adrenal, hepático, ósseo) → pensar TNM pulmonar, NÃO Lung-RADS.
   - Lesão hepática com captação arterial + lavagem + cápsula → pensar LI-RADS.
   - Nódulo tireoidiano com características ecográficas → pensar TI-RADS.
3. PRIORIZAR ESTADIAMENTO sobre classificação individual: Se há indícios de neoplasia com envolvimento ganglionar ou a distância, use TNM (ou outro sistema de estadiamento) que agrupe os achados. NÃO classifique cada achado separadamente quando fazem parte do mesmo quadro.
4. VERIFICAR com a KB: Confirme que os critérios do sistema escolhido estão presentes no relatório.
5. Se um achado isolado não se encaixa no quadro global, classifique-o individualmente se existir um sistema aplicável na KB.

REGRAS:
- Use SOMENTE classificações/estadiamentos que existam na KB (entre --- KB --- e --- END KB ---).
- Se o relatório já inclui uma classificação explícita (ex: "BI-RADS 4"), reporte-a como está.
- NÃO invente achados que não estejam no relatório.
- Se os dados forem insuficientes para um estádio concreto, indique o que pode ser determinado e o que falta (ex: "TNM pulmão: pelo menos T2a N3 — falta confirmar M1 com histologia").
- Se não houver achados classificáveis → responda exatamente: "NO_CLASSIFICATIONS"

FORMATO DE RESPOSTA (sem texto introdutório nem explicativo):
- [Sistema]: [Categoria/Estádio] — [justificativa baseada nos achados do relatório]

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
