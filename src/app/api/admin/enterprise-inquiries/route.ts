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
      .from("enterprise_inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      if (error.message?.includes("enterprise_inquiries")) return NextResponse.json([]);
      return dbErrorResponse(error);
    }
    return NextResponse.json(data || []);
  } catch (e) {
    return toErrorResponse(e, 403);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = createServiceClient();
    const { error } = await supabase.from("enterprise_inquiries").delete().eq("id", id);
    if (error) return dbErrorResponse(error);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e, 403);
  }
}
