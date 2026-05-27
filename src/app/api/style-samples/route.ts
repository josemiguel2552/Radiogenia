import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("style_samples")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return dbErrorResponse(error);
    return NextResponse.json(data || []);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const insertPayload = {
      user_id: user.id,
      modality: body.modality || "",
      original_text: body.original_text || "",
      edited_text: body.edited_text || "",
    };

    const { data, error } = await supabase.from("style_samples").insert(insertPayload).select().single();
    if (error) return dbErrorResponse(error);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id === "all") {
      const { error } = await supabase.from("style_samples").delete().eq("user_id", user.id);
      if (error) return dbErrorResponse(error);
    } else if (id) {
      const { error } = await supabase.from("style_samples").delete().eq("id", id).eq("user_id", user.id);
      if (error) return dbErrorResponse(error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
