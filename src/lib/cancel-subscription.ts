/**
 * Deciding whether a cancellation may be recorded.
 *
 * The rule this exists to enforce: we never tell someone their subscription is
 * cancelled unless Stripe — the thing that actually takes the money — has been
 * told and has confirmed it. Recording a cancellation locally while Stripe goes
 * on billing is the worst outcome available, because the person stops watching
 * for the charge.
 *
 * So every uncertainty resolves to "blocked", not to "cancelled". A Stripe
 * outage, a missing key, a subscription id we cannot look up: all of them fail
 * the cancellation and say so, rather than writing a cancellation we cannot
 * back up. Failing loudly costs someone a retry; failing quietly costs them
 * money and finds out a month later.
 */

/** The subset of a Stripe subscription this decision needs. */
export interface SubscriptionLike {
  id: string;
  status: string;
  cancel_at_period_end?: boolean;
}

export interface CancelContext {
  /** Whether STRIPE_SECRET_KEY is present. */
  stripeConfigured: boolean;
  /** The Stripe customer on the profile, if any. */
  stripeCustomerId: string | null | undefined;
  /**
   * The live subscription, after looking it up by stored id and, failing that,
   * by customer. `null` means the lookup ran and found nothing billing.
   */
  liveSubscription: SubscriptionLike | null;
  /** True when the lookup itself failed, so we do not know what Stripe holds. */
  lookupFailed: boolean;
}

export type CancelDecision =
  /** Stripe holds a live subscription: it must be cancelled and confirmed. */
  | { kind: "stripe"; subscriptionId: string }
  /** No money is flowing through Stripe: the local record is the whole truth. */
  | { kind: "db-only" }
  /** We cannot establish what Stripe holds. Refuse rather than mislead. */
  | { kind: "blocked"; reason: BlockedReason };

export type BlockedReason = "stripe_unavailable" | "stripe_lookup_failed";

/** Statuses that mean money is still going to move. */
export const BILLING_STATUSES = ["active", "trialing", "past_due", "unpaid"] as const;

export function isBilling(sub: SubscriptionLike | null | undefined): boolean {
  return !!sub && (BILLING_STATUSES as readonly string[]).includes(sub.status);
}

export function decideCancellation(ctx: CancelContext): CancelDecision {
  // Never had a Stripe customer, so there is nothing that can charge them.
  // Free and manually provisioned accounts land here.
  if (!ctx.stripeCustomerId) return { kind: "db-only" };

  // There IS a customer, so a subscription may well be billing. Without a key
  // we cannot find out, let alone stop it.
  if (!ctx.stripeConfigured) return { kind: "blocked", reason: "stripe_unavailable" };

  // The lookup threw. Silence here is what produced the charge-after-cancel:
  // not knowing is not the same as nothing being there.
  if (ctx.lookupFailed) return { kind: "blocked", reason: "stripe_lookup_failed" };

  // Looked, and nothing is billing — already cancelled, or the customer never
  // completed a subscription. Recording it locally is honest.
  if (!isBilling(ctx.liveSubscription)) return { kind: "db-only" };

  return { kind: "stripe", subscriptionId: ctx.liveSubscription!.id };
}

/**
 * Whether Stripe's reply actually confirms the cancellation. An API call that
 * returns 200 but leaves cancel_at_period_end false has not cancelled
 * anything, and must not be reported as though it had.
 */
export function cancellationConfirmed(updated: SubscriptionLike | null | undefined): boolean {
  if (!updated) return false;
  // Already gone counts: the subscription cannot bill again either way.
  if (updated.status === "canceled") return true;
  return updated.cancel_at_period_end === true;
}

/**
 * A cancellation we recorded that Stripe is still going to renew — safe to
 * re-assert automatically.
 *
 * The signal is `pending_plan === "free"` and nothing else. Our own cancel
 * endpoint writes it, so it means "this account asked to cancel and has not
 * been billed through that cancellation yet". The `subscription_cancelled_at`
 * timestamp is NOT used here on purpose: it is admin bookkeeping, it is only
 * cleared by a webhook, and webhooks going missing is the very failure this
 * code exists for. A stale timestamp on someone who cancelled and later
 * re-subscribed would make an automatic fix cancel the subscription they are
 * happily paying for.
 */
