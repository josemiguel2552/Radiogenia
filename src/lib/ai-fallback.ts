import type { AIProvider } from "./types";
import {
  generateAIStreamWithUsage,
  generateAIWithUsage,
  type AIResult,
  type StreamResult,
} from "./ai-provider";

/* ── Automatic AI provider fallback ─────────────────────────────
   Goal: users must never be left without a report because one AI
   provider is down. The configured (primary) model gets two attempts
   — giving it a chance to recover from a transient blip — and then
   the request hops to every other provider that has an API key
   configured, in order, until one produces the report. */

/** Safe, current default model per provider when used as a fallback. */
export const FALLBACK_MODELS: Partial<Record<AIProvider, string>> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-v4-flash",
  gemini: "gemini-2.0-flash",
  claude: "claude-haiku-4-5-20251001",
  openrouter: "qwen/qwen-2.5-72b-instruct",
};

/** Preference order for fallback hops (custom endpoints are never used as fallback). */
const FALLBACK_ORDER: AIProvider[] = ["openai", "deepseek", "gemini", "claude", "openrouter"];

/** How many attempts the primary model gets before falling back. */
export const PRIMARY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;
/** Guards only connection/headers on streaming calls, never mid-stream. */
const STREAM_SETUP_TIMEOUT_MS = 20_000;

export interface FallbackConfigLike {
  provider: AIProvider;
  apiKey: string;
  whisperApiKey?: string;
  providerKeys?: Partial<Record<AIProvider, string>>;
}

export interface FallbackCandidate {
  provider: AIProvider;
  modelName: string;
  apiKey: string;
}

function keyForProvider(config: FallbackConfigLike, provider: AIProvider): string | undefined {
  if (config.providerKeys?.[provider]) return config.providerKeys[provider];
  if (provider === config.provider) return config.apiKey;
  if (provider === "openai" && config.whisperApiKey) return config.whisperApiKey;
  return undefined;
}

/** Primary candidate first, then every other provider with a configured key. */
export function buildFallbackChain(
  config: FallbackConfigLike,
  primary: FallbackCandidate,
): FallbackCandidate[] {
  const chain: FallbackCandidate[] = [primary];
  for (const provider of FALLBACK_ORDER) {
    if (provider === primary.provider) continue;
    const apiKey = keyForProvider(config, provider);
    const modelName = FALLBACK_MODELS[provider];
    if (apiKey && modelName) chain.push({ provider, modelName, apiKey });
  }
  return chain;
}

export interface FallbackOutcome<T> {
  result: T;
  usedProvider: AIProvider;
  usedModel: string;
  fellBack: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs `run` down the chain: primary gets PRIMARY_ATTEMPTS tries, the rest one each. */
export async function runChainWithFallback<T>(
  chain: FallbackCandidate[],
  run: (candidate: FallbackCandidate) => Promise<T>,
  opts?: { primaryAttempts?: number; retryDelayMs?: number },
): Promise<FallbackOutcome<T>> {
  const primaryAttempts = Math.max(1, opts?.primaryAttempts ?? PRIMARY_ATTEMPTS);
  const retryDelay = opts?.retryDelayMs ?? RETRY_DELAY_MS;
  let lastError: unknown = new Error("No AI provider candidates available");

  for (let i = 0; i < chain.length; i++) {
    const candidate = chain[i];
    const attempts = i === 0 ? primaryAttempts : 1;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await run(candidate);
        if (i > 0) {
          console.error(`[ai-fallback] recovered with ${candidate.provider}/${candidate.modelName} after primary ${chain[0].provider}/${chain[0].modelName} failed`);
        }
        return { result, usedProvider: candidate.provider, usedModel: candidate.modelName, fellBack: i > 0 };
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[ai-fallback] ${candidate.provider}/${candidate.modelName} failed (attempt ${attempt}/${attempts}): ${msg}`);
        if (i === 0 && attempt < attempts) await sleep(retryDelay);
      }
    }
  }

  throw lastError;
}

interface FallbackGenerateParams {
  config: FallbackConfigLike;
  provider: AIProvider;
  modelName: string;
  apiKey: string;
  customBaseUrl?: string;
  system: string;
  user: string;
  maxTokens?: number;
}

/** Streaming generation with automatic provider fallback (report findings/conclusion). */
export async function streamAIWithFallback(
  params: FallbackGenerateParams,
): Promise<StreamResult & { usedProvider: AIProvider; usedModel: string; fellBack: boolean }> {
  const chain = buildFallbackChain(params.config, {
    provider: params.provider,
    modelName: params.modelName,
    apiKey: params.apiKey,
  });

  const outcome = await runChainWithFallback(chain, async (candidate) => {
    // Abort only if the provider fails to answer with headers in time;
    // the timer is cleared before any streaming happens.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STREAM_SETUP_TIMEOUT_MS);
    try {
      return await generateAIStreamWithUsage({
        provider: candidate.provider,
        modelName: candidate.modelName,
        apiKey: candidate.apiKey,
        customBaseUrl: params.customBaseUrl,
        system: params.system,
        user: params.user,
        maxTokens: params.maxTokens,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  });

  return { ...outcome.result, usedProvider: outcome.usedProvider, usedModel: outcome.usedModel, fellBack: outcome.fellBack };
}

/** Buffered generation with automatic provider fallback. */
export async function generateAIWithUsageFallback(
  params: FallbackGenerateParams,
): Promise<AIResult & { usedProvider: AIProvider; usedModel: string; fellBack: boolean }> {
  const chain = buildFallbackChain(params.config, {
    provider: params.provider,
    modelName: params.modelName,
    apiKey: params.apiKey,
  });

  const outcome = await runChainWithFallback(chain, (candidate) =>
    generateAIWithUsage({
      provider: candidate.provider,
      modelName: candidate.modelName,
      apiKey: candidate.apiKey,
      customBaseUrl: params.customBaseUrl,
      system: params.system,
      user: params.user,
      maxTokens: params.maxTokens,
    }),
  );

  return { ...outcome.result, usedProvider: outcome.usedProvider, usedModel: outcome.usedModel, fellBack: outcome.fellBack };
}
