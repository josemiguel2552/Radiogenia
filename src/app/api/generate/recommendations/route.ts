export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateAI } from "@/lib/ai-provider";
import { buildRecommendationsPrompt } from "@/lib/prompts";
import type { OutputLanguage } from "@/lib/types";

interface CatalogueEntry {
  trigger: string;
  recommendation: string;
  guideline: string;
}

interface LLMRecommendation {
  catalogue_id?: string;
  recommendation?: string;
  guideline?: string;
  triggering_finding?: string;
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-záéíóúüñ\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function validateRecommendation(
  rec: LLMRecommendation,
  catalogue: CatalogueEntry[],
): { valid: boolean; matchedEntry?: CatalogueEntry } {
  if (!rec.recommendation) return { valid: false };

  // Try matching by catalogue_id first (R1, R2, etc.)
  if (rec.catalogue_id) {
    const idMatch = rec.catalogue_id.match(/R?(\d+)/i);
    if (idMatch) {
      const idx = parseInt(idMatch[1], 10) - 1;
      if (idx >= 0 && idx < catalogue.length) {
        return { valid: true, matchedEntry: catalogue[idx] };
      }
    }
  }

  // Fallback: fuzzy match the recommendation text against catalogue entries
  const normRec = normalizeForMatch(rec.recommendation);
  let bestScore = 0;
  let bestEntry: CatalogueEntry | undefined;

  for (const entry of catalogue) {
    const normEntry = normalizeForMatch(entry.recommendation);
    const recWords = new Set(normRec.split(" ").filter((w) => w.length > 3));
    const entryWords = new Set(normEntry.split(" ").filter((w) => w.length > 3));
    if (recWords.size === 0 || entryWords.size === 0) continue;

    let overlap = 0;
    for (const w of recWords) {
      if (entryWords.has(w)) overlap++;
    }
    const score = overlap / Math.max(recWords.size, entryWords.size);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  // Require at least 50% word overlap to consider it a match
  if (bestScore >= 0.5 && bestEntry) {
    return { valid: true, matchedEntry: bestEntry };
  }

  return { valid: false };
}

function formatValidatedOutput(
  validated: { entry: CatalogueEntry; finding: string }[],
  outputLanguage: OutputLanguage,
): string {
  if (validated.length === 0) {
    return outputLanguage === "es"
      ? "No se emiten recomendaciones adicionales."
      : "No additional recommendations.";
  }

  return validated.map((v, i) => {
    const gPart = ` (${v.entry.guideline || "Clinical practice"})`;
    const fLabel = outputLanguage === "es" ? "Hallazgo" : "Finding";
    return `${i + 1}. ${v.entry.recommendation}${gPart} — ${fLabel}: ${v.finding}`;
  }).join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { findingsText } = await req.json();

    const globalConfig = await getGlobalAIConfig();
    const service = createServiceClient();

    const { data: config } = await service
      .from("user_model_config")
      .select("output_language")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: recs } = await supabase
      .from("user_recommendations")
      .select("trigger_keyword, recommendation_text, guideline_name")
      .eq("user_id", user.id);

    const catalogue: CatalogueEntry[] = (recs || []).map((r: { trigger_keyword: string; recommendation_text: string; guideline_name: string }) => ({
      trigger: r.trigger_keyword,
      recommendation: r.recommendation_text,
      guideline: r.guideline_name || "",
    }));

    const outputLanguage = (config?.output_language || "es") as OutputLanguage;

    const { system, user: userPrompt } = buildRecommendationsPrompt({
      findingsText,
      recommendations: catalogue,
      outputLanguage,
    });

    // Empty catalogue → no recommendations possible
    if (!system) {
      return NextResponse.json({ text: userPrompt });
    }

    const taskModel = globalConfig.taskOverrides?.recommendations;
    const effectiveProvider = taskModel?.provider || globalConfig.provider;
    const effectiveKey = resolveApiKey(globalConfig, effectiveProvider);

    if (!effectiveKey) {
      return NextResponse.json(
        { error: `No API key configured for provider "${effectiveProvider}".` },
        { status: 500 },
      );
    }

    const raw = await generateAI({
      provider: effectiveProvider,
      modelName: taskModel?.modelName || globalConfig.modelName,
      apiKey: effectiveKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: userPrompt,
    });

    // Parse and validate LLM output against the catalogue
    let text: string;
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const llmRecs: LLMRecommendation[] = JSON.parse(jsonMatch[0]);
        const validated: { entry: CatalogueEntry; finding: string }[] = [];

        for (const rec of llmRecs) {
          const result = validateRecommendation(rec, catalogue);
          if (result.valid && result.matchedEntry) {
            // Deduplicate by catalogue entry
            const alreadyAdded = validated.some(
              (v) => normalizeForMatch(v.entry.recommendation) === normalizeForMatch(result.matchedEntry!.recommendation),
            );
            if (!alreadyAdded) {
              validated.push({
                entry: result.matchedEntry,
                finding: rec.triggering_finding || "",
              });
            }
          }
        }

        text = formatValidatedOutput(validated, outputLanguage);
      } else {
        // LLM didn't return JSON — check if it's a "no recommendations" response
        const noRecPatterns = /no (se emiten |additional |hay )?(recomendaciones|recommendations)/i;
        if (noRecPatterns.test(raw) || raw.trim() === "[]") {
          text = outputLanguage === "es"
            ? "No se emiten recomendaciones adicionales."
            : "No additional recommendations.";
        } else {
          // Fallback: return empty rather than potentially hallucinated text
          text = outputLanguage === "es"
            ? "No se emiten recomendaciones adicionales."
            : "No additional recommendations.";
        }
      }
    } catch {
      text = outputLanguage === "es"
        ? "No se emiten recomendaciones adicionales."
        : "No additional recommendations.";
    }

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
