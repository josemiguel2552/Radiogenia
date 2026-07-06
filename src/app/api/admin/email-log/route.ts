import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * Per-user log of which lifecycle emails (24h tools / 48h report-types /
 * 5-day guidelines) have been sent, plus signup date and eligibility, so an
 * admin can confirm coverage and manually send any that are overdue.
 * Admin-only.
 */
export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, name, created_at, email_verified, approved, onboarding_email_sent_at, report_types_email_sent_at, guidelines_email_sent_at")
      .neq("role", "admin")
      .is("org_id", null)
      .not("email", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      // A missing column means a migration hasn't been applied yet.
      if (error.message?.includes("_email_sent_at") || error.message?.includes("guidelines")) {
        return NextResponse.json({ users: [], migration: false });
      }
      return dbErrorResponse(error);
    }

    const users = (data || []).map((p) => ({
      id: p.id,
      email: p.email,
      name: p.name,
      signup: p.created_at,
      verified: p.email_verified !== false,
      approved: p.approved !== false,
      sent: {
        tools: p.onboarding_email_sent_at || null,
        report_types: p.report_types_email_sent_at || null,
        guidelines: p.guidelines_email_sent_at || null,
      },
    }));

    return NextResponse.json({ users });
  } catch (error) {
    return toErrorResponse(error);
  }
}