export function isCancellationOutOfSync(
  profile: { pending_plan?: string | null },
  sub: SubscriptionLike | null,
): boolean {
  if (profile.pending_plan !== "free") return false;
  return isBilling(sub) && sub!.cancel_at_period_end !== true;
}

/**
 * The weaker signal: an account stamped as cancelled that Stripe still bills,
 * with no pending downgrade to explain it. That is either a charge nobody
 * expects or a stale stamp on someone who re-subscribed, and the two cannot be
 * told apart from here — so this is reported for a human to look at and never
 * acted on automatically.
 */
export function needsCancellationReview(
  profile: { pending_plan?: string | null; subscription_cancelled_at?: string | null },
  sub: SubscriptionLike | null,
): boolean {
  if (profile.pending_plan === "free") return false; // the case above handles it
  if (!profile.subscription_cancelled_at) return false;
  return isBilling(sub) && sub!.cancel_at_period_end !== true;
}


/* ────────────────────────────────────────────────────────────────────────
 * Undoing a scheduled change ("keep my subscription after all").
 *
 * The mirror image of the same rule. Clearing the pending change locally
 * without Stripe agreeing leaves someone believing they are still subscribed
 * while Stripe quietly ends it on the renewal date — they do not lose money,
 * they lose access, and equally without warning.
 * ──────────────────────────────────────────────────────────────────────── */

export type ReactivateDecision =
  /** Stripe holds the subscription: the scheduled change must be lifted there. */
  | { kind: "stripe"; subscriptionId: string }
  /** No Stripe customer, so the pending change only ever existed locally. */
  | { kind: "db-only" }
  /** Stripe was reached and has nothing billing: there is nothing to keep. */
  | { kind: "gone" }
  /** We cannot establish what Stripe holds. */
  | { kind: "blocked"; reason: BlockedReason };

export function decideReactivation(ctx: CancelContext): ReactivateDecision {
  if (!ctx.stripeCustomerId) return { kind: "db-only" };
  if (!ctx.stripeConfigured) return { kind: "blocked", reason: "stripe_unavailable" };
  if (ctx.lookupFailed) return { kind: "blocked", reason: "stripe_lookup_failed" };

  // Already ended, or never started. Telling someone their subscription is
  // back when Stripe has nothing would be the same lie in the other
  // direction — they have to subscribe again.
  if (!isBilling(ctx.liveSubscription)) return { kind: "gone" };

  return { kind: "stripe", subscriptionId: ctx.liveSubscription!.id };
}

/** Stripe must actually show the subscription as no longer ending. */
export function reactivationConfirmed(updated: SubscriptionLike | null | undefined): boolean {
  if (!updated) return false;
  if (!isBilling(updated)) return false;
  return updated.cancel_at_period_end !== true;
}

/**
 * For undoing a scheduled DOWNGRADE rather than a cancellation: the price has
 * to be back on the plan they are keeping. A call that returns without having
 * changed the price has not undone anything.
 */
export function priceRestored(
  updated: { items?: { data?: { price?: { id?: string } | null }[] } } | null | undefined,
  expectedPriceId: string,
): boolean {
  const actual = updated?.items?.data?.[0]?.price?.id;
  return !!actual && actual === expectedPriceId;
}


/**
 * The fingerprint the original bug actually leaves behind.
 *
 * When a cancellation never reached Stripe, the old code also skipped writing
 * `subscription_cancelled_at` — both lived inside the same `if
 * (stripe_subscription_id)` block. Then the renewal it failed to stop arrived,
 * and the invoice.paid handler cleared `pending_plan` and set the plan to
 * "free". So the victims carry no cancellation marker at all: what is left is
 * an account we bill nothing for while Stripe bills them every month.
 *
 * That discrepancy has two readings and they cannot be told apart from here:
 * a cancellation we failed to honour, or a checkout whose webhook never
 * arrived, leaving someone paying for a plan we never gave them. Both are
 * wrong, both need a person, and neither may be acted on automatically —
 * cancelling the second kind would cut off someone who is paying.
 */
export function isLocallyFreeButBilling(
  profile: { subscription_plan?: string | null; pending_plan?: string | null },
  sub: SubscriptionLike | null,
): boolean {
  if (profile.subscription_plan !== "free") return false;
  if (profile.pending_plan === "free") return false; // a pending cancellation, covered above
  return isBilling(sub);
}
