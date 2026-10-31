import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  adaptJsonl,
  normaliseJob,
  finetuneSpec,
  FINETUNE_PROVIDERS,
} from "@/lib/finetune-providers";

/**
 * A training run costs money and takes hours, and its inputs are a file nobody
 * reads line by line. So the validation is tested hard: a file that is half
 * malformed must say so before it is uploaded, not train a model on whatever
 * happened to survive.
 */

const ROOT = join(__dirname, "../../..");
const source = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const ex = (user: string, assistant: string, system = "Eres un radiólogo.") =>
  JSON.stringify({ messages: [
    { role: "system", content: system },
    { role: "user", content: user },
    { role: "assistant", content: assistant },
  ] });

const openai = FINETUNE_PROVIDERS.openai;
const together = FINETUNE_PROVIDERS.together;

describe("the training file is checked before anyone pays to train on it", () => {
  it("keeps a well-formed conversation untouched", () => {
    const r = adaptJsonl(ex("Hallazgos: nódulo.", "1. Nódulo de 9 mm."), openai);
    expect(r.kept).toBe(1);
    expect(r.dropped).toEqual([]);
    expect(JSON.parse(r.jsonl.trim()).messages).toHaveLength(3);
  });

  it("drops a line with no assistant turn, which is the label", () => {
    const line = JSON.stringify({ messages: [{ role: "user", content: "hola" }] });
    const r = adaptJsonl(line, openai);
    expect(r.kept).toBe(0);
    expect(r.dropped[0]).toEqual({ line: 1, reason: "no assistant message to train on" });
  });

  it("drops a line whose assistant turn is blank", () => {
    const line = JSON.stringify({ messages: [
      { role: "user", content: "hola" },
      { role: "assistant", content: "   " },
    ] });
    expect(adaptJsonl(line, openai).kept).toBe(0);
  });

  it("drops a line with no user turn", () => {
    const line = JSON.stringify({ messages: [{ role: "assistant", content: "1. Nódulo." }] });
    expect(adaptJsonl(line, openai).dropped[0].reason).toBe("no user message");
  });

  it("names the line it dropped, counting from one", () => {
    const text = [ex("a", "b"), "{not json", ex("c", "d")].join("\n");
    const r = adaptJsonl(text, openai);
    expect(r.kept).toBe(2);
    expect(r.dropped).toEqual([{ line: 2, reason: "invalid JSON" }]);
  });

  it("ignores blank lines rather than calling them broken", () => {
    const r = adaptJsonl(`${ex("a", "b")}\n\n  \n${ex("c", "d")}\n`, openai);
    expect(r.kept).toBe(2);
    expect(r.dropped).toEqual([]);
  });

  it("strips our own metadata, which a strict validator would reject", () => {
    const line = JSON.stringify({
      report_id: "abc", modality: "CT",
      messages: [{ role: "user", content: "x" }, { role: "assistant", content: "y" }],
    });
    const r = adaptJsonl(line, openai);
    const parsed = JSON.parse(r.jsonl.trim());
    expect(Object.keys(parsed)).toEqual(["messages"]);
    expect(r.notes.join(" ")).toContain("besides");
  });

  it("removes a message with an invented role instead of the whole example", () => {
    const line = JSON.stringify({ messages: [
      { role: "radiologist", content: "no such role" },
      { role: "user", content: "x" },
      { role: "assistant", content: "y" },
    ] });
    const r = adaptJsonl(line, openai);
    expect(r.kept).toBe(1);
    expect(JSON.parse(r.jsonl.trim()).messages.map((m: { role: string }) => m.role)).toEqual(["user", "assistant"]);
  });

  it("removes a message whose content is not text", () => {
    const line = JSON.stringify({ messages: [
      { role: "user", content: { parts: ["x"] } },
      { role: "assistant", content: "y" },
    ] });
    // No usable user turn is left, so the example cannot be trained on.
    expect(adaptJsonl(line, openai).kept).toBe(0);
  });

  it("refuses a file under the provider's minimum", () => {
    const r = adaptJsonl(ex("a", "b"), openai);
    expect(r.kept).toBe(1);
    expect(r.acceptable).toBe(false);
    expect(openai.minExamples).toBeGreaterThan(1);
  });

  it("accepts one at the minimum", () => {
    const text = Array.from({ length: openai.minExamples }, (_, i) => ex(`caso ${i}`, `conclusión ${i}`)).join("\n");
    expect(adaptJsonl(text, openai).acceptable).toBe(true);
  });

  it("ends the file with a newline, as a JSONL file should", () => {
    const r = adaptJsonl(ex("a", "b"), openai);
    expect(r.jsonl.endsWith("\n")).toBe(true);
  });

  it("returns an empty string rather than a lone newline for nothing kept", () => {
    const r = adaptJsonl("{bad}", openai);
    expect(r.jsonl).toBe("");
  });
});

