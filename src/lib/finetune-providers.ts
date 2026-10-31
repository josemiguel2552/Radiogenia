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
  /**
   * Packed-batch limits, which are per model and usually a SINGLE allowed
   * value — min and max are equal for most of them. A global default cannot
   * work: 8 is the only value Qwen3.5 9B takes and the only one gpt-oss-20b
   * refuses (it takes 1), and Qwen3.5 397B will not go below 16.
   */
  minBatch: number;
  maxBatch: number;
  /** Maximum context in SFT mode. Our examples run ~3k tokens. */
  context: number;
  /** Whether full fine-tuning is offered as well as LoRA. */
  fullFt?: boolean;
  /**
   * The adapter's rank, as the provider's table gives it. Recorded but not
   * sent: the table calls it a DEFAULT, so the provider applies it. If a job
   * is ever refused over the rank, the right number is already here.
   */
  loraRank?: number;
  loraRankMax?: number;
  note?: string;
  recommended?: boolean;
}

/**
 * The knobs, per provider, because they are not the same knobs.
 *
 * OpenAI takes "auto" and scales the learning rate as a MULTIPLIER of its own
 * default (1.8 means 1.8x). Together takes neither: omit a value and it
 * answers "batch size is zero", and its learning_rate is an ABSOLUTE number,
 * so a multiplier of 1.8 would arrive as a learning rate of 1.8 and train a
 * model into noise — a run that costs money, reports success, and produces
 * something unusable. Which is worse than an error, so the scales are kept
 * apart here rather than shared.
 */
