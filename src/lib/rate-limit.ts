import { NextResponse } from "next/server";

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - 600_000;
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) buckets.delete(key);
  }
}

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number;
  intervalMs: number;
}

export const RATE_LIMITS = {
  generate: { maxTokens: 15, refillRate: 15, intervalMs: 60_000 } as RateLimitConfig,
  transcribe: { maxTokens: 30, refillRate: 30, intervalMs: 60_000 } as RateLimitConfig,
  auth: { maxTokens: 10, refillRate: 10, intervalMs: 60_000 } as RateLimitConfig,
  standard: { maxTokens: 60, refillRate: 60, intervalMs: 60_000 } as RateLimitConfig,
  public: { maxTokens: 5, refillRate: 5, intervalMs: 60_000 } as RateLimitConfig,
};

function consume(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; retryAfterMs: number } {
  cleanup();

  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  const elapsed = now - bucket.lastRefill;
  const refill = Math.floor(elapsed / config.intervalMs) * config.refillRate;
  if (refill > 0) {
    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    const timeToRefill = config.intervalMs - (now - bucket.lastRefill);
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(timeToRefill, 1000) };
  }

  bucket.tokens -= 1;
  return { allowed: true, remaining: bucket.tokens, retryAfterMs: 0 };
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig,
): { allowed: boolean; headers: Record<string, string>; errorResponse?: NextResponse } {
  const result = consume(identifier, config);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(config.maxTokens),
    "X-RateLimit-Remaining": String(result.remaining),
  };

  if (!result.allowed) {
    headers["Retry-After"] = String(Math.ceil(result.retryAfterMs / 1000));
    return {
      allowed: false,
      headers,
      errorResponse: NextResponse.json(
        { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
        { status: 429, headers },
      ),
    };
  }

  return { allowed: true, headers };
}
