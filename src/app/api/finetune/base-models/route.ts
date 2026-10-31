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
      // Some catalogues flag trainability; when nothing does, every chat or
      // language model is offered and the provider refuses what it cannot
      // train — which is no worse than guessing, and the names are real.
      const flagged = rows.filter((m) =>
        m.finetuning === true || m.fine_tuning === true || m.supports_finetuning === true ||
        (typeof m.type === "string" && m.type.toLowerCase().includes("finetune")));

      const candidates = (flagged.length > 0 ? flagged : rows.filter((m) => {
        const type = String(m.type || "").toLowerCase();
        return type === "chat" || type === "language" || type === "";
      }));

      const models = [...new Set(candidates.map((m) => String(m.id || m.name || "")).filter(Boolean))].sort();
      return NextResponse.json({
        provider: spec.id,
        models,
        // So the panel can say whether this is a trainable list or the whole
        // catalogue, rather than implying a guarantee it does not have.
        filtered: flagged.length > 0,
        total: rows.length,
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
