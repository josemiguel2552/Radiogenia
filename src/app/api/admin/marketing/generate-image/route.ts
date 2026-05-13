export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";

const ASPECT_MAP: Record<string, string> = {
  square: "1:1",
  landscape: "16:9",
  portrait: "9:16",
};

function buildPrompt(prompt: string, style: string) {
  const styleGuide = style === "minimal"
    ? "Clean minimal design with lots of white space. Modern sans-serif typography."
    : style === "gradient"
    ? "Modern gradient background using teal (#0F766E) to navy (#1E3A5F). Sleek and futuristic feel."
    : style === "medical"
    ? "Professional medical/healthcare aesthetic. Clean, trustworthy, modern. Subtle radiology imagery."
    : "Modern tech startup aesthetic. Bold, clean, professional.";

  return `${styleGuide} Brand: Radiogen.AI (radiology AI assistant). ${prompt}. No text in the image unless specifically requested. High quality, suitable for social media marketing.`;
}

async function generateTogether(apiKey: string, fullPrompt: string, aspect: string, model: string) {
  const res = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || "black-forest-labs/FLUX.1-schnell",
      prompt: fullPrompt,
      n: 1,
      steps: 4,
      response_format: "b64_json",
      width: aspect === "landscape" ? 1024 : aspect === "portrait" ? 768 : 1024,
      height: aspect === "landscape" ? 768 : aspect === "portrait" ? 1024 : 1024,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = "Together AI image generation failed";
    try { msg = JSON.parse(text)?.error?.message || JSON.parse(text)?.error || msg; } catch { msg = text || msg; }
    throw new Error(msg);
  }

  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data returned from Together AI");

  return { image: `data:image/png;base64,${b64}` };
}

async function generateReplicate(apiKey: string, fullPrompt: string, aspect: string, model: string) {
  const aspectRatio = ASPECT_MAP[aspect] || "1:1";

  const res = await fetch(`https://api.replicate.com/v1/models/${model || "black-forest-labs/flux-1.1-pro"}/predictions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Prefer: "wait",
    },
    body: JSON.stringify({
      input: {
        prompt: fullPrompt,
        aspect_ratio: aspectRatio,
        output_format: "png",
        output_quality: 90,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = "Replicate image generation failed";
    try { const j = JSON.parse(text); msg = j.detail || j.error || msg; } catch { msg = text || msg; }
    throw new Error(msg);
  }

  const data = await res.json();

  if (data.status === "starting" || data.status === "processing") {
    const pollUrl = data.urls?.get || `https://api.replicate.com/v1/predictions/${data.id}`;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const pollData = await poll.json();
      if (pollData.status === "succeeded") {
        const imgUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
        const imgRes = await fetch(imgUrl);
        const buf = Buffer.from(await imgRes.arrayBuffer());
        return { image: `data:image/png;base64,${buf.toString("base64")}` };
      }
      if (pollData.status === "failed" || pollData.status === "canceled") {
        throw new Error(pollData.error || "Replicate generation failed");
      }
    }
    throw new Error("Replicate generation timed out");
  }

  const imgUrl = Array.isArray(data.output) ? data.output[0] : data.output;
  if (!imgUrl) throw new Error("No image URL returned from Replicate");

  const imgRes = await fetch(imgUrl);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  return { image: `data:image/png;base64,${buf.toString("base64")}` };
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { prompt, style, aspect, imageApiKey, imageProvider, imageModel } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }
    if (!imageApiKey) {
      return NextResponse.json({ error: "API key required. Configure it in the API Keys section." }, { status: 400 });
    }

    const fullPrompt = buildPrompt(prompt, style);
    const provider = imageProvider || "together";

    let result: { image: string };
    if (provider === "replicate") {
      result = await generateReplicate(imageApiKey, fullPrompt, aspect, imageModel);
    } else {
      result = await generateTogether(imageApiKey, fullPrompt, aspect, imageModel);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[marketing/generate-image]", error);
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
