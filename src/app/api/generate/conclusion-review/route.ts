export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey, hasPlatformAccess } from "@/lib/auth-helpers";
import { generateAIWithUsageFallback } from "@/lib/ai-fallback";
import { logAICost } from "@/lib/log-ai-cost";
import { buildConclusionLinksPrompt, buildConclusionVerifyPrompt } from "@/lib/prompts";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { stripPii } from "@/lib/pii-detect";
import type { OutputLanguage } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-error";

const EMPTY = { links: [], verify: null };

/**
 * Post-delivery review of a finished conclusion. Two independent checks run
 * concurrently against the text the radiologist is already reading:
 *
 *   links  — which findings sentence backs each conclusion point (hover UI)
 *   verify — contradictions with the findings, and acute findings that are
 *            missing from the conclusion or buried below less urgent ones
 *
 * Always called AFTER the conclusion has finished streaming, never from the
 * generation pipeline, so nothing here can delay a report. Both results are
 * advisory: they are shown to the radiologist, never written back into the
 * report — a check that cannot be validated must not edit clinical text.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(EMPTY, { status: 401 });

    const rl = rateLimit(`conclusion-review:${user.id}`, RATE_LIMITS.generate);
    if (!rl.allowed) return NextResponse.json(EMPTY, { status: 429 });

    if (!(await hasPlatformAccess(user.id))) {
      return NextResponse.json(EMPTY, { status: 403 });
    }

    const body = await req.json();
    const { findingsText: rawFindings, conclusionText: rawConclusion, outputLanguage } = body;
    if (!rawFindings || !rawConclusion) return NextResponse.json(EMPTY);

    const { cleaned: findingsText } = stripPii(rawFindings);
    const { cleaned: conclusionText } = stripPii(rawConclusion);
    const lang = (outputLanguage as OutputLanguage) || "es";

    const globalConfig = await getGlobalAIConfig();
    const reviewTask = globalConfig.taskOverrides?.conclusion_verify;
    const provider = reviewTask?.provider || globalConfig.provider;
    const model = reviewTask?.modelName || globalConfig.modelName;
    const apiKey = resolveApiKey(globalConfig, provider);
    if (!apiKey) return NextResponse.json(EMPTY);

    const shared = {
      config: globalConfig,
      provider,
      modelName: model,
      apiKey,
      customBaseUrl: globalConfig.customBaseUrl,
    };

    const linksPrompt = buildConclusionLinksPrompt({ findingsText, conclusionText, outputLanguage: lang });
    const verifyPrompt = buildConclusionVerifyPrompt({ findingsText, draftConclusion: conclusionText, outputLanguage: lang });

    // Concurrent: neither check waits for the other, and one failing must
    // never take the other down with it.
    const [linksResult, verifyResult] = await Promise.allSettled([
      generateAIWithUsageFallback({ ...shared, system: linksPrompt.system, user: linksPrompt.user, maxTokens: 500 }),
      generateAIWithUsageFallback({ ...shared, system: verifyPrompt.system, user: verifyPrompt.user, maxTokens: 220 }),
    ]);

    let links: { point: number; quote: string }[] = [];
    if (linksResult.status === "fulfilled") {
      const r = linksResult.value;
      if (r.usage) {
        logAICost({ userId: user.id, action: "conclusion_links", provider: r.usedProvider, model: r.usedModel, inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens });
      }
      const raw = (r.text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          links = parsed
            .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
            .map((l) => ({ point: Number(l.point), quote: String(l.quote || "") }))
            .filter((l) => Number.isFinite(l.point) && l.point > 0 && l.quote.trim().length >= 3 && l.quote.length <= 400)
            .slice(0, 20);
        }
      } catch { /* a non-JSON answer just means no hover links */ }
    }

    let verify: { status: "ok" | "issues"; notes?: string } | null = null;
    if (verifyResult.status === "fulfilled") {
      const r = verifyResult.value;
      if (r.usage) {
        logAICost({ userId: user.id, action: "conclusion_verify", provider: r.usedProvider, model: r.usedModel, inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens });
      }
      const verdict = (r.text || "").trim();
      if (verdict) {
        verify = /^ok\.?$/i.test(verdict)
          ? { status: "ok" }
          : { status: "issues", notes: verdict.slice(0, 1000) };
      }
    }

    return NextResponse.json({ links, verify });
  } catch (error) {
    return toErrorResponse(error);
  }
}
