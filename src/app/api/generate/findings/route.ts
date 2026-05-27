export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGlobalAIConfig, resolveApiKey, checkReportLimit, incrementReportUsage } from "@/lib/auth-helpers";
import { generateAIStreamWithUsage } from "@/lib/ai-provider";
import { logAICost } from "@/lib/log-ai-cost";
import { buildFindingsPrompt } from "@/lib/prompts";
import { runComboFindings } from "@/lib/combo-findings";
import { getDefaultsForModality, type NormalityLang } from "@/lib/normality-defaults";
import { translateSectionLabel, translateTemplate, enforceOutputLanguage, enforcePeriodSeparation } from "@/lib/section-translate";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { stripPii } from "@/lib/pii-detect";
import type { FindingsLength, NormalFieldsVerbosity, ParaphraseLevel, OutputLanguage, PreferredNormalPhrase } from "@/lib/types";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`generate:${user.id}`, RATE_LIMITS.generate);
    if (!rl.allowed) return rl.errorResponse!;

    const [body, globalConfig, quota] = await Promise.all([
      req.json(),
      getGlobalAIConfig(),
      checkReportLimit(user.id),
    ]);

    if (!quota.allowed) {
      return NextResponse.json({
        error: `Monthly report limit reached (${quota.used}/${quota.limit}). Upgrade your plan for more reports.`,
        code: "LIMIT_REACHED",
        used: quota.used,
        limit: quota.limit,
        plan: quota.plan,
      }, { status: 429 });
    }

    const { template, dictation: rawDictation, modality, studyType, paraphraseOverride, compactNormals: compactOverride, reportMode, outputLanguage: reqLang, cardiacTechniques, recistConfig } = body;

    const { cleaned: dictation, strippedCount, strippedTypes } = stripPii(rawDictation || "");
    if (strippedCount > 0 && process.env.NODE_ENV === "development") {
      console.log(`[findings] PII stripped: ${strippedCount} items`, strippedTypes);
    }

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
      output_language: reqLang || config?.output_language || "es",
      style_learning_enabled: config?.style_learning_enabled ?? true,
      compact_normals: reportMode === "compact" || (compactOverride !== undefined ? compactOverride : (config?.compact_normals ?? false)),
      dictation_only: reportMode === "dictation_only",
    };

    const outLang = safeConfig.output_language as OutputLanguage;

    let preferredNormalPhrases: PreferredNormalPhrase[] | undefined;
    if (safeConfig.style_learning_enabled) {
      try {
        const mod = modality || "CT";
        const normalityLang: NormalityLang = outLang === "es" ? "es" : "en";
        const defaults = getDefaultsForModality(mod, normalityLang);
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

    const translatedTemplate = translateTemplate(template, outLang);

    const responseHeaders = {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Output-Language": safeConfig.output_language,
    };

    // ── Combo pipeline: GPT-4 Mini mapper + DeepSeek V3 validator ──
    if (globalConfig.findingsComboEnabled) {

      const { text: comboText, comboUsage } = await runComboFindings(globalConfig, {
        template: translatedTemplate,
        dictation,
        modality: modality || "CT",
        findingsLength: safeConfig.findings_length as FindingsLength,
        normalFieldsVerbosity: safeConfig.normal_fields_verbosity as NormalFieldsVerbosity,
        paraphraseLevel: safeConfig.paraphrase_level as ParaphraseLevel,
        outputLanguage: safeConfig.output_language as OutputLanguage,
        compactNormals: safeConfig.compact_normals,
        dictationOnly: safeConfig.dictation_only,
        preferredNormalPhrases,
      });

      await incrementReportUsage(user.id);

      logAICost({ userId: user.id, action: "generate_findings", provider: comboUsage.mapper.provider, model: comboUsage.mapper.model, inputTokens: comboUsage.mapper.usage.inputTokens, outputTokens: comboUsage.mapper.usage.outputTokens });
      logAICost({ userId: user.id, action: "generate_findings", provider: comboUsage.validator.provider, model: comboUsage.validator.model, inputTokens: comboUsage.validator.usage.inputTokens, outputTokens: comboUsage.validator.usage.outputTokens });

      const encoder = new TextEncoder();
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(comboText));
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
      dictationOnly: safeConfig.dictation_only,
      preferredNormalPhrases,
      cardiacTechniques: Array.isArray(cardiacTechniques) ? cardiacTechniques : undefined,
      recistConfig: recistConfig || undefined,
    });

    const isImproveWriting = !!paraphraseOverride;
    const taskModel = (isImproveWriting && globalConfig.taskOverrides?.improve_writing)
      ? globalConfig.taskOverrides.improve_writing
      : globalConfig.taskOverrides?.findings;
    const effectiveProvider = taskModel?.provider || globalConfig.provider;
    const effectiveModel = taskModel?.modelName || globalConfig.modelName;
    const effectiveKey = resolveApiKey(globalConfig, effectiveProvider);

    if (!effectiveKey) {
      return NextResponse.json(
        { error: `No API key configured for provider "${effectiveProvider}". Contact your administrator.` },
        { status: 500 },
      );
    }


    const { stream: rawStream, getUsage } = await generateAIStreamWithUsage({
      provider: effectiveProvider,
      modelName: effectiveModel,
      apiKey: effectiveKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: userPrompt,
    });

    await incrementReportUsage(user.id);

    const reader = rawStream.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const userId = user.id;
    const needsEnforce = outLang !== "en";

    const passthrough = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lastNewline = buffer.lastIndexOf("\n");
            if (lastNewline !== -1) {
              const ready = buffer.slice(0, lastNewline + 1);
              buffer = buffer.slice(lastNewline + 1);
              const processed = needsEnforce ? enforceOutputLanguage(ready, outLang) : enforcePeriodSeparation(ready);
              controller.enqueue(encoder.encode(processed));
            }
          }

          if (buffer) {
            buffer += decoder.decode();
            const processed = needsEnforce ? enforceOutputLanguage(buffer, outLang) : enforcePeriodSeparation(buffer);
            controller.enqueue(encoder.encode(processed));
          }
        } finally {
          controller.close();
          const usage = getUsage();
          if (usage) {
            logAICost({ userId, action: "generate_findings", provider: effectiveProvider, model: effectiveModel, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens });
          }
        }
      },
    });

    return new Response(passthrough, { headers: responseHeaders });
  } catch (error) {
    return toErrorResponse(error);
  }
}
