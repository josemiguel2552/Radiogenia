export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrgMembership } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const service = createServiceClient();

    if (body._method === "PATCH" && body.report_id) {
      const update: Record<string, unknown> = {};
      if (body.final_length !== undefined) update.final_length = body.final_length;
      if (body.edit_distance !== undefined) update.edit_distance = body.edit_distance;
      if (body.report_end_at) update.report_end_at = body.report_end_at;
      if (body.duration_seconds !== undefined) update.duration_seconds = body.duration_seconds;
      if (body.final_findings_text !== undefined) update.final_findings_text = body.final_findings_text;
      if (body.final_conclusion_text !== undefined) update.final_conclusion_text = body.final_conclusion_text;
      if (body.recommendations_text !== undefined) update.recommendations_text = body.recommendations_text;

      await service
        .from("report_metrics")
        .update(update)
        .eq("report_id", body.report_id)
        .eq("user_id", user.id);

      return NextResponse.json({ ok: true });
    }

    const membership = await getOrgMembership(user.id);

    const startAt = body.report_start_at ? new Date(body.report_start_at) : null;
    const endAt = body.report_end_at ? new Date(body.report_end_at) : null;
    const duration = startAt && endAt
      ? Math.round((endAt.getTime() - startAt.getTime()) / 1000)
      : (body.duration_seconds || 0);

    const row = {
      user_id: user.id,
      org_id: membership?.org_id || null,
      report_id: body.report_id || null,
      report_start_at: body.report_start_at || null,
      report_end_at: body.report_end_at || null,
      duration_seconds: duration,
      dictation_chars: body.dictation_chars || 0,
      manual_chars: body.manual_chars || 0,
      total_chars: body.total_chars || 0,
      template_sections_total: body.template_sections_total || 0,
      template_sections_filled: body.template_sections_filled || 0,
      ai_draft_length: body.ai_draft_length || 0,
      final_length: body.final_length || 0,
      edit_distance: body.edit_distance || 0,
      ai_findings_text: body.ai_findings_text || "",
      ai_conclusion_text: body.ai_conclusion_text || "",
      study_type: body.study_type || "",
    };

    // The report save (/api/reports) already creates the metric row server-side.
    // If it exists for this report, enrich it; otherwise insert. Prevents
    // duplicate rows double-counting in the hospital dashboard.
    let existing: { id: string } | null = null;
    if (body.report_id) {
      const { data: found } = await service
        .from("report_metrics").select("id").eq("report_id", body.report_id).limit(1).maybeSingle();
      existing = found;
    }
    if (existing) {
      await service.from("report_metrics").update(row).eq("id", existing.id);
    } else {
      await service.from("report_metrics").insert(row);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
