export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGlobalAIConfig, resolveApiKey, checkReportLimit, incrementReportUsage } from "@/lib/auth-helpers";
import { generateAIStream } from "@/lib/ai-provider";
import { buildFindingsPrompt } from "@/lib/prompts";
import { runComboFindings } from "@/lib/combo-findings";
import { getDefaultsForModality } from "@/lib/normality-defaults";
import { translateSectionLabel, translateTemplate, enforceOutputLanguage } from "@/lib/section-translate";
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

    const { template, dictation, modality, studyType, paraphraseOverride } = await req.json();

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
      paraphrase_level: paraphraseOverride || config?.paraphrase_level || "light",
      output_language: config?.output_language || "es",
      style_learning_enabled: config?.style_learning_enabled ?? true,
      compact_normals: config?.compact_normals ?? false,
    };

    let preferredNormalPhrases: PreferredNormalPhrase[] | undefined;
    if (safeConfig.style_learning_enabled) {
      try {
        const mod = modality || "CT";
        const defaults = getDefaultsForModality(mod);
        const defaultKeys = new Set(defaults.map((d) => d.section_label));

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
        const outLang = safeConfig.output_language as OutputLanguage;

        preferredNormalPhrases = defaults.map((d) => ({
          label: translateSectionLabel(d.section_label, outLang),
          phrase: overrideMap.get(d.section_label) ?? d.phrase,
        }));

        for (const o of overrides) {
          if (!defaultKeys.has(o.section_label)) {
            preferredNormalPhrases.push({
              label: translateSectionLabel(o.section_label, outLang),
              phrase: o.phrase,
            });
          }
        }
      } catch { /* ignore */ }
    }

    const outLang = safeConfig.output_language as OutputLanguage;
    const translatedTemplate = translateTemplate(template, outLang);

    const responseHeaders = {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Output-Language": safeConfig.output_language,
    };

    // Increment report usage BEFORE responding (must complete before serverless fn dies)
    await incrementReportUsage(user.id);

    // ── Combo pipeline: GPT-4 Mini mapper + DeepSeek V3 validator ──
    if (globalConfig.findingsComboEnabled) {
      console.log(`[findings] COMBO mode — GPT-4o-mini + DeepSeek V3, compact=${safeConfig.compact_normals}, lang=${safeConfig.output_language}`);

      const comboResult = await runComboFindings(globalConfig, {
        template: translatedTemplate,
        dictation,
        modality: modality || "CT",
        findingsLength: safeConfig.findings_length as FindingsLength,
        normalFieldsVerbosity: safeConfig.normal_fields_verbosity as NormalFieldsVerbosity,
        paraphraseLevel: safeConfig.paraphrase_level as ParaphraseLevel,
        outputLanguage: safeConfig.output_language as OutputLanguage,
        compactNormals: safeConfig.compact_normals,
        preferredNormalPhrases,
      });

      const encoder = new TextEncoder();
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(comboResult));
          controller.close();
        },
      });

      return new Response(body, { headers: responseHeaders });
    }

    // ── Standard single-model streaming pipeline ──
    const { system, user: userPrompt } = buildFindingsPrompt({
      template: translatedTemplate,
      dictation,
      modality: modality || "CT",
      findingsLength: safeConfig.findings_length as FindingsLength,
      normalFieldsVerbosity: safeConfig.normal_fields_verbosity as NormalFieldsVerbosity,
      paraphraseLevel: safeConfig.paraphrase_level as ParaphraseLevel,
      outputLanguage: safeConfig.output_language as OutputLanguage,
      compactNormals: safeConfig.compact_normals,
      preferredNormalPhrases,
    });

    const taskModel = globalConfig.taskOverrides?.findings;
    const effectiveProvider = taskModel?.provider || globalConfig.provider;
    const effectiveModel = taskModel?.modelName || globalConfig.modelName;
    const effectiveKey = resolveApiKey(globalConfig, effectiveProvider);

    if (!effectiveKey) {
      return NextResponse.json(
        { error: `No API key configured for provider "${effectiveProvider}". Contact your administrator.` },
        { status: 500 },
      );
    }

    console.log(`[findings] provider=${effectiveProvider}, model=${effectiveModel}, keyLen=${effectiveKey.length}, compact=${safeConfig.compact_normals}, lang=${safeConfig.output_language}`);

    const rawStream = await generateAIStream({
      provider: effectiveProvider,
      modelName: effectiveModel,
      apiKey: effectiveKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: userPrompt,
    });

    if (outLang !== "en") {
      const reader = rawStream.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }
      fullText += decoder.decode();
      const enforced = enforceOutputLanguage(fullText, outLang);
      const encoder = new TextEncoder();
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(enforced));
          controller.close();
        },
      });
      return new Response(body, { headers: responseHeaders });
    }

    return new Response(rawStream, { headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
