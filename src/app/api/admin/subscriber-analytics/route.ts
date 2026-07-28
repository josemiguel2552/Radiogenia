import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * Subscriber CONVERSION analytics (card-first billing model).
 *
 * The question is no longer "do they like the tools?" but "do they end up
 * paying — and do they cancel?". For recently-registered individual users
 * this aggregates the money funnel from profiles alone (no audit logs):
 *
 *   registered → email verified → card added (trial started) → paying
 *
 * plus the current state of every cohort member (trialing, trial cancelled,
 * paying, cancellation scheduled, lapsed, never activated) and key dates.
 * Admin-only; excludes admins and hospital/org members.
 */

type Row = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  country: string | null;
  subscription_plan: string | null;
  email_verified: boolean | null;
  stripe_subscription_id: string | null;
  pending_plan: string | null;
  pending_plan_effective_date: string | null;
  reports_used_this_month: number | null;
  trial_used_at?: string | null;
  trial_ends_at?: string | null;
  subscription_cancelled_at?: string | null;
  subscription_ended_at?: string | null;
};

export type ConvState =
  | "unverified"      // never verified their email — never saw Stripe
  | "no_card"         // verified but abandoned before entering the card
  | "trialing"        // trial running, renewal intact
  | "trial_cancelled" // trial running but renewal cancelled
  | "paying"          // active paid subscription
  | "cancel_scheduled"// paying but cancellation scheduled
  | "lapsed"          // had a subscription, now gone
  | "bonus";          // non-free plan without Stripe (manual/bonus)

function stateOf(r: Row, now: number): ConvState {
  const trialActive = !!r.trial_ends_at && Date.parse(r.trial_ends_at) > now;
  const cancelPending = r.pending_plan === "free";
  if (trialActive) return cancelPending ? "trial_cancelled" : "trialing";
  if (r.subscription_plan && r.subscription_plan !== "free") {
    if (!r.stripe_subscription_id) return "bonus";
    return cancelPending ? "cancel_scheduled" : "paying";
  }
  if (r.subscription_ended_at || r.trial_used_at) return "lapsed";
  return r.email_verified === false ? "unverified" : "no_card";
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const url = new URL(req.url);
    const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 365);
    const now = Date.now();
    const cutoff = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: profRaw, error: profErr } = await supabase
      .from("profiles")
      .select("id, email, name, created_at, country, subscription_plan, email_verified, stripe_subscription_id, pending_plan, pending_plan_effective_date, reports_used_this_month, role, org_id")
      .gte("created_at", cutoff)
      .neq("role", "admin")
      .is("org_id", null)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (profErr) return dbErrorResponse(profErr);
    const rows = (profRaw || []) as Row[];

    // Trial/cancellation columns are best-effort (they arrive with the
    // trial-billing migrations).
    const extraById = new Map<string, Partial<Row>>();
    const extraSelects = [
      "id, trial_used_at, trial_ends_at, subscription_cancelled_at, subscription_ended_at",
      "id, trial_used_at, trial_ends_at, subscription_ended_at",
      "id, trial_used_at, trial_ends_at",
    ];
    for (const sel of extraSelects) {
      const { data, error } = await supabase
        .from("profiles")
        .select(sel)
        .gte("created_at", cutoff)
        .limit(2000);
      if (!error) {
        for (const r of (data || []) as unknown as Row[]) extraById.set(r.id, r);
        break;
      }
    }
    for (const r of rows) Object.assign(r, extraById.get(r.id) || {});

    if (rows.length === 0) {
      return NextResponse.json({ days, generatedAt: new Date().toISOString(), cohortSize: 0, empty: true });
    }

    // ── Funnel + states ──
    const funnel = { registered: rows.length, verified: 0, cardAdded: 0, paying: 0 };
    const states: Record<ConvState, number> = {
      unverified: 0, no_card: 0, trialing: 0, trial_cancelled: 0,
      paying: 0, cancel_scheduled: 0, lapsed: 0, bonus: 0,
    };
    const payingByPlan: Record<string, number> = {};
    let trialCancellations = 0; // cancelled during an (ongoing or past) trial
    let finishedTrials = 0;     // trials whose end date has passed
    let finishedTrialsPaid = 0; // ...that turned into a live paid subscription

    const perDay = new Map<string, { signups: number; cards: number }>();
    const dayKey = (iso: string) => iso.slice(0, 10);

    const users = rows.map((r) => {
      const st = stateOf(r, now);
      states[st] += 1;

      if (r.email_verified !== false) funnel.verified += 1;
      const cardAdded = !!(r.trial_used_at || r.stripe_subscription_id);
      if (cardAdded) funnel.cardAdded += 1;
      const payingNow = st === "paying" || st === "cancel_scheduled";
      if (payingNow) {
        funnel.paying += 1;
        const plan = r.subscription_plan || "starter";
        payingByPlan[plan] = (payingByPlan[plan] || 0) + 1;
      }

      if (r.subscription_cancelled_at && (st === "trial_cancelled" || (r.trial_ends_at && Date.parse(r.subscription_cancelled_at) < Date.parse(r.trial_ends_at)))) {
        trialCancellations += 1;
      }
      if (r.trial_ends_at && Date.parse(r.trial_ends_at) <= now) {
        finishedTrials += 1;
        if (payingNow) finishedTrialsPaid += 1;
      }

      const sd = dayKey(r.created_at);
      if (!perDay.has(sd)) perDay.set(sd, { signups: 0, cards: 0 });
      perDay.get(sd)!.signups += 1;
      if (r.trial_used_at) {
        const cd = dayKey(r.trial_used_at);
        if (!perDay.has(cd)) perDay.set(cd, { signups: 0, cards: 0 });
        perDay.get(cd)!.cards += 1;
      }

      return {
        id: r.id,
        email: r.email || "—",
        name: r.name || "—",
        signup: r.created_at,
        country: r.country,
        plan: r.subscription_plan || "free",
        state: st,
        emailVerified: r.email_verified !== false,
        trialStartedAt: r.trial_used_at || null,
        trialEndsAt: r.trial_ends_at || null,
        cancelledAt: r.subscription_cancelled_at || null,
        accessUntil: r.pending_plan === "free" ? (r.pending_plan_effective_date || r.trial_ends_at || null) : null,
        endedAt: r.subscription_ended_at || null,
        reportsThisMonth: Math.max(0, r.reports_used_this_month || 0),
      };
    });

    const timeline = [...perDay.entries()]
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => a.day.localeCompare(b.day));

    return NextResponse.json({
      days,
      generatedAt: new Date().toISOString(),
      cohortSize: rows.length,
      funnel,
      states,
      payingByPlan,
      trialCancellations,
      trialConversion: { finished: finishedTrials, paid: finishedTrialsPaid },
      timeline,
      users: users.slice(0, 300),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
