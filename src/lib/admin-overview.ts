/**
 * The admin overview: one summary of what every other tab holds.
 *
 * The overview used to show five counters, a plan bar chart and the clinical
 * checklist editor — the editor is not a summary of anything, and the counters
 * said nothing about direction. Everything here is therefore computed as a
 * value AND the period before it, because "412 informes" only means something
 * next to the 280 of the previous month.
 *
 * The arithmetic lives in this module rather than in the route so it can be
 * tested without Supabase: a dashboard that quietly divides by zero, counts
 * admins as customers or compares a 30-day window against a 60-day one is
 * worse than no dashboard, since every decision taken from it inherits the
 * error.
 */

export interface ProfileRow {
  id: string;
  role?: string | null;
  created_at: string;
  subscription_plan?: string | null;
  pending_plan?: string | null;
  email_verified?: boolean | null;
  approved?: boolean | null;
  org_id?: string | null;
  reports_used_this_month?: number | null;
  dictation_seconds_used?: number | null;
  stripe_subscription_id?: string | null;
  trial_used_at?: string | null;
  trial_ends_at?: string | null;
  subscription_ended_at?: string | null;
}

export interface ReportRow {
  user_id: string;
  modality?: string | null;
  created_at: string;
}

/** An AI call, as audit_logs records it. */
export interface UsageRow {
  action?: string | null;
  estimated_cost_usd?: number | string | null;
  created_at: string;
}

export interface OrgRow {
  id: string;
  is_active?: boolean | null;
  is_pilot?: boolean | null;
  max_seats?: number | null;
  region?: string | null;
  billing_mode?: string | null;
}

export interface OverviewInput {
  /** Reference instant, so the windows are reproducible in tests. */
  now: number;
  profiles: ProfileRow[];
  /** Reports over the last 60 days, so this month has a month to beat. */
  reports: ReportRow[];
  /** AI calls over the last 60 days. */
  usage: UsageRow[];
  orgs: OrgRow[];
  activeOrgMembers: { org_id: string }[];
  seatOrders: { status?: string | null; seats?: number | null; unit_price?: number | string | null }[];
  tickets: { status?: string | null }[];
  residentVerifications: { status?: string | null }[];
  waitlist: { created_at: string }[];
  dictationFeedback: { up: number; down: number };
  /** True when a row cap was hit, so the figures below are a floor. */
  truncated?: boolean;
}

/** Monthly price of each paid plan, in EUR. */
export const PLAN_PRICES: Record<string, number> = {
  starter: 7.99,
  professional: 15.99,
  resident: 4.99,
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * A value against the equivalent window immediately before it.
 *
 * `changePct` is null rather than 0 or Infinity when the previous window is
 * empty: going from 0 to 12 has no percentage, and rendering "+∞%" or "+0%"
 * both read as noise. The caller shows the raw jump instead.
 */
export interface Trend {
  current: number;
  previous: number;
  changePct: number | null;
}

export function trend(current: number, previous: number): Trend {
  return {
    current,
    previous,
    changePct: previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null,
  };
}

/** Local day key (YYYY-MM-DD) for the daily series. */
function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** A dense day-by-day series — gaps as zeros, so a sparkline is not misread. */
export function dailySeries(timestamps: number[], now: number, days: number): { day: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const ts of timestamps) counts.set(dayKey(ts), (counts.get(dayKey(ts)) || 0) + 1);

  const out: { day: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(now - i * DAY);
    out.push({ day: key, value: counts.get(key) || 0 });
  }
  return out;
}

export interface Overview {
  generatedAt: string;
  truncated: boolean;
  money: {
    mrr: number;
    mrrByPlan: Record<string, number>;
    paying: number;
    trialing: number;
    cancelScheduled: number;
    lapsed: number;
    /** Of the trials that have already ended, how many are paying now. */
    trialConversionPct: number | null;
    finishedTrials: number;
    arpu: number;
  };
  growth: {
    signups: Trend;
    verifiedPct: number | null;
    signupsPerDay: { day: string; value: number }[];
    totalUsers: number;
  };
  activity: {
    reportsToday: number;
    reports7d: number;
    reports: Trend;
    reportsPerDay: { day: string; value: number }[];
    activeUsers7d: number;
    activeUsers: Trend;
    /** Reports per active radiologist over the last 30 days. */
    reportsPerActiveUser: number | null;
    dictationMinutes: number;
    topModalities: { modality: string; count: number }[];
  };
  cost: {
    aiCost: Trend;
    costPerReport: number | null;
    /** What is left of the monthly revenue after the AI bill, as a share. */
    grossMarginPct: number | null;
    calls: Trend;
    errorRatePct: number | null;
  };
  hospitals: {
    total: number;
    active: number;
    gifted: number;
    seatsUsed: number;
    seatsTotal: number;
    pendingOrders: number;
    pendingOrdersValue: number;
    byRegion: Record<string, number>;
  };
  /** Everything waiting for the admin to do something, with its tab. */
  queue: { key: string; count: number; tab: string }[];
  quality: {
    dictationUp: number;
    dictationDown: number;
    dictationPct: number | null;
  };
}

