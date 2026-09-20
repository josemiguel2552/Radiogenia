import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PLANS, type SubscriptionPlan } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-error";
import Stripe from "stripe";
import {
  decideCancellation,
  cancellationConfirmed,
  decideReactivation,
  reactivationConfirmed,
  priceRestored,
  isBilling,
  type SubscriptionLike,
} from "@/lib/cancel-subscription";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

const PLAN_PRICE_ENV: Record<string, string> = {
  resident: "STRIPE_PRICE_ID_RESIDENT",
  starter: "STRIPE_PRICE_ID_STARTER",
  professional: "STRIPE_PRICE_ID_PROFESSIONAL",
  unlimited: "STRIPE_PRICE_ID_UNLIMITED",
};

export const dynamic = "force-dynamic";

function getNextPeriodDate(periodStart: string): Date {
  const start = new Date(periodStart);
  const next = new Date(start);
  next.setMonth(next.getMonth() + 1);
  return next;
}


/**
 * Finds the subscription Stripe really holds for this customer. The stored id
 * can be missing entirely — the checkout webhook may never have arrived, which
 * this codebase already compensates for elsewhere — so a customer-wide lookup
 * is the fallback rather than an optimisation.
 *
 * Returns `lookupFailed` instead of throwing, because the caller has to tell
 * "Stripe says nothing is billing" apart from "we could not ask Stripe".
 */
