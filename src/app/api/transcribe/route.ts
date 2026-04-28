import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, checkDictationLimit } from "@/lib/auth-helpers";
import { getWhisperPrompt } from "@/lib/whisper-prompts";
import { postprocessWhisper } from "@/lib/whisper-postprocess";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const globalConfig = await getGlobalAIConfig();

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const language = (formData.get("language") as string) || "";
    const studyContext = (formData.get("study_context") as string) || "";
    const templateSections = (formData.get("template_sections") as string) || "";
    const context = (formData.get("context") as string) || "";
    const durationSeconds = Math.max(0, Math.min(120, Number(formData.get("duration_seconds")) || 0));

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    // Check dictation quota before calling Whisper
    const quota = await checkDictationLimit(user.id);
    if (!quota.allowed) {
      const usedMin = Math.round(quota.usedSeconds / 60);
      const limitMin = Math.round(quota.limitSeconds / 60);
      return NextResponse.json({
        error: `Dictation limit reached (${usedMin}/${limitMin} min). Upgrade your plan for more minutes.`,
        code: "DICTATION_LIMIT",
      }, { status: 429 });
    }

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

    const mimeToExt: Record<string, string> = {
      "audio/webm": "webm", "audio/webm;codecs=opus": "webm",
      "audio/ogg": "ogg", "audio/ogg;codecs=opus": "ogg",
      "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav",
      "audio/x-m4a": "m4a", "audio/flac": "flac",
    };
    const ext = mimeToExt[audioFile.type] || "webm";
    const fileName = `dictation.${ext}`;

    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, fileName);
    whisperForm.append("model", "whisper-1");
    whisperForm.append("response_format", "text");
    whisperForm.append("temperature", "0");
    if (language) whisperForm.append("language", language);

    // Construct prompt: prior transcript → study context → domain vocabulary.
    // Whisper keeps the LAST 224 tokens of the prompt, so domain vocab goes last.
    const domainPrompt = getWhisperPrompt(language || "es", templateSections || undefined);
    const priorContext = context ? context.slice(-200) : "";
    const parts: string[] = [];
    if (priorContext) parts.push(priorContext);
    if (studyContext) parts.push(studyContext);
    parts.push(domainPrompt);
    whisperForm.append("prompt", parts.join("\n"));

    const res = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${whisperKey}` },
      body: whisperForm,
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Whisper API error: ${err}` }, { status: res.status });
    }

    // Increment dictation usage after successful transcription
    if (durationSeconds > 0) {
      const roundedSeconds = Math.ceil(durationSeconds);
      await supabase.rpc("increment_dictation_seconds", {
        uid: user.id,
        seconds: roundedSeconds,
      }).then(({ error }) => {
        if (error) {
          supabase
            .from("profiles")
            .update({ dictation_seconds_used: quota.usedSeconds + roundedSeconds })
            .eq("id", user.id)
            .then(() => {});
        }
      });
    }

    const rawText = await res.text();
    const text = postprocessWhisper(rawText);
    return NextResponse.json({
      text,
      dictation: {
        usedSeconds: quota.usedSeconds + Math.ceil(durationSeconds),
        limitSeconds: quota.limitSeconds,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
