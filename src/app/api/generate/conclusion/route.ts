export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateAIStream } from "@/lib/ai-provider";
import { buildConclusionPrompt } from "@/lib/prompts";
import type { OutputLanguage } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { findingsText, clinicalInfo, modality, studyType } = await req.json();

    const globalConfig = await getGlobalAIConfig();
    const service = createServiceClient();

    const { data: config } = await service
      .from("user_model_config")
      .select("output_language, style_learning_enabled")
      .eq("user_id", user.id)
      .maybeSingle();

    const outputLanguage = config?.output_language || "es";
    const styleLearning = config?.style_learning_enabled ?? true;

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
      preferredConclusionPhrases,
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

    console.log(`[conclusion] provider=${effectiveProvider}, model=${taskModel?.modelName || globalConfig.modelName}, keyLen=${effectiveKey.length}`);

    const stream = await generateAIStream({
      provider: effectiveProvider,
      modelName: taskModel?.modelName || globalConfig.modelName,
      apiKey: effectiveKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: userPrompt,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
