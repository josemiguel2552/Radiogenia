export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey, hasPlatformAccess } from "@/lib/auth-helpers";
import { streamAIWithFallback } from "@/lib/ai-fallback";
import { logAICost } from "@/lib/log-ai-cost";
import { buildConclusionAdjustPrompt } from "@/lib/prompts";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { stripPii } from "@/lib/pii-detect";
import type { OutputLanguage } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-error";

/**
 * Reshapes an existing conclusion to a one-line instruction ("shorter",
 * "lead with the pneumothorax"). One pass over the conclusion text alone —
 * the findings are deliberately not sent, so there is nothing for it to
 * import into the report that the radiologist did not already have.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`generate:${user.id}`, RATE_LIMITS.generate);
    if (!rl.allowed) return rl.errorResponse!;

    if (!(await hasPlatformAccess(user.id))) {
      return NextResponse.json({ error: "Subscription required", code: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
    }

    const body = await req.json();
    const { conclusionText: rawConclusion, instruction: rawInstruction, outputLanguage } = body;
    if (!rawConclusion?.trim() || !rawInstruction?.trim()) {
      return NextResponse.json({ error: "Missing conclusion or instruction" }, { status: 400 });
    }

    const { cleaned: conclusionText } = stripPii(String(rawConclusion));
    const { cleaned: instruction } = stripPii(String(rawInstruction).slice(0, 300));
    const lang = (outputLanguage as OutputLanguage) || "es";

    const globalConfig = await getGlobalAIConfig();
    const taskModel = globalConfig.taskOverrides?.conclusion;
    const provider = taskModel?.provider || globalConfig.provider;
    const model = taskModel?.modelName || globalConfig.modelName;
    const apiKey = resolveApiKey(globalConfig, provider);
    if (!apiKey) {
      return NextResponse.json({ error: `No API key configured for provider "${provider}".` }, { status: 500 });
    }

    const result = await streamAIWithFallback({
      config: globalConfig,
      provider,
      modelName: model,
      apiKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system: buildConclusionAdjustPrompt(lang, instruction),
      user: conclusionText,
      maxTokens: conclusionText.length > 2000 ? 1024 : 768,
    });

    const reader = result.stream.getReader();
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
          const usage = result.getUsage();
          if (usage) {
            logAICost({ userId, action: "conclusion_adjust", provider: result.usedProvider, model: result.usedModel, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens });
          }
        }
      },
    });

    return new Response(passthrough, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Output-Language": lang },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
