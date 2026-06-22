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

function buildClassifyPrompt(lang: Lang, kb: string, conclusion: string, findings: string, systems?: string[]): string {
  const systemsList = systems && systems.length > 0
    ? systems.join(", ")
    : "BI-RADS, LI-RADS, TI-RADS, PI-RADS, O-RADS, CAD-RADS, Bosniak, TNM, Fazekas, Fisher, ASPECTS";

  const instructions: Record<Lang, string> = {
    es: `Eres un asistente radiológico experto en CLASIFICACIÓN y ESTADIFICACIÓN. Tu ÚNICA función es asignar categorías de clasificación o estadios a los hallazgos del informe.

HERRAMIENTA DE CLASIFICACIÓN.
- SÍ usa SOLO estos sistemas: ${systemsList}.
- NO uses sistemas que no estén en la lista anterior.

VISIÓN GLOBAL:
Analiza TODOS los hallazgos EN CONJUNTO antes de clasificar.
- Masa pulmonar + adenopatías + nódulos a distancia → TNM.
- Lesión hepática con captación arterial + lavado + cápsula → LI-RADS.
- Nódulo tiroideo con características ecográficas → TI-RADS.
- Prioriza estadificación sobre clasificación individual cuando los hallazgos formen un cuadro.

REGLAS CRÍTICAS:
- Usa SOLO clasificaciones de la KB (entre --- KB --- y --- END KB ---).
- Si el informe ya incluye una clasificación explícita, repórtala tal cual.
- NO inventes hallazgos que no estén en el informe.
- SOLO muestra sistemas que tengan una clasificación asignada. OMITE completamente los sistemas que no apliquen — NO imprimas líneas con "NO_CLASSIFICATIONS".
- Si NINGÚN hallazgo es clasificable, responde ÚNICAMENTE con "NO_CLASSIFICATIONS" (sin listar sistemas individuales).

REGLAS CONTRA ERRORES FRECUENTES:
1. TNM — USA LOS DATOS EXACTOS DEL INFORME:
   - El tamaño del tumor determina el T. Lee la medida EXACTA del informe y busca en la KB a qué T corresponde. Ej: 23 mm = T1c (>2 cm y ≤3 cm), NO T4.
   - NO copies la definición de un T que no corresponde al tamaño. Verifica tamaño → rango del T en la KB → asigna.
   - Calcula el estadio global (I, II, III, IV) a partir de la combinación T+N+M según la KB, no al revés.
2. NO DUPLIQUES clasificaciones del mismo hallazgo:
   - Si una lesión hepática ya está incluida en el TNM como M1, NO la clasifiques también con LI-RADS.
   - Evita clasificar el mismo hallazgo con múltiples sistemas redundantes.
3. CADA SISTEMA REQUIERE SUS DATOS ESPECÍFICOS:
   - LI-RADS: requiere datos de captación arterial, lavado, cápsula. Si el informe solo dice "lesión hepática indeterminada" sin estos datos → NO clasifiques con LI-RADS.
   - Bosniak: es SOLO para quistes renales. Si no hay quiste renal en el informe → NO uses Bosniak.
   - TI-RADS: requiere características ecográficas del nódulo tiroideo. Sin ecografía tiroidea → NO uses TI-RADS.
   - BI-RADS: requiere hallazgos mamarios (mamografía/ecografía/RM mama). Sin hallazgos mamarios → NO uses BI-RADS.
   - NO apliques un sistema solo porque existe un hallazgo en ese órgano. Verifica que los DATOS NECESARIOS para ese sistema estén presentes.
4. TNM — LESIONES INDETERMINADAS vs SOSPECHOSAS EN LA M:
   - Lesión descrita como "indeterminada" NO es metástasis. NO la incluyas en el componente M. Si es el único hallazgo a distancia, no hay M1.
   - Lesión NUEVA en contexto oncológico (ej: nódulo adrenal nuevo en paciente con masa pulmonar) SÍ puede incluirse como sospechosa de metástasis, pero DEBES indicarlo explícitamente: "sospechoso de metástasis" en la descripción del hallazgo.
   - Diferencia entre "indeterminada" y "nueva": "indeterminada" = no se sabe qué es. "Nueva" en contexto de malignidad = sospechosa.
   - Si hay lesiones sospechosas + indeterminadas, solo las sospechosas cuentan para la M. Menciona las indeterminadas por separado como nota si lo deseas.

ORDEN DE PRESENTACIÓN (siempre el mismo):
1. Estadificaciones (TNM) primero.
2. Clasificaciones de imagen por orden alfabético (BI-RADS, Bosniak, CAD-RADS, LI-RADS, O-RADS, PI-RADS, TI-RADS).
3. Escalas de severidad al final (ASPECTS, Fazekas, Fisher).

FORMATO SEGÚN TIPO DE SISTEMA:

Para TNM:
- TNM [órgano]: [estadio global]
  T[x]: [definición de la KB para este T] — [hallazgo concreto del informe]
  N[x]: [definición de la KB para este N] — [hallazgo concreto del informe]
  M[x]: [definición de la KB para este M] — [hallazgo concreto del informe]
  (Si un componente no se puede determinar: "Tx/Nx/Mx: no valorable — [qué dato falta]")

Para escalas de categoría (BI-RADS, TI-RADS, LI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak):
- [Sistema]: [Categoría] — [seguimiento/actuación recomendada según la KB]

Para escalas de severidad (Fazekas, Fisher, ASPECTS):
- [Sistema]: [Grado/Puntuación] — [significado del grado según la KB]

Sin texto introductorio ni explicativo fuera del formato.`,

    en: `You are a radiology assistant expert in CLASSIFICATION and STAGING. Your ONLY function is to assign classification categories or stages to report findings.

CLASSIFICATION TOOL.
- Use ONLY these systems: ${systemsList}.
- DO NOT use systems not in the list above.

GLOBAL VIEW:
Analyze ALL findings AS A WHOLE before classifying.
- Lung mass + lymphadenopathy + distant nodules → TNM.
- Hepatic lesion with arterial enhancement + washout + capsule → LI-RADS.
- Thyroid nodule with ultrasound characteristics → TI-RADS.
- Prioritize staging over individual classification when findings form a clinical picture.

CRITICAL RULES:
- Use ONLY classifications from the KB (between --- KB --- and --- END KB ---).
- If the report already includes an explicit classification, report it as-is.
- DO NOT invent findings not present in the report.
- ONLY show systems that have an assigned classification. COMPLETELY OMIT systems that do not apply — DO NOT print lines with "NO_CLASSIFICATIONS".
- If NO findings are classifiable at all, respond ONLY with "NO_CLASSIFICATIONS" (without listing individual systems).

RULES AGAINST COMMON ERRORS:
1. TNM — USE EXACT DATA FROM THE REPORT:
   - Tumor size determines T. Read the EXACT measurement from the report and look up in the KB which T it corresponds to. E.g.: 23 mm = T1c (>2 cm and ≤3 cm), NOT T4.
   - DO NOT copy the definition of a T that does not match the size. Verify size → T range in KB → assign.
   - Calculate the overall stage (I, II, III, IV) from the T+N+M combination per the KB, not the other way around.
2. DO NOT DUPLICATE classifications for the same finding:
   - If a hepatic lesion is already included in TNM as M1, DO NOT also classify it with LI-RADS.
   - Avoid classifying the same finding with multiple redundant systems.
3. EACH SYSTEM REQUIRES ITS SPECIFIC DATA:
   - LI-RADS: requires arterial enhancement, washout, capsule data. If the report only says "indeterminate hepatic lesion" without these → DO NOT classify with LI-RADS.
   - Bosniak: is ONLY for renal cysts. If there is no renal cyst in the report → DO NOT use Bosniak.
   - TI-RADS: requires thyroid nodule ultrasound features. Without thyroid ultrasound → DO NOT use TI-RADS.
   - BI-RADS: requires breast findings (mammography/ultrasound/breast MRI). Without breast findings → DO NOT use BI-RADS.
   - DO NOT apply a system just because a finding exists in that organ. Verify that the REQUIRED DATA for that system is present.
4. TNM — INDETERMINATE vs SUSPICIOUS LESIONS IN THE M COMPONENT:
   - A lesion described as "indeterminate" is NOT metastasis. DO NOT include it in the M component. If it is the only distant finding, there is no M1.
   - A NEW lesion in an oncologic context (e.g., new adrenal nodule in a patient with a lung mass) CAN be included as suspicious for metastasis, but you MUST state it explicitly: "suspicious for metastasis" in the finding description.
   - Distinction: "indeterminate" = nature unknown. "New" in a malignancy context = suspicious.
   - If there are suspicious + indeterminate lesions, only suspicious ones count toward M. Mention indeterminate ones separately as a note if desired.

PRESENTATION ORDER (always the same):
1. Staging (TNM) first.
2. Imaging classifications alphabetically (BI-RADS, Bosniak, CAD-RADS, LI-RADS, O-RADS, PI-RADS, TI-RADS).
3. Severity scales last (ASPECTS, Fazekas, Fisher).

FORMAT BY SYSTEM TYPE:

For TNM:
- TNM [organ]: [overall stage]
  T[x]: [KB definition for this T] — [specific report finding]
  N[x]: [KB definition for this N] — [specific report finding]
  M[x]: [KB definition for this M] — [specific report finding]
  (If a component cannot be determined: "Tx/Nx/Mx: not assessable — [what data is missing]")

For category scales (BI-RADS, TI-RADS, LI-RADS, PI-RADS, Lung-RADS, O-RADS, CAD-RADS, Bosniak):
- [System]: [Category] — [recommended follow-up/action per the KB]

For severity scales (Fazekas, Fisher, ASPECTS):
- [System]: [Grade/Score] — [meaning of the grade per the KB]

No introductory or explanatory text outside the format.`,

    pt: `Você é um assistente radiológico especialista em CLASSIFICAÇÃO e ESTADIAMENTO. Sua ÚNICA função é atribuir categorias de classificação ou estádios aos achados do relatório.

FERRAMENTA DE CLASSIFICAÇÃO.
- Use SOMENTE estes sistemas: ${systemsList}.
- NÃO use sistemas que não estejam na lista acima.

VISÃO GLOBAL:
Analise TODOS os achados EM CONJUNTO antes de classificar.
- Massa pulmonar + adenopatias + nódulos a distância → TNM.
- Lesão hepática com captação arterial + lavagem + cápsula → LI-RADS.
- Nódulo tireoidiano com características ecográficas → TI-RADS.
- Priorize estadiamento sobre classificação individual quando os achados formem um quadro.

REGRAS CRÍTICAS:
- Use SOMENTE classificações da KB (entre --- KB --- e --- END KB ---).
- Se o relatório já inclui classificação explícita, reporte-a como está.
- NÃO invente achados que não estejam no relatório.
- SOMENTE mostre sistemas que tenham uma classificação atribuída. OMITA completamente os sistemas que não se apliquem — NÃO imprima linhas com "NO_CLASSIFICATIONS".
- Se NENHUM achado for classificável, responda UNICAMENTE com "NO_CLASSIFICATIONS" (sem listar sistemas individuais).

REGRAS CONTRA ERROS FREQUENTES:
1. TNM — USE OS DADOS EXATOS DO RELATÓRIO:
   - O tamanho do tumor determina o T. Leia a medida EXATA do relatório e busque na KB a qual T corresponde. Ex: 23 mm = T1c (>2 cm e ≤3 cm), NÃO T4.
   - NÃO copie a definição de um T que não corresponde ao tamanho. Verifique tamanho → faixa do T na KB → atribua.
   - Calcule o estádio global (I, II, III, IV) a partir da combinação T+N+M segundo a KB, não ao contrário.
2. NÃO DUPLIQUE classificações do mesmo achado:
   - Se uma lesão hepática já está incluída no TNM como M1, NÃO a classifique também com LI-RADS.
   - Evite classificar o mesmo achado com múltiplos sistemas redundantes.
3. CADA SISTEMA REQUER SEUS DADOS ESPECÍFICOS:
   - LI-RADS: requer dados de captação arterial, lavagem, cápsula. Se o relatório só diz "lesão hepática indeterminada" sem esses dados → NÃO classifique com LI-RADS.
   - Bosniak: é SOMENTE para cistos renais. Se não há cisto renal no relatório → NÃO use Bosniak.
   - TI-RADS: requer características ecográficas do nódulo tireoidiano. Sem ecografia tireoidiana → NÃO use TI-RADS.
   - BI-RADS: requer achados mamários. Sem achados mamários → NÃO use BI-RADS.
   - NÃO aplique um sistema só porque existe um achado nesse órgão. Verifique que os DADOS NECESSÁRIOS para esse sistema estejam presentes.
4. TNM — LESÕES INDETERMINADAS vs SUSPEITAS NO COMPONENTE M:
   - Lesão descrita como "indeterminada" NÃO é metástase. NÃO a inclua no componente M. Se for o único achado a distância, não há M1.
   - Lesão NOVA em contexto oncológico (ex: nódulo adrenal novo em paciente com massa pulmonar) PODE ser incluída como suspeita de metástase, mas DEVE indicar explicitamente: "suspeito de metástase" na descrição do achado.
   - Diferença: "indeterminada" = natureza desconhecida. "Nova" em contexto de malignidade = suspeita.
   - Se há lesões suspeitas + indeterminadas, apenas as suspeitas contam para o M. Mencione as indeterminadas separadamente como nota se desejar.

ORDEM DE APRESENTAÇÃO (sempre a mesma):
1. Estadiamentos (TNM) primeiro.
2. Classificações de imagem em ordem alfabética (BI-RADS, Bosniak, CAD-RADS, LI-RADS, O-RADS, PI-RADS, TI-RADS).
3. Escalas de severidade por último (ASPECTS, Fazekas, Fisher).

FORMATO POR TIPO DE SISTEMA:

Para TNM:
- TNM [órgão]: [estádio global]
  T[x]: [definição da KB para este T] — [achado concreto do relatório]
  N[x]: [definição da KB para este N] — [achado concreto do relatório]
  M[x]: [definição da KB para este M] — [achado concreto do relatório]
  (Se um componente não puder ser determinado: "Tx/Nx/Mx: não avaliável — [que dado falta]")

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

    const { conclusion, findings, language, systems, additionalContext } = await req.json() as {
      conclusion: string;
      findings?: string;
      language?: string;
      systems?: string[];
      additionalContext?: string;
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
    let system = buildClassifyPrompt(lang, kb, conclusion, findings || "", systems);

    if (additionalContext?.trim()) {
      const contextLabel: Record<Lang, string> = {
        es: "INFORMACIÓN ADICIONAL proporcionada por el radiólogo (considérala como datos del informe para la clasificación)",
        en: "ADDITIONAL INFORMATION provided by the radiologist (treat as report data for classification purposes)",
        pt: "INFORMAÇÃO ADICIONAL fornecida pelo radiologista (considere como dados do relatório para classificação)",
      };
      system += `\n\n--- ${contextLabel[lang]} ---\n${additionalContext.trim()}\n--- END ---`;
    }

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

    const cleaned = text
      .trim()
      .split("\n")
      .filter((line) => !line.includes("NO_CLASSIFICATIONS"))
      .join("\n")
      .trim();

    if (!cleaned) {
      return NextResponse.json({ classifications: null });
    }

    return NextResponse.json({ classifications: cleaned });
  } catch (error) {
    return toErrorResponse(error);
  }
}
