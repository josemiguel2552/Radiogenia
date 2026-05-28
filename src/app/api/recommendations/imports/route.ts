export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrgMembership } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data } = await service
      .from("user_recommendation_imports")
      .select("org_recommendation_id")
      .eq("user_id", user.id);

    const ids = (data || []).map((r: { org_recommendation_id: string }) => r.org_recommendation_id);
    return NextResponse.json(ids);
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
    const ids: string[] = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "No recommendation IDs provided" }, { status: 400 });
    }

    const membership = await getOrgMembership(user.id);
    if (!membership) {
      return NextResponse.json({ error: "Not a member of any organization" }, { status: 403 });
    }

    const service = createServiceClient();

    const { data: valid } = await service
      .from("org_recommendations")
      .select("id")
      .eq("org_id", membership.org_id)
      .in("id", ids);

    const validIds = (valid || []).map((r: { id: string }) => r.id);
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid recommendations found" }, { status: 400 });
    }

    const rows = validIds.map((id) => ({
      user_id: user.id,
      org_recommendation_id: id,
    }));

    const { error } = await service
      .from("user_recommendation_imports")
      .upsert(rows, { onConflict: "user_id,org_recommendation_id", ignoreDuplicates: true });

    if (error) return dbErrorResponse(error);
    return NextResponse.json({ success: true, imported: validIds.length });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const service = createServiceClient();
    const { error } = await service
      .from("user_recommendation_imports")
      .delete()
      .eq("user_id", user.id)
      .eq("org_recommendation_id", id);

    if (error) return dbErrorResponse(error);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
