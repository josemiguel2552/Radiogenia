import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { generateAI } from "@/lib/ai-provider";
import { buildFindingsPrompt } from "@/lib/prompts";
import { pickTopPhrases } from "@/lib/style-learning";
import type { AIProvider, FindingsLength, NormalFieldsVerbosity, ParaphraseLevel, OutputLanguage, PreferredNormalPhrase } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { template, dictation, modality, studyType } = await req.json();

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

    // Get learned normality phrases if style learning is enabled
    let preferredNormalPhrases: PreferredNormalPhrase[] | undefined;
    if (config.style_learning_enabled && studyType) {
      try {
        const mod = modality || "CT";
        const maxPhrases = config.few_shot_count || 5;

        // First: phrases from the exact study type
        const { data: exact } = await supabase
          .from("style_patterns")
          .select("label, phrase, frequency, last_seen_at")
          .eq("user_id", user.id)
          .eq("modality", mod)
          .eq("study_type", studyType)
          .eq("kind", "normal_phrase");

        const exactTop = exact && exact.length > 0
          ? pickTopPhrases(exact as { label: string; phrase: string; frequency: number; last_seen_at: string }[], maxPhrases)
          : [];

        // Collect labels already covered by the exact study type
        const coveredLabels = new Set(exactTop.map((p) => (p.label || "").toLowerCase().trim()));

        // Fallback: fill gaps with phrases from the same modality (other study types)
        let fallback: typeof exactTop = [];
        if (coveredLabels.size < maxPhrases) {
          const { data: modalityPhrases } = await supabase
            .from("style_patterns")
            .select("label, phrase, frequency, last_seen_at")
            .eq("user_id", user.id)
            .eq("modality", mod)
            .neq("study_type", studyType)
            .eq("kind", "normal_phrase");

          if (modalityPhrases && modalityPhrases.length > 0) {
            const uncovered = (modalityPhrases as typeof exactTop).filter(
              (p) => !coveredLabels.has((p.label || "").toLowerCase().trim()),
            );
            fallback = pickTopPhrases(uncovered, maxPhrases - exactTop.length);
          }
        }

        const combined = [...exactTop, ...fallback];
        if (combined.length > 0) {
          preferredNormalPhrases = combined.map((p) => ({ label: p.label || "", phrase: p.phrase }));
        }
      } catch { /* style_patterns table may not exist */ }
    }

    const { system, user: userPrompt } = buildFindingsPrompt({
      template,
      dictation,
      modality: modality || "CT",
      findingsLength: config.findings_length as FindingsLength,
      normalFieldsVerbosity: config.normal_fields_verbosity as NormalFieldsVerbosity,
      paraphraseLevel: config.paraphrase_level as ParaphraseLevel,
      outputLanguage: (config.output_language || "es") as OutputLanguage,
      preferredNormalPhrases,
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
