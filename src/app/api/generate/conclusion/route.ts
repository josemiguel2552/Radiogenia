import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { generateAI } from "@/lib/ai-provider";
import { buildConclusionPrompt } from "@/lib/prompts";
import { pickTopPhrases } from "@/lib/style-learning";
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

    // Get learned conclusion phrases if style learning is enabled
    let preferredConclusionPhrases: string[] | undefined;
    if (config.style_learning_enabled && modality && studyType) {
      const { count } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("modality", modality)
        .eq("study_type", studyType);

      if (count != null && count >= 3) {
        const { data: patterns } = await supabase
          .from("style_patterns")
          .select("phrase, frequency, last_seen_at")
          .eq("user_id", user.id)
          .eq("modality", modality)
          .eq("study_type", studyType)
          .eq("kind", "conclusion_phrase");

        if (patterns && patterns.length > 0) {
          const top = pickTopPhrases(
            patterns as { phrase: string; frequency: number; last_seen_at: string }[],
            5,
          );
          preferredConclusionPhrases = top.map((p) => p.phrase);
        }
      }
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
