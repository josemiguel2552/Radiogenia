import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const globalConfig = await getGlobalAIConfig();
    if (globalConfig.provider !== "openai") {
      return NextResponse.json({ error: "Fine-tuning requires OpenAI as the global provider." }, { status: 400 });
    }
    const apiKey = globalConfig.apiKey;

    const { fileId, baseModel, suffix } = await req.json();
    if (!fileId) return NextResponse.json({ error: "Missing fileId" }, { status: 400 });

    const body: Record<string, unknown> = {
      training_file: fileId,
      model: baseModel || "gpt-4o-mini-2024-07-18",
    };
    if (suffix) body.suffix = suffix;

    const res = await fetch("https://api.openai.com/v1/fine_tuning/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: "Failed to start fine-tuning: " + (err.error?.message || JSON.stringify(err)) }, { status: 500 });
    }

    const job = await res.json();

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      model: job.model,
      createdAt: job.created_at,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
