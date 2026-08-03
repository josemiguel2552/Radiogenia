import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 90-day data retention for lapsed subscribers, driven by a daily Vercel Cron
 * (see vercel.json). When a subscription ends the webhook stamps
 * subscription_ended_at; if the user hasn't reactivated within 90 days, the
 * account and all its data are permanently deleted (auth.users cascade).
 *
 * Safety rails: only individual accounts (no org), never admins, never
 * accounts with a live Stripe subscription or a non-free plan, small batch
 * per run, and every deletion is logged. ?dryRun=1 previews without deleting.
 *
 * Auth mirrors the other crons: Vercel's `Bearer ${CRON_SECRET}` or an
 * authenticated admin.
 */

const RETENTION_DAYS = 90;
const BATCH_LIMIT = 25;

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

    const service = createServiceClient();
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await service
      .from("profiles")
      .select("id, email, subscription_ended_at, subscription_plan, stripe_subscription_id, org_id, role")
      .not("subscription_ended_at", "is", null)
      .lte("subscription_ended_at", cutoff)
      .eq("subscription_plan", "free")
      .is("stripe_subscription_id", null)
      .is("org_id", null)
      .neq("role", "admin")
      .order("subscription_ended_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (error) {
      // Retention migration not applied yet: report instead of crashing.
      if (error.message?.includes("subscription_ended_at")) {
        return NextResponse.json({ ok: false, migration: false, error: error.message });
      }
      throw error;
    }

    const candidates = rows || [];

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        wouldDelete: candidates.length,
        users: candidates.map((c) => ({ email: c.email, accessEndedAt: c.subscription_ended_at })),
      });
    }

    let deleted = 0;
    const errors: string[] = [];
    for (const p of candidates) {
      try {
        const { error: delErr } = await service.auth.admin.deleteUser(p.id);
        if (delErr) {
          errors.push(`${p.email}: ${delErr.message}`);
          continue;
        }
        deleted += 1;
        console.log(`[purge-lapsed] deleted account ${p.email} (access ended ${p.subscription_ended_at})`);
      } catch (e) {
        errors.push(`${p.email}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({ ok: true, deleted, candidates: candidates.length, errors });
  } catch (error) {
    return toErrorResponse(error);
  }
}
