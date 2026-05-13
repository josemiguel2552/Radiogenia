import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";

const SIZE_MAP_V3: Record<string, string> = {
  square: "1024x1024",
  landscape: "1792x1024",
  portrait: "1024x1792",
};

const SIZE_MAP_V2: Record<string, string> = {
  square: "1024x1024",
  landscape: "1024x1024",
  portrait: "1024x1024",
};

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { prompt, style, aspect, openaiKey, imageModel } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    if (!openaiKey) {
      return NextResponse.json({ error: "OpenAI API key required. Configure it in the API Keys section." }, { status: 400 });
    }

    const apiKey = openaiKey;
    const model = imageModel || "dall-e-3";
    const isV3 = model === "dall-e-3";
    const sizeMap = isV3 ? SIZE_MAP_V3 : SIZE_MAP_V2;
    const size = sizeMap[aspect] || "1024x1024";

    const styleGuide = style === "minimal"
      ? "Clean minimal design with lots of white space. Modern sans-serif typography."
      : style === "gradient"
      ? "Modern gradient background using teal (#0F766E) to navy (#1E3A5F). Sleek and futuristic feel."
      : style === "medical"
      ? "Professional medical/healthcare aesthetic. Clean, trustworthy, modern. Subtle radiology imagery."
      : "Modern tech startup aesthetic. Bold, clean, professional.";

    const fullPrompt = `${styleGuide} Brand: Radiogen.AI (radiology AI assistant). ${prompt}. No text in the image unless specifically requested. High quality, suitable for social media marketing.`;

    const body: Record<string, unknown> = {
      model,
      prompt: fullPrompt,
      n: 1,
      size,
      response_format: "b64_json",
    };
    if (isV3) body.quality = "standard";

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
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
