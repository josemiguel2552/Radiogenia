import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgMembership } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getOrgMembership(user.id);
    if (!membership) return NextResponse.json({ membership: null });

    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", membership.org_id)
      .single();

    const { data: sections } = await supabase
      .from("org_sections")
      .select("*")
      .eq("org_id", membership.org_id)
      .order("display_order");

    const { count: memberCount } = await supabase
      .from("org_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", membership.org_id)
      .eq("is_active", true);

    return NextResponse.json({
      membership,
      organization: org,
      sections: sections || [],
      active_members: memberCount || 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
