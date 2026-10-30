import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";
import { finetuneSpec, normaliseJob, type FinetuneProviderId } from "@/lib/finetune-providers";

export const dynamic = "force-dynamic";

/** One job, polled while it runs. */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { jobId, provider } = await req.json();
    const spec = finetuneSpec(String(provider || "openai"));

    const globalConfig = await getGlobalAIConfig();
    const apiKey = resolveApiKey(globalConfig, spec.keyProvider);
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

    const res = await fetch(spec.endpoints.job(jobId), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const raw = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: `${spec.label} (${res.status}): ${raw.slice(0, 400)}` }, { status: 502 });
    }

    let job: Record<string, unknown> = {};
    try { job = JSON.parse(raw); } catch { /* fields come back null */ }
    const n = normaliseJob(job, spec.id);

    return NextResponse.json({
      provider: spec.id,
      jobId: n.jobId || jobId,
      status: n.status,
      fineTunedModel: n.fineTunedModel,
      trainedTokens: (job.trained_tokens as number) ?? (job.total_tokens as number) ?? null,
      error: n.error,
      createdAt: n.createdAt,
      finishedAt: n.finishedAt,
      trainingFile: (job.training_file as string) || null,
      hyperparams: job.hyperparameters || null,
      /** Ready to paste into a task override. */
      usableAs: n.status === "succeeded" && n.fineTunedModel
        ? { provider: spec.keyProvider, model: n.fineTunedModel }
        : null,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Every job this provider has, for the history table.
 *
 * One provider per request, so a key that is missing or a provider that is
 * down cannot blank out the other one's history.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const id = (new URL(req.url).searchParams.get("provider") || "openai") as FinetuneProviderId;
    const spec = finetuneSpec(id);

    const globalConfig = await getGlobalAIConfig();
    const apiKey = resolveApiKey(globalConfig, spec.keyProvider);
    if (!apiKey) return NextResponse.json({ provider: spec.id, jobs: [], ftModels: [], fileMap: {} });

    const headers = { Authorization: `Bearer ${apiKey}` };
    const jobsRes = await fetch(spec.endpoints.jobs, { headers }).catch(() => null);

    // The raw row is kept beside the normalised one: the history table shows
    // the token count and the training file's name, which are provider
    // specifics that normalising deliberately drops.
    let jobs: { n: ReturnType<typeof normaliseJob>; raw: Record<string, unknown> }[] = [];
    if (jobsRes?.ok) {
      const data = await jobsRes.json().catch(() => null);
      // OpenAI wraps the list in `data`; Together returns it bare.
      const list: unknown = Array.isArray(data) ? data : data?.data;
      if (Array.isArray(list)) {
        jobs = list
          .filter((j): j is Record<string, unknown> => !!j && typeof j === "object")
          .map((raw) => ({ n: normaliseJob(raw, spec.id), raw }));
      }
    }

    // The models this provider can already serve, to offer as task overrides.
    const ftModels = [...new Set(jobs.filter((j) => j.n.status === "succeeded" && j.n.fineTunedModel).map((j) => j.n.fineTunedModel!))];

    const fileMap: Record<string, { filename: string; bytes: number; createdAt: number }> = {};
    if (spec.id === "openai") {
      const fileIds = [...new Set(jobs.map((j) => j.raw.training_file as string | undefined).filter(Boolean))] as string[];
      await Promise.all(fileIds.map(async (fid) => {
        try {
          const r = await fetch(`https://api.openai.com/v1/files/${fid}`, { headers });
          if (r.ok) {
            const f = await r.json();
            fileMap[fid] = { filename: f.filename, bytes: f.bytes, createdAt: f.created_at };
          }
        } catch { /* a name is a nicety */ }
      }));
    }

    return NextResponse.json({
      provider: spec.id,
      jobs: jobs.map(({ n, raw }) => ({
        jobId: n.jobId,
        status: n.status,
        fineTunedModel: n.fineTunedModel,
        model: n.baseModel,
        createdAt: n.createdAt,
        finishedAt: n.finishedAt,
        trainedTokens: (raw.trained_tokens as number) ?? (raw.total_tokens as number) ?? null,
        trainingFile: (raw.training_file as string) || null,
        nEpochs: (raw.hyperparameters as Record<string, unknown> | undefined)?.n_epochs ?? (raw.n_epochs as number) ?? null,
      })),
      ftModels,
      fileMap,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