describe("the two providers take the same file", () => {
  it("produces identical output for both, and says so", () => {
    // This is the honest answer to "adapt the JSONL to that AI": there is
    // nothing to convert, and the note says that instead of implying work.
    const text = [ex("a", "b"), ex("c", "d")].join("\n");
    const a = adaptJsonl(text, openai);
    const b = adaptJsonl(text, together);
    expect(b.jsonl).toBe(a.jsonl);
    expect(b.notes.join(" ")).toContain("Format unchanged");
  });
});

describe("a job reads the same whoever ran it", () => {
  it("maps OpenAI's statuses onto ours", () => {
    expect(normaliseJob({ id: "ft-1", status: "validating_files" }, "openai").status).toBe("queued");
    expect(normaliseJob({ id: "ft-1", status: "running" }, "openai").status).toBe("running");
    expect(normaliseJob({ id: "ft-1", status: "succeeded", fine_tuned_model: "ft:gpt-4o-mini:x" }, "openai"))
      .toMatchObject({ status: "succeeded", fineTunedModel: "ft:gpt-4o-mini:x" });
  });

  it("maps Together's, including the ones that mean failure", () => {
    expect(normaliseJob({ id: "j1", status: "Pending" }, "together").status).toBe("queued");
    expect(normaliseJob({ id: "j1", status: "Uploading" }, "together").status).toBe("running");
    expect(normaliseJob({ id: "j1", status: "Completed" }, "together").status).toBe("succeeded");
    expect(normaliseJob({ id: "j1", status: "user_error" }, "together").status).toBe("failed");
  });

  it("says unknown rather than guessing at a status it has not seen", () => {
    expect(normaliseJob({ id: "j1", status: "reticulating" }, "together").status).toBe("unknown");
  });

  it("finds the finished model under whichever name it comes back as", () => {
    // Together's field name could not be verified, so each plausible one is
    // read. A wrong guess then shows as a blank model, not a broken page.
    for (const field of ["output_name", "model_output_name", "fine_tuned_model"]) {
      const job = normaliseJob({ id: "j1", status: "completed", [field]: "me/model-ft" }, "together");
      expect(job.fineTunedModel).toBe("me/model-ft");
    }
  });

  it("accepts a timestamp as a number or as a date string", () => {
    expect(normaliseJob({ id: "j", status: "completed", created_at: 1762000000 }, "together").createdAt).toBe(1762000000);
    const iso = normaliseJob({ id: "j", status: "completed", created_at: "2026-10-30T10:00:00Z" }, "together");
    expect(iso.createdAt).toBe(Math.floor(Date.parse("2026-10-30T10:00:00Z") / 1000));
  });

  it("survives a response with nothing in it", () => {
    const job = normaliseJob({}, "together");
    expect(job).toMatchObject({ jobId: "", status: "unknown", fineTunedModel: null });
  });
});

describe("an unknown provider falls back rather than crashing", () => {
  it("resolves to OpenAI", () => {
    expect(finetuneSpec("nonsense").id).toBe("openai");
    expect(finetuneSpec("together").id).toBe("together");
  });
});

