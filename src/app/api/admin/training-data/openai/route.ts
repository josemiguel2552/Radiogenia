import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { getErrorMessage, getErrorStatus } from "@/lib/api-error";
import { buildTrainingExamples, toJsonl } from "@/lib/training-export";

export const dynamic = "force-dynamic";
/** Paging the whole report history and building a prompt per row is slow. */
export const maxDuration = 120;

/**
 * The training file, to download and inspect.
 *
 * Uploading does NOT go through here any more: /api/finetune/upload takes a
 * JSON body, builds the same file server-side and posts it straight to the
 * provider. At roughly 9.5 KB an example — each one embeds the whole ~8,900
 * character conclusion prompt — a real dataset is several megabytes, and a
 * request body is capped at 4.5 MB.
 *
 * The examples are built by lib/training-export, which also strips PII:
 * whoever trains on this file keeps it.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const url = new URL(req.url);
    const modality = url.searchParams.get("modality");
    const correctionsOnly = url.searchParams.get("corrections_only") === "true";
    const preview = url.searchParams.get("preview") === "true";

    const { examples, modalities } = await buildTrainingExamples(supabase, { modality, correctionsOnly });

    if (preview) {
      return NextResponse.json({
        total: examples.length,
        preview: examples.slice(0, 5),
        modalities,
        // What the file weighs, so the panel can say so rather than letting
        // someone discover it as a failed upload.
        bytes: Buffer.byteLength(toJsonl(examples), "utf8"),
      });
    }

    return new NextResponse(toJsonl(examples), {
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename="radiogenai-finetune-${new Date().toISOString().slice(0, 10)}.jsonl"`,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: getErrorStatus(message) });
  }
}
