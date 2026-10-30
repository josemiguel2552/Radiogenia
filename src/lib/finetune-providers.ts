/**
 * Who can train a model for us, and what their training file has to look like.
 *
 * OpenAI's self-serve fine-tuning is being wound down — its fine-tunable base
 * models leave the API in January 2027, fine-tuned ones included — so a
 * fine-tune trained there today is a model with an expiry date. The second
 * provider exists for that reason, and the choice of an open-weight host is
 * deliberate: the adapter it produces is a thing we own, which no vendor
 * roadmap can retire out from under us.
 *
 * The file format is the same either way. Both take one JSON object per line
 * with a `messages` array, which is what the training export already emits, so
 * "adapting" a file is validating it and enforcing each provider's limits
 * rather than converting anything. This module says that plainly instead of
 * inventing a conversion step that does nothing.
 */

import type { AIProvider } from "./types";

export type FinetuneProviderId = "openai" | "together";

export interface FinetuneBaseModel {
  id: string;
  label: string;
  /** Shown next to the name: why you would pick this one. */
  note?: string;
}

export interface FinetuneProviderSpec {
  id: FinetuneProviderId;
  label: string;
  /** The provider whose stored API key and inference endpoint this uses. */
  keyProvider: AIProvider;
  endpoints: {
    upload: string;
    create: string;
    /** One job by id. */
    job: (jobId: string) => string;
    /** The job list, for the history table. */
    jobs: string;
  };
  baseModels: FinetuneBaseModel[];
  /** Fewest examples the provider will accept in a file. */
  minExamples: number;
  /**
   * Whether a finished job yields an adapter we own and can serve elsewhere,
   * as opposed to a hosted model that only answers from the vendor's API.
   */
  ownsWeights: boolean;
  /** What to tell the admin before they spend money on a run. */
  caveat?: string;
}

export const FINETUNE_PROVIDERS: Record<FinetuneProviderId, FinetuneProviderSpec> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    keyProvider: "openai",
    endpoints: {
      upload: "https://api.openai.com/v1/files",
      create: "https://api.openai.com/v1/fine_tuning/jobs",
      job: (id) => `https://api.openai.com/v1/fine_tuning/jobs/${id}`,
      jobs: "https://api.openai.com/v1/fine_tuning/jobs?limit=100",
    },
    baseModels: [
      { id: "gpt-4o-mini-2024-07-18", label: "gpt-4o-mini", note: "retires 2027-01-14" },
      { id: "gpt-4.1-mini-2025-04-14", label: "gpt-4.1-mini", note: "retires 2027-01-14" },
    ],
    minExamples: 10,
    ownsWeights: false,
    caveat: "openai_sunset",
  },
  together: {
    id: "together",
    label: "Together AI",
    keyProvider: "together",
    // ⚠️ The upload path is the one Together's own curl example uses. The
    // job-creation and retrieval paths could NOT be verified: this container's
    // network policy refuses docs.together.ai, so they come from the shape
    // their CLI and Python client describe rather than from the REST
    // reference. If a call 404s, the fix is here and nowhere else — every
    // route reads these two lines.
    endpoints: {
      upload: "https://api.together.xyz/v1/files/upload",
      create: "https://api.together.xyz/v1/fine-tunes",
      job: (id) => `https://api.together.xyz/v1/fine-tunes/${id}`,
      jobs: "https://api.together.xyz/v1/fine-tunes",
    },
    baseModels: [
      { id: "Qwen/Qwen3-8B", label: "Qwen3 8B", note: "cheapest, good for format and tone" },
      { id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Reference", label: "Llama 3.1 8B" },
      { id: "meta-llama/Meta-Llama-3.3-70B-Instruct-Reference", label: "Llama 3.3 70B", note: "strongest, costs more" },
    ],
    minExamples: 10,
    ownsWeights: true,
    caveat: "together_unverified",
  },
};

export function finetuneSpec(id: string): FinetuneProviderSpec {
  return FINETUNE_PROVIDERS[(id as FinetuneProviderId)] ?? FINETUNE_PROVIDERS.openai;
}

/* ── The training file ─────────────────────────────────────── */

export interface AdaptedLine {
  line: number;
  reason: string;
}

export interface AdaptedJsonl {
  /** The file to upload: one compact JSON object per line. */
  jsonl: string;
  kept: number;
  dropped: AdaptedLine[];
  /** What was changed, in words, for the admin to read before uploading. */
  notes: string[];
  /** False when the provider would refuse the file outright. */
  acceptable: boolean;
}

interface RawMessage {
  role?: unknown;
  content?: unknown;
}

const ROLES = new Set(["system", "user", "assistant"]);

/**
 * Validate and normalise a training file for one provider.
 *
 * Deliberately strict about what it keeps and loud about what it drops: a
 * training run costs money and takes hours, and a file that is half malformed
 * trains a model on whatever survived without ever saying so.
 */
