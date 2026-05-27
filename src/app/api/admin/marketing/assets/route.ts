import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("marketing_assets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return dbErrorResponse(error);
    return NextResponse.json({ assets: data || [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { type, platform, title, content, image_url, metadata } = await req.json();

    if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

    const { data, error } = await supabase
      .from("marketing_assets")
      .insert({ type, platform, title, content, image_url, metadata: metadata || {} })
      .select()
      .single();

    if (error) return dbErrorResponse(error);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await req.json();

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { error } = await supabase
      .from("marketing_assets")
      .delete()
      .eq("id", id);

    if (error) return dbErrorResponse(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
