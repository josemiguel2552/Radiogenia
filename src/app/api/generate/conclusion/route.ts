export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGlobalAIConfig, resolveApiKey, hasPlatformAccess } from "@/lib/auth-helpers";
import { streamAIWithFallback, generateAIWithUsageFallback } from "@/lib/ai-fallback";
import { logAICost } from "@/lib/log-ai-cost";
import { buildConclusionPrompt, buildConclusionRefinePrompt } from "@/lib/prompts";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { stripPii } from "@/lib/pii-detect";
import { logPiiStrip } from "@/lib/pii-log";
import type { OutputLanguage, ConclusionStyle } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`generate:${user.id}`, RATE_LIMITS.generate);
    if (!rl.allowed) return rl.errorResponse!;

    // Card-first billing: no AI usage without an active subscription, even
    // via direct API calls with a live session.
    if (!(await hasPlatformAccess(user.id))) {
      return NextResponse.json({ error: "Subscription required", code: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
    }


    const service = createServiceClient();

    const [body, globalConfig, { data: config }] = await Promise.all([
      req.json(),
      getGlobalAIConfig(),
      service
        .from("user_model_config")
        .select("output_language, style_learning_enabled, conclusion_style")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    const { findingsText: rawFindings, clinicalInfo: rawClinical, modality, studyType, conclusionStyle: reqStyle, outputLanguage: reqLang, cardiacTechniques, recistConfig } = body;

    const { cleaned: findingsText, strippedCount: sc1, strippedTypes: st1 } = stripPii(rawFindings || "");
    const { cleaned: clinicalInfo, strippedCount: sc2, strippedTypes: st2 } = stripPii(rawClinical || "");
    const mergedTypes: Record<string, number> = { ...st1 };
    for (const [k, v] of Object.entries(st2)) mergedTypes[k] = (mergedTypes[k] || 0) + v;
    logPiiStrip(user.id, "conclusion", sc1 + sc2, mergedTypes);

    const outputLanguage = reqLang || config?.output_language || "es";
    const styleLearning = config?.style_learning_enabled ?? true;
    const rawStyle = reqStyle || config?.conclusion_style || "grouped";
    const conclusionStyle = (rawStyle === "detailed" ? "grouped" : rawStyle) as ConclusionStyle;

    let preferredConclusionPhrases: string[] | undefined;
    if (styleLearning && modality && studyType) {
      try {
        const [{ data: exact }, { data: fallback }] = await Promise.all([
          supabase
            .from("style_patterns")
            .select("phrase, frequency, last_seen_at")
            .eq("user_id", user.id)
            .eq("modality", modality)
            .eq("study_type", studyType)
            .eq("kind", "conclusion_sample")
            .order("last_seen_at", { ascending: false })
            .limit(3),
          supabase
            .from("style_patterns")
            .select("phrase, frequency, last_seen_at")
            .eq("user_id", user.id)
            .eq("modality", modality)
            .neq("study_type", studyType)
            .eq("kind", "conclusion_sample")
            .order("last_seen_at", { ascending: false })
            .limit(3),
        ]);

        const samples = [...(exact || []), ...(fallback || [])].slice(0, 3);
        if (samples.length > 0) {
          preferredConclusionPhrases = samples.map((s) => s.phrase);
        }
      } catch { /* style_patterns table may not exist */ }
    }

    const { system, user: userPrompt } = buildConclusionPrompt({
      findingsText,
      clinicalInfo: clinicalInfo || "",
      outputLanguage: outputLanguage as OutputLanguage,
      conclusionStyle,
      preferredConclusionPhrases,
      isCardiacMri: Array.isArray(cardiacTechniques) && cardiacTechniques.length > 0,
      isRecistStudy: !!recistConfig,
      recistConfig: recistConfig || undefined,
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

    // Integrated (grouped) conclusions get a second wording-polish pass. The
    // specialized cardiac/RECIST formats keep their single-pass generation.
    const isCardiac = Array.isArray(cardiacTechniques) && cardiacTechniques.length > 0;
    const isRecist = !!recistConfig;
    const shouldRefine = conclusionStyle === "grouped" && !isCardiac && !isRecist;

    if (shouldRefine) {
      // Pass 1 — generate the draft (buffered), with automatic provider fallback.
      const draft = await generateAIWithUsageFallback({
        config: globalConfig,
        provider: effectiveProvider,
        modelName: effectiveModel,
        apiKey: effectiveKey,
        customBaseUrl: globalConfig.customBaseUrl,
        system,
        user: userPrompt,
        maxTokens,
      });
      if (draft.usage) {
        logAICost({ userId, action: "generate_conclusion", provider: draft.usedProvider, model: draft.usedModel, inputTokens: draft.usage.inputTokens, outputTokens: draft.usage.outputTokens });
      }
      const draftText = (draft.text || "").trim();
      if (!draftText) {
        return new Response("", { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Output-Language": outputLanguage } });
      }
      // Pass 2 — polish the wording (streamed). If the primary already fell
      // back in pass 1, start directly with the provider that worked.
      const pass2 = await streamAIWithFallback({
        config: globalConfig,
        provider: draft.usedProvider,
        modelName: draft.usedModel,
        apiKey: draft.fellBack ? resolveApiKey(globalConfig, draft.usedProvider) : effectiveKey,
        customBaseUrl: globalConfig.customBaseUrl,
        system: buildConclusionRefinePrompt(outputLanguage as OutputLanguage),
        user: draftText,
        maxTokens,
      });
      return streamToResponse(pass2.stream, pass2.getUsage, "conclusion_refine", pass2.usedProvider, pass2.usedModel);
    }

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
