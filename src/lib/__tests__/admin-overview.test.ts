import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { buildOverview, trend, dailySeries, PLAN_PRICES } from "@/lib/admin-overview";
import type { OverviewInput, ProfileRow } from "@/lib/admin-overview";

/**
 * The overview is read to decide things, so every number in it has to be the
 * number it claims to be. These cover the ways a dashboard lies quietly:
 * counting the admin as a customer, billing a hospital seat twice, comparing
 * a 30-day window against everything that came before it, and dividing by a
 * zero that only happens on a quiet week.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-14T12:00:00Z");
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

function input(over: Partial<OverviewInput> = {}): OverviewInput {
  return {
    now: NOW,
    profiles: [],
    reports: [],
    usage: [],
    orgs: [],
    activeOrgMembers: [],
    seatOrders: [],
    tickets: [],
    residentVerifications: [],
    waitlist: [],
    dictationFeedback: { up: 0, down: 0 },
    ...over,
  };
}

function profile(over: Partial<ProfileRow> = {}): ProfileRow {
  return { id: Math.random().toString(36).slice(2), created_at: ago(5), ...over };
}

describe("a period is only meaningful next to the one before it", () => {
  it("compares the last 30 days with the 30 before, not with all history", () => {
    const o = buildOverview(input({
      reports: [
        ...Array.from({ length: 5 }, () => ({ user_id: "a", created_at: ago(10) })),
        ...Array.from({ length: 2 }, () => ({ user_id: "a", created_at: ago(40) })),
        // 80 days back: outside both windows, must not inflate "previous".
        { user_id: "a", created_at: ago(80) },
      ],
    }));
    expect(o.activity.reports.current).toBe(5);
    expect(o.activity.reports.previous).toBe(2);
    expect(o.activity.reports.changePct).toBe(150);
  });

  it("gives no percentage when there is nothing to compare against", () => {
    // 0 → 12 is not "+1200%" and not "+0%"; the view shows the jump itself.
    expect(trend(12, 0).changePct).toBeNull();
    expect(trend(0, 0).changePct).toBeNull();
    expect(trend(5, 10).changePct).toBe(-50);
  });

  it("fills the quiet days, so a sparkline is not read as a shorter month", () => {
    const s = dailySeries([NOW, NOW, NOW - 3 * DAY], NOW, 7);
    expect(s).toHaveLength(7);
    expect(s[6].value).toBe(2);
    expect(s[3].value).toBe(1);
    expect(s[0].value).toBe(0);
    // Oldest first, so it reads left to right.
    expect(s[0].day < s[6].day).toBe(true);
  });
});

describe("the money is counted once", () => {
  it("leaves the admin out of the customer figures", () => {
    const o = buildOverview(input({
      profiles: [
        profile({ role: "admin", subscription_plan: "professional" }),
        profile({ subscription_plan: "starter" }),
      ],
    }));
    expect(o.growth.totalUsers).toBe(1);
    expect(o.money.paying).toBe(1);
    expect(o.money.mrr).toBe(PLAN_PRICES.starter);
  });

  it("does not bill a hospital radiologist on top of the hospital's order", () => {
    // The seat is paid through the institution's order. Counting the member's
    // plan as well would book the same euro twice and overstate MRR.
    const o = buildOverview(input({
      profiles: [profile({ subscription_plan: "professional", org_id: "org-1" })],
      seatOrders: [{ status: "active", seats: 4, unit_price: 12 }],
    }));
    expect(o.money.mrr).toBe(48);
    expect(o.money.mrrByPlan.hospitals).toBe(48);
    expect(o.money.mrrByPlan.professional).toBeUndefined();
    // Still a paying customer, just not a separately billed one.
    expect(o.money.paying).toBe(1);
  });

  it("keeps an unpaid order out of the revenue and in the queue", () => {
    const o = buildOverview(input({
      seatOrders: [{ status: "pending", seats: 3, unit_price: 10 }],
    }));
    expect(o.money.mrr).toBe(0);
    expect(o.hospitals.pendingOrders).toBe(1);
    expect(o.hospitals.pendingOrdersValue).toBe(30);
    expect(o.queue.find((q) => q.key === "seat_orders")?.count).toBe(1);
  });

  it("separates a running trial from a subscription", () => {
    const o = buildOverview(input({
      profiles: [
        profile({ subscription_plan: "starter", trial_ends_at: ago(-3), trial_used_at: ago(11) }),
        profile({ subscription_plan: "starter" }),
      ],
    }));
    expect(o.money.trialing).toBe(1);
    expect(o.money.paying).toBe(1);
    // A trial is not revenue yet, so only the subscription is in the MRR.
    expect(o.money.mrr).toBe(PLAN_PRICES.starter);
  });

  it("counts a scheduled cancellation as still paying, and flags it", () => {
    const o = buildOverview(input({
      profiles: [profile({ subscription_plan: "professional", pending_plan: "free" })],
    }));
    expect(o.money.paying).toBe(1);
    expect(o.money.cancelScheduled).toBe(1);
  });

  it("measures trial conversion only on trials that have finished", () => {
    const o = buildOverview(input({
      profiles: [
        profile({ trial_ends_at: ago(2), subscription_plan: "starter" }),  // converted
        profile({ trial_ends_at: ago(2), subscription_plan: "free" }),     // did not
        profile({ trial_ends_at: ago(-5), subscription_plan: "starter" }), // still running
      ],
    }));
    expect(o.money.finishedTrials).toBe(2);
    expect(o.money.trialConversionPct).toBe(50);
  });
});

describe("the operating figures", () => {
  it("counts active radiologists, not reports", () => {
    const o = buildOverview(input({
      reports: [
        { user_id: "a", created_at: ago(1) },
        { user_id: "a", created_at: ago(2) },
        { user_id: "b", created_at: ago(3) },
        { user_id: "c", created_at: ago(45) },
      ],
    }));
    expect(o.activity.activeUsers.current).toBe(2);
    expect(o.activity.activeUsers.previous).toBe(1);
    expect(o.activity.reportsPerActiveUser).toBe(1.5);
  });

  it("works out the AI cost per report and the margin over the same month", () => {
    const o = buildOverview(input({
      profiles: [profile({ subscription_plan: "professional" })],
      reports: Array.from({ length: 10 }, () => ({ user_id: "a", created_at: ago(5) })),
      usage: Array.from({ length: 10 }, () => ({ action: "generate_findings", estimated_cost_usd: 0.1, created_at: ago(5) })),
    }));
    expect(o.cost.aiCost.current).toBe(1);
    expect(o.cost.costPerReport).toBe(0.1);
    // 15.99 of revenue against 1.00 of spend.
    expect(o.cost.grossMarginPct).toBe(93.7);
  });

  it("reports no margin rather than a negative one when nothing is billed", () => {
    const o = buildOverview(input({
      usage: [{ estimated_cost_usd: 5, created_at: ago(1) }],
    }));
    expect(o.cost.grossMarginPct).toBeNull();
    expect(o.cost.costPerReport).toBeNull();
    expect(o.quality.dictationPct).toBeNull();
  });

  it("takes the error rate over the calls of the same window", () => {
    const o = buildOverview(input({
      usage: [
        { action: "generate_findings", created_at: ago(1) },
        { action: "report_error", created_at: ago(1) },
        { action: "report_error", created_at: ago(50) }, // previous window
      ],
    }));
    expect(o.cost.calls.current).toBe(2);
    expect(o.cost.errorRatePct).toBe(50);
  });

  it("ranks the modalities of the current month only", () => {
    const o = buildOverview(input({
      reports: [
        { user_id: "a", modality: "CT", created_at: ago(1) },
        { user_id: "a", modality: "CT", created_at: ago(2) },
        { user_id: "a", modality: "US", created_at: ago(3) },
        { user_id: "a", modality: "MRI", created_at: ago(44) },
      ],
    }));
    expect(o.activity.topModalities[0]).toEqual({ modality: "CT", count: 2 });
    expect(o.activity.topModalities.map((m) => m.modality)).not.toContain("MRI");
  });
});

describe("the queue only shows what is actually waiting", () => {
  it("lists each pending item with the tab that resolves it", () => {
    const o = buildOverview(input({
      tickets: [{ status: "open" }, { status: "in_progress" }, { status: "closed" }],
      residentVerifications: [{ status: "pending" }, { status: "approved" }],
      profiles: [profile({ approved: false }), profile({ approved: true })],
      waitlist: [{ created_at: ago(1) }],
    }));
    const byKey = Object.fromEntries(o.queue.map((q) => [q.key, q]));
    expect(byKey.tickets.count).toBe(2);
    expect(byKey.tickets.tab).toBe("support");
    expect(byKey.residents.count).toBe(1);
    expect(byKey.approvals.count).toBe(1);
    expect(byKey.waitlist.count).toBe(1);
  });

  it("stays empty when there is nothing to do, rather than showing five zeros", () => {
    expect(buildOverview(input()).queue).toEqual([]);
  });
});

describe("hospitals are summarized without opening the tab", () => {
  it("adds up occupied and contracted seats, and groups by version", () => {
    const o = buildOverview(input({
      orgs: [
        { id: "a", max_seats: 10, region: "eu", is_active: true },
        { id: "b", max_seats: 5, region: null, billing_mode: "gifted", is_active: false },
      ],
      activeOrgMembers: [{ org_id: "a" }, { org_id: "a" }, { org_id: "b" }],
    }));
    expect(o.hospitals).toMatchObject({
      total: 2, active: 1, gifted: 1, seatsUsed: 3, seatsTotal: 15,
    });
    expect(o.hospitals.byRegion).toEqual({ eu: 1, auto: 1 });
  });
});

describe("the overview summarizes the other tabs instead of replacing them", () => {
  const ROOT = join(__dirname, "../../..");
  const src = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
  const page = src("src/app/admin/page.tsx");

  it("sends every queue item to a tab that exists", () => {
    // A chip pointing at a tab the page does not know would silently do
    // nothing, which is worse than not offering the shortcut.
    const start = page.indexOf("type Tab =");
    const union = page.slice(start, page.indexOf(";", start));
    const o = buildOverview(input({
      tickets: [{ status: "open" }],
      residentVerifications: [{ status: "pending" }],
      seatOrders: [{ status: "pending", seats: 1, unit_price: 1 }],
      profiles: [profile({ approved: false })],
      waitlist: [{ created_at: ago(1) }],
    }));
    expect(o.queue).toHaveLength(5);
    for (const q of o.queue) expect(union).toContain(`"${q.tab}"`);
  });

  it("no longer puts the configuration editors on the overview", () => {
    // The clinical checklist editor and the manual download are not summaries
    // of anything; they sat between the admin and the figures.
    const overview = page.slice(page.indexOf('{tab === "overview"'));
    const firstTabAfter = overview.indexOf('{tab === "users"');
    const block = overview.slice(0, firstTabAfter);
    expect(block).toContain("AdminOverviewTab");
    expect(block).not.toContain("clinical-checklist");
    expect(block).not.toContain("AdminManualDownload");
  });

  it("keeps those editors reachable, moved to the tabs they belong to", () => {
    expect(page).toContain("clinical-checklist");
    expect(page).toContain("AdminManualDownload");
  });

  it("reads the figures from one endpoint rather than six", () => {
    const ui = src("src/components/admin/admin-overview-tab.tsx");
    expect(ui).toContain('fetch("/api/admin/overview")');
  });
});

describe("a capped query is never passed off as a total", () => {
  it("carries the truncation flag through to the view", () => {
    expect(buildOverview(input({ truncated: true })).truncated).toBe(true);
    expect(buildOverview(input()).truncated).toBe(false);
  });
});
