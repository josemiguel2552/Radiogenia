import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { toErrorResponse } from "@/lib/api-error";
import { adaptJsonl, finetuneSpec } from "@/lib/finetune-providers";
import { uploadJsonlToProvider } from "@/lib/finetune-upload";
import { buildTrainingExamples, toJsonl } from "@/lib/training-export";

/** Building the file from the whole report history and uploading it takes a
 *  while; the default would cut it off partway. */
export const maxDuration = 120;

/**
 * Get a training file to the provider, by either of two routes.
 *
 * JSON body — the normal one. The server builds the file from the reports
 * itself and posts it straight on. This exists because the file is about
 * 9.5 KB per example (each embeds the whole conclusion prompt), so a real
 * dataset is several megabytes and a request body is capped at 4.5 MB: having
 * the browser download it and post it back answered 413, whose plain-text
 * body the browser then failed to parse as JSON.
 *
 * Multipart body — an admin uploading a file by hand. Still subject to that
 * 4.5 MB cap, which is fine for the small curated files it is meant for.
 *
 * Either way the content is validated by the same adapter before it leaves.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const globalConfig = await getGlobalAIConfig();
    const contentType = req.headers.get("content-type") || "";

    /* ── Built here, from the reports ── */
    if (contentType.includes("application/json")) {
      const { provider, modality, correctionsOnly } = await req.json();
      const spec = finetuneSpec(String(provider || "openai"));
      const apiKey = resolveApiKey(globalConfig, spec.keyProvider);
      if (!apiKey) {
        return NextResponse.json(
          { error: `No ${spec.label} API key configured. Add one in Plataforma → Modelos.` },
          { status: 400 },
        );
      }

      const { examples } = await buildTrainingExamples(createServiceClient(), {
        modality: modality || null,
        correctionsOnly: !!correctionsOnly,
      });
      if (examples.length === 0) {
        return NextResponse.json(
          { error: correctionsOnly
            ? "No corrected reports found to build training examples from."
            : "No reports found to build training examples from." },
          { status: 400 },
        );
      }

      const adapted = adaptJsonl(toJsonl(examples), spec);
      if (!adapted.acceptable) {
        return NextResponse.json({
          error: `${spec.label} needs at least ${spec.minExamples} examples; this set has ${adapted.kept}.`,
          kept: adapted.kept,
          notes: adapted.notes,
        }, { status: 400 });
      }

      const up = await uploadJsonlToProvider(spec, apiKey, adapted.jsonl);
      if (up.error) return NextResponse.json({ error: up.error }, { status: 502 });

      return NextResponse.json({
        provider: spec.id,
        fileId: up.fileId,
        fileName: "training_data.jsonl",
        validExamples: adapted.kept,
        skippedErrors: adapted.dropped.length,
        errors: adapted.dropped.slice(0, 5).map((d) => `Line ${d.line}: ${d.reason}`),
        notes: adapted.notes,
        bytes: Buffer.byteLength(adapted.jsonl, "utf8"),
      });
    }

    /* ── Uploaded by hand ── */
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const spec = finetuneSpec(String(formData.get("provider") || "openai"));
    const apiKey = resolveApiKey(globalConfig, spec.keyProvider);
    if (!apiKey) {
      return NextResponse.json(
        { error: `No ${spec.label} API key configured. Add one in Plataforma → Modelos.` },
        { status: 400 },
      );
    }
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    let text = "";
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      const mammoth = (await import("mammoth")).default;
      const buffer = Buffer.from(await file.arrayBuffer());
      text = (await mammoth.extractRawText({ buffer })).value;
    } else if (fileName.endsWith(".jsonl") || fileName.endsWith(".txt") || fileName.endsWith(".json")) {
      text = await file.text();
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use .docx, .jsonl, or .txt" }, { status: 400 });
    }

    const adapted = adaptJsonl(text, spec);
    if (!adapted.acceptable) {
      return NextResponse.json({
        error: adapted.kept === 0
          ? "No valid training examples found. Each line must be a JSON object with a 'messages' array."
          : `${spec.label} needs at least ${spec.minExamples} examples; this file has ${adapted.kept}.`,
        kept: adapted.kept,
        dropped: adapted.dropped.slice(0, 10),
        notes: adapted.notes,
      }, { status: 400 });
    }

    const up = await uploadJsonlToProvider(spec, apiKey, adapted.jsonl);
    if (up.error) return NextResponse.json({ error: up.error }, { status: 502 });

    return NextResponse.json({
      provider: spec.id,
      fileId: up.fileId,
      fileName: file.name,
      validExamples: adapted.kept,
      skippedErrors: adapted.dropped.length,
      errors: adapted.dropped.slice(0, 5).map((d) => `Line ${d.line}: ${d.reason}`),
      notes: adapted.notes,
      bytes: Buffer.byteLength(adapted.jsonl, "utf8"),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
