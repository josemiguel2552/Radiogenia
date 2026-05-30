export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateAIStreamWithUsage } from "@/lib/ai-provider";
import { logAICost } from "@/lib/log-ai-cost";
import { buildConclusionPrompt } from "@/lib/prompts";
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

    const [body, globalConfig] = await Promise.all([
      req.json(),
      getGlobalAIConfig(),
    ]);
    const { findingsText: rawFindings, clinicalInfo: rawClinical, modality, studyType, conclusionStyle: reqStyle, outputLanguage: reqLang, cardiacTechniques, recistConfig } = body;

    const { cleaned: findingsText, strippedCount: sc1, strippedTypes: st1 } = stripPii(rawFindings || "");
    const { cleaned: clinicalInfo, strippedCount: sc2, strippedTypes: st2 } = stripPii(rawClinical || "");
    const mergedTypes: Record<string, number> = { ...st1 };
    for (const [k, v] of Object.entries(st2)) mergedTypes[k] = (mergedTypes[k] || 0) + v;
    logPiiStrip(user.id, "conclusion", sc1 + sc2, mergedTypes);

    const service = createServiceClient();

    const { data: config } = await service
      .from("user_model_config")
      .select("output_language, style_learning_enabled, conclusion_style")
      .eq("user_id", user.id)
      .maybeSingle();

    const outputLanguage = reqLang || config?.output_language || "es";
    const styleLearning = config?.style_learning_enabled ?? true;
    const rawStyle = reqStyle || config?.conclusion_style || "grouped";
    const conclusionStyle = (rawStyle === "detailed" ? "grouped" : rawStyle) as ConclusionStyle;

    let preferredConclusionPhrases: string[] | undefined;
    if (styleLearning && modality && studyType) {
      try {
        const { data: exact } = await supabase
          .from("style_patterns")
          .select("phrase, frequency, last_seen_at")
          .eq("user_id", user.id)
          .eq("modality", modality)
          .eq("study_type", studyType)
          .eq("kind", "conclusion_sample")
          .order("last_seen_at", { ascending: false })
          .limit(3);

        const samples = exact || [];

        if (samples.length < 3) {
          const { data: modalitySamples } = await supabase
            .from("style_patterns")
            .select("phrase, frequency, last_seen_at")
            .eq("user_id", user.id)
            .eq("modality", modality)
            .neq("study_type", studyType)
            .eq("kind", "conclusion_sample")
            .order("last_seen_at", { ascending: false })
            .limit(3 - samples.length);

          if (modalitySamples) {
            samples.push(...modalitySamples);
          }
        }

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
    const { stream, getUsage } = await generateAIStreamWithUsage({
      provider: effectiveProvider,
      modelName: effectiveModel,
      apiKey: effectiveKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: userPrompt,
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
            logAICost({ userId, action: "generate_conclusion", provider: effectiveProvider, model: effectiveModel, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens });
          }
        }
      },
    });

    return new Response(passthrough, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Output-Language": outputLanguage,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
