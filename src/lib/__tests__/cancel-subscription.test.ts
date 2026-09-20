import { describe, it, expect } from "vitest";
import {
  decideCancellation,
  cancellationConfirmed,
  isCancellationOutOfSync,
  needsCancellationReview,
  decideReactivation,
  reactivationConfirmed,
  priceRestored,
  isBilling,
  type CancelContext,
  type SubscriptionLike,
} from "@/lib/cancel-subscription";

const sub = (status: string, cancelAtPeriodEnd?: boolean): SubscriptionLike => ({
  id: "sub_123",
  status,
  ...(cancelAtPeriodEnd === undefined ? {} : { cancel_at_period_end: cancelAtPeriodEnd }),
});

const ctx = (over: Partial<CancelContext> = {}): CancelContext => ({
  stripeConfigured: true,
  stripeCustomerId: "cus_123",
  liveSubscription: sub("active"),
  lookupFailed: false,
  ...over,
});

describe("a live subscription must be cancelled in Stripe", () => {
  it.each(["active", "trialing", "past_due", "unpaid"])(
    "routes a %s subscription through Stripe", (status) => {
      const d = decideCancellation(ctx({ liveSubscription: sub(status) }));
      expect(d).toEqual({ kind: "stripe", subscriptionId: "sub_123" });
    },
  );

  it("cancels the subscription Stripe actually holds, not the one we stored", () => {
    // The stored id can be missing or stale; the caller looks it up and the
    // decision follows what Stripe returned.
    const d = decideCancellation(ctx({ liveSubscription: { id: "sub_live", status: "active" } }));
    expect(d).toEqual({ kind: "stripe", subscriptionId: "sub_live" });
  });
});

describe("uncertainty blocks the cancellation — it never passes as done", () => {
  it("blocks when there is a Stripe customer but no key to reach Stripe with", () => {
    // This is the case that charged someone: no key, so the code skipped
    // Stripe entirely and reported success.
    const d = decideCancellation(ctx({ stripeConfigured: false }));
    expect(d).toEqual({ kind: "blocked", reason: "stripe_unavailable" });
  });

  it("blocks when the lookup threw, because not knowing is not nothing", () => {
    const d = decideCancellation(ctx({ lookupFailed: true, liveSubscription: null }));
    expect(d).toEqual({ kind: "blocked", reason: "stripe_lookup_failed" });
  });

  it("blocks on a failed lookup even if a stale subscription was in hand", () => {
    const d = decideCancellation(ctx({ lookupFailed: true }));
    expect(d.kind).toBe("blocked");
  });

  it("never returns db-only for a Stripe customer whose state is unknown", () => {
    for (const over of [{ stripeConfigured: false }, { lookupFailed: true }]) {
      expect(decideCancellation(ctx(over)).kind).not.toBe("db-only");
    }
  });
});

describe("a local-only cancellation is allowed only when nothing can charge", () => {
  it("allows it when the account never had a Stripe customer", () => {
    expect(decideCancellation(ctx({ stripeCustomerId: null })).kind).toBe("db-only");
    expect(decideCancellation(ctx({ stripeCustomerId: undefined })).kind).toBe("db-only");
  });

  it("allows it when Stripe was reached and holds nothing billing", () => {
    expect(decideCancellation(ctx({ liveSubscription: null })).kind).toBe("db-only");
  });

  it.each(["canceled", "incomplete_expired", "paused"])(
    "allows it when the subscription is %s", (status) => {
      expect(decideCancellation(ctx({ liveSubscription: sub(status) })).kind).toBe("db-only");
    },
  );

  it("does not need a key when there is no customer to look up", () => {
    const d = decideCancellation(ctx({ stripeCustomerId: null, stripeConfigured: false }));
    expect(d.kind).toBe("db-only");
  });
});

describe("Stripe's reply has to actually say it is cancelled", () => {
  it("accepts cancel_at_period_end true", () => {
    expect(cancellationConfirmed(sub("active", true))).toBe(true);
  });

  it("accepts an already-cancelled subscription", () => {
    expect(cancellationConfirmed(sub("canceled"))).toBe(true);
  });

  it("rejects a 200 that left the subscription renewing", () => {
    // The whole failure mode in one line: the call succeeded, nothing changed.
    expect(cancellationConfirmed(sub("active", false))).toBe(false);
    expect(cancellationConfirmed(sub("active"))).toBe(false);
    expect(cancellationConfirmed(sub("trialing", false))).toBe(false);
  });

  it("rejects no reply at all", () => {
    expect(cancellationConfirmed(null)).toBe(false);
    expect(cancellationConfirmed(undefined)).toBe(false);
  });
});

describe("finding the accounts already charged after cancelling", () => {
  it("flags a pending downgrade to free that Stripe will still renew", () => {
    expect(isCancellationOutOfSync({ pending_plan: "free" }, sub("active", false))).toBe(true);
  });

  it("flags a trialing subscription that will convert to a charge", () => {
    expect(isCancellationOutOfSync({ pending_plan: "free" }, sub("trialing", false))).toBe(true);
  });

  it("does not flag one Stripe has correctly set to end", () => {
    expect(isCancellationOutOfSync({ pending_plan: "free" }, sub("active", true))).toBe(false);
  });

  it("does not flag one already gone from Stripe", () => {
    expect(isCancellationOutOfSync({ pending_plan: "free" }, sub("canceled"))).toBe(false);
    expect(isCancellationOutOfSync({ pending_plan: "free" }, null)).toBe(false);
  });

  it("does not flag an account that never asked to cancel", () => {
    expect(isCancellationOutOfSync({ pending_plan: null }, sub("active", false))).toBe(false);
    expect(isCancellationOutOfSync({ pending_plan: "starter" }, sub("active", false))).toBe(false);
  });
});

