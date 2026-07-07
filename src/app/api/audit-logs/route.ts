import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, report_id, provider, model, duration_ms, had_corrections, metadata } = body;

    const validActions = ["generate_findings", "generate_conclusion", "save_report", "report_error", "correction_logged"];
    // UI product-analytics events: which tools/buttons users interact with.
    const UI_ACTIONS = new Set([
      "ui_view_templates", "ui_view_calculators", "ui_view_recommendations", "ui_view_account",
      "ui_copy_report", "ui_new_report", "ui_dictation_start",
      "ui_template_selected", "ui_calculator_opened",
      "ui_rec_panel_open", "ui_rec_selected", "ui_rec_copied",
      "ui_bot_opened", "ui_classify_clicked", "ui_clinical_check_clicked",
      "ui_try_example", "ui_abandon_after_generate",
      "ui_bot_feedback", "ui_dictation_feedback",
    ]);
    if (!action || (!validActions.includes(action) && !UI_ACTIONS.has(action))) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const row: Record<string, unknown> = {
      user_id: user.id,
      action,
      report_id: report_id || null,
      provider: provider || null,
      model: model || null,
      duration_ms: duration_ms || null,
      had_corrections: had_corrections || false,
      metadata: metadata || {},
    };

    const { error } = await supabase
      .from("audit_logs")
      .insert(row);

    if (error) {
      // Never break the UI over telemetry, but leave a trace in server logs —
      // a silent swallow here hid a stale DB constraint once already.
      console.error(`[audit-logs] insert failed for action="${action}": ${error.message}`);
      if (error.message?.includes("audit_logs")) {
        return NextResponse.json({ ok: true, skipped: true });
      }
      return dbErrorResponse(error);
    }

    if (action === "report_error" && report_id) {
      await supabase
        .from("reports")
        .update({
          error_reported: true,
          error_report_note: metadata?.note || null,
        })
        .eq("id", report_id)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
