import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief"],
    });

    const url = new URL(req.url);
    const sectionId = url.searchParams.get("section_id");
    const userId = url.searchParams.get("user_id");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Get member user_ids for the allowed scope
    let membersQuery = supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", membership.org_id)
      .eq("is_active", true);

    if (!membership.is_org_chief && membership.section_id) {
      membersQuery = membersQuery.eq("section_id", membership.section_id);
    } else if (sectionId) {
      membersQuery = membersQuery.eq("section_id", sectionId);
    }

    const { data: members } = await membersQuery;
    const memberIds = (members || []).map((m) => m.user_id);

    if (memberIds.length === 0) return NextResponse.json([]);

    let query = supabase
      .from("reports")
      .select("id, user_id, study_type, modality, created_at, findings_text, conclusion_text")
      .in("user_id", memberIds)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userId) query = query.eq("user_id", userId);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error } = await query;
    if (error) return dbErrorResponse(error);

    return NextResponse.json(data || []);
  } catch (error) {
    return toErrorResponse(error);
  }
}
