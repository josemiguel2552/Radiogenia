import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { encrypt } from "@/lib/encryption";
import { getUserRole } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();

    let { data } = await service
      .from("user_model_config")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) {
      await service.from("user_model_config").upsert(
        { user_id: user.id },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
      const { data: retry } = await service
        .from("user_model_config")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      data = retry;
    }

    if (data) {
      data.api_key_encrypted = data.api_key_encrypted ? "••••••••" : "";
      if (data.compact_normals === undefined) data.compact_normals = false;
      if (!data.dictation_language) data.dictation_language = "auto";
    }

    const role = await getUserRole(user.id);

    return NextResponse.json({ ...data, role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Encrypt API key if provided and not the masked value
    if (body.api_key && body.api_key !== "••••••••") {
      body.api_key_encrypted = encrypt(body.api_key);
    }
    delete body.api_key;

    // Remove fields that shouldn't be updated directly
    delete body.id;
    delete body.user_id;
    delete body.created_at;
    delete body.updated_at;
    delete body.style_sample_count;
    delete body.role;

    // Non-admins cannot change provider, model, or API key
    const role = await getUserRole(user.id);
    if (role !== "admin") {
      delete body.provider;
      delete body.model_name;
      delete body.custom_base_url;
      delete body.api_key_encrypted;
    }

    const service = createServiceClient();

    // Try upsert; if a column is missing (migration not applied), retry without it
    let result = await service
      .from("user_model_config")
      .upsert({ ...body, user_id: user.id }, { onConflict: "user_id" })
      .select()
      .single();

    if (result.error?.message?.includes("column")) {
      delete body.compact_normals;
      delete body.dictation_language;
      result = await service
        .from("user_model_config")
        .upsert({ ...body, user_id: user.id }, { onConflict: "user_id" })
        .select()
        .single();
    }

    const { data, error } = result;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (data) {
      data.api_key_encrypted = data.api_key_encrypted ? "••••••••" : "";
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
