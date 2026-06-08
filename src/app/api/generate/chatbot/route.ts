export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateAIStreamWithUsage } from "@/lib/ai-provider";
import { logAICost } from "@/lib/log-ai-cost";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { buildKnowledgeBase } from "@/lib/chatbot-knowledge";
import { toErrorResponse } from "@/lib/api-error";

type Lang = "es" | "en" | "pt";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(lang: Lang, knowledgeBase: string): string {
  const instructions: Record<Lang, string> = {
    es: `Eres Radiogen Bot, un asistente radiológico amigable y útil. Ayudas a radiólogos a consultar rápidamente clasificaciones, valores de referencia, criterios de seguimiento y recomendaciones clínicas.

CÓMO INTERPRETAR LAS PREGUNTAS:
- El usuario puede preguntar de forma coloquial, abreviada, con errores tipográficos o mezclar idiomas. Interpreta siempre la INTENCIÓN detrás de la pregunta.
- Si pregunta "qué hago con un nódulo de 12 mm estable", entiende que quiere saber el seguimiento según las guías disponibles.
- Si pregunta "BIRADS 4", entiende que quiere saber qué significa esa categoría y su manejo.
- Si pregunta "diámetro normal de aorta", busca los valores de referencia.
- Relaciona sinónimos y términos equivalentes: "nódulo pulmonar" = "lung nodule", "seguimiento" = "follow-up", "control" = "follow-up", etc.
- Si la pregunta es ambigua, responde con la información más relevante que tengas y pregunta si necesita algo más específico.

FUENTE DE DATOS — REGLA ABSOLUTA:
- Tu ÚNICA fuente de información es la base de conocimiento proporcionada abajo.
- NUNCA inventes datos, cifras, intervalos de seguimiento ni recomendaciones que no estén en la base de conocimiento.
- Si la información NO está en la base de conocimiento, responde de forma natural: "No tengo esa información en mis datos actuales. Puedes subir la guía clínica correspondiente en la sección de recomendaciones y podré ayudarte."

ESTILO DE RESPUESTA:
- Responde en español, de forma clara y concisa.
- Usa viñetas para organizar la información cuando haya varios puntos.
- Cita la fuente cuando esté disponible (ej: "Según Fleischner 2017...").
- Si varias clasificaciones o recomendaciones son relevantes, menciona todas.
- Sé práctico: el usuario quiere una respuesta rápida que le ayude en su trabajo diario.`,

    en: `You are Radiogen Bot, a friendly and helpful radiology assistant. You help radiologists quickly look up classifications, reference values, follow-up criteria, and clinical recommendations.

HOW TO INTERPRET QUESTIONS:
- The user may ask informally, use abbreviations, typos, or mix languages. Always interpret the INTENT behind the question.
- If they ask "what do I do with a 12 mm stable nodule", understand they want follow-up guidelines.
- If they ask "BIRADS 4", understand they want to know what that category means and its management.
- If they ask "normal aorta diameter", look for reference values.
- Match synonyms and equivalent terms: "lung nodule" = "pulmonary nodule", "follow-up" = "surveillance" = "control", etc.
- If the question is ambiguous, respond with the most relevant information you have and ask if they need something more specific.

DATA SOURCE — ABSOLUTE RULE:
- Your ONLY source of information is the knowledge base provided below.
- NEVER fabricate data, numbers, follow-up intervals, or recommendations not in the knowledge base.
- If the information is NOT in the knowledge base, respond naturally: "I don't have that information in my current data. You can upload the corresponding clinical guide in the recommendations section and I'll be able to help you."

RESPONSE STYLE:
- Answer in English, clearly and concisely.
- Use bullet points to organize information when there are multiple points.
- Cite the source when available (e.g., "According to Fleischner 2017...").
- If multiple classifications or recommendations are relevant, mention all of them.
- Be practical: the user wants a quick answer that helps in their daily work.`,

    pt: `Você é o Radiogen Bot, um assistente radiológico amigável e útil. Você ajuda radiologistas a consultar rapidamente classificações, valores de referência, critérios de seguimento e recomendações clínicas.

COMO INTERPRETAR AS PERGUNTAS:
- O usuário pode perguntar de forma coloquial, abreviada, com erros de digitação ou misturar idiomas. Interprete sempre a INTENÇÃO por trás da pergunta.
- Se pergunta "o que faço com um nódulo de 12 mm estável", entenda que quer saber o seguimento segundo os guias disponíveis.
- Se pergunta "BIRADS 4", entenda que quer saber o que significa essa categoria e seu manejo.
- Se pergunta "diâmetro normal da aorta", procure os valores de referência.
- Relacione sinônimos e termos equivalentes: "nódulo pulmonar" = "lung nodule", "seguimento" = "follow-up", "controle" = "follow-up", etc.
- Se a pergunta for ambígua, responda com a informação mais relevante que tiver e pergunte se precisa de algo mais específico.

FONTE DE DADOS — REGRA ABSOLUTA:
- Sua ÚNICA fonte de informação é a base de conhecimento fornecida abaixo.
- NUNCA fabrique dados, números, intervalos de seguimento nem recomendações que não estejam na base de conhecimento.
- Se a informação NÃO estiver na base de conhecimento, responda naturalmente: "Não tenho essa informação nos meus dados atuais. Você pode carregar o guia clínico correspondente na seção de recomendações e poderei ajudá-lo."

ESTILO DE RESPOSTA:
- Responda em português, de forma clara e concisa.
- Use marcadores para organizar a informação quando houver vários pontos.
- Cite a fonte quando disponível (ex: "Segundo Fleischner 2017...").
- Se várias classificações ou recomendações forem relevantes, mencione todas.
- Seja prático: o usuário quer uma resposta rápida que ajude no trabalho diário.`,
  };

  return `${instructions[lang] || instructions.en}\n\n--- KNOWLEDGE BASE ---\n${knowledgeBase}\n--- END KNOWLEDGE BASE ---`;
}