describe("a model trained anywhere is usable everywhere", () => {
  it("serves Together through the shared provider layer", () => {
    // Without this, a finished fine-tune could be trained but never called,
    // which is the whole point of training it.
    const ai = source("src/lib/ai-provider.ts");
    expect(ai).toContain('case "together":');
    expect(ai).toContain("https://api.together.xyz/v1/chat/completions");
  });

  it("includes it in every list of OpenAI-shaped providers", () => {
    // Three switches enumerate them: the streaming delta, the SSE error
    // reader, and the request body that turns streaming on. Missing one gives
    // a provider that works until it is asked to stream.
    const ai = source("src/lib/ai-provider.ts");
    expect(ai.match(/provider === "together"/g)?.length).toBe(2);
    expect(ai).toMatch(/case "openrouter":\n    case "together":/);
  });

  it("is a provider a task override can name", () => {
    const types = source("src/lib/types.ts");
    expect(types).toContain('| "together" |');
    expect(types).toContain('value: "together"');
  });

  it("has its key stored, read, saved and masked like the others", () => {
    expect(source("src/lib/auth-helpers.ts")).toContain('["together_api_key_encrypted", "together"]');
    const config = source("src/app/api/admin/config/route.ts");
    expect(config).toContain('["together_api_key", "together_api_key_encrypted"]');
    // Masked on the way out, or the key would be echoed to the browser.
    const masked = config.slice(config.indexOf("const MASKED = ["));
    expect(masked.slice(0, 400)).toContain("together_api_key_encrypted");
    expect(source("supabase/migrations/20261030_together_api_key.sql")).toContain("together_api_key_encrypted");
  });
});

describe("the dashboard drives the whole run from one place", () => {
  const page = source("src/app/admin/page.tsx");

  it("sends the chosen provider with every call", () => {
    expect(page).toContain('form.append("provider", ftProvider)');
    expect(page).toContain("provider: ftProvider, fileId: ftFileId");
    expect(page).toContain("{ jobId, provider: ftProvider }");
    expect(page).toContain("/api/finetune/status?provider=${ftProvider}");
  });

  it("moves the base model when the provider changes", () => {
    // A gpt-4o-mini id submitted to Together is a job that fails on arrival.
    expect(page).toContain("function changeFtProvider");
    expect(page).toContain("setFtBaseModel(FINETUNE_PROVIDERS[id].baseModels[0].id)");
  });

  it("offers only base models the chosen provider can train", () => {
    expect(page).toContain("FINETUNE_PROVIDERS[ftProvider].baseModels.map");
    expect(page).not.toContain('<SelectItem value="gpt-4o-mini-2024-07-18">');
  });

  it("shows the finished model with the provider to pair it with", () => {
    expect(page).toContain("admin.ft_ready_title");
    expect(page).toContain("FINETUNE_PROVIDERS[ftProvider].keyProvider");
  });
});

/**
 * The two ends of the chain, checked against each other.
 *
 * The exporter builds examples and the uploader validates them, and nothing
 * made them agree: a change to either could leave the panel generating a file
 * its own upload rejects, which only shows up as "no valid training examples"
 * on a file that looks fine.
 */
