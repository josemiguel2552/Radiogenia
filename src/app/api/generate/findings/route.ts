import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { generateAI } from "@/lib/ai-provider";
import { buildFindingsPrompt } from "@/lib/prompts";
import type { AIProvider, FindingsLength, NormalFieldsVerbosity, ParaphraseLevel, OutputLanguage } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { template, dictation, modality } = await req.json();

    // Get model config
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

    // Get style samples if enabled
    let styleSamples: string[] = [];
    if (config.style_learning_enabled && config.style_sample_count >= 5) {
      const { data: samples } = await supabase
        .from("style_samples")
        .select("findings_text")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(config.few_shot_count || 3);

      if (samples) {
        styleSamples = samples.map((s: { findings_text: string }) => s.findings_text);
      }
    }

    const { system, user: userPrompt } = buildFindingsPrompt({
      template,
      dictation,
      modality: modality || "CT",
      findingsLength: config.findings_length as FindingsLength,
      normalFieldsVerbosity: config.normal_fields_verbosity as NormalFieldsVerbosity,
      paraphraseLevel: config.paraphrase_level as ParaphraseLevel,
      outputLanguage: (config.output_language || "es") as OutputLanguage,
      styleSamples,
    });

    const text = await generateAI({
      provider: config.provider as AIProvider,
      modelName: config.model_name,
      apiKey,
      customBaseUrl: config.custom_base_url,
      system,
      user: userPrompt,
    });

    return NextResponse.json({ text, outputLanguage: config.output_language || "es" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
