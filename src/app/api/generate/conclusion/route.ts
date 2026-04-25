import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGlobalAIConfig } from "@/lib/auth-helpers";
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

    let { data: config } = await supabase
      .from("user_model_config")
      .select("output_language, style_learning_enabled")
      .eq("user_id", user.id)
      .single();

    if (!config) {
      const service = createServiceClient();
      await service.from("user_model_config").upsert({ user_id: user.id }, { onConflict: "user_id" });
      const { data: retry } = await supabase
        .from("user_model_config")
        .select("output_language, style_learning_enabled")
        .eq("user_id", user.id)
        .single();
      config = retry;
    }

    if (!config) return NextResponse.json({ error: "No model config found" }, { status: 400 });

    let preferredConclusionPhrases: string[] | undefined;
    if (config.style_learning_enabled && modality && studyType) {
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
      outputLanguage: (config.output_language || "es") as OutputLanguage,
      preferredConclusionPhrases,
    });

    const stream = await generateAIStream({
      provider: globalConfig.provider,
      modelName: globalConfig.modelName,
      apiKey: globalConfig.apiKey,
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
