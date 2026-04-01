import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { generateAI } from "@/lib/ai-provider";
import { buildConclusionPrompt } from "@/lib/prompts";
import type { AIProvider, OutputLanguage } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { findingsText } = await req.json();

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

    const { system, user: userPrompt } = buildConclusionPrompt({
      findingsText,
      outputLanguage: (config.output_language || "es") as OutputLanguage,
    });

    const text = await generateAI({
      provider: config.provider as AIProvider,
      modelName: config.model_name,
      apiKey,
      customBaseUrl: config.custom_base_url,
      system,
      user: userPrompt,
    });

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
