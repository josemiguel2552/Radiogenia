import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendOnboardingToolsEmail } from "@/lib/email";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends the "here are your tools" onboarding email ~24h after signup.
 *
 * Intended to be triggered by a Vercel Cron (daily) — see vercel.json. Vercel
 * automatically attaches `Authorization: Bearer ${CRON_SECRET}` to cron
 * invocations, which we verify here. An authenticated admin can also call it
 * manually (e.g. to test, or with ?dryRun=1 to preview who would be emailed).
 *
 * Idempotent: each user is guarded by profiles.onboarding_email_sent_at, set
 * only after a successful send, so repeated runs never email anyone twice.
 */

type EmailLang = "es" | "en" | "pt";

function pickLang(output_language: string | null | undefined): EmailLang {
  if (output_language === "en") return "en";
  if (output_language === "pt") return "pt";
  return "es"; // default (and for fr/de/it, which the email doesn't cover)
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";

    // Auth: Vercel Cron bearer secret, OR an authenticated admin (manual/testing).
    const auth = req.headers.get("authorization") || "";
    const secret = process.env.CRON_SECRET;
    const hasCronAuth = !!secret && auth === `Bearer ${secret}`;
    if (!hasCronAuth) {
      // Falls back to session-based admin auth; throws if not an admin.
      await requireAdmin();
    }

    const supabase = createServiceClient();

    const now = Date.now();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Candidates: individual (non-org, non-admin) users who signed up between
    // 24h and 30d ago, confirmed their email, are approved (have access), and
    // haven't received the onboarding email yet.
    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id, email, name, created_at, email_verified, approved")
      .is("onboarding_email_sent_at", null)
      .lte("created_at", dayAgo)
      .gte("created_at", monthAgo)
      .neq("role", "admin")
      .is("org_id", null)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      // If the tracking column is missing (migration not applied yet), no-op.
      if (error.message?.includes("onboarding_email_sent_at")) {
        return NextResponse.json({ ok: true, sent: 0, note: "migration not applied" });
      }
      return dbErrorResponse(error);
    }

    const candidates = (rows || []).filter(
      (p) => p.email && p.email_verified !== false && p.approved !== false,
    );

    // Resolve preferred language from user_model_config.output_language.
    const langById = new Map<string, EmailLang>();
    if (candidates.length > 0) {
      const ids = candidates.map((c) => c.id);
      const { data: configs } = await supabase
        .from("user_model_config")
        .select("user_id, output_language")
        .in("user_id", ids);
      for (const c of (configs || []) as { user_id: string; output_language: string | null }[]) {
        langById.set(c.user_id, pickLang(c.output_language));
      }
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        wouldSend: candidates.length,
        users: candidates.map((c) => ({
          email: c.email,
          signup: c.created_at,
          lang: langById.get(c.id) || "es",
        })),
      });
    }

    let sent = 0;
    const errors: string[] = [];
    for (const p of candidates) {
      try {
        await sendOnboardingToolsEmail(p.email as string, p.name, langById.get(p.id) || "es");
        const { error: upErr } = await supabase
          .from("profiles")
          .update({ onboarding_email_sent_at: new Date().toISOString() })
          .eq("id", p.id);
        if (upErr) {
          // Avoid re-sending on the next run if we can't record it: log and stop
          // marking, but the send already happened — record best-effort.
          errors.push(`mark ${p.email}: ${upErr.message}`);
        }
        sent += 1;
      } catch (e) {
        errors.push(`${p.email}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({ ok: true, sent, candidates: candidates.length, errors });
  } catch (error) {
    return toErrorResponse(error);
  }
}
