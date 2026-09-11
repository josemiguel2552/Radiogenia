export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey, hasPlatformAccess } from "@/lib/auth-helpers";
import { generateAIWithUsageFallback } from "@/lib/ai-fallback";
import { logAICost } from "@/lib/log-ai-cost";
import { buildSentenceImprovePrompt } from "@/lib/prompts";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { stripPii } from "@/lib/pii-detect";
import type { OutputLanguage } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-error";

const MAX_SENTENCE = 600;

/**
 * Rewrites one selected findings sentence. Buffered rather than streamed:
 * it is a single sentence, and swapping it in once is steadier to watch than
 * having it typed back into the middle of the report.
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
    const raw = typeof body.sentence === "string" ? body.sentence.trim() : "";
    if (raw.length < 3) return NextResponse.json({ error: "Empty selection" }, { status: 400 });
    if (raw.length > MAX_SENTENCE) return NextResponse.json({ error: "Selection too long" }, { status: 400 });

    const { cleaned: sentence } = stripPii(raw);
    const lang = (body.outputLanguage as OutputLanguage) || "es";

    const globalConfig = await getGlobalAIConfig();
    // Same model as the report's prose work, so a fixed sentence reads like
    // the rest of the report rather than like a different writer.
    const taskModel = globalConfig.taskOverrides?.improve_writing || globalConfig.taskOverrides?.findings;
    const provider = taskModel?.provider || globalConfig.provider;
    const model = taskModel?.modelName || globalConfig.modelName;
    const apiKey = resolveApiKey(globalConfig, provider);
    if (!apiKey) {
      return NextResponse.json({ error: `No API key configured for provider "${provider}".` }, { status: 500 });
    }

    const result = await generateAIWithUsageFallback({
      config: globalConfig,
      provider,
      modelName: model,
      apiKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system: buildSentenceImprovePrompt(lang),
      user: sentence,
      maxTokens: 400,
    });

    if (result.usage) {
      logAICost({ userId: user.id, action: "improve_sentence", provider: result.usedProvider, model: result.usedModel, inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens });
    }

    // Models like to wrap a single returned sentence in quotes; strip only a
    // matched pair so a real quotation inside the text survives.
    let text = (result.text || "").trim().replace(/\s+/g, " ");
    const quoted = /^["'«“]([\s\S]*)["'»”]$/;
    if (text.length > 1 && quoted.test(text)) {
      text = text.replace(quoted, "$1").trim();
    }
    if (!text) return NextResponse.json({ error: "Empty result" }, { status: 502 });

    return NextResponse.json({ text });
  } catch (error) {
    return toErrorResponse(error);
  }
}
