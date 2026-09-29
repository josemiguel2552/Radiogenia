export const maxDuration = 90;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateWithImages, providerSupportsVision, isAcceptedImageType, type VisionImage } from "@/lib/vision-ai";
import { buildDifferentialPrompt, parseDifferentialResponse, isBodyRegion, type DifferentialLang } from "@/lib/differential";
import { stripPii } from "@/lib/pii-detect";
import { logAICost } from "@/lib/log-ai-cost";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";

/** Three images at ~6 MB each is already generous for a few screenshots. */
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/** base64 inflates by 4/3; this is the decoded size. */
function decodedSize(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function POST(req: NextRequest) {
  try {
    // Admin only, deliberately. This sits outside the reporting product and
    // outside what the platform offers its users.
    const { userId } = await requireAdmin();

    const rl = rateLimit(`differential:${userId}`, RATE_LIMITS.generate);
    if (!rl.allowed) return rl.errorResponse!;

    const body = await req.json();
    const {
      images: rawImages,
      region,
      modality: rawModality,
      hounsfield: rawHu,
      clinicalNote: rawNote,
      hasRoi,
      language: rawLang,
      anonymisationConfirmed,
    } = body;

    // The radiologist has to have said the images carry no patient data.
    // Screenshots out of a PACS routinely have the name burned into a corner,
    // and this endpoint sends them to a third party.
    if (anonymisationConfirmed !== true) {
      return NextResponse.json({ error: "anonymisation_not_confirmed" }, { status: 400 });
    }

    if (!Array.isArray(rawImages) || rawImages.length === 0) {
      return NextResponse.json({ error: "no_images" }, { status: 400 });
    }
    if (rawImages.length > MAX_IMAGES) {
      return NextResponse.json({ error: "too_many_images" }, { status: 400 });
    }
    if (!isBodyRegion(region)) {
      return NextResponse.json({ error: "invalid_region" }, { status: 400 });
    }

    const images: VisionImage[] = [];
    for (const img of rawImages) {
      const mediaType = typeof img?.mediaType === "string" ? img.mediaType : "";
      const base64 = typeof img?.base64 === "string" ? img.base64 : "";
      if (!isAcceptedImageType(mediaType) || !base64) {
        return NextResponse.json({ error: "invalid_image" }, { status: 400 });
      }
      if (decodedSize(base64) > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "image_too_large" }, { status: 413 });
      }
      images.push({ base64, mediaType });
    }

    const lang: DifferentialLang = rawLang === "en" ? "en" : rawLang === "pt" ? "pt" : "es";

    // Free text gets the same scrub as everywhere else before leaving us.
    const hounsfield = stripPii(String(rawHu ?? "").slice(0, 120)).cleaned.trim();
    const clinicalNote = stripPii(String(rawNote ?? "").slice(0, 600)).cleaned.trim();
    const modality = String(rawModality ?? "").slice(0, 40).trim();
    const regionLabel = typeof body.regionLabel === "string" ? body.regionLabel.slice(0, 60) : region;

    const globalConfig = await getGlobalAIConfig();
    const override = globalConfig.taskOverrides?.differential;

    // Only a provider that can actually look at the image. Falling back to a
    // text-only model would answer about an image it never saw.
    const provider = override?.provider
      || (providerSupportsVision(globalConfig.provider) ? globalConfig.provider : "claude");
    if (!providerSupportsVision(provider)) {
      return NextResponse.json({ error: "provider_has_no_vision", provider }, { status: 503 });
    }

    const apiKey = resolveApiKey(globalConfig, provider);
    if (!apiKey) {
      return NextResponse.json({ error: "no_api_key", provider }, { status: 503 });
    }

    const modelName = override?.modelName
      || (provider === "claude" ? "claude-sonnet-5" : "gpt-4o");

    const { system, user } = buildDifferentialPrompt({
      lang,
      region,
      regionLabel,
      modality: modality || undefined,
      hounsfield: hounsfield || undefined,
      clinicalNote: clinicalNote || undefined,
      imageCount: images.length,
      hasRoi: hasRoi === true,
    });

    const result = await generateWithImages({
      provider, modelName, apiKey, system, user, images, maxTokens: 2500,
    });

    logAICost({
      userId,
      action: "differential",
      provider,
      model: modelName,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });

    const parsed = parseDifferentialResponse(result.text);
    if (!parsed) {
      return NextResponse.json({ error: "unparseable_response" }, { status: 502 });
    }

    return NextResponse.json({ ...parsed, model: modelName, provider });
  } catch (error) {
    return toErrorResponse(error);
  }
}
