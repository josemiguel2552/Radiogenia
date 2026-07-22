import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// One-shot sync: creates report_metrics rows for a hospital's saved reports
// that predate the server-side metric recording (or whose client-side metric
// call failed). Idempotent — only fills reports without an existing row.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const { org_id } = await req.json();
    if (!org_id) return NextResponse.json({ error: "Missing org_id" }, { status: 400 });

    const { data: members } = await service
      .from("org_members")
      .select("user_id")
      .eq("org_id", org_id);
    const userIds = [...new Set((members || []).map((m) => m.user_id as string))];
    if (userIds.length === 0) return NextResponse.json({ ok: true, created: 0, reason: "no_members" });

    const since = new Date();
    since.setDate(since.getDate() - 90);

    const { data: reports, error: rErr } = await service
      .from("reports")
      .select("id, user_id, study_type, findings_text, conclusion_text, initial_findings_text, initial_conclusion_text, generation_duration_ms, created_at")
      .in("user_id", userIds)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .limit(1000);
    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
    if (!reports || reports.length === 0) return NextResponse.json({ ok: true, created: 0, reason: "no_reports" });

    const { data: existing, error: mErr } = await service
      .from("report_metrics")
      .select("report_id")
      .in("report_id", reports.map((r) => r.id));
    if (mErr) return NextResponse.json({ error: `report_metrics: ${mErr.message}` }, { status: 500 });

    const have = new Set((existing || []).map((m) => m.report_id));
    const missing = reports.filter((r) => !have.has(r.id));

    let created = 0;
    const errors: string[] = [];
    for (const r of missing) {
      const aiF = r.initial_findings_text || r.findings_text || "";
      const aiC = r.initial_conclusion_text || r.conclusion_text || "";
      const draftLen = aiF.length + aiC.length;
      const row: Record<string, unknown> = {
        user_id: r.user_id,
        org_id,
        report_id: r.id,
        report_end_at: r.created_at,
        created_at: r.created_at, // keep date-range filters meaningful
        duration_seconds: r.generation_duration_ms ? Math.round(r.generation_duration_ms / 1000) : 0,
        ai_draft_length: draftLen,
        final_length: (r.findings_text || "").length + (r.conclusion_text || "").length,
        study_type: r.study_type || "",
        ai_findings_text: aiF,
        ai_conclusion_text: aiC,
        final_findings_text: r.findings_text || "",
        final_conclusion_text: r.conclusion_text || "",
      };
      const { error } = await service.from("report_metrics").insert(row);
      if (error) errors.push(error.message);
      else created++;
    }

    return NextResponse.json({ ok: true, created, skipped: have.size, errors: errors.slice(0, 3) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
