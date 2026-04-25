import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { encrypt, decrypt } from "@/lib/encryption";
import { testConnection } from "@/lib/ai-provider";
import type { AIProvider } from "@/lib/types";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("global_model_config")
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Global config not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...data,
      api_key_encrypted: data.api_key_encrypted ? "••••••••" : "",
      whisper_api_key_encrypted: data.whisper_api_key_encrypted ? "••••••••" : "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAdmin();
    const supabase = await createClient();
    const body = await req.json();

    const updates: Record<string, unknown> = { updated_by: userId };

    if (body.provider) updates.provider = body.provider;
    if (body.model_name) updates.model_name = body.model_name;
    if (body.custom_base_url !== undefined) updates.custom_base_url = body.custom_base_url;

    if (body.api_key && body.api_key !== "••••••••") {
      updates.api_key_encrypted = encrypt(body.api_key);
    }

    if (body.whisper_api_key && body.whisper_api_key !== "••••••••") {
      updates.whisper_api_key_encrypted = encrypt(body.whisper_api_key);
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

    return NextResponse.json({
      ...data,
      api_key_encrypted: data.api_key_encrypted ? "••••••••" : "",
      whisper_api_key_encrypted: data.whisper_api_key_encrypted ? "••••••••" : "",
    });
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
