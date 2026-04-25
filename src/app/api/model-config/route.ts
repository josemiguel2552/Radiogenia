import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("user_model_config")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      data.api_key_encrypted = data.api_key_encrypted ? "••••••••" : "";
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return NextResponse.json({ ...data, role: profile?.role || "radiologist" });
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

    const { data, error } = await supabase
      .from("user_model_config")
      .update(body)
      .eq("user_id", user.id)
      .select()
      .single();

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