describe("what the exporter produces is what the uploader accepts", () => {
  it("keeps an example built exactly the way the export builds it", async () => {
    const { buildTrainingPrompt } = await import("@/lib/training-prompt");
    const findings = "Hígado: lesión de 12 mm en segmento VII (8 mm en el previo).\nPulmón: nódulo de 9 mm en LID.";
    const conclusion = "1. Nódulo de nueva aparición de 9 mm en lóbulo inferior derecho.\n2. Lesión hepática mayor que en el previo (8 → 12 mm).";
    const prompt = buildTrainingPrompt({ findingsText: findings, conclusionText: conclusion, clinicalInfo: "Control oncológico." });

    const line = JSON.stringify({
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
        { role: "assistant", content: conclusion },
      ],
    });

    for (const spec of Object.values(FINETUNE_PROVIDERS)) {
      const r = adaptJsonl(line, spec);
      expect(r.kept).toBe(1);
      expect(r.dropped).toEqual([]);
      // The conversation survives intact: a trimmed system prompt would train
      // against instructions production does not send.
      const parsed = JSON.parse(r.jsonl.trim());
      expect(parsed.messages).toHaveLength(3);
      expect(parsed.messages[0].content).toBe(prompt.system);
      expect(parsed.messages[2].content).toBe(conclusion);
    }
  });

  it("strips patient identifiers before the file leaves", () => {
    // This file is uploaded to a third party and kept by them. Every
    // generation route already strips; this was the one payload that got
    // STORED rather than answered and forgotten.
    const lib = source("src/lib/training-export.ts");
    expect(lib).toContain('import { stripPii } from "./pii-detect"');
    expect(lib).toContain("stripPii(r.findings_text!).cleaned");
    expect(lib).toContain("stripPii(r.conclusion_text!).cleaned");
    // The audit-log fallback path builds examples too.
    expect(lib).toContain("stripPii((m.corrected_conclusion");
  });

  it("trains on the stripped text it will be asked about in service", () => {
    // The conclusion route strips before prompting, so an example paired with
    // unstripped findings is an example of input the model never meets.
    const lib = source("src/lib/training-export.ts");
    const mapBlock = lib.slice(lib.indexOf("const findings = stripPii"), lib.indexOf("return {", lib.indexOf("const findings = stripPii")));
    expect(mapBlock).toContain("reconcileFindings(findings, conclusion)");
    expect(mapBlock).not.toContain("r.findings_text!, r.conclusion_text!");
  });
});

describe("a trained model reaches the dropdowns", () => {
  const page = source("src/app/admin/page.tsx");
  const route = source("src/app/api/finetune/status/route.ts");

  it("offers each provider its own fine-tunes", () => {
    // Both pickers used to gate the fine-tuned group on provider === "openai",
    // so a model trained anywhere else could never be selected — the whole
    // point of training it.
    expect(page).toContain("ftModelsByProvider[provider] || []");
    expect(page).toContain("ftModelsByProvider[o.provider] || []");
    expect(page).not.toContain('provider === "openai"\n                        ? ftModelsList');
    expect(page).not.toContain("ftModelsList");
  });

  it("does not let the training panel's selection decide what Modelos offers", () => {
    // The list is built for every provider with a key, not for the one
    // selected in Entrenamiento.
    expect(route).toContain("Object.values(FINETUNE_PROVIDERS).map(async (sp)");
    expect(route).toContain("modelsByProvider");
  });

  it("keys the list by the provider a task override would name", () => {
    // taskOverrides store {provider, model}; indexing by anything else would
    // offer a model under a provider that cannot serve it.
    expect(route).toContain("[sp.keyProvider, await modelsFor(sp, key)]");
  });

  it("asks OpenAI for its model list rather than reading its jobs", () => {
    // The jobs endpoint is paginated: a fine-tune older than the first page
    // would silently disappear from the dropdowns while still existing.
    const fn = route.slice(route.indexOf("async function modelsFor"), route.indexOf("Every job this provider has"));
    expect(fn).toContain("https://api.openai.com/v1/models");
    expect(fn).toContain('startsWith("ft:")');
  });

  it("skips a provider with no key instead of calling it", () => {
    expect(route).toContain("if (!apiKey) return [];");
    expect(route).toContain("apiKey ? await fetch(spec.endpoints.jobs");
  });
});

/**
 * The failure this chain actually hit.
 *
 * Each example embeds the whole ~8,900-character conclusion prompt, so the
 * file is about 9.5 KB per example: 841 examples is 7.65 MB, and doubled it
 * is 15.3 MB. The panel downloaded it and posted it back through our own API,
 * where a request body is capped at 4.5 MB. The upload answered 413 with a
 * plain-text body and the browser's res.json() turned that into
 * "Unexpected token 'R', \"Request En\"... is not valid JSON" — a parser error
 * about the parser, with nothing in it about the actual limit.
 */
