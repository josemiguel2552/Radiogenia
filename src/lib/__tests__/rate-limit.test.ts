import { describe, it, expect } from "vitest";
import { rateLimit, RATE_LIMITS } from "../rate-limit";

describe("rateLimit", () => {
  const key = "test:user1";

  it("allows requests within the limit", () => {
    const config = { maxTokens: 3, refillRate: 3, intervalMs: 60_000 };
    const r1 = rateLimit(key + ":a", config);
    expect(r1.allowed).toBe(true);
    expect(r1.headers["X-RateLimit-Remaining"]).toBe("2");
  });

  it("blocks after tokens are exhausted", () => {
    const config = { maxTokens: 2, refillRate: 2, intervalMs: 60_000 };
    const k = key + ":b";
    rateLimit(k, config);
    rateLimit(k, config);
    const r3 = rateLimit(k, config);
    expect(r3.allowed).toBe(false);
    expect(r3.errorResponse).toBeDefined();
    expect(r3.errorResponse!.status).toBe(429);
  });

  it("returns correct remaining count", () => {
    const config = { maxTokens: 5, refillRate: 5, intervalMs: 60_000 };
    const k = key + ":c";
    const r1 = rateLimit(k, config);
    expect(r1.headers["X-RateLimit-Remaining"]).toBe("4");
    const r2 = rateLimit(k, config);
    expect(r2.headers["X-RateLimit-Remaining"]).toBe("3");
  });

  it("predefined configs have expected shape", () => {
    for (const [, config] of Object.entries(RATE_LIMITS)) {
      expect(config).toHaveProperty("maxTokens");
      expect(config).toHaveProperty("refillRate");
      expect(config).toHaveProperty("intervalMs");
      expect(config.maxTokens).toBeGreaterThan(0);
    }
  });
});