describe("the automatic fix cannot cancel a subscription someone is paying for", () => {
  it("ignores a stale cancelled-at stamp on an active subscription", () => {
    // Someone who cancelled months ago and later re-subscribed. The stamp is
    // only cleared by a webhook, and missing webhooks are the whole premise
    // of this bug — so acting on it would cancel their live subscription.
    const resubscribed = {
      pending_plan: null,
      subscription_cancelled_at: "2026-06-01T00:00:00Z",
    };
    expect(isCancellationOutOfSync(resubscribed, sub("active", false))).toBe(false);
  });

  it("reports that account for review instead of touching it", () => {
    const resubscribed = {
      pending_plan: null,
      subscription_cancelled_at: "2026-06-01T00:00:00Z",
    };
    expect(needsCancellationReview(resubscribed, sub("active", false))).toBe(true);
  });

  it("does not ask for review when the pending downgrade already explains it", () => {
    expect(
      needsCancellationReview(
        { pending_plan: "free", subscription_cancelled_at: "2026-06-01T00:00:00Z" },
        sub("active", false),
      ),
    ).toBe(false);
  });

  it("does not ask for review when nothing is billing", () => {
    const stamped = { pending_plan: null, subscription_cancelled_at: "2026-06-01T00:00:00Z" };
    expect(needsCancellationReview(stamped, sub("canceled"))).toBe(false);
    expect(needsCancellationReview(stamped, null)).toBe(false);
    expect(needsCancellationReview(stamped, sub("active", true))).toBe(false);
  });

  it("does not ask for review for an account with no cancellation history", () => {
    expect(needsCancellationReview({ pending_plan: null }, sub("active", false))).toBe(false);
  });
});

describe("which statuses count as still taking money", () => {
  it.each(["active", "trialing", "past_due", "unpaid"])("%s does", (s) => {
    expect(isBilling(sub(s))).toBe(true);
  });

  it.each(["canceled", "incomplete", "incomplete_expired", "paused"])("%s does not", (s) => {
    expect(isBilling(sub(s))).toBe(false);
  });

  it("treats nothing as not billing", () => {
    expect(isBilling(null)).toBe(false);
    expect(isBilling(undefined)).toBe(false);
  });
});


describe("undoing a scheduled change is held to the same standard", () => {
  it("goes through Stripe when a live subscription is scheduled to end", () => {
    const d = decideReactivation(ctx({ liveSubscription: sub("active", true) }));
    expect(d).toEqual({ kind: "stripe", subscriptionId: "sub_123" });
  });

  it("blocks with a Stripe customer and no key", () => {
    // Before, this cleared the pending change and said "reactivated" while
    // Stripe went on ending the subscription on the renewal date.
    expect(decideReactivation(ctx({ stripeConfigured: false }))).toEqual({
      kind: "blocked", reason: "stripe_unavailable",
    });
  });

  it("blocks when the lookup threw", () => {
    expect(decideReactivation(ctx({ lookupFailed: true })).kind).toBe("blocked");
  });

  it("reports it as gone rather than reactivated when Stripe has nothing", () => {
    // Saying "you are subscribed again" when Stripe holds nothing is the same
    // lie pointing the other way.
    expect(decideReactivation(ctx({ liveSubscription: null })).kind).toBe("gone");
    expect(decideReactivation(ctx({ liveSubscription: sub("canceled") })).kind).toBe("gone");
  });

  it("is local-only when the account never had a Stripe customer", () => {
    expect(decideReactivation(ctx({ stripeCustomerId: null })).kind).toBe("db-only");
  });

  it("never reports success from an unknown state", () => {
    for (const over of [{ stripeConfigured: false }, { lookupFailed: true }]) {
      expect(["blocked"]).toContain(decideReactivation(ctx(over)).kind);
    }
  });
});

describe("Stripe has to confirm the subscription is no longer ending", () => {
  it("accepts a billing subscription that is not set to cancel", () => {
    expect(reactivationConfirmed(sub("active", false))).toBe(true);
    expect(reactivationConfirmed(sub("active"))).toBe(true);
    expect(reactivationConfirmed(sub("trialing", false))).toBe(true);
  });

  it("rejects one still set to cancel at period end", () => {
    expect(reactivationConfirmed(sub("active", true))).toBe(false);
  });

  it("rejects one that is not billing at all", () => {
    expect(reactivationConfirmed(sub("canceled", false))).toBe(false);
    expect(reactivationConfirmed(null)).toBe(false);
  });
});

describe("undoing a downgrade has to actually restore the price", () => {
  const withPrice = (id: string) => ({ items: { data: [{ price: { id } }] } });

  it("accepts the price the plan is being kept on", () => {
    expect(priceRestored(withPrice("price_pro"), "price_pro")).toBe(true);
  });

  it("rejects a call that left the downgraded price in place", () => {
    expect(priceRestored(withPrice("price_starter"), "price_pro")).toBe(false);
  });

  it("rejects a reply with no price to check", () => {
    expect(priceRestored({ items: { data: [] } }, "price_pro")).toBe(false);
    expect(priceRestored(null, "price_pro")).toBe(false);
    expect(priceRestored(undefined, "price_pro")).toBe(false);
  });
});