describe("the browser never carries the training file", () => {
  const page = source("src/app/admin/page.tsx");
  const upload = source("src/app/api/finetune/upload/route.ts");
  const augment = source("src/app/api/admin/training-data/augment/route.ts");

  it("asks the server to build and upload, instead of shipping bytes", () => {
    // Both buttons send a short JSON instruction, not a file.
    expect(page).toContain('correctionsOnly: ftCorrectionsOnly,');
    // Nothing is posted back up as a file. Downloading one to inspect is
    // still fine — the 4.5 MB cap is on request bodies, not responses.
    expect(page).not.toContain('form.append("file", blob');
    const download = page.slice(page.indexOf("async function handleExportFtData"));
    expect(download.slice(0, 500)).toContain("await res.blob()");
  });

  it("builds the file inside the upload route", () => {
    expect(upload).toContain("buildTrainingExamples(createServiceClient()");
    expect(upload).toContain('contentType.includes("application/json")');
  });

  it("keeps the by-hand upload for small curated files", () => {
    // Still useful, and still under the cap it is meant for.
    expect(upload).toContain("req.formData()");
  });

  it("gives the long routes time to finish", () => {
    // Paging the whole history and building a prompt per row does not fit in
    // the default.
    expect(upload).toContain("export const maxDuration = 120");
    expect(augment).toContain("export const maxDuration = 300");
    expect(source("src/app/api/admin/training-data/openai/route.ts")).toContain("export const maxDuration = 120");
  });

  it("does not hand a multi-megabyte file back from the augmentation", () => {
    expect(augment).toContain("uploadJsonlToProvider");
    // It returns a file id and a short preview, not the file.
    expect(augment).toContain("preview: synthetic.slice(0, 2)");
    expect(augment).not.toMatch(/\n\s+jsonl,\n/);
  });
});

describe("a response that is not JSON reads as what it is", () => {
  const page = source("src/app/admin/page.tsx");

  it("never parses a body blind", () => {
    expect(page).toContain("async function readJson");
    // Every call site goes through it; a single res.json() left behind is
    // another "Unexpected token" waiting to happen.
    expect(page).not.toContain("await res.json()");
    expect(page).not.toContain("await uploadRes.json()");
    expect(page).not.toContain("await augRes.json()");
  });

  it("reports the status and the first line instead of a parser error", () => {
    const fn = page.slice(page.indexOf("async function readJson"));
    expect(fn.slice(0, 700)).toContain("HTTP ${res.status}");
    expect(fn.slice(0, 700)).toContain("res.text()");
  });

  it("reads the provider's reply as text first, server-side too", () => {
    // The same mistake one layer down: an error from whatever sits in front
    // of the provider is not JSON either.
    const up = source("src/lib/finetune-upload.ts");
    expect(up).toContain("const raw = await res.text()");
    expect(up.indexOf("await res.text()")).toBeLessThan(up.indexOf("JSON.parse(raw)"));
  });
});

describe("the augmentation finishes, or says how far it got", () => {
  const augment = source("src/app/api/admin/training-data/augment/route.ts");

  it("caps how many examples one run augments", () => {
    // Every synthetic example is a model call. 841 of them cannot be made
    // inside one request however the batching is arranged.
    expect(augment).toContain("const DEFAULT_LIMIT");
    expect(augment).toContain("source.slice(0, limit)");
  });

  it("says how much is left rather than looking finished", () => {
    expect(augment).toContain("remaining: Math.max(0, source.length - examples.length)");
    expect(source("src/app/admin/page.tsx")).toContain("admin.ft_augment_partial");
  });

  it("trains on the whole set, with part of it doubled", () => {
    // Not just the augmented slice: the point is more of everything.
    expect(augment).toContain("const combined = [...source, ...synthetic]");
  });

  it("stopped making 281 sequential rounds of one call each", () => {
    expect(augment).toContain("const CONCURRENCY = 8");
    expect(augment).not.toContain("const batchSize = 3");
  });
});
