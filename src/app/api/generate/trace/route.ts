import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig } from "@/lib/auth-helpers";
import { generateAI } from "@/lib/ai-provider";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { dictation, findings } = await req.json();
    if (!dictation || !findings) {
      return NextResponse.json({ error: "Missing dictation or findings" }, { status: 400 });
    }

    const globalConfig = await getGlobalAIConfig();

    const system = `You are a medical report auditing assistant performing bidirectional traceability between a radiologist's dictation and the structured findings report.

TASK — TWO DIRECTIONS:

A) DICTATION → FINDINGS (omission check):
1. Split the dictation into individual clinical observations. Each distinct finding, measurement, anatomical description, or negative finding is a separate fragment. Keep each fragment as a short phrase (the exact words from the dictation).
2. For each fragment, identify which section of the structured findings contains that information.
3. If a dictation fragment is NOT reflected in any section, mark it as unmatched — this is a critical safety issue (omission).

B) FINDINGS → DICTATION (hallucination check):
1. Identify any specific clinical finding, measurement, or pathological description in the findings that does NOT have a corresponding observation in the dictation.
2. Exclude normal/default phrases ("within normal limits", "unremarkable", etc.) — those are expected for unmentioned sections.
3. Only flag genuinely invented clinical details that appear in the findings but the radiologist never dictated.

RESPOND ONLY with valid JSON:
{
  "mappings": [
    {
      "dictation_fragment": "exact short phrase from dictation",
      "section": "Section name from findings",
      "matched": true
    }
  ],
  "unmatched": [
    {
      "dictation_fragment": "phrase from dictation not found in findings",
      "reason": "brief reason"
    }
  ],
  "hallucinations": [
    {
      "findings_fragment": "clinical detail in findings not backed by dictation",
      "section": "Section name",
      "reason": "brief reason"
    }
  ]
}

If there are no unmatched items, return "unmatched": [].
If there are no hallucinations, return "hallucinations": [].`;

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

    const trace = JSON.parse(jsonMatch[0]);
    if (!trace.hallucinations) trace.hallucinations = [];
    return NextResponse.json(trace);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
