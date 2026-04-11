import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId, baseModel, suffix } = await req.json();
    if (!fileId) return NextResponse.json({ error: "Missing fileId" }, { status: 400 });

    const { data: config } = await supabase
      .from("user_model_config")
      .select("api_key_encrypted")
      .eq("user_id", user.id)
      .single();

    if (!config) return NextResponse.json({ error: "No model config" }, { status: 400 });

    let apiKey = "";
    try {
      apiKey = config.api_key_encrypted ? decrypt(config.api_key_encrypted) : "";
    } catch {
      return NextResponse.json({ error: "Failed to decrypt API key" }, { status: 500 });
    }

    // Create fine-tuning job
    const body: Record<string, unknown> = {
      training_file: fileId,
      model: baseModel || "gpt-4o-mini-2024-07-18",
    };
    if (suffix) body.suffix = suffix;

    const res = await fetch("https://api.openai.com/v1/fine_tuning/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: "Failed to start fine-tuning: " + (err.error?.message || JSON.stringify(err)) }, { status: 500 });
    }

    const job = await res.json();

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      model: job.model,
      createdAt: job.created_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
