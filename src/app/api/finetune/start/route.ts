import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";
import { finetuneSpec, normaliseJob } from "@/lib/finetune-providers";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const { fileId, baseModel, suffix, nEpochs, learningRateMultiplier, batchSize, provider } = await req.json();
    const spec = finetuneSpec(String(provider || "openai"));

    const globalConfig = await getGlobalAIConfig();
    const apiKey = resolveApiKey(globalConfig, spec.keyProvider);
    if (!apiKey) {
      return NextResponse.json(
        { error: `No ${spec.label} API key configured. Add one in Plataforma → Modelos → Provider API Keys.` },
        { status: 400 },
      );
    }
    if (!fileId) return NextResponse.json({ error: "Missing fileId" }, { status: 400 });

    const model = baseModel || spec.baseModels[0]?.id;
    let body: Record<string, unknown>;

    if (spec.id === "together") {
      // LoRA by default: it is the cheap option, and the adapter is a thing we
      // own rather than a model held on someone's roadmap.
      //
      // Every hyperparameter is sent as a number. Together fills nothing in —
      // omitting batch_size answers "batch size is zero" — and its
      // learning_rate is absolute, so OpenAI's multiplier scale must not be
      // passed through here: 1.8 would be a learning rate of 1.8.
      const hp = spec.hyperparams;
      const num = (given: unknown, fallback: string) => {
        const n = Number(given);
        return Number.isFinite(n) && n > 0 ? n : Number(fallback);
      };
      body = {
        training_file: fileId,
        model,
        lora: true,
        n_epochs: num(nEpochs, hp.defaults.epochs),
        batch_size: num(batchSize, hp.defaults.batchSize),
        learning_rate: num(learningRateMultiplier, hp.defaults.learningRate),
      };
      if (suffix) body.suffix = suffix;
    } else {
      const hyperparameters: Record<string, unknown> = {};
      if (nEpochs && nEpochs !== "auto") hyperparameters.n_epochs = Number(nEpochs);
      if (learningRateMultiplier && learningRateMultiplier !== "auto") hyperparameters.learning_rate_multiplier = Number(learningRateMultiplier);
      if (batchSize && batchSize !== "auto") hyperparameters.batch_size = Number(batchSize);
      body = { training_file: fileId, model };
      if (suffix) body.suffix = suffix;
      if (Object.keys(hyperparameters).length > 0) body.hyperparameters = hyperparameters;
    }

    const res = await fetch(spec.endpoints.create, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `${spec.label} refused the job (${res.status}): ${raw.slice(0, 600)}` },
        { status: 502 },
      );
    }

    let job: Record<string, unknown> = {};
    try { job = JSON.parse(raw); } catch { /* reported below */ }
    const normalised = normaliseJob(job, spec.id);
    if (!normalised.jobId) {
      return NextResponse.json(
        { error: `${spec.label} started the job but returned no id: ${raw.slice(0, 400)}` },
        { status: 502 },
      );
    }

    return NextResponse.json({
      provider: spec.id,
      jobId: normalised.jobId,
      status: normalised.status,
      model: normalised.baseModel,
      createdAt: normalised.createdAt,
      hyperparameters: job.hyperparameters || null,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
