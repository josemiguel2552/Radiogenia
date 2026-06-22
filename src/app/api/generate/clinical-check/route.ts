export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateAIWithUsage } from "@/lib/ai-provider";
import { logAICost } from "@/lib/log-ai-cost";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";
import { getClinicalChecklistKB, sectionsToText, type ChecklistSection } from "@/lib/clinical-checklist-kb";

type Lang = "es" | "en" | "pt";

async function loadKB(): Promise<string> {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("global_model_config")
      .select("clinical_checklist_kb")
      .single();
    if (data?.clinical_checklist_kb?.trim()) {
      const parsed = JSON.parse(data.clinical_checklist_kb) as ChecklistSection[];
      if (Array.isArray(parsed) && parsed.length > 0) return sectionsToText(parsed);
    }
  } catch {
    // fall through to default
  }
  return getClinicalChecklistKB();
}

function buildClinicalCheckPrompt(lang: Lang, kb: string): string {
  const instructions: Record<Lang, string> = {
    es: `Eres un radiólogo senior revisando informes de colegas. Tu tarea es analizar los hallazgos y la conclusión del informe y detectar DATOS CLÍNICAMENTE IMPORTANTES que podrían faltar, basándote en el checklist clínico proporcionado.

REGLAS ESTRICTAS:
1. SOLO sugiere datos que sean CLÍNICAMENTE RELEVANTES para la patología descrita en el informe. No sugieras hallazgos genéricos.
2. Un dato falta si: el informe describe una condición (ej: TEP) pero NO menciona un hallazgo asociado importante (ej: signos de sobrecarga de cavidades derechas).
3. NO sugieras datos que YA ESTÁN en el informe. Lee cuidadosamente antes de sugerir.
4. NO sugieras hallazgos para patologías que NO están en el informe.
5. Máximo 4 sugerencias, ordenadas por relevancia clínica (la más urgente primero).
6. Cada sugerencia debe incluir:
   - La pregunta concreta al radiólogo
   - Opciones de respuesta predefinidas (el radiólogo elige una)
   - La sección anatómica donde se insertaría el dato
   - Un texto de inserción predefinido para cada opción de respuesta
7. Las opciones deben ser mutuamente excluyentes y cubrir los escenarios más comunes.
8. La última opción siempre debe ser un texto libre / "No aplica".

Si el informe NO tiene patología relevante o TODOS los datos importantes ya están presentes, responde EXACTAMENTE: NO_SUGGESTIONS

Si hay datos faltantes, responde en formato JSON (sin bloques de código):
[
  {
    "id": "identificador",
    "question": "Pregunta al radiólogo",
    "section": "Nombre de la sección anatómica donde insertar",
    "options": [
      { "label": "Opción 1", "insertText": "Texto a insertar en la sección si elige esta opción." },
      { "label": "Opción 2", "insertText": "Texto alternativo a insertar." },
      { "label": "No aplica / No evaluado", "insertText": "" }
    ]
  }
]

IMPORTANTE: el insertText debe ser una frase radiológica profesional lista para añadir al informe, NO una pregunta ni una explicación.`,

    en: `You are a senior radiologist reviewing colleagues' reports. Your task is to analyze the report findings and conclusion and detect CLINICALLY IMPORTANT DATA that may be missing, based on the provided clinical checklist.

STRICT RULES:
1. ONLY suggest data that is CLINICALLY RELEVANT to the pathology described in the report. Do not suggest generic findings.
2. Data is missing if: the report describes a condition (e.g., PE) but does NOT mention an important associated finding (e.g., right heart strain signs).
3. DO NOT suggest data that is ALREADY in the report. Read carefully before suggesting.
4. DO NOT suggest findings for pathologies NOT present in the report.
5. Maximum 4 suggestions, ordered by clinical relevance (most urgent first).
6. Each suggestion must include:
   - The specific question to the radiologist
   - Predefined answer options (the radiologist picks one)
   - The anatomical section where the data would be inserted
   - A predefined insertion text for each answer option
7. Options must be mutually exclusive and cover the most common scenarios.
8. The last option should always be a free text / "Not applicable".

If the report has NO relevant pathology or ALL important data is already present, respond EXACTLY: NO_SUGGESTIONS

If data is missing, respond in JSON format (no code blocks):
[
  {
    "id": "identifier",
    "question": "Question to the radiologist",
    "section": "Anatomical section name where to insert",
    "options": [
      { "label": "Option 1", "insertText": "Text to insert in the section if this option is chosen." },
      { "label": "Option 2", "insertText": "Alternative text to insert." },
      { "label": "Not applicable / Not assessed", "insertText": "" }
    ]
  }
]

IMPORTANT: the insertText must be a professional radiological phrase ready to add to the report, NOT a question or explanation.`,

    pt: `Você é um radiologista sênior revisando laudos de colegas. Sua tarefa é analisar os achados e a conclusão do laudo e detectar DADOS CLINICAMENTE IMPORTANTES que possam estar faltando, com base no checklist clínico fornecido.

REGRAS ESTRITAS:
1. SOMENTE sugira dados que sejam CLINICAMENTE RELEVANTES para a patologia descrita no laudo. Não sugira achados genéricos.
2. Um dado está faltando se: o laudo descreve uma condição (ex: TEP) mas NÃO menciona um achado associado importante (ex: sinais de sobrecarga de câmaras direitas).
3. NÃO sugira dados que JÁ ESTÃO no laudo. Leia cuidadosamente antes de sugerir.
4. NÃO sugira achados para patologias que NÃO estão no laudo.
5. Máximo 4 sugestões, ordenadas por relevância clínica (mais urgente primeiro).
6. Cada sugestão deve incluir:
   - A pergunta concreta ao radiologista
   - Opções de resposta predefinidas (o radiologista escolhe uma)
   - A seção anatômica onde o dado seria inserido
   - Um texto de inserção predefinido para cada opção de resposta
7. As opções devem ser mutuamente excludentes e cobrir os cenários mais comuns.
8. A última opção deve sempre ser texto livre / "Não se aplica".

Se o laudo NÃO tem patologia relevante ou TODOS os dados importantes já estão presentes, responda EXATAMENTE: NO_SUGGESTIONS

Se há dados faltantes, responda em formato JSON (sem blocos de código):
[
  {
    "id": "identificador",
    "question": "Pergunta ao radiologista",
    "section": "Nome da seção anatômica onde inserir",
    "options": [
      { "label": "Opção 1", "insertText": "Texto a inserir na seção se escolher esta opção." },
      { "label": "Opção 2", "insertText": "Texto alternativo a inserir." },
      { "label": "Não se aplica / Não avaliado", "insertText": "" }
    ]
  }
]

IMPORTANTE: o insertText deve ser uma frase radiológica profissional pronta para adicionar ao laudo, NÃO uma pergunta nem uma explicação.`,
  };

  return `${instructions[lang]}

--- CLINICAL CHECKLIST KB ---
${kb}
--- END KB ---`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`clinical-check:${user.id}`, RATE_LIMITS.generate);
    if (!rl.allowed) return rl.errorResponse!;

    const { findings, conclusion, language } = (await req.json()) as {
      findings: string;
      conclusion: string;
      language?: string;
    };

    if (!findings?.trim() && !conclusion?.trim()) {
      return NextResponse.json(
        { error: "No findings or conclusion" },
        { status: 400 },
      );
    }

    const lang = (
      language === "en" || language === "pt" ? language : "es"
    ) as Lang;

    const [kb, globalConfig] = await Promise.all([
      loadKB(),
      getGlobalAIConfig(),
    ]);

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
    const systemPrompt = buildClinicalCheckPrompt(lang, kb);

    const reportText = [
      findings?.trim() ? `FINDINGS:\n${findings.trim()}` : "",
      conclusion?.trim() ? `CONCLUSION:\n${conclusion.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const { text, usage } = await generateAIWithUsage({
      provider: effectiveProvider,
      modelName: effectiveModel,
      apiKey: effectiveKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system: systemPrompt,
      user: reportText,
      maxTokens: 1024,
    });

    if (usage) {
      logAICost({
        userId: user.id,
        action: "clinical_check",
        provider: effectiveProvider,
        model: effectiveModel,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
    }

    const raw = text.trim();
    if (raw === "NO_SUGGESTIONS") {
      return NextResponse.json({ suggestions: [] });
    }

    try {
      const jsonStr = raw.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
      const suggestions = JSON.parse(jsonStr) as {
        id: string;
        question: string;
        section: string;
        options: { label: string; insertText: string }[];
      }[];
      if (Array.isArray(suggestions)) {
        return NextResponse.json({ suggestions: suggestions.slice(0, 4) });
      }
    } catch {
      // AI didn't return valid JSON
    }

    return NextResponse.json({ suggestions: [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}
