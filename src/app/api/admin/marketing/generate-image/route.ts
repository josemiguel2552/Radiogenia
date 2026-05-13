import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig } from "@/lib/auth-helpers";

const SIZE_MAP: Record<string, string> = {
  square: "1024x1024",
  landscape: "1792x1024",
  portrait: "1024x1792",
};

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { prompt, style, aspect } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const config = await getGlobalAIConfig();
    const apiKey = config.apiKey;
    const size = SIZE_MAP[aspect] || "1024x1024";

    const styleGuide = style === "minimal"
      ? "Clean minimal design with lots of white space. Modern sans-serif typography."
      : style === "gradient"
      ? "Modern gradient background using teal (#0F766E) to navy (#1E3A5F). Sleek and futuristic feel."
      : style === "medical"
      ? "Professional medical/healthcare aesthetic. Clean, trustworthy, modern. Subtle radiology imagery."
      : "Modern tech startup aesthetic. Bold, clean, professional.";

    const fullPrompt = `${styleGuide} Brand: Radiogen.AI (radiology AI assistant). ${prompt}. No text in the image unless specifically requested. High quality, suitable for social media marketing.`;

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: fullPrompt,
        n: 1,
        size,
        quality: "standard",
        response_format: "b64_json",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error?.message || "Image generation failed" }, { status: 500 });
    }

    const data = await res.json();
    const b64 = data.data?.[0]?.b64_json;
    const revisedPrompt = data.data?.[0]?.revised_prompt;

    if (!b64) {
      return NextResponse.json({ error: "No image data returned" }, { status: 500 });
    }

    return NextResponse.json({
      image: `data:image/png;base64,${b64}`,
      revisedPrompt,
      size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
