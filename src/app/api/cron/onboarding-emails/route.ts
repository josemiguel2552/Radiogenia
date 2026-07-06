import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendOnboardingToolsEmail, sendReportTypesEmail, sendGuidelinesEmail } from "@/lib/email";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Lifecycle emails, driven by a daily Vercel Cron (see vercel.json):
 *   - ~24h after signup: the "here are your tools" onboarding email.
 *   - ~48h after signup: the "report types" email.
 *   - ~5 days after signup: the "extract recommendations from guidelines" email.
 *
 * Vercel attaches `Authorization: Bearer ${CRON_SECRET}` to cron invocations,
 * which we verify. An authenticated admin can also call it (e.g. ?dryRun=1 to
 * preview). Each email is guarded by its own profiles column, set only after a
 * successful send, so repeated runs never email anyone twice.
 */

type EmailLang = "es" | "en" | "pt";
type SupabaseClient = ReturnType<typeof createServiceClient>;

function pickLang(output_language: string | null | undefined): EmailLang {
  if (output_language === "en") return "en";
  if (output_language === "pt") return "pt";
  return "es"; // default (and for fr/de/it, which the emails don't cover)
}

type Candidate = { id: string; email: string | null; name: string | null; created_at: string; email_verified: boolean | null; approved: boolean | null };

async function processLifecycleEmail(
  supabase: SupabaseClient,
  opts: { flagColumn: string; minAgeHours: number; send: (to: string, name: string | null, lang: EmailLang) => Promise<void>; dryRun: boolean },
) {
  const now = Date.now();
  const ageAgo = new Date(now - opts.minAgeHours * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Individual (non-org, non-admin) users past the age threshold, confirmed and
  // approved, who haven't received this specific email yet.
  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id, email, name, created_at, email_verified, approved")
    .is(opts.flagColumn, null)
    .lte("created_at", ageAgo)
    .gte("created_at", monthAgo)
    .neq("role", "admin")
    .is("org_id", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    if (error.message?.includes(opts.flagColumn)) return { migration: false, sent: 0, candidates: 0 };
    throw error;
  }

  const candidates = (rows || []).filter(
    (p: Candidate) => p.email && p.email_verified !== false && p.approved !== false,
  );

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

  if (opts.dryRun) {
    return {
      dryRun: true,
      wouldSend: candidates.length,
      users: candidates.map((c) => ({ email: c.email, signup: c.created_at, lang: langById.get(c.id) || "es" })),
    };
  }

  let sent = 0;
  const errors: string[] = [];
  for (const p of candidates) {
    try {
      await opts.send(p.email as string, p.name, langById.get(p.id) || "es");
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ [opts.flagColumn]: new Date().toISOString() })
        .eq("id", p.id);
      if (upErr) errors.push(`mark ${p.email}: ${upErr.message}`);
      sent += 1;
    } catch (e) {
      errors.push(`${p.email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { sent, candidates: candidates.length, errors };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";

    const auth = req.headers.get("authorization") || "";
    const secret = process.env.CRON_SECRET;
    const hasCronAuth = !!secret && auth === `Bearer ${secret}`;
    if (!hasCronAuth) {
      await requireAdmin(); // session-based admin fallback (manual/testing)
    }

    const supabase = createServiceClient();

    const onboarding = await processLifecycleEmail(supabase, {
      flagColumn: "onboarding_email_sent_at", minAgeHours: 24, send: sendOnboardingToolsEmail, dryRun,
    });
    const reportTypes = await processLifecycleEmail(supabase, {
      flagColumn: "report_types_email_sent_at", minAgeHours: 48, send: sendReportTypesEmail, dryRun,
    });
    const guidelines = await processLifecycleEmail(supabase, {
      flagColumn: "guidelines_email_sent_at", minAgeHours: 120, send: sendGuidelinesEmail, dryRun,
    });

    return NextResponse.json({ ok: true, onboarding, reportTypes, guidelines });
  } catch (error) {
    return toErrorResponse(error);
  }
}
