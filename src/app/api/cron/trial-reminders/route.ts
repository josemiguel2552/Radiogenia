import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendTrialReminderEmail } from "@/lib/email";
import { PLANS } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Day-14 trial charge reminder, driven by a daily Vercel Cron (see
 * vercel.json). Users whose 15-day trial ends within the next ~36 hours get
 * one email reminding them of the upcoming Starter charge, that payments are
 * non-refundable, and how to cancel. Guarded by trial_reminder_sent_at so
 * repeated runs never email anyone twice per trial.
 *
 * Auth mirrors /api/cron/onboarding-emails: Vercel's `Bearer ${CRON_SECRET}`
 * or an authenticated admin (e.g. with ?dryRun=1 to preview).
 */

type EmailLang = "es" | "en" | "pt";

function pickLang(output_language: string | null | undefined): EmailLang {
  if (output_language === "en") return "en";
  if (output_language === "pt") return "pt";
  return "es";
}

const WINDOW_HOURS = 36;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";

    const auth = req.headers.get("authorization") || "";
    const secret = process.env.CRON_SECRET;
    const hasCronAuth = !!secret && auth === `Bearer ${secret}`;
    if (!hasCronAuth) {
      await requireAdmin();
    }

    const supabase = createServiceClient();
    const now = new Date();
    const windowEnd = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);

    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id, email, name, trial_ends_at")
      .is("trial_reminder_sent_at", null)
      .not("trial_ends_at", "is", null)
      .not("stripe_subscription_id", "is", null)
      .gt("trial_ends_at", now.toISOString())
      .lte("trial_ends_at", windowEnd.toISOString())
      .is("org_id", null)
      .neq("role", "admin")
      .order("trial_ends_at", { ascending: true })
      .limit(100);

    if (error) {
      // Trial-billing migration not applied yet: report instead of crashing.
      if (error.message?.includes("trial_")) {
        return NextResponse.json({ ok: false, migration: false, error: error.message });
      }
      throw error;
    }

    const candidates = (rows || []).filter((p) => p.email);

    const langById = new Map<string, EmailLang>();
    if (candidates.length > 0) {
      const { data: configs } = await supabase
        .from("user_model_config")
        .select("user_id, output_language")
        .in("user_id", candidates.map((c) => c.id));
      for (const c of (configs || []) as { user_id: string; output_language: string | null }[]) {
        langById.set(c.user_id, pickLang(c.output_language));
      }
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        wouldSend: candidates.length,
        users: candidates.map((c) => ({ email: c.email, trialEndsAt: c.trial_ends_at, lang: langById.get(c.id) || "es" })),
      });
    }

    let sent = 0;
    const errors: string[] = [];
    for (const p of candidates) {
      try {
        await sendTrialReminderEmail(
          p.email as string,
          p.name,
          langById.get(p.id) || "es",
          p.trial_ends_at as string,
          PLANS.starter.price,
        );
        const { error: upErr } = await supabase
          .from("profiles")
          .update({ trial_reminder_sent_at: new Date().toISOString() })
          .eq("id", p.id);
        if (upErr) errors.push(`mark ${p.email}: ${upErr.message}`);
        sent += 1;
      } catch (e) {
        errors.push(`${p.email}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({ ok: true, sent, candidates: candidates.length, errors });
  } catch (error) {
    return toErrorResponse(error);
  }
}
