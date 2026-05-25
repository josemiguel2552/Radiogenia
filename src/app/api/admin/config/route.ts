import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { encrypt } from "@/lib/encryption";
import { testConnection } from "@/lib/ai-provider";
import type { AIProvider } from "@/lib/types";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("global_model_config")
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Global config not found" }, { status: 404 });
    }

    const MASKED_KEY_FIELDS = [
      "api_key_encrypted",
      "whisper_api_key_encrypted",
      "anthropic_api_key_encrypted",
      "google_api_key_encrypted",
      "deepseek_api_key_encrypted",
      "custom_api_key_encrypted",
    ] as const;

    const masked = { ...data };
    for (const f of MASKED_KEY_FIELDS) {
      masked[f] = masked[f] ? "••••••••" : "";
    }

    return NextResponse.json(masked);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAdmin();
    const supabase = createServiceClient();
    const body = await req.json();

    const updates: Record<string, unknown> = { updated_by: userId };

    if (body.provider) updates.provider = body.provider;
    if (body.model_name) updates.model_name = body.model_name;
    if (body.custom_base_url !== undefined) updates.custom_base_url = body.custom_base_url;

    const taskFields = [
      "findings_provider", "findings_model",
      "conclusion_provider", "conclusion_model",
      "trace_provider", "trace_model",
      "dictation_correction_provider", "dictation_correction_model",
      "improve_writing_provider", "improve_writing_model",
    ];
    for (const field of taskFields) {
      if (field in body) updates[field] = body[field] || null;
    }

    if (body.api_key && body.api_key !== "••••••••") {
      updates.api_key_encrypted = encrypt(body.api_key);
    }

    if (body.whisper_api_key && body.whisper_api_key !== "••••••••") {
      updates.whisper_api_key_encrypted = encrypt(body.whisper_api_key);
    }

    const providerKeyMap: [string, string][] = [
      ["anthropic_api_key", "anthropic_api_key_encrypted"],
      ["google_api_key", "google_api_key_encrypted"],
      ["deepseek_api_key", "deepseek_api_key_encrypted"],
      ["custom_api_key", "custom_api_key_encrypted"],
    ];
    for (const [bodyField, dbCol] of providerKeyMap) {
      if (body[bodyField] && body[bodyField] !== "••••••••") {
        updates[dbCol] = encrypt(body[bodyField]);
      }
    }

    // Get existing config ID (singleton table)
    const { data: existing } = await supabase
      .from("global_model_config")
      .select("id")
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Global config not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("global_model_config")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const MASKED = [
      "api_key_encrypted", "whisper_api_key_encrypted",
      "anthropic_api_key_encrypted", "google_api_key_encrypted",
      "deepseek_api_key_encrypted", "custom_api_key_encrypted",
    ] as const;
    const result = { ...data };
    for (const f of MASKED) {
      result[f] = result[f] ? "••••••••" : "";
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    if (!body.provider || !body.model_name || !body.api_key) {
      return NextResponse.json({ error: "Missing provider, model_name, or api_key" }, { status: 400 });
    }

    const ok = await testConnection({
      provider: body.provider as AIProvider,
      modelName: body.model_name,
      apiKey: body.api_key,
      customBaseUrl: body.custom_base_url || undefined,
    });

    return NextResponse.json({ ok });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
