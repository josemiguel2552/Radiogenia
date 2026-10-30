import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";
import { adaptJsonl, finetuneSpec } from "@/lib/finetune-providers";

/**
 * Validate a training file and hand it to the provider that will train on it.
 *
 * The validation lives in finetune-providers so it can be tested without a
 * network and shared by both providers: a run costs money and hours, and a
 * file that is half malformed otherwise trains on whatever survived without
 * ever saying so.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const spec = finetuneSpec(String(formData.get("provider") || "openai"));

    const globalConfig = await getGlobalAIConfig();
    const apiKey = resolveApiKey(globalConfig, spec.keyProvider);
    if (!apiKey) {
      return NextResponse.json(
        { error: `No ${spec.label} API key configured. Add one in Plataforma → Modelos → Provider API Keys.` },
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
    } else if (fileName.endsWith(".jsonl") || fileName.endsWith(".txt")) {
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

    const blob = new Blob([adapted.jsonl], { type: "application/jsonl" });
    const uploadForm = new FormData();
    uploadForm.append("purpose", "fine-tune");
    uploadForm.append("file", blob, "training_data.jsonl");
    // Together's upload rejects a file it cannot tell the type of; OpenAI
    // ignores the extra field.
    if (spec.id === "together") uploadForm.append("file_name", "training_data.jsonl");

    const uploadRes = await fetch(spec.endpoints.upload, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: uploadForm,
    });

    const raw = await uploadRes.text();
    if (!uploadRes.ok) {
      return NextResponse.json(
        { error: `${spec.label} file upload failed (${uploadRes.status}): ${raw.slice(0, 600)}` },
        { status: 502 },
      );
    }

    let uploadData: Record<string, unknown> = {};
    try { uploadData = JSON.parse(raw); } catch { /* handled below */ }

    const fileId = (uploadData.id as string) || (uploadData.file_id as string) || "";
    if (!fileId) {
      return NextResponse.json(
        { error: `${spec.label} accepted the file but returned no id: ${raw.slice(0, 400)}` },
        { status: 502 },
      );
    }

    return NextResponse.json({
      provider: spec.id,
      fileId,
      fileName: (uploadData.filename as string) || "training_data.jsonl",
      validExamples: adapted.kept,
      skippedErrors: adapted.dropped.length,
      errors: adapted.dropped.slice(0, 5).map((d) => `Line ${d.line}: ${d.reason}`),
      notes: adapted.notes,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
