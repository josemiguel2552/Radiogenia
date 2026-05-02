export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig } from "@/lib/auth-helpers";
import { generateAI } from "@/lib/ai-provider";
import { buildPdfExtractionPrompt } from "@/lib/prompts";
import { extractPdfText } from "@/lib/pdf-extract";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfText = await extractPdfText(buffer);

    const globalConfig = await getGlobalAIConfig();
    const { system } = buildPdfExtractionPrompt();

    const text = await generateAI({
      provider: globalConfig.provider,
      modelName: globalConfig.modelName,
      apiKey: globalConfig.apiKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: `Texto de la guía clínica:\n${pdfText.substring(0, 15000)}`,
    });

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });

    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ recommendations: extracted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
