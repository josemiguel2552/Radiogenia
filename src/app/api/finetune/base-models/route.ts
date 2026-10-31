import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";
import { finetuneSpec } from "@/lib/finetune-providers";

export const dynamic = "force-dynamic";

/**
 * The base models this account can actually train, asked of the provider.
 *
 * A hardcoded list was wrong within weeks: "Qwen/Qwen3-8B" came back as
 * "model not found in configuration", because the catalog had moved on and
 * the name was taken from what I knew rather than from the provider. The
 * provider is the only thing that knows, so it is asked — and a name can
 * still be typed by hand for anything this misses.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const spec = finetuneSpec(new URL(req.url).searchParams.get("provider") || "openai");
    const globalConfig = await getGlobalAIConfig();
    const apiKey = resolveApiKey(globalConfig, spec.keyProvider);

    if (!apiKey) {
      return NextResponse.json({
        provider: spec.id,
        models: [],
        error: `No ${spec.label} API key configured.`,
      });
    }

    const url = spec.id === "together"
      ? "https://api.together.xyz/v1/models"
      : "https://api.openai.com/v1/models";

    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    const raw = await res.text();
    if (!res.ok) {
      return NextResponse.json({
        provider: spec.id,
        models: [],
        error: `${spec.label} (${res.status}): ${raw.slice(0, 300)}`,
      });
    }

    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch {
      return NextResponse.json({ provider: spec.id, models: [], error: "Unreadable model list" });
    }

    // Together returns a bare array; OpenAI wraps it in `data`.
    const list: unknown = Array.isArray(parsed) ? parsed : (parsed as { data?: unknown })?.data;
    if (!Array.isArray(list)) {
      return NextResponse.json({ provider: spec.id, models: [], error: "Unexpected model list shape" });
    }

    const rows = list.filter((m): m is Record<string, unknown> => !!m && typeof m === "object");

    if (spec.id === "together") {
      // /v1/models is the INFERENCE catalogue, which is a superset: a model
      // listed there is refused for training with "not found in
      // configuration". So look for a flag that marks trainability, and when
      // there is none, say so rather than offering the catalogue as if it
      // were the answer — that sent two jobs to be refused.
      const flagged = rows.filter((m) =>
        m.finetuning === true || m.fine_tuning === true || m.supports_finetuning === true ||
        m.trainable === true || m.supports_fine_tuning === true ||
        (typeof m.type === "string" && m.type.toLowerCase().includes("finetune")));

      const idsOf = (ms: Record<string, unknown>[]) =>
        [...new Set(ms.map((m) => String(m.id || m.name || "")).filter(Boolean))].sort();

      // The field names above are guesses, and guessing twice was enough.
      // Reporting the keys the catalogue actually carries is how the filter
      // gets written from evidence instead.
      const sampleKeys = [...new Set(rows.slice(0, 40).flatMap((m) => Object.keys(m)))].sort();

      return NextResponse.json({
        provider: spec.id,
        models: idsOf(flagged.length > 0 ? flagged : rows),
        filtered: flagged.length > 0,
        total: rows.length,
        sampleKeys,
      });
    }

    // OpenAI: the fine-tunable bases are the gpt-* chat models, and its own
    // fine-tunes (ft:…) are not base models.
    const models = [...new Set(
      rows
        .map((m) => String(m.id || ""))
        .filter((id) => /^gpt-/.test(id) && !id.startsWith("ft:")),
    )].sort();

    return NextResponse.json({ provider: spec.id, models, filtered: false, total: rows.length });
  } catch (error) {
    return toErrorResponse(error);
  }
}
