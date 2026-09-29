/**
 * Image-capable model calls.
 *
 * Kept apart from ai-provider.ts on purpose: every other route in the codebase
 * sends text, and its buildBody(model, system, user, maxTokens) signature is
 * shared by all of them. Threading images through that would touch every
 * caller to serve one feature.
 *
 * Only the two providers with a vision API we can rely on are supported. A
 * provider without one fails loudly rather than silently dropping the images
 * and answering from the text alone — an answer about an image nobody looked
 * at is worse than no answer.
 */

export interface VisionImage {
  /** Raw base64, no data: prefix. */
  base64: string;
  /** image/png, image/jpeg or image/webp. */
  mediaType: string;
}

export interface VisionParams {
  provider: string;
  modelName: string;
  apiKey: string;
  system: string;
  user: string;
  images: VisionImage[];
  maxTokens?: number;
}

export interface VisionResult {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
}

export const VISION_PROVIDERS = ["claude", "openai"] as const;

export function providerSupportsVision(provider: string): boolean {
  return (VISION_PROVIDERS as readonly string[]).includes(provider);
}

/** Media types the two providers both accept. */
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export function isAcceptedImageType(mediaType: string): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mediaType);
}

export function buildVisionBody(params: VisionParams): Record<string, unknown> {
  const { provider, modelName, system, user, images, maxTokens = 2048 } = params;

  if (provider === "claude") {
    return {
      model: modelName,
      max_tokens: maxTokens,
      temperature: 0,
      system,
      messages: [
        {
          role: "user",
          content: [
            ...images.map((img) => ({
              type: "image",
              source: { type: "base64", media_type: img.mediaType, data: img.base64 },
            })),
            { type: "text", text: user },
          ],
        },
      ],
    };
  }

  // openai
  const isGpt5 = /^gpt-5/.test(modelName);
  return {
    model: modelName,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          ...images.map((img) => ({
            type: "image_url",
            image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
          })),
          { type: "text", text: user },
        ],
      },
    ],
    // GPT-5.x rejects max_tokens and only takes the default temperature.
    ...(isGpt5 ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens, temperature: 0 }),
  };
}

export async function generateWithImages(params: VisionParams): Promise<VisionResult> {
  const { provider, apiKey } = params;

  if (!providerSupportsVision(provider)) {
    throw new Error(`Provider "${provider}" has no image support configured`);
  }
  if (params.images.length === 0) {
    throw new Error("No images supplied");
  }

  const url = provider === "claude"
    ? "https://api.anthropic.com/v1/messages"
    : "https://api.openai.com/v1/chat/completions";

  const headers: Record<string, string> = provider === "claude"
    ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" }
    : { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(buildVisionBody(params)),
  });

  if (!res.ok) {
    throw new Error(`Vision provider error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();

  if (provider === "claude") {
    const d = data as { content?: { type: string; text: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
    return {
      text: d.content?.find((c) => c.type === "text")?.text || "",
      usage: { inputTokens: d.usage?.input_tokens || 0, outputTokens: d.usage?.output_tokens || 0 },
    };
  }

  const d = data as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    text: d.choices?.[0]?.message?.content || "",
    usage: { inputTokens: d.usage?.prompt_tokens || 0, outputTokens: d.usage?.completion_tokens || 0 },
  };
}
