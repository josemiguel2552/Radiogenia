export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const orgId = req.nextUrl.searchParams.get("org_id");
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    if (!orgId) {
      const { data: orgs } = await service
        .from("organizations")
        .select("id, name, is_pilot")
        .eq("is_pilot", true)
        .order("name");
      return NextResponse.json({ pilot_orgs: orgs || [] });
    }

    let query = service
      .from("report_metrics")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data: metrics } = await query;

    const { data: members } = await service
      .from("org_members")
      .select("user_id, section_role, staff_type, org_sections(name)")
      .eq("org_id", orgId)
      .eq("is_active", true);

    const userIds = [...new Set((metrics || []).map((m) => m.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await service.from("profiles").select("id, name, email").in("id", userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    const memberMap = new Map((members || []).map((m) => {
      const sec = m.org_sections as unknown as { name: string } | null;
      return [m.user_id, { role: m.section_role, staff_type: m.staff_type, section: sec?.name || "" }];
    }));

    const { data: surveys } = await service
      .from("pilot_survey_responses")
      .select("*")
      .eq("org_id", orgId);

    const enrichedMetrics = (metrics || []).map((m) => {
      const p = profileMap.get(m.user_id);
      const mem = memberMap.get(m.user_id);
      return {
        ...m,
        user_name: p?.name || p?.email || m.user_id,
        user_email: p?.email || "",
        staff_type: mem?.staff_type || "attending",
        section: mem?.section || "",
      };
    });

    const enrichedSurveys = (surveys || []).map((s) => {
      const p = profileMap.get(s.user_id);
      return { ...s, user_name: p?.name || p?.email || "" };
    });

    return NextResponse.json({
      metrics: enrichedMetrics,
      surveys: enrichedSurveys,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
