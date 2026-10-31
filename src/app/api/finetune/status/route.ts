import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";
import { finetuneSpec, normaliseJob, FINETUNE_PROVIDERS, type FinetuneProviderId } from "@/lib/finetune-providers";

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
      model: n.baseModel,
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
 * The fine-tuned models a provider can serve, whoever is selected in the
 * training panel.
 *
 * This is deliberately NOT scoped to the requested provider: the model
 * dropdowns in Modelos offer the fine-tunes of whichever provider that
 * dropdown is set to, and tying the list to an unrelated selection made in
 * the training panel is how a model you trained stops appearing.
 *
 * OpenAI is asked for its model list rather than read off its jobs: the jobs
 * endpoint is paginated, so a fine-tune older than the first page would
 * otherwise vanish from the dropdowns while still existing.
 */
async function modelsFor(spec: ReturnType<typeof finetuneSpec>, apiKey: string): Promise<string[]> {
  if (!apiKey) return [];
  const headers = { Authorization: `Bearer ${apiKey}` };

  if (spec.id === "openai") {
    try {
      const r = await fetch("https://api.openai.com/v1/models", { headers });
      if (!r.ok) return [];
      const d = await r.json();
      return (d.data || [])
        .filter((m: Record<string, unknown>) =>
          (m.owned_by as string)?.startsWith("user-") ||
          (m.owned_by as string)?.startsWith("organization-") ||
          (m.id as string)?.startsWith("ft:"))
        .map((m: Record<string, unknown>) => m.id as string);
    } catch {
      return [];
    }
  }

  // Together names the model when the job finishes, so its finished jobs are
  // the list.
  try {
    const r = await fetch(spec.endpoints.jobs, { headers });
    if (!r.ok) return [];
    const d = await r.json();
    const list: unknown = Array.isArray(d) ? d : d?.data;
    if (!Array.isArray(list)) return [];
    return [...new Set(
      list
        .filter((j): j is Record<string, unknown> => !!j && typeof j === "object")
        .map((j) => normaliseJob(j, spec.id))
        .filter((j) => j.status === "succeeded" && j.fineTunedModel)
        .map((j) => j.fineTunedModel!),
    )];
  } catch {
    return [];
  }
}

/**
 * Every job this provider has, for the history table, plus the usable models
 * of every provider for the dropdowns.
 *
 * One provider's jobs per request, so a key that is missing or a provider
 * that is down cannot blank out the other one's history.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const id = (new URL(req.url).searchParams.get("provider") || "openai") as FinetuneProviderId;
    const spec = finetuneSpec(id);

    const globalConfig = await getGlobalAIConfig();
    const apiKey = resolveApiKey(globalConfig, spec.keyProvider);

    // No key for this provider: no jobs to list, and no point asking.
    const headers = { Authorization: `Bearer ${apiKey}` };
    const jobsRes = apiKey ? await fetch(spec.endpoints.jobs, { headers }).catch(() => null) : null;

    // The raw row is kept beside the normalised one: the history table shows
    // the token count and the training file's name, which are provider
    // specifics that normalising deliberately drops.
    let jobs: { n: ReturnType<typeof normaliseJob>; raw: Record<string, unknown> }[] = [];
    // What came back when no list could be found in it. A job that exists but
    // does not appear is otherwise indistinguishable from no job at all —
    // which is exactly how a running fine-tune vanished from the panel.
    let listDiagnostic: string | null = null;

    if (!jobsRes) {
      listDiagnostic = apiKey ? "list request failed" : "no API key";
    } else if (!jobsRes.ok) {
      listDiagnostic = `list returned HTTP ${jobsRes.status}: ${(await jobsRes.text().catch(() => "")).slice(0, 200)}`;
    } else {
      const data = await jobsRes.json().catch(() => null);
      // OpenAI wraps it in `data`. Together's shape is not documented to us,
      // so every plausible wrapper is tried before giving up.
      const candidates: unknown[] = [
        data,
        (data as { data?: unknown })?.data,
        (data as { jobs?: unknown })?.jobs,
        (data as { results?: unknown })?.results,
        (data as { items?: unknown })?.items,
      ];
      const list = candidates.find((c) => Array.isArray(c)) as unknown[] | undefined;

      if (Array.isArray(list)) {
        jobs = list
          .filter((j): j is Record<string, unknown> => !!j && typeof j === "object")
          .map((raw) => ({ n: normaliseJob(raw, spec.id), raw }));
      } else {
        const keys = data && typeof data === "object" ? Object.keys(data as object).join(", ") : typeof data;
        listDiagnostic = `no array in the response; top-level keys: ${keys}`;
      }
    }

    // Every provider's usable models, keyed by the provider a task override
    // would name — which is what the dropdowns index by.
    const entries = await Promise.all(
      Object.values(FINETUNE_PROVIDERS).map(async (sp) => {
        const key = resolveApiKey(globalConfig, sp.keyProvider);
        return [sp.keyProvider, await modelsFor(sp, key)] as const;
      }),
    );
    const modelsByProvider: Record<string, string[]> = {};
    for (const [prov, models] of entries) if (models.length > 0) modelsByProvider[prov] = models;
    const ftModels = modelsByProvider[spec.keyProvider] || [];

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
      modelsByProvider,
      fileMap,
      listDiagnostic,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
