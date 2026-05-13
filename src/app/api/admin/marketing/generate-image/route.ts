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

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to download generated image");
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/png";
  return `data:${contentType};base64,${buf.toString("base64")}`;
}

async function generateTogether(apiKey: string, fullPrompt: string, aspect: string, model: string) {
  const body: Record<string, unknown> = {
    model: model || "black-forest-labs/FLUX.1-schnell",
    prompt: fullPrompt,
    n: 1,
    steps: 4,
    width: aspect === "landscape" ? 1024 : aspect === "portrait" ? 768 : 1024,
    height: aspect === "landscape" ? 768 : aspect === "portrait" ? 1024 : 1024,
  };

  const res = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  const responseText = await res.text();

  if (!res.ok) {
    let msg = `Together AI error (${res.status})`;
    try {
      const j = JSON.parse(responseText);
      msg = j.error?.message || j.error?.type || j.error || j.message || msg;
    } catch {
      msg = responseText.slice(0, 200) || msg;
    }
    throw new Error(msg);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error("Together AI returned invalid JSON");
  }

  const item = data.data?.[0];
  if (!item) throw new Error("No image data returned from Together AI");

  if (item.b64_json) {
    return { image: `data:image/png;base64,${item.b64_json}` };
  }
  if (item.url) {
    const b64 = await fetchImageAsBase64(item.url);
    return { image: b64 };
  }

  throw new Error("Together AI returned no image URL or base64");
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

  const responseText = await res.text();

  if (!res.ok) {
    let msg = `Replicate error (${res.status})`;
    try {
      const j = JSON.parse(responseText);
      msg = j.detail || j.error || j.title || msg;
    } catch {
      msg = responseText.slice(0, 200) || msg;
    }
    throw new Error(msg);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error("Replicate returned invalid JSON");
  }

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
        return { image: await fetchImageAsBase64(imgUrl) };
      }
      if (pollData.status === "failed" || pollData.status === "canceled") {
        throw new Error(pollData.error || "Replicate generation failed");
      }
    }
    throw new Error("Replicate generation timed out");
  }

  if (data.status === "succeeded" || data.output) {
    const imgUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    if (!imgUrl) throw new Error("No image URL returned from Replicate");
    return { image: await fetchImageAsBase64(imgUrl) };
  }

  throw new Error(`Replicate unexpected status: ${data.status}`);
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
