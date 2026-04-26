export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig } from "@/lib/auth-helpers";
import { generateAI } from "@/lib/ai-provider";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { dictation, findings, outputLanguage } = await req.json();
    if (!dictation || !findings) {
      return NextResponse.json({ error: "Missing dictation or findings" }, { status: 400 });
    }

    const globalConfig = await getGlobalAIConfig();
    const lang = outputLanguage || "es";

    const system = `You are a medical report auditing assistant. You perform bidirectional traceability AND automatic repair in a SINGLE pass.

STEP 1 — TRACE:
A) DICTATION → FINDINGS (omission check): Split the dictation into individual clinical observations. For each, identify which findings section contains it. Mark as unmatched if missing.
B) FINDINGS → DICTATION (hallucination check): Flag any specific clinical finding/measurement in the findings NOT backed by the dictation. Exclude normal/default phrases.

STEP 2 — REPAIR (only if unmatched or hallucinations exist):
If there are omissions: integrate each omitted fragment into the appropriate findings section naturally, matching the report style.
If there are hallucinations: remove only the hallucinated detail (not the entire section). If removing leaves a section empty, write a normal/default phrase.
Then re-map the corrected findings in the same format.

OUTPUT — respond ONLY with valid JSON:
{
  "mappings": [{"dictation_fragment": "exact phrase", "section": "Section name", "matched": true}],
  "unmatched": [{"dictation_fragment": "phrase", "reason": "brief reason"}],
  "hallucinations": [{"findings_fragment": "detail", "section": "Section name", "reason": "brief reason"}],
  "repaired": false,
  "corrected_findings": null
}

If repair was needed, set "repaired": true and "corrected_findings" to the FULL corrected findings text (in ${lang}). The mappings/unmatched/hallucinations should reflect the FINAL corrected state (mappings should be complete, unmatched should be empty, hallucinations should be empty).

If no repair was needed, set "repaired": false, "corrected_findings": null, and return the trace of the original findings.`;

    const userMsg = `DICTATION:\n${dictation}\n\nSTRUCTURED FINDINGS:\n${findings}`;

    const raw = await generateAI({
      provider: globalConfig.provider,
      modelName: globalConfig.modelName,
      apiKey: globalConfig.apiKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: userMsg,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse trace" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    if (!result.hallucinations) result.hallucinations = [];
    if (!result.mappings) result.mappings = [];
    if (!result.unmatched) result.unmatched = [];
    if (result.repaired === undefined) result.repaired = false;
    if (result.corrected_findings === undefined) result.corrected_findings = null;

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