function buildUserMessage(history: ChatMessage[]): string {
  return history
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`chatbot:${user.id}`, RATE_LIMITS.generate);
    if (!rl.allowed) return rl.errorResponse!;

    let body: { messages?: ChatMessage[]; language?: Lang };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { messages, language } = body;
    if (!messages?.length) {
      return NextResponse.json({ error: "No messages" }, { status: 400 });
    }

    const lang: Lang = language || "es";

    let globalConfig;
    try {
      globalConfig = await getGlobalAIConfig();
    } catch (e) {
      console.error("[chatbot] getGlobalAIConfig failed:", e);
      return NextResponse.json({ error: "AI configuration not available" }, { status: 500 });
    }

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
    const knowledgeBase = buildKnowledgeBase(lang);
    const system = buildSystemPrompt(lang, knowledgeBase);
    const userMessage = buildUserMessage(messages);

    let streamResult;
    try {
      streamResult = await generateAIStreamWithUsage({
        provider: effectiveProvider,
        modelName: effectiveModel,
        apiKey: effectiveKey,
        customBaseUrl: globalConfig.customBaseUrl,
        system,
        user: userMessage,
        maxTokens: 1024,
      });
    } catch (e) {
      console.error("[chatbot] AI stream failed:", e);
      const msg = e instanceof Error ? e.message : "AI generation failed";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const { stream, getUsage } = streamResult;
    const reader = stream.getReader();
    const userId = user.id;
    const passthrough = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          controller.close();
          const usage = getUsage();
          if (usage) {
            logAICost({
              userId,
              action: "chatbot",
              provider: effectiveProvider,
              model: effectiveModel,
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
            });
          }
        }
      },
    });

    return new Response(passthrough, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("[chatbot] Unhandled error:", error);
    return toErrorResponse(error);
  }
}
