export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGlobalAIConfig, checkReportLimit } from "@/lib/auth-helpers";
import { generateAIStream } from "@/lib/ai-provider";
import { buildFindingsPrompt } from "@/lib/prompts";
import { getDefaultsForModality } from "@/lib/normality-defaults";
import type { FindingsLength, NormalFieldsVerbosity, ParaphraseLevel, OutputLanguage, PreferredNormalPhrase } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quota = await checkReportLimit(user.id);
    if (!quota.allowed) {
      return NextResponse.json({
        error: `Monthly report limit reached (${quota.used}/${quota.limit}). Upgrade your plan for more reports.`,
        code: "LIMIT_REACHED",
        used: quota.used,
        limit: quota.limit,
        plan: quota.plan,
      }, { status: 429 });
    }

    const { template, dictation, modality, studyType } = await req.json();

    const globalConfig = await getGlobalAIConfig();
    const service = createServiceClient();

    let { data: config } = await service
      .from("user_model_config")
      .select("findings_length, normal_fields_verbosity, paraphrase_level, output_language, style_learning_enabled, compact_normals")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!config) {
      await service.from("user_model_config").upsert(
        { user_id: user.id },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
      const { data: retry } = await service
        .from("user_model_config")
        .select("findings_length, normal_fields_verbosity, paraphrase_level, output_language, style_learning_enabled, compact_normals")
        .eq("user_id", user.id)
        .maybeSingle();
      config = retry;
    }

    const safeConfig = {
      findings_length: config?.findings_length || "standard",
      normal_fields_verbosity: config?.normal_fields_verbosity || "standard",
      paraphrase_level: config?.paraphrase_level || "light",
      output_language: config?.output_language || "es",
      style_learning_enabled: config?.style_learning_enabled ?? true,
      compact_normals: config?.compact_normals ?? false,
    };

    let preferredNormalPhrases: PreferredNormalPhrase[] | undefined;
    if (safeConfig.style_learning_enabled) {
      try {
        const mod = modality || "CT";
        const defaults = getDefaultsForModality(mod);

        let overrides: { section_label: string; phrase: string }[] = [];
        try {
          const { data } = await supabase
            .from("normality_phrases")
            .select("section_label, phrase")
            .eq("user_id", user.id)
            .eq("modality", mod);
          overrides = data || [];
        } catch { /* table may not exist */ }

        const overrideMap = new Map(overrides.map((o) => [o.section_label, o.phrase]));

        preferredNormalPhrases = defaults.map((d) => ({
          label: d.section_label,
          phrase: overrideMap.get(d.section_label) ?? d.phrase,
        }));
      } catch { /* ignore */ }
    }

    const { system, user: userPrompt } = buildFindingsPrompt({
      template,
      dictation,
      modality: modality || "CT",
      findingsLength: safeConfig.findings_length as FindingsLength,
      normalFieldsVerbosity: safeConfig.normal_fields_verbosity as NormalFieldsVerbosity,
      paraphraseLevel: safeConfig.paraphrase_level as ParaphraseLevel,
      outputLanguage: safeConfig.output_language as OutputLanguage,
      compactNormals: safeConfig.compact_normals,
      preferredNormalPhrases,
    });

    const stream = await generateAIStream({
      provider: globalConfig.provider,
      modelName: globalConfig.modelName,
      apiKey: globalConfig.apiKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: userPrompt,
    });

    // Increment report usage via service client (bypasses RLS)
    service.rpc("increment_report_usage", { uid: user.id }).then(({ error: rpcError }) => {
      if (rpcError) {
        service
          .from("profiles")
          .update({ reports_used_this_month: quota.used + 1 })
          .eq("id", user.id)
          .then(() => {});
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Output-Language": safeConfig.output_language,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
