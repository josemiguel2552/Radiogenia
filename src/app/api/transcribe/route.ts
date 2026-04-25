import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const globalConfig = await getGlobalAIConfig();

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const language = (formData.get("language") as string) || "";
    const context = (formData.get("context") as string) || "";

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    // Use dedicated Whisper key if available, otherwise fall back to main key when provider is OpenAI
    const whisperKey = globalConfig.whisperApiKey
      || (globalConfig.provider === "openai" ? globalConfig.apiKey : "");

    if (!whisperKey) {
      return NextResponse.json({
        error: "Voice dictation requires a Whisper API key (OpenAI). Configure it in Admin > AI Config.",
      }, { status: 400 });
    }

    const baseUrl = (globalConfig.provider === "custom" && globalConfig.customBaseUrl)
      ? globalConfig.customBaseUrl.replace(/\/+$/, "")
      : "https://api.openai.com/v1";

    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, "audio.webm");
    whisperForm.append("model", "whisper-1");
    whisperForm.append("response_format", "text");
    if (language) whisperForm.append("language", language);
    if (context) whisperForm.append("prompt", context);

    const res = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${whisperKey}` },
      body: whisperForm,
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Whisper API error: ${err}` }, { status: res.status });
    }

    const text = await res.text();
    return NextResponse.json({ text: text.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
