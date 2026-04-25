import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: config } = await supabase
      .from("user_model_config")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!config) return NextResponse.json({ error: "No model config" }, { status: 400 });

    // Whisper requires an OpenAI API key — use the user's key if provider is OpenAI,
    // otherwise check for a dedicated whisper key or fall back to the configured key
    let apiKey = "";
    try {
      apiKey = config.api_key_encrypted ? decrypt(config.api_key_encrypted) : "";
    } catch {
      return NextResponse.json({ error: "Failed to decrypt API key" }, { status: 500 });
    }
    if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 400 });

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const language = (formData.get("language") as string) || "";
    const context = (formData.get("context") as string) || "";

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    // Determine which API to use based on the user's provider
    const provider = config.provider as string;

    if (provider === "openai" || provider === "custom") {
      // OpenAI Whisper API
      const baseUrl = (provider === "custom" && config.custom_base_url)
        ? config.custom_base_url.replace(/\/+$/, "")
        : "https://api.openai.com/v1";

      const whisperForm = new FormData();
      whisperForm.append("file", audioFile, "audio.webm");
      whisperForm.append("model", "whisper-1");
      whisperForm.append("response_format", "text");
      if (language) whisperForm.append("language", language);
      if (context) whisperForm.append("prompt", context);

      const res = await fetch(`${baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: whisperForm,
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Whisper API error: ${err}` }, { status: res.status });
      }

      const text = await res.text();
      return NextResponse.json({ text: text.trim() });
    }

    if (provider === "gemini") {
      // Google Gemini — use their speech-to-text or fall back
      return NextResponse.json({
        error: "Voice dictation requires an OpenAI API key for Whisper. Configure OpenAI as your provider or add a secondary OpenAI key.",
      }, { status: 400 });
    }

    // For other providers (Claude, DeepSeek), Whisper still needs OpenAI
    return NextResponse.json({
      error: "Voice dictation uses OpenAI Whisper. Please configure an OpenAI API key in Connection settings.",
    }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
