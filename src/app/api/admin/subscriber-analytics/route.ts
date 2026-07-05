import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * New-subscriber experience analytics.
 *
 * Aggregates audit_logs against profiles.created_at (signup date) to describe
 * the onboarding experience of recently-registered individual users: an
 * activation funnel, engagement segments, retention, feature adoption (with a
 * retention lift), friction signals, and what tools attract users.
 *
 * Admin-only. This is PLATFORM product analytics for the owner — it is not the
 * org productivity metrics (which are gated to org_chief and hidden from
 * radiologists); this route excludes org members entirely.
 */

// Map a raw audit action to a coarse feature bucket (null = not a feature use).
function featureOf(action: string): string | null {
  if (action === "ui_view_calculators" || action === "ui_calculator_opened") return "calculators";
  if (action === "ui_view_recommendations" || action.startsWith("ui_rec_")) return "recommendations";
  if (action === "ui_classify_clicked") return "classify";
  if (action === "ui_clinical_check_clicked") return "clinical_check";
  if (action === "ui_bot_opened") return "bot";
  if (action === "ui_view_templates" || action === "ui_template_selected") return "templates";
  if (action === "ui_dictation_start") return "dictation";
  return null;
}

const FEATURES = ["calculators", "recommendations", "classify", "clinical_check", "bot", "templates", "dictation"];
// Features that count as "explored an advanced tool" for the funnel.
const ADVANCED_TOOLS = new Set(["calculators", "recommendations", "classify", "clinical_check", "bot"]);

const GEN_ACTIONS = new Set(["generate_findings", "generate_conclusion"]);
const START_ACTIONS = new Set(["generate_findings", "generate_conclusion", "ui_new_report", "ui_dictation_start"]);
const COMPLETE_ACTIONS = new Set(["save_report", "ui_copy_report"]);

function dayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD in UTC
}

type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  subscription_plan: string | null;
  approved: boolean | null;
  email_verified: boolean | null;
  stripe_subscription_id: string | null;
};

