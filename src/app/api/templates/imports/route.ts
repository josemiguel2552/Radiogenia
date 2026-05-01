import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrgMembership } from "@/lib/auth-helpers";

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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const ids = (data || []).map((r: { org_template_id: string }) => r.org_template_id);
    return NextResponse.json(ids);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
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
    const rows = orgTemplateIds.map((id) => ({
      user_id: user.id,
      org_template_id: id,
    }));

    const { error } = await service
      .from("user_template_imports")
      .upsert(rows, { onConflict: "user_id,org_template_id", ignoreDuplicates: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, imported: orgTemplateIds.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
