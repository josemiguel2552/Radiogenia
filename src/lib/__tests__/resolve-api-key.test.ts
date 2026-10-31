import { describe, it, expect } from "vitest";
import { resolveApiKey } from "@/lib/auth-helpers";
import type { GlobalAIConfig } from "@/lib/auth-helpers";

/**
 * Which key goes to which provider.
 *
 * This used to fall back to the main provider's key for any provider that had
 * none of its own, and that did real damage twice over. It sent one vendor's
 * credential to another vendor's API — with DeepSeek as the main provider,
 * configuring Together sent the DeepSeek key to api.together.xyz, which
 * answered "Invalid API key provided". And because the key was never empty,
 * every `if (!apiKey)` guard in the codebase was dead: a provider with no key
 * could not be detected locally and surfaced as a remote 401 about a
 * credential belonging to someone else.
 */

const config = (over: Partial<GlobalAIConfig> = {}): GlobalAIConfig => ({
  provider: "deepseek",
  modelName: "deepseek-flash",
  apiKey: "MAIN-deepseek",
  ...over,
}) as GlobalAIConfig;

describe("a provider gets its own key", () => {
  it("uses the key stored for it", () => {
    const c = config({ providerKeys: { together: "TOGETHER-key", claude: "CLAUDE-key" } });
    expect(resolveApiKey(c, "together")).toBe("TOGETHER-key");
    expect(resolveApiKey(c, "claude")).toBe("CLAUDE-key");
  });

  it("uses the main key for the main provider", () => {
    // The main key IS that provider's key, which is why this case stays.
    expect(resolveApiKey(config(), "deepseek")).toBe("MAIN-deepseek");
  });

  it("prefers a specific key over the main one, even for the main provider", () => {
    const c = config({ providerKeys: { deepseek: "SPECIFIC-deepseek" } });
    expect(resolveApiKey(c, "deepseek")).toBe("SPECIFIC-deepseek");
  });
});

describe("a provider with no key gets nothing", () => {
  it("does not hand another vendor's credential over", () => {
    // The bug: this returned "MAIN-deepseek", and that key was transmitted to
    // api.together.xyz.
    expect(resolveApiKey(config(), "together")).toBe("");
    expect(resolveApiKey(config(), "claude")).toBe("");
    expect(resolveApiKey(config(), "gemini")).toBe("");
    expect(resolveApiKey(config(), "openrouter")).toBe("");
  });

  it("returns empty, so a missing key can be caught before any call", () => {
    // Every `if (!apiKey)` guard depends on this being falsy.
    expect(resolveApiKey(config(), "together")).toBeFalsy();
  });

  it("leaves other providers' keys alone when one is missing", () => {
    const c = config({ providerKeys: { claude: "CLAUDE-key" } });
    expect(resolveApiKey(c, "claude")).toBe("CLAUDE-key");
    expect(resolveApiKey(c, "together")).toBe("");
  });
});

describe("the Whisper key is an OpenAI key", () => {
  it("serves OpenAI tasks when OpenAI is not the main provider", () => {
    // There is no separate OpenAI key field: it lives here, which is how the
    // combo pipeline and OpenAI fine-tuning get one.
    const c = config({ whisperApiKey: "WHISPER-openai" });
    expect(resolveApiKey(c, "openai")).toBe("WHISPER-openai");
  });

  it("does not serve anyone else", () => {
    const c = config({ whisperApiKey: "WHISPER-openai" });
    expect(resolveApiKey(c, "together")).toBe("");
    expect(resolveApiKey(c, "claude")).toBe("");
  });

  it("gives way to a key stored for OpenAI specifically", () => {
    const c = config({ whisperApiKey: "WHISPER-openai", providerKeys: { openai: "OPENAI-key" } });
    expect(resolveApiKey(c, "openai")).toBe("OPENAI-key");
  });

  it("is not needed when OpenAI is the main provider", () => {
    const c = config({ provider: "openai", apiKey: "MAIN-openai", whisperApiKey: "WHISPER-openai" });
    expect(resolveApiKey(c, "openai")).toBe("MAIN-openai");
  });

  it("returns nothing for OpenAI when neither exists", () => {
    expect(resolveApiKey(config(), "openai")).toBe("");
  });
});

describe("the guards that this makes live", () => {
  it("are present on both fine-tuning entry points", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const root = join(__dirname, "../../..");
    for (const rel of ["src/app/api/finetune/upload/route.ts", "src/app/api/finetune/start/route.ts"]) {
      const src = readFileSync(join(root, rel), "utf8");
      expect(src).toContain("if (!apiKey)");
      // And they name the provider whose key is missing, rather than leaving
      // the admin to work out which of six it was.
      expect(src).toContain("No ${spec.label} API key configured");
    }
  });

  it("is present on the combo pipeline, which needs two different keys", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const src = readFileSync(join(__dirname, "../combo-findings.ts"), "utf8");
    expect(src).toContain("if (!openaiKey) throw new Error");
    expect(src).toContain("if (!deepseekKey) throw new Error");
  });
});
