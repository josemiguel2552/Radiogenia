/**
 * The fine-tuning jobs we have launched, kept server-side.
 *
 * A training run lasts hours and the page does not. The provider's list
 * endpoint is the only other record of it, and when that could not be read a
 * queued job simply vanished from the panel after a refresh — a job that
 * exists but cannot be listed is indistinguishable from no job at all.
 *
 * Holding the ids here means any device can ask after a job by id, whatever
 * the provider's list does. Every function degrades to doing nothing if the
 * table has not been created yet, so a missing migration costs the history
 * rather than the panel.
 */

import { createServiceClient } from "./supabase/service";

export interface StoredJob {
  provider: string;
  jobId: string;
  baseModel: string | null;
  status: string;
  fineTunedModel: string | null;
  createdAt: string | null;
}

const TABLE = "finetune_jobs";

function rowToJob(r: Record<string, unknown>): StoredJob {
  return {
    provider: String(r.provider || ""),
    jobId: String(r.job_id || ""),
    baseModel: (r.base_model as string) || null,
    status: String(r.status || "unknown"),
    fineTunedModel: (r.fine_tuned_model as string) || null,
    createdAt: (r.created_at as string) || null,
  };
}

/** Called the moment a job is accepted, before anything can be lost. */
export async function recordJob(job: {
  provider: string;
  jobId: string;
  baseModel?: string | null;
  status?: string;
  createdBy?: string | null;
}): Promise<void> {
  try {
    const service = createServiceClient();
    await service.from(TABLE).upsert(
      {
        provider: job.provider,
        job_id: job.jobId,
        base_model: job.baseModel || null,
        status: job.status || "queued",
        created_by: job.createdBy || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,job_id" },
    );
  } catch { /* the panel still shows it from the provider's list */ }
}

export async function listJobs(provider: string, limit = 50): Promise<StoredJob[]> {
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from(TABLE)
      .select("provider, job_id, base_model, status, fine_tuned_model, created_at")
      .eq("provider", provider)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data || []).map((r) => rowToJob(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

/**
 * Write back what the provider just said.
 *
 * The stored status is a cache: it is refreshed whenever the panel polls, so
 * a device that never opened the panel still sees the finished model name.
 */
export async function updateJob(
  provider: string,
  jobId: string,
  patch: { status?: string; fineTunedModel?: string | null; baseModel?: string | null },
): Promise<void> {
  try {
    const service = createServiceClient();
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.status) row.status = patch.status;
    if (patch.fineTunedModel !== undefined) row.fine_tuned_model = patch.fineTunedModel;
    if (patch.baseModel !== undefined && patch.baseModel !== null) row.base_model = patch.baseModel;
    await service.from(TABLE).update(row).eq("provider", provider).eq("job_id", jobId);
  } catch { /* the next poll tries again */ }
}

/**
 * Take ownership of ids that were only ever stored in one browser.
 *
 * The jobs launched before this table existed live in the localStorage of
 * whichever device started them. This lets that device hand them over once,
 * so they become visible everywhere rather than being stranded.
 */
export async function adoptJobs(provider: string, jobIds: string[], createdBy?: string | null): Promise<number> {
  const clean = [...new Set(jobIds.map((j) => String(j || "").trim()).filter(Boolean))].slice(0, 25);
  if (clean.length === 0) return 0;
  try {
    const service = createServiceClient();
    const { error } = await service.from(TABLE).upsert(
      clean.map((jobId) => ({
        provider,
        job_id: jobId,
        status: "unknown",
        created_by: createdBy || null,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "provider,job_id", ignoreDuplicates: true },
    );
    return error ? 0 : clean.length;
  } catch {
    return 0;
  }
}
