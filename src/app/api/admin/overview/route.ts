import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";
import { buildOverview } from "@/lib/admin-overview";
import type { ProfileRow, ReportRow, UsageRow, OrgRow } from "@/lib/admin-overview";

export const dynamic = "force-dynamic";

/** 60 days: the last 30 need the 30 before them to be worth anything. */
const WINDOW_DAYS = 60;
const PAGE = 1000;
/** Ceiling per table, so one busy month cannot hang the dashboard. */
const MAX_PAGES = 20;

/**
 * PostgREST caps a response at 1000 rows and says nothing about it, so a
 * single .select() silently becomes "the first thousand" — and every total
 * built on it is wrong in a way nobody notices. Paginate, and report when the
 * ceiling itself was reached so the view can say the figures are a floor.
 */
interface Rangeable {
  range(from: number, to: number): PromiseLike<{ data: unknown; error: unknown }>;
}

async function fetchAll<T>(build: () => Rangeable): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await build().range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) return { rows, truncated: false };
    const batch = (data || []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

/**
 * Just the work waiting for the admin, for the badges on the navigation.
 *
 * Count-only queries: the full overview paginates two months of reports and
 * AI calls, which is far too much to run on every admin page load for five
 * numbers — and would run it twice, since the summary fetches it as well.
 */
async function queueOnly() {
  const supabase = createServiceClient();
  const head = { count: "exact" as const, head: true };
  /** A table this database does not have is not work waiting. */
  const n = async (p: PromiseLike<{ count: number | null; error: unknown }>) => {
    try {
      const { count, error } = await p;
      return error ? 0 : count || 0;
    } catch {
      return 0;
    }
  };

  const [tickets, residents, seatOrders, approvals, waitlist] = await Promise.all([
    n(supabase.from("support_tickets").select("id", head).in("status", ["open", "in_progress"])),
    n(supabase.from("resident_verifications").select("id", head).eq("status", "pending")),
    n(supabase.from("org_seat_orders").select("id", head).eq("status", "pending")),
    n(supabase.from("profiles").select("id", head).eq("approved", false)),
    n(supabase.from("waitlist").select("id", head)),
  ]);

  return {
    queue: [
      { key: "tickets", count: tickets, tab: "support" },
      { key: "residents", count: residents, tab: "residents" },
      { key: "seat_orders", count: seatOrders, tab: "hospitals" },
      { key: "approvals", count: approvals, tab: "users" },
      { key: "waitlist", count: waitlist, tab: "waitlist" },
    ].filter((q) => q.count > 0),
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    if (new URL(req.url).searchParams.get("only") === "queue") {
      return NextResponse.json(await queueOnly(), {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    const supabase = createServiceClient();

    const now = Date.now();
    const since = new Date(now - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Profiles carry the trial and cancellation columns only once the billing
    // migrations have run, so the richer select falls back to the plain one
    // rather than failing the whole dashboard.
    const PROFILE_BASE = "id, role, created_at, subscription_plan, pending_plan, email_verified, approved, org_id, reports_used_this_month, dictation_seconds_used, stripe_subscription_id";
    let profiles: ProfileRow[] = [];
    for (const sel of [
      `${PROFILE_BASE}, trial_used_at, trial_ends_at, subscription_ended_at`,
      `${PROFILE_BASE}, trial_used_at, trial_ends_at`,
      PROFILE_BASE,
    ]) {
      const r = await fetchAll<ProfileRow>(() => supabase.from("profiles").select(sel).order("created_at", { ascending: false }));
      if (r.rows.length > 0 || sel === PROFILE_BASE) { profiles = r.rows; break; }
    }

    const [reports, usage, orgs, members, orders, tickets, residents, waitlist] = await Promise.all([
      fetchAll<ReportRow>(() => supabase.from("reports").select("user_id, modality, created_at").gte("created_at", since)),
      fetchAll<UsageRow>(() => supabase.from("audit_logs").select("action, estimated_cost_usd, created_at").gte("created_at", since)),
      fetchAll<OrgRow>(() => supabase.from("organizations").select("id, is_active, is_pilot, max_seats, region, billing_mode")),
      fetchAll<{ org_id: string }>(() => supabase.from("org_members").select("org_id").eq("is_active", true)),
      fetchAll<{ status: string | null; seats: number | null; unit_price: number | null }>(() => supabase.from("org_seat_orders").select("status, seats, unit_price")),
      fetchAll<{ status: string | null }>(() => supabase.from("support_tickets").select("status")),
      fetchAll<{ status: string | null }>(() => supabase.from("resident_verifications").select("status")),
      fetchAll<{ created_at: string }>(() => supabase.from("waitlist").select("created_at")),
    ]);

    // Counted server-side over every log, not just the window above.
    let dictationFeedback = { up: 0, down: 0 };
    try {
      const [{ count: up }, { count: down }] = await Promise.all([
        supabase.from("audit_logs").select("id", { count: "exact", head: true })
          .eq("action", "ui_dictation_feedback").eq("metadata->>verdict", "up"),
        supabase.from("audit_logs").select("id", { count: "exact", head: true })
          .eq("action", "ui_dictation_feedback").eq("metadata->>verdict", "down"),
      ]);
      dictationFeedback = { up: up || 0, down: down || 0 };
    } catch { /* audit_logs may predate the feedback action */ }

    const overview = buildOverview({
      now,
      profiles,
      reports: reports.rows,
      usage: usage.rows,
      orgs: orgs.rows,
      activeOrgMembers: members.rows,
      seatOrders: orders.rows,
      tickets: tickets.rows,
      residentVerifications: residents.rows,
      waitlist: waitlist.rows,
      dictationFeedback,
      truncated: reports.truncated || usage.truncated,
    });

    return NextResponse.json(overview, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
