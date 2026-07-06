import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendOnboardingToolsEmail } from "@/lib/email";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One-time broadcast of the onboarding email to already-registered users.
 *
 * Admin-only. Independent of the daily cron: it keys off onboarding_broadcast_at
 * (a separate column), so it neither re-emails via the cron nor disables the 24h
 * flow for new signups. Idempotent and resumable — each recipient is stamped
 * after a successful send, so clicking again only picks up who's left. Processes
 * up to `limit` per call (default 100) to stay within the serverless timeout.
 *
 * Body: { dryRun?: boolean, limit?: number }
 */

type EmailLang = "es" | "en" | "pt";
function pickLang(o?: string | null): EmailLang {
  return o === "en" ? "en" : o === "pt" ? "pt" : "es";
}

type Row = { id: string; email: string | null; name: string | null; email_verified: boolean | null; approved: boolean | null };

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const limit = Math.min(Math.max(Number(body?.limit) || 100, 1), 200);

    // Candidates: individual (non-org, non-admin) users with a valid, confirmed,
    // approved account that haven't received the broadcast yet.
    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id, email, name, email_verified, approved")
      .is("onboarding_broadcast_at", null)
      .not("email", "is", null)
      .neq("role", "admin")
      .is("org_id", null)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (error) {
      if (error.message?.includes("onboarding_broadcast_at")) {
        return NextResponse.json({ ok: true, migration: false, wouldSend: 0, sent: 0, remaining: 0 });
      }
      return dbErrorResponse(error);
    }

    const candidates = (rows || []).filter(
      (p: Row) => p.email && p.email_verified !== false && p.approved !== false,
    );

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        wouldSend: candidates.length,
        sample: candidates.slice(0, 5).map((c) => c.email),
      });
    }

    const batch = candidates.slice(0, limit);

    // Preferred language per user.
    const langById = new Map<string, EmailLang>();
    if (batch.length > 0) {
      const ids = batch.map((c) => c.id);
      const { data: cfgs } = await supabase
        .from("user_model_config")
        .select("user_id, output_language")
        .in("user_id", ids);
      for (const c of (cfgs || []) as { user_id: string; output_language: string | null }[]) {
        langById.set(c.user_id, pickLang(c.output_language));
      }
    }

    let sent = 0;
    const errors: string[] = [];
    for (const p of batch) {
      try {
        await sendOnboardingToolsEmail(p.email as string, p.name, langById.get(p.id) || "es");
        await supabase
          .from("profiles")
          .update({ onboarding_broadcast_at: new Date().toISOString() })
          .eq("id", p.id);
        sent += 1;
      } catch (e) {
        errors.push(`${p.email}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      errors,
      remaining: Math.max(0, candidates.length - sent),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
