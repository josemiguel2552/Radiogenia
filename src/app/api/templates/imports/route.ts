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
    const { data, error } = await service
      .from("user_template_imports")
      .select("org_template_id")
      .eq("user_id", user.id);

    if (error) return dbErrorResponse(error);

    const ids = (data || []).map((r: { org_template_id: string }) => r.org_template_id);
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
    const orgTemplateIds: string[] = Array.isArray(body.org_template_ids)
      ? body.org_template_ids
      : body.org_template_id
        ? [body.org_template_id]
        : [];

    if (orgTemplateIds.length === 0) {
      return NextResponse.json({ error: "No template IDs provided" }, { status: 400 });
    }

    const membership = await getOrgMembership(user.id);
    if (!membership) {
      return NextResponse.json({ error: "Not a member of any organization" }, { status: 403 });
    }

    const service = createServiceClient();

    const { data: valid } = await service
      .from("org_templates")
      .select("id")
      .eq("org_id", membership.org_id)
      .in("id", orgTemplateIds);

    const validIds = (valid || []).map((r: { id: string }) => r.id);
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid templates found" }, { status: 400 });
    }

    const rows = validIds.map((id) => ({
      user_id: user.id,
      org_template_id: id,
    }));

    const { error } = await service
      .from("user_template_imports")
      .upsert(rows, { onConflict: "user_id,org_template_id", ignoreDuplicates: true });

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

    const url = new URL(req.url);
    const orgTemplateId = url.searchParams.get("org_template_id");
    if (!orgTemplateId) {
      return NextResponse.json({ error: "Missing org_template_id" }, { status: 400 });
    }

    const service = createServiceClient();
    const { error } = await service
      .from("user_template_imports")
      .delete()
      .eq("user_id", user.id)
      .eq("org_template_id", orgTemplateId);

    if (error) return dbErrorResponse(error);

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
