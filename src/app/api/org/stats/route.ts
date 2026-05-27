import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOrgRole } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await requireOrgRole(user.id, {
      chief: true,
    });

    const service = createServiceClient();
    const url = new URL(req.url);
    const sectionId = url.searchParams.get("section_id");

    let membersQuery = service
      .from("org_members")
      .select("user_id, section_id, section_role, is_org_chief, org_sections(name)")
      .eq("org_id", membership.org_id)
      .eq("is_active", true);

    if (!membership.is_org_chief && membership.section_id) {
      membersQuery = membersQuery.eq("section_id", membership.section_id);
    } else if (sectionId) {
      membersQuery = membersQuery.eq("section_id", sectionId);
    }

    const { data: members } = await membersQuery;
    if (!members || members.length === 0) {
      return NextResponse.json({ members: [], sections: [], total_reports_this_month: 0, total_members: 0 }, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    const memberIds = members.map((m) => m.user_id as string);

    const { data: profiles } = await service
      .from("profiles")
      .select("id, email, name")
      .in("id", memberIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: reports } = await service
      .from("reports")
      .select("user_id, id")
      .in("user_id", memberIds)
      .gte("created_at", monthStart);

    const countMap = new Map<string, number>();
    for (const r of reports || []) {
      countMap.set(r.user_id, (countMap.get(r.user_id) || 0) + 1);
    }

    const memberStats = members.map((m) => {
      const profile = profileMap.get(m.user_id);
      const section = m.org_sections as unknown as { name: string } | null;
      return {
        user_id: m.user_id,
        email: profile?.email || "",
        name: profile?.name || "",
        section_id: m.section_id,
        section_name: section?.name || "",
        section_role: m.section_role,
        is_org_chief: m.is_org_chief,
        reports_this_month: countMap.get(m.user_id as string) || 0,
      };
    });

    const sectionMap = new Map<string, { name: string; members: number; reports: number }>();
    for (const ms of memberStats) {
      const key = ms.section_id || "unassigned";
      const existing = sectionMap.get(key) || { name: ms.section_name || "Sin sección", members: 0, reports: 0 };
      existing.members++;
      existing.reports += ms.reports_this_month;
      sectionMap.set(key, existing);
    }

    return NextResponse.json({
      members: memberStats,
      sections: Array.from(sectionMap.entries()).map(([id, s]) => ({ id, ...s })),
      total_reports_this_month: Array.from(countMap.values()).reduce((a, b) => a + b, 0),
      total_members: memberStats.length,
    }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
