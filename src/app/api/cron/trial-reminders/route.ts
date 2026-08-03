import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendTrialReminderEmail } from "@/lib/email";
import { PLANS } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-error";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Day-6 trial charge reminder, driven by a daily Vercel Cron (see
 * vercel.json). Users whose 7-day trial ends within the next ~36 hours get
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


type SupabaseService = ReturnType<typeof createServiceClient>;

/**
 * Stamp trial_used_at / trial_ends_at for subscriptions Stripe reports as
 * trialing but that carry no local trial dates. Returns how many rows were
 * repaired. Silent no-op when Stripe or the columns are unavailable.
 */
async function backfillTrialDates(supabase: SupabaseService): Promise<number> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return 0;

  let candidates: { id: string; stripe_subscription_id: string }[] = [];
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, stripe_subscription_id")
      .not("stripe_subscription_id", "is", null)
      .is("trial_ends_at", null)
      .is("org_id", null)
      .limit(100);
    if (error) return 0;
    candidates = (data || []) as { id: string; stripe_subscription_id: string }[];
  } catch {
    return 0;
  }
  if (candidates.length === 0) return 0;

  const stripe = new Stripe(key);
  let repaired = 0;
  for (const c of candidates) {
    try {
      const sub = await stripe.subscriptions.retrieve(c.stripe_subscription_id);
      if (!sub.trial_end) continue;
      await supabase
        .from("profiles")
        .update({
          trial_ends_at: new Date(sub.trial_end * 1000).toISOString(),
          trial_used_at: sub.trial_start
            ? new Date(sub.trial_start * 1000).toISOString()
            : new Date(sub.created * 1000).toISOString(),
        })
        .eq("id", c.id);
      repaired += 1;
      console.log(`[trial-reminders] backfilled trial dates for profile ${c.id}`);
    } catch { /* one bad subscription must not stop the rest */ }
  }
  return repaired;
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
      // A scheduled run arrives with a Vercel user-agent and no session. If
      // CRON_SECRET is unset the admin check below rejects it and the job
      // silently does nothing — make that visible instead of invisible.
      const isScheduled = (req.headers.get("user-agent") || "").toLowerCase().includes("vercel-cron");
      if (isScheduled && !secret) {
        console.error("[cron] CRON_SECRET is not configured — scheduled run rejected, no emails sent");
        return NextResponse.json({ ok: false, error: "cron_secret_missing" }, { status: 401 });
      }
      await requireAdmin();
    }

    const supabase = createServiceClient();
    const now = new Date();
    const windowEnd = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);

    // Self-heal: a trial started before the trial-billing migration existed
    // never got its dates stamped, so the reminder would never find it.
    // Ask Stripe for the truth and backfill before selecting candidates.
    const backfilled = await backfillTrialDates(supabase);

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
      // When nobody matches, explain WHY: the usual causes are the trial
      // columns never being stamped (migration applied after the trials
      // started) or the cron running unauthenticated because CRON_SECRET
      // is missing in the host environment.
      const diagnostics: Record<string, unknown> = {
        now: now.toISOString(),
        windowEnd: windowEnd.toISOString(),
        cronSecretConfigured: !!secret,
      };
      try {
        const { count: withTrialEnd } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .not("trial_ends_at", "is", null);
        const { count: alreadySent } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .not("trial_reminder_sent_at", "is", null);
        const { count: withSubscription } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .not("stripe_subscription_id", "is", null);
        diagnostics.profilesWithTrialEndsAt = withTrialEnd ?? null;
        diagnostics.profilesWithSubscription = withSubscription ?? null;
        diagnostics.remindersAlreadySent = alreadySent ?? null;

        // The next few upcoming trial ends, whatever their state.
        const { data: upcoming } = await supabase
          .from("profiles")
          .select("email, trial_ends_at, trial_reminder_sent_at, stripe_subscription_id")
          .not("trial_ends_at", "is", null)
          .order("trial_ends_at", { ascending: false })
          .limit(10);
        diagnostics.recentTrials = (upcoming || []).map((u) => ({
          email: u.email,
          trialEndsAt: u.trial_ends_at,
          reminderSentAt: u.trial_reminder_sent_at,
          hasSubscription: !!u.stripe_subscription_id,
        }));
      } catch (e) {
        diagnostics.error = e instanceof Error ? e.message : String(e);
      }

      return NextResponse.json({
        ok: true,
        dryRun: true,
        backfilled,
        wouldSend: candidates.length,
        users: candidates.map((c) => ({ email: c.email, trialEndsAt: c.trial_ends_at, lang: langById.get(c.id) || "es" })),
        diagnostics,
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

    return NextResponse.json({ ok: true, sent, backfilled, candidates: candidates.length, errors });
  } catch (error) {
    return toErrorResponse(error);
  }
}