export function adaptJsonl(text: string, spec: FinetuneProviderSpec): AdaptedJsonl {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const kept: string[] = [];
  const dropped: AdaptedLine[] = [];
  const notes: string[] = [];
  let strippedExtras = 0;
  let strippedRoles = 0;

  for (let i = 0; i < lines.length; i++) {
    const at = i + 1;
    let parsed: unknown;
    try {
      parsed = JSON.parse(lines[i]);
    } catch {
      dropped.push({ line: at, reason: "invalid JSON" });
      continue;
    }
    if (!parsed || typeof parsed !== "object") {
      dropped.push({ line: at, reason: "not a JSON object" });
      continue;
    }

    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.messages)) {
      dropped.push({ line: at, reason: 'missing "messages" array' });
      continue;
    }

    const messages = (obj.messages as RawMessage[])
      .filter((m) => {
        const ok = !!m && typeof m.role === "string" && ROLES.has(m.role) && typeof m.content === "string";
        if (!ok) strippedRoles++;
        return ok;
      })
      .map((m) => ({ role: m.role as string, content: m.content as string }));

    if (!messages.some((m) => m.role === "assistant" && m.content.trim())) {
      // Nothing to learn from: the assistant turn IS the label.
      dropped.push({ line: at, reason: "no assistant message to train on" });
      continue;
    }
    if (!messages.some((m) => m.role === "user" && m.content.trim())) {
      dropped.push({ line: at, reason: "no user message" });
      continue;
    }

    // Anything beyond `messages` is ours, not the trainer's, and a strict
    // validator rejects the whole file over it.
    if (Object.keys(obj).some((k) => k !== "messages")) strippedExtras++;

    kept.push(JSON.stringify({ messages }));
  }

  if (strippedExtras > 0) {
    notes.push(`${strippedExtras} line(s) carried fields besides "messages"; only the conversation was kept.`);
  }
  if (strippedRoles > 0) {
    notes.push(`${strippedRoles} message(s) had an unusable role or non-text content and were removed.`);
  }
  if (dropped.length > 0) {
    notes.push(`${dropped.length} line(s) could not be used.`);
  }
  notes.push(
    spec.id === "openai"
      ? "Format unchanged: this is the conversational JSONL OpenAI expects."
      : "Format unchanged: Together takes the same one-object-per-line conversational JSONL.",
  );

  return {
    jsonl: kept.length > 0 ? kept.join("\n") + "\n" : "",
    kept: kept.length,
    dropped,
    notes,
    acceptable: kept.length >= spec.minExamples,
  };
}

/* ── Job status, normalised ────────────────────────────────── */

export interface NormalisedJob {
  jobId: string;
  /** queued | running | succeeded | failed | cancelled | unknown */
  status: string;
  /** The model name to put in a task override once it is ready. */
  fineTunedModel: string | null;
  baseModel: string | null;
  createdAt: number | null;
  finishedAt: number | null;
  error: string | null;
}

const OPENAI_STATUS: Record<string, string> = {
  validating_files: "queued",
  queued: "queued",
  running: "running",
  succeeded: "succeeded",
  failed: "failed",
  cancelled: "cancelled",
};

const TOGETHER_STATUS: Record<string, string> = {
  pending: "queued",
  queued: "queued",
  running: "running",
  uploading: "running",
  compressing: "running",
  completed: "succeeded",
  error: "failed",
  failed: "failed",
  cancelled: "cancelled",
  user_error: "failed",
};

const num = (v: unknown): number | null => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : Math.floor(t / 1000);
  }
  return null;
};

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/**
 * One job, in our own words.
 *
 * Together's field names could not be read from their reference (see the note
 * on its endpoints), so the fields are looked for under each name their CLI
 * and client libraries use. It is defensive on purpose: a wrong guess here
 * shows up as a job whose model name is blank, not as a broken page.
 */
export function normaliseJob(raw: Record<string, unknown>, provider: FinetuneProviderId): NormalisedJob {
  const rawStatus = String(raw.status ?? "").toLowerCase();

  if (provider === "together") {
    return {
      jobId: str(raw.id) || "",
      status: TOGETHER_STATUS[rawStatus] ?? "unknown",
      fineTunedModel:
        str(raw.output_name) || str(raw.model_output_name) || str(raw.model_output_path) || str(raw.fine_tuned_model),
      baseModel: str(raw.model) || str(raw.base_model),
      createdAt: num(raw.created_at),
      finishedAt: num(raw.updated_at) ?? num(raw.finished_at),
      error: str(raw.error) || str((raw.error as Record<string, unknown> | null)?.message),
    };
  }

  return {
    jobId: str(raw.id) || "",
    status: OPENAI_STATUS[rawStatus] ?? "unknown",
    fineTunedModel: str(raw.fine_tuned_model),
    baseModel: str(raw.model),
    createdAt: num(raw.created_at),
    finishedAt: num(raw.finished_at),
    error: str((raw.error as Record<string, unknown> | null)?.message),
  };
}