type LogRow = {
  user_id: string;
  action: string;
  created_at: string;
  had_corrections: boolean | null;
  metadata: Record<string, unknown> | null;
};

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const url = new URL(req.url);
    const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 365);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Cohort: recently-registered individual users (exclude admins and org members).
    const { data: profRaw, error: profErr } = await supabase
      .from("profiles")
      .select("id, email, name, created_at, subscription_plan, approved, email_verified, stripe_subscription_id, role, org_id")
      .gte("created_at", cutoff)
      .neq("role", "admin")
      .is("org_id", null)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (profErr) return dbErrorResponse(profErr);

    const profiles = (profRaw || []) as Profile[];
    const ids = profiles.map((p) => p.id);

    if (ids.length === 0) {
      return NextResponse.json({ days, generatedAt: new Date().toISOString(), cohortSize: 0, empty: true });
    }

    // All audit events for the cohort (chunk the IN filter to stay under URL limits).
    const logs: LogRow[] = [];
    const CHUNK = 200;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from("audit_logs")
        .select("user_id, action, created_at, had_corrections, metadata")
        .in("user_id", slice)
        .order("created_at", { ascending: true })
        .limit(50000);
      if (error) {
        if (error.message?.includes("audit_logs")) break;
        return dbErrorResponse(error);
      }
      if (data) logs.push(...(data as LogRow[]));
    }

    // Per-user aggregation.
    type UserAgg = {
      generations: number;
      reportsSaved: number;
      copied: number;
      errors: number;
      corrections: number;
      started: boolean;
      generated: boolean;
      completed: boolean;
      events: number;
      firstEventAt: string | null;
      lastEventAt: string | null;
      firstStartAt: string | null;
      days: Set<string>;
      features: Set<string>;
    };
    const agg = new Map<string, UserAgg>();
    for (const id of ids) {
      agg.set(id, {
        generations: 0, reportsSaved: 0, copied: 0, errors: 0, corrections: 0,
        started: false, generated: false, completed: false, events: 0,
        firstEventAt: null, lastEventAt: null, firstStartAt: null,
        days: new Set(), features: new Set(),
      });
    }

    const calcCounts = new Map<string, Set<string>>();
    const templateCounts = new Map<string, Set<string>>();

    for (const log of logs) {
      const u = agg.get(log.user_id);
      if (!u) continue;
      u.events += 1;
      if (!u.firstEventAt) u.firstEventAt = log.created_at;
      u.lastEventAt = log.created_at;
      u.days.add(dayKey(log.created_at));

      if (GEN_ACTIONS.has(log.action)) { u.generations += 1; u.generated = true; }
      if (log.action === "save_report") u.reportsSaved += 1;
      if (log.action === "ui_copy_report") u.copied += 1;
      if (log.action === "report_error") u.errors += 1;
      if (log.action === "correction_logged") u.corrections += 1;
      if (START_ACTIONS.has(log.action)) { u.started = true; if (!u.firstStartAt) u.firstStartAt = log.created_at; }
      if (COMPLETE_ACTIONS.has(log.action)) u.completed = true;

      const feat = featureOf(log.action);
      if (feat) u.features.add(feat);

      // Metadata: what tools attract users.
      if (log.action === "ui_calculator_opened") {
        const calc = String(log.metadata?.calc || "").trim();
        if (calc) {
          if (!calcCounts.has(calc)) calcCounts.set(calc, new Set());
          calcCounts.get(calc)!.add(log.user_id);
        }
      }
      if (log.action === "ui_template_selected") {
        const tpl = String(log.metadata?.template || "").trim();
        if (tpl) {
          if (!templateCounts.has(tpl)) templateCounts.set(tpl, new Set());
          templateCounts.get(tpl)!.add(log.user_id);
        }
      }
    }

    // Derived per-user rows + cohort rollups.
    type Segment = "bounced" | "one_and_done" | "engaged" | "champion";
    function segmentOf(u: UserAgg): Segment {
      const activeDays = u.days.size;
      const reports = u.generations + u.reportsSaved;
      if (!u.generated && !u.completed) return "bounced";
      if ((reports >= 3 && activeDays >= 2) || u.features.size >= 3) return "champion";
      if (u.generations >= 2 || activeDays >= 2) return "engaged";
      return "one_and_done";
    }

    const segCounts: Record<Segment, number> = { bounced: 0, one_and_done: 0, engaged: 0, champion: 0 };
    const funnel = { registered: ids.length, activated: 0, started: 0, generated: 0, completed: 0, exploredTool: 0, returned: 0 };
    const featureUsers: Record<string, number> = {};
    const featureReturned: Record<string, number> = {};
    for (const f of FEATURES) { featureUsers[f] = 0; featureReturned[f] = 0; }

    let returnedTotal = 0;
    const retention = { day0: 0, d1_7: 0, d8plus: 0 };
    const ttfrValues: number[] = []; // time-to-first-report, minutes

    let abandoned = 0; // generated but never completed
    let errorUsers = 0; let errorEvents = 0;
    let correctionUsers = 0;
    let notActivated = 0;
    let unverified = 0; let unapproved = 0; let paying = 0;

    const planCounts: Record<string, number> = {};

    const profById = new Map(profiles.map((p) => [p.id, p]));
    const userRows = ids.map((id) => {
      const u = agg.get(id)!;
      const p = profById.get(id)!;
      const activeDays = u.days.size;
      const reports = u.generations + u.reportsSaved;
      const explored = [...u.features].some((f) => ADVANCED_TOOLS.has(f));
      const returned = activeDays >= 2;
      const seg = segmentOf(u);
      segCounts[seg] += 1;

      // Funnel.
      if (u.events > 0) funnel.activated += 1;
      if (u.started) funnel.started += 1;
      if (u.generated) funnel.generated += 1;
      if (u.completed) funnel.completed += 1;
      if (explored) funnel.exploredTool += 1;
      if (returned) funnel.returned += 1;

      if (returned) returnedTotal += 1;

      // Feature adoption + retention lift.
      for (const f of u.features) {
        featureUsers[f] += 1;
        if (returned) featureReturned[f] += 1;
      }

      // Retention buckets by day-diff from signup.
      const signupDay = dayKey(p.created_at);
      let maxDiff = -1; let hasDay0 = false; let hasD1_7 = false;
      for (const d of u.days) {
        const diff = Math.round((Date.parse(d) - Date.parse(signupDay)) / 86400000);
        if (diff === 0) hasDay0 = true;
        if (diff >= 1 && diff <= 7) hasD1_7 = true;
        if (diff > maxDiff) maxDiff = diff;
      }
      if (hasDay0) retention.day0 += 1;
      if (hasD1_7) retention.d1_7 += 1;
      if (maxDiff >= 8) retention.d8plus += 1;

      // Time to first report (activation latency).
      let ttfr: number | null = null;
      if (u.firstStartAt) {
        ttfr = Math.max(0, Math.round((Date.parse(u.firstStartAt) - Date.parse(p.created_at)) / 60000));
        ttfrValues.push(ttfr);
      }

      // Friction.
      if (u.generated && !u.completed) abandoned += 1;
      if (u.errors > 0) { errorUsers += 1; errorEvents += u.errors; }
      if (u.corrections > 0) correctionUsers += 1;
      if (u.events === 0) notActivated += 1;
      if (p.email_verified === false) unverified += 1;
      if (p.approved === false) unapproved += 1;
      if (p.stripe_subscription_id) paying += 1;

      const plan = p.subscription_plan || "free";
      planCounts[plan] = (planCounts[plan] || 0) + 1;

      const score = Math.min(100,
        reports * 18 + activeDays * 14 + u.features.size * 9 + u.copied * 4);

      return {
        id,
        email: p.email || "—",
        name: p.name || "—",
        signup: p.created_at,
        plan,
        paying: !!p.stripe_subscription_id,
        emailVerified: p.email_verified !== false,
        approved: p.approved !== false,
        events: u.events,
        generations: u.generations,
        reportsSaved: u.reportsSaved,
        copied: u.copied,
        reports,
        activeDays,
        features: [...u.features],
        featureCount: u.features.size,
        errors: u.errors,
        corrections: u.corrections,
        lastSeen: u.lastEventAt,
        ttfrMinutes: ttfr,
        returned,
        segment: seg,
        score,
      };
    });

    const median = (arr: number[]): number | null => {
      if (arr.length === 0) return null;
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
    };

    const returnedRate = ids.length ? returnedTotal / ids.length : 0;
    const featureAdoption = FEATURES.map((f) => {
      const used = featureUsers[f];
      const retRateAmong = used ? featureReturned[f] / used : 0;
      return {
        feature: f,
        users: used,
        pct: ids.length ? used / ids.length : 0,
        returnedRateAmong: retRateAmong,
        // Lift vs cohort baseline (ratio; >1 means users of this feature retain better).
        retentionLift: returnedRate > 0 && used > 0 ? retRateAmong / returnedRate : null,
      };
    }).sort((a, b) => b.users - a.users);

    const topCalculators = [...calcCounts.entries()]
      .map(([calc, users]) => ({ calc, users: users.size }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);
    const topTemplates = [...templateCounts.entries()]
      .map(([template, users]) => ({ template, users: users.size }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);

    userRows.sort((a, b) => b.score - a.score || Date.parse(b.signup) - Date.parse(a.signup));

    return NextResponse.json({
      days,
      generatedAt: new Date().toISOString(),
      cohortSize: ids.length,
      totalEvents: logs.length,
      planCounts,
      paying,
      unverified,
      unapproved,
      funnel,
      segments: segCounts,
      retention,
      returnedRate,
      ttfr: { median: median(ttfrValues), count: ttfrValues.length },
      featureAdoption,
      friction: { abandoned, errorUsers, errorEvents, correctionUsers, notActivated },
      topCalculators,
      topTemplates,
      users: userRows.slice(0, 300),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
