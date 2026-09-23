export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGlobalAIConfig, resolveApiKey, hasPlatformAccess } from "@/lib/auth-helpers";
import { streamAIWithFallback } from "@/lib/ai-fallback";
import { logAICost } from "@/lib/log-ai-cost";
import { buildConclusionPrompt } from "@/lib/prompts";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { stripPii } from "@/lib/pii-detect";
import { logPiiStrip } from "@/lib/pii-log";
import type { OutputLanguage } from "@/lib/types";
import { normalizeConclusionStyle } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-error";


/**
 * The radiologist's own recent conclusions for this kind of study, used to
 * match their voice. Returns [] rather than throwing: a missing table or a
 * slow query must not be able to fail a report.
 */
async function fetchConclusionStyleSamples(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  modality: unknown,
  studyType: unknown,
): Promise<string[]> {
  if (typeof modality !== "string" || typeof studyType !== "string" || !modality || !studyType) return [];
  const base = () =>
    supabase
      .from("style_patterns")
      .select("phrase, frequency, last_seen_at")
      .eq("user_id", userId)
      .eq("modality", modality)
      .eq("kind", "conclusion_sample")
      .order("last_seen_at", { ascending: false })
      .limit(3);
  try {
    const [{ data: exact }, { data: fallback }] = await Promise.all([
      base().eq("study_type", studyType),
      base().neq("study_type", studyType),
    ]);
    return [...(exact || []), ...(fallback || [])].slice(0, 3).map((s) => s.phrase);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`generate:${user.id}`, RATE_LIMITS.generate);
    if (!rl.allowed) return rl.errorResponse!;

    const service = createServiceClient();

    // The body is read first because everything else needs what is in it, and
    // reading it costs no round trip — then the four lookups that used to run
    // one after another (access check, global config, user config, style
    // samples) go out together. They have no dependencies on each other, so
    // serialising them was putting three needless round trips in front of the
    // first token.
    const body = await req.json();
    const { findingsText: rawFindings, clinicalInfo: rawClinical, modality, studyType, conclusionStyle: reqStyle, outputLanguage: reqLang, cardiacTechniques, recistConfig, mustInclude: rawInclude, exclude: rawExclude } = body;

    const [hasAccess, globalConfig, { data: config }, styleSamples] = await Promise.all([
      hasPlatformAccess(user.id),
      getGlobalAIConfig(),
      service
        .from("user_model_config")
        .select("output_language, style_learning_enabled, conclusion_style")
        .eq("user_id", user.id)
        .maybeSingle(),
      fetchConclusionStyleSamples(supabase, user.id, modality, studyType),
    ]);

    // Card-first billing: no AI usage without an active subscription, even via
    // direct API calls with a live session. Fetched in parallel, checked
    // before anything reaches a provider.
    if (!hasAccess) {
      return NextResponse.json({ error: "Subscription required", code: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
    }

    const { cleaned: findingsText, strippedCount: sc1, strippedTypes: st1 } = stripPii(rawFindings || "");
    const { cleaned: clinicalInfo, strippedCount: sc2, strippedTypes: st2 } = stripPii(rawClinical || "");
    const mergedTypes: Record<string, number> = { ...st1 };
    for (const [k, v] of Object.entries(st2)) mergedTypes[k] = (mergedTypes[k] || 0) + v;
    logPiiStrip(user.id, "conclusion", sc1 + sc2, mergedTypes);

    // Findings the radiologist ticked come back from the browser, so they get
    // the same PII scrub as everything else before reaching a provider. The
    // cap is above what a long report splits into: these two lists together
    // are every sentence of the findings, and dropping the tail of either
    // would quietly put back a finding that was ticked out.
    const cleanList = (raw: unknown) =>
      Array.isArray(raw)
        ? raw
            .filter((x): x is string => typeof x === "string")
            .slice(0, 120)
            .map((x) => stripPii(x.slice(0, 600)).cleaned.trim())
            .filter(Boolean)
        : undefined;
    const mustInclude = cleanList(rawInclude);
    const exclude = cleanList(rawExclude);

    const outputLanguage = reqLang || config?.output_language || "es";
    const styleLearning = config?.style_learning_enabled ?? true;
    const conclusionStyle = normalizeConclusionStyle(reqStyle || config?.conclusion_style);

    // Fetched above alongside everything else; the preference only decides
    // whether the samples are used, which costs nothing to evaluate here.
    const preferredConclusionPhrases = styleLearning && styleSamples.length > 0
      ? styleSamples
      : undefined;

    const { system, user: userPrompt } = buildConclusionPrompt({
      findingsText,
      clinicalInfo: clinicalInfo || "",
      outputLanguage: outputLanguage as OutputLanguage,
      conclusionStyle,
      preferredConclusionPhrases,
      isCardiacMri: Array.isArray(cardiacTechniques) && cardiacTechniques.length > 0,
      isRecistStudy: !!recistConfig,
      recistConfig: recistConfig || undefined,
      mustInclude,
      exclude,
    });

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
    const findingsLen = findingsText.length;
    const maxTokens = findingsLen > 5000 ? 1024 : findingsLen > 2000 ? 768 : 512;
    const userId = user.id;

    // Stream a ReadableStream to the client, logging AI cost on completion.
    const streamToResponse = (
      stream: ReadableStream<Uint8Array>,
      getUsage: () => { inputTokens: number; outputTokens: number } | null,
      action: string,
      usedProvider: string,
      usedModel: string,
    ) => {
      const reader = stream.getReader();
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
              logAICost({ userId, action, provider: usedProvider, model: usedModel, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens });
            }
          }
        },
      });
      return new Response(passthrough, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "X-Output-Language": outputLanguage },
      });
    };

    // One streamed pass. The integrated style used to be drafted in full and
    // then polished in a second call, which meant nothing appeared on screen
    // until the whole draft existed; its wording rules now live in the prompt
    // itself, so the text starts arriving immediately.
    //
    // The fact-check against the findings deliberately does NOT run here: it
    // would put a whole round-trip in front of the first token. It runs
    // afterwards, on the delivered text, via /api/generate/conclusion-review.
    const single = await streamAIWithFallback({
      config: globalConfig,
      provider: effectiveProvider,
      modelName: effectiveModel,
      apiKey: effectiveKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: userPrompt,
      maxTokens,
    });
    return streamToResponse(single.stream, single.getUsage, "generate_conclusion", single.usedProvider, single.usedModel);
  } catch (error) {
    return toErrorResponse(error);
  }
}