async function findLiveSubscription(
  stripe: Stripe,
  customerId: string,
  storedSubId: string | null | undefined,
): Promise<{ subscription: SubscriptionLike | null; lookupFailed: boolean }> {
  let stored: Stripe.Subscription | null = null;
  try {
    if (storedSubId) stored = await stripe.subscriptions.retrieve(storedSubId);
  } catch {
    // A stale id is not a failure: fall through to the customer lookup, which
    // is the authoritative answer anyway.
    stored = null;
  }
  if (isBilling(stored)) return { subscription: stored, lookupFailed: false };

  try {
    const list = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
    const live = list.data.find((s) => isBilling(s)) ?? null;
    return { subscription: live ?? stored, lookupFailed: false };
  } catch {
    return { subscription: null, lookupFailed: true };
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("subscription_plan, reports_used_this_month, dictation_seconds_used, billing_period_start, pending_plan, pending_plan_effective_date, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    let referralBonusExpires: string | null = null;
    let stripeSubId: string | null = null;
    try {
      const { data: extra } = await service
        .from("profiles")
        .select("referral_bonus_expires_at, stripe_subscription_id")
        .eq("id", user.id)
        .single();
      referralBonusExpires = extra?.referral_bonus_expires_at ?? null;
      stripeSubId = extra?.stripe_subscription_id ?? null;
    } catch { /* columns may not exist yet */ }

    // Active-trial end date + whether this account already used its one trial
    // (best-effort: columns may predate the migration).
    let trialEndsAt: string | null = null;
    let trialUsed = false;
    try {
      const { data: trialRow } = await service
        .from("profiles")
        .select("trial_ends_at, trial_used_at")
        .eq("id", user.id)
        .single();
      if (trialRow?.trial_ends_at && new Date(trialRow.trial_ends_at).getTime() > Date.now()) {
        trialEndsAt = trialRow.trial_ends_at;
      }
      trialUsed = !!trialRow?.trial_used_at;
    } catch { /* ignore */ }

    // Self-healing sync with Stripe: if the user has a Stripe customer but the
    // local plan is "free" (e.g. the checkout webhook never arrived), query
    // Stripe directly for the active subscription and reconcile the DB.
    if (profile.stripe_customer_id && profile.subscription_plan === "free" && !profile.pending_plan) {
      const stripe = getStripe();
      if (stripe) {
        try {
          let sub: Stripe.Subscription | null = null;

          if (stripeSubId) {
            try {
              sub = await stripe.subscriptions.retrieve(stripeSubId);
            } catch { /* stored sub id stale — fall through to customer lookup */ }
          }

          if (!sub || (sub.status !== "active" && sub.status !== "trialing")) {
            const list = await stripe.subscriptions.list({
              customer: profile.stripe_customer_id,
              status: "active",
              limit: 1,
            });
            sub = list.data[0] ?? sub;
          }

          if (sub && (sub.status === "active" || sub.status === "trialing")) {
            const priceId = sub.items.data[0]?.price?.id;
            const envMap: Record<string, SubscriptionPlan> = {};
            for (const [plan, envKey] of Object.entries(PLAN_PRICE_ENV)) {
              const pid = process.env[envKey];
              if (pid) envMap[pid] = plan as SubscriptionPlan;
            }
            const realPlan = priceId ? envMap[priceId] : undefined;
            if (realPlan && realPlan !== "free") {
              profile.subscription_plan = realPlan;
              profile.billing_period_start = new Date(
                (sub.items.data[0]?.current_period_start ?? Math.floor(Date.now() / 1000)) * 1000
              ).toISOString();
              profile.reports_used_this_month = 0;
              profile.dictation_seconds_used = 0;
              stripeSubId = sub.id;
              await service
                .from("profiles")
                .update({
                  subscription_plan: realPlan,
                  stripe_subscription_id: sub.id,
                  billing_period_start: profile.billing_period_start,
                  reports_used_this_month: 0,
                  dictation_seconds_used: 0,
                })
                .eq("id", user.id);
            }
          }
        } catch { /* Stripe unreachable — use local data */ }
      }
    }

    const bonusExpired = referralBonusExpires
      && new Date(referralBonusExpires).getTime() <= Date.now();
    const hasPaidSub = !!stripeSubId;

    if (bonusExpired && !hasPaidSub && profile.subscription_plan !== "free") {
      await service
        .from("profiles")
        .update({
          subscription_plan: "free",
          referral_bonus_expires_at: null,
          reports_used_this_month: 0,
          dictation_seconds_used: 0,
          billing_period_start: new Date().toISOString(),
        })
        .eq("id", user.id);
      profile.subscription_plan = "free";
      profile.reports_used_this_month = 0;
      profile.dictation_seconds_used = 0;
      profile.billing_period_start = new Date().toISOString();
    }

    // Self-heal a stale scheduled-cancellation date: Stripe is authoritative
    // about when access really ends (during a trial that's the trial end, not
    // billing_period_start + 1 month).
    let pendingEffectiveOverride: string | null = null;
    if (profile.pending_plan === "free" && stripeSubId) {
      const stripe = getStripe();
      if (stripe) {
        try {
          const sub = await stripe.subscriptions.retrieve(stripeSubId);
          const endTs = sub.cancel_at || sub.trial_end || sub.items.data[0]?.current_period_end || null;
          if (endTs) {
            const real = new Date(endTs * 1000).toISOString();
            if (profile.pending_plan_effective_date !== real) {
              pendingEffectiveOverride = real;
              await service
                .from("profiles")
                .update({ pending_plan_effective_date: real })
                .eq("id", user.id);
            }
          }
        } catch { /* ignore */ }
      }
    }

    const periodStart = profile.billing_period_start || new Date().toISOString();
    const nextPeriod = getNextPeriodDate(periodStart);
    const needsReset = nextPeriod.getTime() <= Date.now();

    let plan = (profile.subscription_plan || "free") as SubscriptionPlan;
    let used = profile.reports_used_this_month ?? 0;
    let dictationSecondsUsed = profile.dictation_seconds_used ?? 0;
    let pendingPlan = profile.pending_plan as SubscriptionPlan | null;
    let pendingEffective = pendingEffectiveOverride ?? profile.pending_plan_effective_date;

    if (needsReset) {
      if (pendingPlan && PLANS[pendingPlan]) {
        plan = pendingPlan;
        pendingPlan = null;
        pendingEffective = null;
      }
      used = 0;
      dictationSecondsUsed = 0;

      await service
        .from("profiles")
        .update({
          subscription_plan: plan,
          reports_used_this_month: 0,
          dictation_seconds_used: 0,
          billing_period_start: new Date().toISOString(),
          pending_plan: null,
          pending_plan_effective_date: null,
        })
        .eq("id", user.id);
    }

    const planConfig = PLANS[plan];

    const hasCarryover = used < 0 || dictationSecondsUsed < 0;
    const effectiveLimit = hasCarryover ? planConfig.reports + Math.abs(Math.min(0, used)) : planConfig.reports;
    const effectiveDictLimit = hasCarryover ? planConfig.dictationMinutes * 60 + Math.abs(Math.min(0, dictationSecondsUsed)) : planConfig.dictationMinutes * 60;
    const displayUsed = Math.max(0, used);
    const displayDictUsed = Math.max(0, dictationSecondsUsed);

    return NextResponse.json({
      plan,
      planConfig,
      used: displayUsed,
      limit: effectiveLimit,
      remaining: Math.max(0, effectiveLimit - displayUsed),
      periodStart,
      nextPeriodDate: nextPeriod.toISOString(),
      pendingPlan,
      pendingPlanEffectiveDate: pendingEffective,
      hasStripe: !!profile.stripe_customer_id,
      trialEndsAt,
      trialUsed,
      dictation: {
        usedSeconds: displayDictUsed,
        limitSeconds: effectiveDictLimit,
        usedMinutes: Math.round(displayDictUsed / 60),
        limitMinutes: Math.round(effectiveDictLimit / 60),
        remainingMinutes: Math.max(0, Math.round(effectiveDictLimit / 60) - Math.round(displayDictUsed / 60)),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan, cancelPending } = await req.json();

    const service = createServiceClient();

    if (cancelPending) {
      const { data: info } = await service
        .from("profiles")
        .select("stripe_subscription_id, stripe_customer_id, pending_plan, subscription_plan")
        .eq("id", user.id)
        .single();

      // Same rule as cancelling, pointing the other way: clearing the pending
      // change locally without Stripe agreeing leaves someone believing they
      // are still subscribed while Stripe ends it on the renewal date.
      const stripe = getStripe();
      let live: SubscriptionLike | null = null;
      let lookupFailed = false;

      if (stripe && info?.stripe_customer_id) {
        const found = await findLiveSubscription(stripe, info.stripe_customer_id, info.stripe_subscription_id);
        live = found.subscription;
        lookupFailed = found.lookupFailed;
      }

      const decision = decideReactivation({
        stripeConfigured: !!stripe,
        stripeCustomerId: info?.stripe_customer_id,
        liveSubscription: live,
        lookupFailed,
      });

      if (decision.kind === "blocked") {
        console.error(`[subscription] reactivation blocked for user=${user.id}: ${decision.reason}`);
        return NextResponse.json(
          { error: "reactivate_unverified", reason: decision.reason },
          { status: 503 },
        );
      }

      if (decision.kind === "gone") {
        // Nothing left to keep. Saying otherwise would send them away thinking
        // they are covered until they find they are not.
        return NextResponse.json(
          { error: "subscription_gone", needsCheckout: true },
          { status: 409 },
        );
      }

      if (decision.kind === "stripe" && stripe) {
        if (info?.pending_plan === "free") {
          const updated = await stripe.subscriptions.update(decision.subscriptionId, {
            cancel_at_period_end: false,
          });
          if (!reactivationConfirmed(updated)) {
            throw new Error(`Stripe did not lift the cancellation on ${decision.subscriptionId}`);
          }
        } else if (info?.pending_plan && info.subscription_plan && info.subscription_plan !== "free") {
          const envKey = PLAN_PRICE_ENV[info.subscription_plan];
          const currentPriceId = envKey ? process.env[envKey] : null;
          if (!currentPriceId) {
            return NextResponse.json({ error: "Price not configured" }, { status: 503 });
          }
          const sub = await stripe.subscriptions.retrieve(decision.subscriptionId);
          const itemId = sub.items.data[0]?.id;
          if (!itemId) {
            throw new Error(`Subscription ${decision.subscriptionId} has no item to price`);
          }
          const updated = await stripe.subscriptions.update(decision.subscriptionId, {
            items: [{ id: itemId, price: currentPriceId }],
            proration_behavior: "none",
          });
          if (!priceRestored(updated, currentPriceId)) {
            throw new Error(`Stripe did not restore the price on ${decision.subscriptionId}`);
          }
        }

        // The id we just acted on is the one to keep.
        if (info?.stripe_subscription_id !== decision.subscriptionId) {
          await service
            .from("profiles")
            .update({ stripe_subscription_id: decision.subscriptionId })
            .eq("id", user.id);
        }
      }

      await service
        .from("profiles")
        .update({ pending_plan: null, pending_plan_effective_date: null })
        .eq("id", user.id);
      // Reactivation wipes the cancellation timestamp (admin visibility).
      try {
        await service
          .from("profiles")
          .update({ subscription_cancelled_at: null })
          .eq("id", user.id);
      } catch { /* column may predate migration */ }
      return NextResponse.json({ ok: true, cancelled: true });
    }

    if (!plan || !PLANS[plan as SubscriptionPlan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Resident pricing requires an approved verification, also when arriving
    // here as a plan change (checkout enforces the same rule).
    if (plan === "resident") {
      const { data: verification } = await service
        .from("resident_verifications")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();
      if (!verification) {
        return NextResponse.json({ error: "Resident verification required" }, { status: 403 });
      }
    }

    const { data: profile } = await service
      .from("profiles")
      .select("subscription_plan, billing_period_start, stripe_subscription_id, stripe_customer_id, reports_used_this_month, dictation_seconds_used")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const currentPlan = profile.subscription_plan as SubscriptionPlan;

    if (plan === currentPlan) {
      return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
    }

    const isUpgrade = PLANS[plan as SubscriptionPlan].price > PLANS[currentPlan].price;

    if (isUpgrade && !profile.stripe_subscription_id) {
      return NextResponse.json({ error: "No active subscription — use checkout", needsCheckout: true }, { status: 402 });
    }

    if (isUpgrade && profile.stripe_subscription_id) {
      const stripe = getStripe();
      if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

      const envKey = PLAN_PRICE_ENV[plan];
      const newPriceId = envKey ? process.env[envKey] : null;
      if (!newPriceId) return NextResponse.json({ error: "Price not configured" }, { status: 503 });

      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      const itemId = sub.items.data[0]?.id;
      if (itemId) {
        await stripe.subscriptions.update(profile.stripe_subscription_id, {
          items: [{ id: itemId, price: newPriceId }],
          proration_behavior: "none",
          // Upgrading during the trial ends it (higher plans have no trial);
          // ending the trial resets the billing cycle anchor automatically,
          // so the new price is invoiced immediately in both branches.
          ...(sub.status === "trialing"
            ? { trial_end: "now" as const }
            : { billing_cycle_anchor: "now" as const }),
          // A previously scheduled cancellation must not survive an upgrade —
          // the user is paying for the new plan going forward.
          cancel_at_period_end: false,
        });
        if (sub.status === "trialing") {
          // Best-effort: stop showing "trial until ..." for the upgraded plan.
          try {
            await service.from("profiles").update({ trial_ends_at: null }).eq("id", user.id);
          } catch { /* column may predate migration */ }
        }
      }

      const oldLimits = PLANS[currentPlan];
      const usedReports = Math.max(0, profile.reports_used_this_month ?? 0);
      const usedDictation = Math.max(0, profile.dictation_seconds_used ?? 0);
      const carryoverReports = Math.max(0, oldLimits.reports - usedReports);
      const carryoverDictation = Math.max(0, oldLimits.dictationMinutes * 60 - usedDictation);

      await service
        .from("profiles")
        .update({
          subscription_plan: plan,
          billing_period_start: new Date().toISOString(),
          reports_used_this_month: -carryoverReports,
          dictation_seconds_used: -carryoverDictation,
          pending_plan: null,
          pending_plan_effective_date: null,
        })
        .eq("id", user.id);

      return NextResponse.json({ ok: true, immediate: true });
    }

    // Write the deferred plan BEFORE touching Stripe: the subscription.updated
    // webhook checks pending_plan to avoid applying the lower price
    // immediately, so it must be visible before Stripe fires the event.
    let effectiveDate = getNextPeriodDate(profile.billing_period_start || new Date().toISOString());
    await service
      .from("profiles")
      .update({
        pending_plan: plan,
        pending_plan_effective_date: effectiveDate.toISOString(),
      })
      .eq("id", user.id);

    // A cancellation has to reach Stripe or fail. Before this, a profile with
    // no stored subscription id — which happens whenever the checkout webhook
    // does not arrive — skipped Stripe entirely and still returned success,
    // so the account went on being charged while the UI said "cancelled".
    if (plan === "free") {
      const stripe = getStripe();
      let live: SubscriptionLike | null = null;
      let lookupFailed = false;

      if (stripe && profile.stripe_customer_id) {
        const found = await findLiveSubscription(stripe, profile.stripe_customer_id, profile.stripe_subscription_id);
        live = found.subscription;
        lookupFailed = found.lookupFailed;
      }

      const decision = decideCancellation({
        stripeConfigured: !!stripe,
        stripeCustomerId: profile.stripe_customer_id,
        liveSubscription: live,
        lookupFailed,
      });

      if (decision.kind === "blocked") {
        // Undo the deferred write: claiming a cancellation we could not make
        // is what we are here to stop.
        await service
          .from("profiles")
          .update({ pending_plan: null, pending_plan_effective_date: null })
          .eq("id", user.id);
        console.error(`[subscription] cancellation blocked for user=${user.id}: ${decision.reason}`);
        return NextResponse.json(
          { error: "cancel_unverified", reason: decision.reason },
          { status: 503 },
        );
      }

      if (decision.kind === "stripe" && stripe) {
        try {
          const updated = await stripe.subscriptions.update(decision.subscriptionId, {
            cancel_at_period_end: true,
          });

          if (!cancellationConfirmed(updated)) {
            // The call returned, but the subscription is still set to renew.
            throw new Error(`Stripe did not confirm cancellation of ${decision.subscriptionId}`);
          }

          // The id we just cancelled is the one to keep: the stored one may
          // have been missing or stale, which is how we got here.
          if (profile.stripe_subscription_id !== decision.subscriptionId) {
            await service
              .from("profiles")
              .update({ stripe_subscription_id: decision.subscriptionId })
              .eq("id", user.id);
          }

          // Stripe decides the real end of access: the trial end while
          // trialing, otherwise the end of the paid period. Our provisional
          // billing_period_start+1mo estimate can be wrong (e.g. a month out
          // for a trial cancelled on day 1) — store the authoritative date.
          const endTs = updated.cancel_at
            || updated.trial_end
            || updated.items.data[0]?.current_period_end
            || null;
          if (endTs) {
            effectiveDate = new Date(endTs * 1000);
            await service
              .from("profiles")
              .update({ pending_plan_effective_date: effectiveDate.toISOString() })
              .eq("id", user.id);
          }
        } catch (stripeErr) {
          await service
            .from("profiles")
            .update({ pending_plan: null, pending_plan_effective_date: null })
            .eq("id", user.id);
          throw stripeErr;
        }
      }

      // Record when the cancellation was requested (admin visibility). Only
      // reached once Stripe has confirmed, or once we know nothing is billing.
      try {
        await service
          .from("profiles")
          .update({ subscription_cancelled_at: new Date().toISOString() })
          .eq("id", user.id);
      } catch { /* column may predate migration */ }

      return NextResponse.json({ ok: true, deferred: true, effectiveDate: effectiveDate.toISOString() });
    }

    if (profile.stripe_subscription_id) {
      const stripe = getStripe();
      if (stripe) {
        try {
          {
            const envKey = PLAN_PRICE_ENV[plan];
            const newPriceId = envKey ? process.env[envKey] : null;
            if (newPriceId) {
              const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
              const itemId = sub.items.data[0]?.id;
              if (itemId) {
                await stripe.subscriptions.update(profile.stripe_subscription_id, {
                  items: [{ id: itemId, price: newPriceId }],
                  proration_behavior: "none",
                  // Choosing a (paid) plan supersedes any scheduled cancellation.
                  cancel_at_period_end: false,
                });
              }
            }
          }
        } catch (stripeErr) {
          // Stripe failed → revert the deferred change so DB and Stripe agree.
          await service
            .from("profiles")
            .update({ pending_plan: null, pending_plan_effective_date: null })
            .eq("id", user.id);
          throw stripeErr;
        }
      }
    }

    return NextResponse.json({ ok: true, deferred: true, effectiveDate: effectiveDate.toISOString() });
  } catch (error) {
    return toErrorResponse(error);
  }
}