export interface FinetuneHyperparams {
  /** Whether leaving a value out means "choose for me". */
  supportsAuto: boolean;
  epochs: string[];
  batchSizes: string[];
  learningRates: { value: string; label: string }[];
  /** Sent when the admin has not chosen. "auto" only where that is allowed. */
  defaults: { epochs: string; batchSize: string; learningRate: string };
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
  hyperparams: FinetuneHyperparams;
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
      { id: "gpt-4o-mini-2024-07-18", label: "gpt-4o-mini", minBatch: 1, maxBatch: 32, context: 65536, recommended: true, note: "retires 2027-01-14" },
      { id: "gpt-4.1-mini-2025-04-14", label: "gpt-4.1-mini", minBatch: 1, maxBatch: 32, context: 65536, note: "retires 2027-01-14" },
    ],
    minExamples: 10,
    hyperparams: {
      supportsAuto: true,
      epochs: ["auto", "1", "2", "3", "4", "5", "10"],
      batchSizes: ["auto", "1", "2", "4", "8", "16"],
      learningRates: [
        { value: "auto", label: "Auto" },
        { value: "0.1", label: "0.1x" },
        { value: "0.5", label: "0.5x" },
        { value: "1", label: "1x" },
        { value: "1.8", label: "1.8x" },
        { value: "2", label: "2x" },
        { value: "5", label: "5x" },
      ],
      defaults: { epochs: "auto", batchSize: "auto", learningRate: "auto" },
    },
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
    // Together's own supported-models table, API IDs and limits included.
    // Guessing these cost three refused jobs: the catalogue at /v1/models is
    // what the account can CALL, which is a superset of what it can TRAIN.
    //
    // Vision-language variants are left out (we send text), as are the
    // reasoning-first models: the conclusion prompt wants no deliberation.
    baseModels: [
      { id: "Qwen/Qwen3.5-9B", label: "Qwen3.5 9B", minBatch: 8, maxBatch: 8, context: 65536, fullFt: true, recommended: true, note: "small, cheap to serve, strong in Spanish", loraRank: 64, loraRankMax: 128 },
      { id: "Qwen/Qwen3.5-4B", label: "Qwen3.5 4B", minBatch: 8, maxBatch: 8, context: 131072, note: "cheapest", loraRank: 64, loraRankMax: 128 },
      { id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Reference", label: "Llama 3.1 8B Instruct", minBatch: 8, maxBatch: 8, context: 131072, fullFt: true, loraRank: 64, loraRankMax: 128 },
      { id: "Qwen/Qwen3.5-27B", label: "Qwen3.5 27B", minBatch: 2, maxBatch: 2, context: 131072, fullFt: true, loraRank: 64, loraRankMax: 128 },
      { id: "Qwen/Qwen3.6-27B", label: "Qwen3.6 27B", minBatch: 2, maxBatch: 2, context: 131072, fullFt: true, loraRank: 64, loraRankMax: 128 },
      { id: "Qwen/Qwen3.8-27B", label: "Qwen3.8 27B", minBatch: 2, maxBatch: 2, context: 131072, fullFt: true, loraRank: 64, loraRankMax: 128 },
      { id: "Qwen/Qwen3.5-35B-A3B", label: "Qwen3.5 35B A3B", minBatch: 8, maxBatch: 8, context: 65536, loraRank: 64, loraRankMax: 128 },
      { id: "Qwen/Qwen3.6-35B-A3B", label: "Qwen3.6 35B A3B", minBatch: 8, maxBatch: 8, context: 65536, loraRank: 64, loraRankMax: 128 },
      { id: "google/gemma-4-31B-it", label: "Gemma 4 31B IT", minBatch: 4, maxBatch: 4, context: 49152, fullFt: true, loraRank: 64, loraRankMax: 128 },
      { id: "google/gemma-4-26B-A4B-it", label: "Gemma 4 26B A4B IT", minBatch: 4, maxBatch: 4, context: 49152, loraRank: 64, loraRankMax: 128 },
      { id: "meta-llama/Llama-4-Scout-17B-16E-Instruct", label: "Llama 4 Scout 17B", minBatch: 8, maxBatch: 8, context: 65536, loraRank: 64, loraRankMax: 128 },
      { id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct", label: "Llama 4 Maverick 17B", minBatch: 16, maxBatch: 16, context: 16384, loraRank: 64, loraRankMax: 128 },
      { id: "meta-llama/Llama-3.3-70B-Instruct-Reference", label: "Llama 3.3 70B Instruct", minBatch: 8, maxBatch: 8, context: 24576, fullFt: true, note: "strongest here, dearest to serve", loraRank: 64, loraRankMax: 128 },
      { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B", minBatch: 1, maxBatch: 1, context: 131072, loraRank: 64, loraRankMax: 128 },
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", minBatch: 2, maxBatch: 2, context: 65536, loraRank: 64, loraRankMax: 128 },
      { id: "deepseek-ai/DeepSeek-V3.1", label: "DeepSeek V3.1", minBatch: 2, maxBatch: 2, context: 65536, loraRank: 16, loraRankMax: 16 },
      { id: "deepseek-ai/DeepSeek-V4-Flash", label: "DeepSeek V4 Flash", minBatch: 1, maxBatch: 1, context: 131072, loraRank: 64, loraRankMax: 128 },
      { id: "mistralai/Mixtral-8x7B-Instruct-v0.1", label: "Mixtral 8x7B Instruct", minBatch: 8, maxBatch: 8, context: 32768, fullFt: true, loraRank: 64, loraRankMax: 128 },
      { id: "zai-org/GLM-5.3", label: "GLM 5.3", minBatch: 1, maxBatch: 1, context: 50688, loraRank: 16, loraRankMax: 16 },
      { id: "moonshotai/Kimi-K2.6", label: "Kimi K2.6", minBatch: 4, maxBatch: 4, context: 32768, loraRank: 16, loraRankMax: 16 },
    ],
    minExamples: 10,
    hyperparams: {
      // No "auto": a missing value is read as zero.
      supportsAuto: false,
      epochs: ["1", "2", "3", "4", "5"],
      // Unused for Together: the allowed values come from the chosen model,
      // where min and max are usually the same single number.
      batchSizes: [],
      // Absolute rates. 1e-4 is the usual starting point for a LoRA adapter;
      // the lower ones are for when a run overfits.
      learningRates: [
        { value: "0.00001", label: "1e-5" },
        { value: "0.00005", label: "5e-5" },
        { value: "0.0001", label: "1e-4" },
        { value: "0.0002", label: "2e-4" },
        { value: "0.0003", label: "3e-4" },
      ],
      defaults: { epochs: "3", batchSize: "", learningRate: "0.0001" },
    },
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

/** The batch sizes a given base model accepts, as a list the UI can offer. */
export function batchSizesFor(spec: FinetuneProviderSpec, modelId: string): string[] {
  const model = spec.baseModels.find((m) => m.id === modelId);
  if (!model) return spec.hyperparams.batchSizes;
  const out: string[] = [];
  for (let n = model.minBatch; n <= model.maxBatch; n *= 2) out.push(String(n));
  if (out.length === 0) out.push(String(model.minBatch));
  return out;
}

/**
 * Keep a batch size inside what the model takes.
 *
 * The last guard before the request: a stale value left in the panel is
 * otherwise a job refused on arrival, and for most of these models there is
 * exactly one number that works.
 */
export function clampBatch(spec: FinetuneProviderSpec, modelId: string, given: unknown): number {
  const model = spec.baseModels.find((m) => m.id === modelId);
  const n = Number(given);
  if (!model) return Number.isFinite(n) && n > 0 ? n : 1;
  if (!Number.isFinite(n) || n <= 0) return model.minBatch;
  return Math.min(Math.max(n, model.minBatch), model.maxBatch);
}
