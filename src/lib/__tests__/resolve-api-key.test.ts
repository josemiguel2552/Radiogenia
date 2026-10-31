import { describe, it, expect } from "vitest";
import { resolveApiKey } from "@/lib/auth-helpers";
import type { GlobalAIConfig } from "@/lib/auth-helpers";
import { readFileSync } from "fs";
import { join } from "path";

const adminPage = readFileSync(join(__dirname, "../../..", "src/app/admin/page.tsx"), "utf8");

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

/**
 * Being able to enter a key and a model at all.
 *
 * The keys section showed a field only for providers some task override
 * already named, which is a circle: you cannot point a task at Together
 * until Together works, and you cannot make it work without its key. Fine-
 * tuning made it unreachable — training is not a task, so nothing would ever
 * name the provider you want to train with.
 */
describe("the Models section lets a key be entered", () => {
  const page = adminPage;

  it("shows a field for every provider but the main one", () => {
    expect(page).toContain("const toShow = keyConfig.filter((k) => k.prov !== provider)");
    expect(page).not.toContain("keyConfig.filter((k) => extraProviders.has(k.prov))");
  });

  it("still offers a field for the one we added", () => {
    expect(page).toContain('{ prov: "together", label: "Together AI"');
  });

  it("marks which providers a task is actually pointing at", () => {
    // The information the filter used to convey, without gating on it.
    expect(page).toContain("extraProviders.has(k.prov) && (");
    expect(page).toContain("admin.in_use");
  });
});

describe("a model name can always be typed", () => {
  const page = adminPage;

  it("offers it on every model field, not only where the list is empty", () => {
    // A fine-tune's name is in no static list, and before the job list
    // refreshes it is in no fetched one either. Three fields name a model:
    // the default model, each task override, and the training base model.
    expect(page).toContain("all.length > 0 && !modelManual");   // default
    expect(page).toContain("allModels.length > 0 && !manual");  // per task
    expect(page).toContain("ftBaseManual ? (");                  // training base
    const offers = page.match(/admin\.model_type_manually/g)?.length ?? 0;
    expect(offers).toBe(3);
  });

  it("lets you go back to the list from each of them", () => {
    expect(page.match(/admin\.model_pick_from_list/g)?.length).toBe(3);
  });

  it("does not leave a stale base model selected once the real list arrives", () => {
    // The static default was a name the provider had dropped; keeping it
    // selected submits a job that fails on arrival.
    expect(page).toContain("d.models.includes(current) ? current : d.models[0]");
  });

  it("asks the provider which models it can train", () => {
    expect(page).toContain("/api/finetune/base-models?provider=");
  });

  it("keeps the sentinel out of the saved value", () => {
    // Picking "type a name" must switch the field, not store "__manual__" as
    // the model.
    expect(page).toContain('const MANUAL = "__manual__"');
    expect(page).toContain("if (v === MANUAL) { setModelManual(true); return; }");
    expect(page).toContain("if (v === MANUAL) {\n                                    setManualTasks");
  });
});
