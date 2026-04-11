import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get API key
    const { data: config } = await supabase
      .from("user_model_config")
      .select("api_key_encrypted, provider")
      .eq("user_id", user.id)
      .single();

    if (!config || config.provider !== "openai") {
      return NextResponse.json({ error: "Fine-tuning is only available with OpenAI. Select OpenAI as your provider first." }, { status: 400 });
    }

    let apiKey = "";
    try {
      apiKey = config.api_key_encrypted ? decrypt(config.api_key_encrypted) : "";
    } catch {
      return NextResponse.json({ error: "Failed to decrypt API key" }, { status: 500 });
    }
    if (!apiKey) return NextResponse.json({ error: "No API key configured" }, { status: 400 });

    // Get uploaded file
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    let text = "";
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      const mammoth = require("mammoth");
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (fileName.endsWith(".jsonl") || fileName.endsWith(".txt")) {
      text = await file.text();
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use .docx, .jsonl, or .txt" }, { status: 400 });
    }

    // Parse and validate JSONL lines
    const lines = text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    const validLines: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        const parsed = JSON.parse(lines[i]);
        // Validate chat format
        if (!parsed.messages || !Array.isArray(parsed.messages)) {
          errors.push(`Line ${i + 1}: missing "messages" array`);
          continue;
        }
        const roles = parsed.messages.map((m: { role: string }) => m.role);
        if (!roles.includes("assistant")) {
          errors.push(`Line ${i + 1}: missing "assistant" message`);
          continue;
        }
        validLines.push(JSON.stringify(parsed));
      } catch {
        // Try to find JSON objects in the line (Word may merge lines)
        errors.push(`Line ${i + 1}: invalid JSON`);
      }
    }

    if (validLines.length === 0) {
      return NextResponse.json({
        error: "No valid training examples found. Each line must be a JSON object with a 'messages' array.",
        errors: errors.slice(0, 10),
      }, { status: 400 });
    }

    // Build JSONL content
    const jsonlContent = validLines.join("\n");
    const jsonlBlob = new Blob([jsonlContent], { type: "application/jsonl" });

    // Upload to OpenAI Files API
    const uploadForm = new FormData();
    uploadForm.append("purpose", "fine-tune");
    uploadForm.append("file", jsonlBlob, "training_data.jsonl");

    const uploadRes = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      return NextResponse.json({ error: "OpenAI file upload failed: " + (err.error?.message || JSON.stringify(err)) }, { status: 500 });
    }

    const uploadData = await uploadRes.json();

    return NextResponse.json({
      fileId: uploadData.id,
      fileName: uploadData.filename,
      validExamples: validLines.length,
      skippedErrors: errors.length,
      errors: errors.slice(0, 5),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
