import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { generateAI } from "@/lib/ai-provider";
import type { AIProvider } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { dictation, findings } = await req.json();
    if (!dictation || !findings) {
      return NextResponse.json({ error: "Missing dictation or findings" }, { status: 400 });
    }

    const { data: config } = await supabase
      .from("user_model_config")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!config) return NextResponse.json({ error: "No model config" }, { status: 400 });

    let apiKey = "";
    try {
      apiKey = config.api_key_encrypted ? decrypt(config.api_key_encrypted) : "";
    } catch {
      return NextResponse.json({ error: "Failed to decrypt API key" }, { status: 500 });
    }
    if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 400 });

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
      provider: config.provider as AIProvider,
      modelName: config.model_name,
      apiKey,
      customBaseUrl: config.custom_base_url,
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
