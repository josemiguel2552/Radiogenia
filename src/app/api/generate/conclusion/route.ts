import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { generateAI } from "@/lib/ai-provider";
import { buildConclusionPrompt } from "@/lib/prompts";
import type { AIProvider, OutputLanguage } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { findingsText, clinicalInfo, modality, studyType } = await req.json();

    const { data: config } = await supabase
      .from("user_model_config")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!config) return NextResponse.json({ error: "No model config found" }, { status: 400 });

    let apiKey = "";
    try {
      apiKey = config.api_key_encrypted ? decrypt(config.api_key_encrypted) : "";
    } catch {
      return NextResponse.json({ error: "Failed to decrypt API key" }, { status: 500 });
    }

    if (!apiKey) return NextResponse.json({ error: "No API key configured" }, { status: 400 });

    // Get learned conclusion style samples if style learning is enabled
    let preferredConclusionPhrases: string[] | undefined;
    if (config.style_learning_enabled && modality && studyType) {
      try {
        // First: samples from the exact study type
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

        // Fallback: fill with conclusions from same modality if < 3
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

    const text = await generateAI({
      provider: config.provider as AIProvider,
      modelName: config.model_name,
      apiKey,
      customBaseUrl: config.custom_base_url,
      system,
      user: userPrompt,
    });

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
