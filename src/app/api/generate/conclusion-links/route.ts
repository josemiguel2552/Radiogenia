export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey, hasPlatformAccess } from "@/lib/auth-helpers";
import { generateAIWithUsageFallback } from "@/lib/ai-fallback";
import { logAICost } from "@/lib/log-ai-cost";
import { buildConclusionLinksPrompt } from "@/lib/prompts";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { stripPii } from "@/lib/pii-detect";
import type { OutputLanguage } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-error";

/**
 * Provenance links for the report UI (hover a conclusion point → see which
 * findings sentence backs it). Always called AFTER the conclusion has
 * already finished streaming to the radiologist — never part of the
 * generation pipeline — so a slow or failed call here never delays or
 * affects report generation. Best-effort: any problem just means no
 * highlight is available, never an error surfaced to the user.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ links: [] }, { status: 401 });

    const rl = rateLimit(`conclusion-links:${user.id}`, RATE_LIMITS.generate);
    if (!rl.allowed) return NextResponse.json({ links: [] }, { status: 429 });

    if (!(await hasPlatformAccess(user.id))) {
      return NextResponse.json({ links: [] }, { status: 403 });
    }

    const body = await req.json();
    const { findingsText: rawFindings, conclusionText: rawConclusion, outputLanguage } = body;
    if (!rawFindings || !rawConclusion) {
      return NextResponse.json({ links: [] });
    }

    const { cleaned: findingsText } = stripPii(rawFindings);
    const { cleaned: conclusionText } = stripPii(rawConclusion);

    const globalConfig = await getGlobalAIConfig();
    const linksTask = globalConfig.taskOverrides?.conclusion_verify;
    const provider = linksTask?.provider || globalConfig.provider;
    const model = linksTask?.modelName || globalConfig.modelName;
    const apiKey = resolveApiKey(globalConfig, provider);
    if (!apiKey) return NextResponse.json({ links: [] });

    const { system, user: userPrompt } = buildConclusionLinksPrompt({
      findingsText,
      conclusionText,
      outputLanguage: (outputLanguage as OutputLanguage) || "es",
    });

    const result = await generateAIWithUsageFallback({
      config: globalConfig,
      provider,
      modelName: model,
      apiKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: userPrompt,
      maxTokens: 500,
    });

    if (result.usage) {
      logAICost({ userId: user.id, action: "conclusion_links", provider: result.usedProvider, model: result.usedModel, inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens });
    }

    const raw = (result.text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ links: [] });
    }

    if (!Array.isArray(parsed)) return NextResponse.json({ links: [] });

    const links = parsed
      .filter((l): l is { point: unknown; quote: unknown } => !!l && typeof l === "object")
      .map((l) => ({ point: Number((l as { point: unknown }).point), quote: String((l as { quote: unknown }).quote || "") }))
      .filter((l) => Number.isFinite(l.point) && l.point > 0 && l.quote.trim().length >= 3 && l.quote.length <= 400)
      .slice(0, 20);

    return NextResponse.json({ links });
  } catch (error) {
    return toErrorResponse(error);
  }
}