function isCustomer(p: ProfileRow): boolean {
  return p.role !== "admin";
}

/** Paying means a non-free plan, whoever is footing it. */
function isPaying(p: ProfileRow): boolean {
  const plan = p.subscription_plan || "free";
  return plan !== "free";
}

export function buildOverview(input: OverviewInput): Overview {
  const { now } = input;
  const d30 = now - 30 * DAY;
  const d60 = now - 60 * DAY;
  const d7 = now - 7 * DAY;
  const todayKey = dayKey(now);

  const customers = input.profiles.filter(isCustomer);

  // ── Money ──
  const mrrByPlan: Record<string, number> = {};
  let paying = 0, trialing = 0, cancelScheduled = 0, lapsed = 0;
  let finishedTrials = 0, finishedTrialsPaid = 0;
  let dictationSeconds = 0;

  for (const p of customers) {
    dictationSeconds += p.dictation_seconds_used || 0;

    const trialActive = !!p.trial_ends_at && Date.parse(p.trial_ends_at) > now;
    const cancelPending = p.pending_plan === "free";

    if (trialActive) {
      trialing += 1;
    } else if (isPaying(p)) {
      paying += 1;
      if (cancelPending) cancelScheduled += 1;
      const plan = p.subscription_plan || "starter";
      // Hospital seats are billed to the institution through its seat orders,
      // so counting them here as well would book the same money twice.
      if (!p.org_id) mrrByPlan[plan] = (mrrByPlan[plan] || 0) + (PLAN_PRICES[plan] ?? 0);
    } else if (p.subscription_ended_at || p.trial_used_at) {
      lapsed += 1;
    }

    if (p.trial_ends_at && Date.parse(p.trial_ends_at) <= now) {
      finishedTrials += 1;
      if (isPaying(p)) finishedTrialsPaid += 1;
    }
  }

  // Seats the hospitals are actually paying for, at the price of their order.
  let seatRevenue = 0;
  let pendingOrders = 0, pendingOrdersValue = 0;
  for (const o of input.seatOrders) {
    const value = (o.seats || 0) * Number(o.unit_price || 0);
    if (o.status === "active" || o.status === "paid") seatRevenue += value;
    else if (o.status === "pending") { pendingOrders += 1; pendingOrdersValue += value; }
  }
  if (seatRevenue > 0) mrrByPlan.hospitals = Math.round(seatRevenue * 100) / 100;

  const mrr = Math.round(Object.values(mrrByPlan).reduce((a, b) => a + b, 0) * 100) / 100;

  // ── Growth ──
  const signupTimes = customers.map((p) => Date.parse(p.created_at)).filter((t) => !Number.isNaN(t));
  const signups30 = signupTimes.filter((t) => t >= d30).length;
  const signupsPrev30 = signupTimes.filter((t) => t >= d60 && t < d30).length;
  const recent = customers.filter((p) => Date.parse(p.created_at) >= d30);
  const verified = recent.filter((p) => p.email_verified !== false).length;

  // ── Activity ──
  const reportTimes = input.reports.map((r) => Date.parse(r.created_at)).filter((t) => !Number.isNaN(t));
  const reports30 = reportTimes.filter((t) => t >= d30).length;
  const reportsPrev30 = reportTimes.filter((t) => t >= d60 && t < d30).length;
  const reports7d = reportTimes.filter((t) => t >= d7).length;
  const reportsToday = input.reports.filter((r) => dayKey(Date.parse(r.created_at)) === todayKey).length;

  const usersIn = (from: number, to: number) => {
    const s = new Set<string>();
    for (const r of input.reports) {
      const t = Date.parse(r.created_at);
      if (t >= from && t < to) s.add(r.user_id);
    }
    return s.size;
  };
  const activeUsers30 = usersIn(d30, now + DAY);
  const activeUsersPrev30 = usersIn(d60, d30);

  const modalityCounts = new Map<string, number>();
  for (const r of input.reports) {
    if (Date.parse(r.created_at) < d30) continue;
    const m = (r.modality || "—").trim() || "—";
    modalityCounts.set(m, (modalityCounts.get(m) || 0) + 1);
  }
  const topModalities = [...modalityCounts.entries()]
    .map(([modality, count]) => ({ modality, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ── Cost ──
  const costIn = (from: number, to: number) => {
    let sum = 0, calls = 0;
    for (const u of input.usage) {
      const t = Date.parse(u.created_at);
      if (t < from || t >= to) continue;
      calls += 1;
      sum += Number(u.estimated_cost_usd || 0);
    }
    return { cost: Math.round(sum * 10000) / 10000, calls };
  };
  const cost30 = costIn(d30, now + DAY);
  const costPrev30 = costIn(d60, d30);
  const errors30 = input.usage.filter(
    (u) => u.action === "report_error" && Date.parse(u.created_at) >= d30,
  ).length;

  // ── Hospitals ──
  const seatsByOrg = new Map<string, number>();
  for (const m of input.activeOrgMembers) seatsByOrg.set(m.org_id, (seatsByOrg.get(m.org_id) || 0) + 1);
  const byRegion: Record<string, number> = {};
  let seatsTotal = 0, seatsUsed = 0, activeOrgs = 0, gifted = 0;
  for (const o of input.orgs) {
    seatsTotal += o.max_seats || 0;
    seatsUsed += seatsByOrg.get(o.id) || 0;
    if (o.is_active !== false) activeOrgs += 1;
    if (o.billing_mode === "gifted") gifted += 1;
    const key = o.region || "auto";
    byRegion[key] = (byRegion[key] || 0) + 1;
  }

  // ── Queue ──
  const queue = [
    { key: "tickets", count: input.tickets.filter((t) => t.status === "open" || t.status === "in_progress").length, tab: "support" },
    { key: "residents", count: input.residentVerifications.filter((r) => r.status === "pending").length, tab: "residents" },
    { key: "seat_orders", count: pendingOrders, tab: "hospitals" },
    { key: "approvals", count: customers.filter((p) => p.approved === false).length, tab: "users" },
    { key: "waitlist", count: input.waitlist.length, tab: "waitlist" },
  ].filter((q) => q.count > 0);

  const fb = input.dictationFeedback;
  const fbTotal = fb.up + fb.down;

  return {
    generatedAt: new Date(now).toISOString(),
    truncated: !!input.truncated,
    money: {
      mrr,
      mrrByPlan,
      paying,
      trialing,
      cancelScheduled,
      lapsed,
      finishedTrials,
      trialConversionPct: finishedTrials > 0 ? Math.round((finishedTrialsPaid / finishedTrials) * 1000) / 10 : null,
      arpu: paying > 0 ? Math.round((mrr / paying) * 100) / 100 : 0,
    },
    growth: {
      signups: trend(signups30, signupsPrev30),
      verifiedPct: recent.length > 0 ? Math.round((verified / recent.length) * 1000) / 10 : null,
      signupsPerDay: dailySeries(signupTimes.filter((t) => t >= d30), now, 30),
      totalUsers: customers.length,
    },
    activity: {
      reportsToday,
      reports7d,
      reports: trend(reports30, reportsPrev30),
      reportsPerDay: dailySeries(reportTimes.filter((t) => t >= d30), now, 30),
      activeUsers7d: usersIn(d7, now + DAY),
      activeUsers: trend(activeUsers30, activeUsersPrev30),
      reportsPerActiveUser: activeUsers30 > 0 ? Math.round((reports30 / activeUsers30) * 10) / 10 : null,
      dictationMinutes: Math.round(dictationSeconds / 60),
      topModalities,
    },
    cost: {
      aiCost: trend(cost30.cost, costPrev30.cost),
      costPerReport: reports30 > 0 ? Math.round((cost30.cost / reports30) * 10000) / 10000 : null,
      // MRR is monthly revenue and the AI cost is a month's spend, so they are
      // the same window. Null when there is no revenue to take a share of.
      grossMarginPct: mrr > 0 ? Math.round(((mrr - cost30.cost) / mrr) * 1000) / 10 : null,
      calls: trend(cost30.calls, costPrev30.calls),
      errorRatePct: cost30.calls > 0 ? Math.round((errors30 / cost30.calls) * 1000) / 10 : null,
    },
    hospitals: {
      total: input.orgs.length,
      active: activeOrgs,
      gifted,
      seatsUsed,
      seatsTotal,
      pendingOrders,
      pendingOrdersValue: Math.round(pendingOrdersValue * 100) / 100,
      byRegion,
    },
    queue,
    quality: {
      dictationUp: fb.up,
      dictationDown: fb.down,
      dictationPct: fbTotal > 0 ? Math.round((fb.up / fbTotal) * 1000) / 10 : null,
    },
  };
}
