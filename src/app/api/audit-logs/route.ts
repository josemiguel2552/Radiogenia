import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, report_id, provider, model, duration_ms, had_corrections, metadata } = body;

    const validActions = ["generate_findings", "generate_conclusion", "save_report", "report_error"];
    if (!action || !validActions.includes(action)) {
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
      if (error.message?.includes("audit_logs")) {
        return NextResponse.json({ ok: true, skipped: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
