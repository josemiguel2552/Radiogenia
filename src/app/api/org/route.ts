import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrgMembership } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getOrgMembership(user.id);
    if (!membership) return NextResponse.json({ membership: null });

    const service = createServiceClient();

    const { data: org } = await service
      .from("organizations")
      .select("*")
      .eq("id", membership.org_id)
      .single();

    const { data: sections } = await service
      .from("org_sections")
      .select("*")
      .eq("org_id", membership.org_id)
      .order("display_order");

    const { count: memberCount } = await service
      .from("org_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", membership.org_id)
      .eq("is_active", true);

    return NextResponse.json({
      membership,
      organization: org,
      sections: sections || [],
      active_members: memberCount || 0,
    }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
