import { describe, it, expect } from "vitest";
import { buildFallbackChain, runChainWithFallback, FALLBACK_MODELS, type FallbackCandidate } from "../ai-fallback";

const primary: FallbackCandidate = { provider: "deepseek", modelName: "deepseek-v4-flash", apiKey: "dsk" };

describe("buildFallbackChain", () => {
  it("puts the primary first and adds every provider with a configured key", () => {
    const chain = buildFallbackChain(
      {
        provider: "deepseek",
        apiKey: "dsk",
        whisperApiKey: "whisper-key",
        providerKeys: { gemini: "gk", claude: "ck" },
      },
      primary,
    );
    expect(chain[0]).toEqual(primary);
    const providers = chain.map((c) => c.provider);
    // openai via whisper key, gemini + claude via provider keys; no openrouter (no key)
    expect(providers).toEqual(["deepseek", "openai", "gemini", "claude"]);
    expect(chain[1].apiKey).toBe("whisper-key");
    expect(chain[1].modelName).toBe(FALLBACK_MODELS.openai);
  });

  it("never duplicates the primary provider and yields only the primary without other keys", () => {
    const chain = buildFallbackChain({ provider: "deepseek", apiKey: "dsk" }, primary);
    expect(chain).toHaveLength(1);
  });

  it("uses the main config key when the main provider differs from the task primary", () => {
    const openaiPrimary: FallbackCandidate = { provider: "openai", modelName: "gpt-4o-mini", apiKey: "ok" };
    const chain = buildFallbackChain(
      { provider: "deepseek", apiKey: "dsk" },
      openaiPrimary,
    );
    expect(chain.map((c) => c.provider)).toEqual(["openai", "deepseek"]);
    expect(chain[1].apiKey).toBe("dsk");
    expect(chain[1].modelName).toBe(FALLBACK_MODELS.deepseek);
  });
});

describe("runChainWithFallback", () => {
  const chain: FallbackCandidate[] = [
    primary,
    { provider: "openai", modelName: "gpt-4o-mini", apiKey: "ok" },
    { provider: "gemini", modelName: "gemini-2.0-flash", apiKey: "gk" },
  ];

  it("returns the primary result without falling back when it succeeds", async () => {
    const calls: string[] = [];
    const out = await runChainWithFallback(chain, async (c) => {
      calls.push(c.provider);
      return "ok";
    }, { retryDelayMs: 0 });
    expect(out).toMatchObject({ result: "ok", usedProvider: "deepseek", fellBack: false });
    expect(calls).toEqual(["deepseek"]);
  });

  it("retries the primary a second time before falling back", async () => {
    const calls: string[] = [];
    let failures = 0;
    const out = await runChainWithFallback(chain, async (c) => {
      calls.push(c.provider);
      if (c.provider === "deepseek") { failures++; throw new Error("boom"); }
      return "rescued";
    }, { retryDelayMs: 0 });
    expect(failures).toBe(2);
    expect(calls).toEqual(["deepseek", "deepseek", "openai"]);
    expect(out).toMatchObject({ result: "rescued", usedProvider: "openai", usedModel: "gpt-4o-mini", fellBack: true });
  });

  it("keeps hopping until one provider works", async () => {
    const out = await runChainWithFallback(chain, async (c) => {
      if (c.provider !== "gemini") throw new Error(`${c.provider} down`);
      return "gemini-report";
    }, { retryDelayMs: 0 });
    expect(out).toMatchObject({ result: "gemini-report", usedProvider: "gemini", fellBack: true });
  });

  it("throws the last error when every provider fails", async () => {
    await expect(
      runChainWithFallback(chain, async (c) => { throw new Error(`${c.provider} down`); }, { retryDelayMs: 0 }),
    ).rejects.toThrow("gemini down");
  });
});
