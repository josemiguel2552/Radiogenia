import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const globalConfig = await getGlobalAIConfig();
    const apiKey = resolveApiKey(globalConfig, "openai");
    if (!apiKey) {
      return NextResponse.json({ error: "No OpenAI API key configured. Add one in AI Config → Provider API Keys." }, { status: 400 });
    }

    const { fileId, baseModel, suffix, nEpochs, learningRateMultiplier, batchSize } = await req.json();
    if (!fileId) return NextResponse.json({ error: "Missing fileId" }, { status: 400 });

    const hyperparameters: Record<string, unknown> = {};
    if (nEpochs && nEpochs !== "auto") hyperparameters.n_epochs = Number(nEpochs);
    if (learningRateMultiplier && learningRateMultiplier !== "auto") hyperparameters.learning_rate_multiplier = Number(learningRateMultiplier);
    if (batchSize && batchSize !== "auto") hyperparameters.batch_size = Number(batchSize);

    const body: Record<string, unknown> = {
      training_file: fileId,
      model: baseModel || "gpt-4o-mini-2024-07-18",
    };
    if (suffix) body.suffix = suffix;
    if (Object.keys(hyperparameters).length > 0) body.hyperparameters = hyperparameters;

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
      hyperparameters: job.hyperparameters || null,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
