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

    const system = `You are a medical report auditing assistant. Trace each clinical observation from the radiologist's dictation to the structured findings.

TASK:
1. Split the dictation into individual clinical observations. Each distinct finding, measurement, anatomical description, or negative finding is a separate fragment. Keep each fragment as a short phrase (the exact words from the dictation).
2. For each fragment, identify which section of the structured findings contains that information.
3. If a dictation fragment is NOT reflected in any section, mark it as unmatched — this is a critical safety issue.

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
  ]
}`;

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
    return NextResponse.json(trace);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
