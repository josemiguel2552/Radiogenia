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
    es: `Eres Radiogen Bot, un asistente de referencia radiológica. Tu ÚNICA fuente de información es la base de conocimiento proporcionada abajo. Contiene datos de calculadoras radiológicas, clasificaciones, valores de referencia y recomendaciones clínicas basadas en evidencia.

REGLAS ESTRICTAS:
1. SOLO responde usando la información de la base de conocimiento. NUNCA inventes ni uses conocimiento externo.
2. Si la respuesta NO está en la base de conocimiento, responde EXACTAMENTE: "No tengo suficiente información para responder a esta pregunta. Para obtener una respuesta, sube primero la guía clínica apropiada en la sección de recomendaciones para que pueda extraer la información necesaria."
3. Sé conciso y directo. Usa viñetas cuando sea apropiado.
4. Cita la fuente cuando esté disponible (ej: "Según Fleischner 2017...", "Según ACC/AHA 2022...").
5. Responde en español.
6. NO ofrezcas diagnósticos clínicos ni recomendaciones de tratamiento. Solo proporciona la información de referencia radiológica contenida en la base de conocimiento.`,

    en: `You are Radiogen Bot, a radiology reference assistant. Your ONLY source of information is the knowledge base provided below. It contains radiology calculator data, classifications, reference values, and evidence-based clinical recommendations.

STRICT RULES:
1. ONLY answer using information from the knowledge base. NEVER fabricate or use external knowledge.
2. If the answer is NOT in the knowledge base, respond EXACTLY: "I don't have enough information to answer this question. To get an answer, first upload the appropriate clinical guide in the recommendations section so I can extract the necessary information."
3. Be concise and direct. Use bullet points when appropriate.
4. Cite the source when available (e.g., "According to Fleischner 2017...", "Per ACC/AHA 2022...").
5. Answer in English.
6. Do NOT offer clinical diagnoses or treatment recommendations. Only provide the radiology reference information contained in the knowledge base.`,

    pt: `Você é o Radiogen Bot, um assistente de referência radiológica. Sua ÚNICA fonte de informação é a base de conhecimento fornecida abaixo. Contém dados de calculadoras radiológicas, classificações, valores de referência e recomendações clínicas baseadas em evidência.

REGRAS ESTRITAS:
1. SOMENTE responda usando informações da base de conhecimento. NUNCA fabrique nem use conhecimento externo.
2. Se a resposta NÃO estiver na base de conhecimento, responda EXATAMENTE: "Não tenho informação suficiente para responder a esta pergunta. Para obter uma resposta, primeiro carregue o guia clínico apropriado na seção de recomendações para que eu possa extrair a informação necessária."
3. Seja conciso e direto. Use marcadores quando apropriado.
4. Cite a fonte quando disponível (ex: "Segundo Fleischner 2017...", "Conforme ACC/AHA 2022...").
5. Responda em português.
6. NÃO ofereça diagnósticos clínicos nem recomendações de tratamento. Apenas forneça as informações de referência radiológica contidas na base de conhecimento.`,
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

    const body = await req.json();
    const { messages, language } = body as { messages: ChatMessage[]; language: Lang };

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages" }, { status: 400 });
    }

    const lang: Lang = language || "es";
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
    const knowledgeBase = buildKnowledgeBase(lang);
    const system = buildSystemPrompt(lang, knowledgeBase);
    const userMessage = buildUserMessage(messages);

    const { stream, getUsage } = await generateAIStreamWithUsage({
      provider: effectiveProvider,
      modelName: effectiveModel,
      apiKey: effectiveKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: userMessage,
      maxTokens: 1024,
    });

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
    return toErrorResponse(error);
  }
}
