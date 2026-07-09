import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendVerificationReminderEmail } from "@/lib/email";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Admin: resend the verification (magic-link) email to users who signed up but
 * never confirmed their email. Mirrors /api/auth/resend-confirmation but in bulk
 * and admin-triggered. Targets individual, still-unverified accounts with a
 * valid email — approval is no longer a gate, so it's not filtered on here
 * (this count is what "how many to contact" should mean). ?dryRun previews
 * the count without sending.
 */

type EmailLang = "es" | "en" | "pt";
function pickLang(o?: string | null): EmailLang {
  return o === "en" ? "en" : o === "pt" ? "pt" : "es";
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const limit = Math.min(Math.max(Number(body?.limit) || 200, 1), 300);

    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id, email, name")
      .eq("email_verified", false)
      .is("org_id", null)
      .neq("role", "admin")
      .not("email", "is", null)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (error) return dbErrorResponse(error);

    const candidates = (rows || []).filter((p) => p.email);

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        unverified: candidates.length,
        sample: candidates.slice(0, 8).map((c) => c.email),
      });
    }

    const batch = candidates.slice(0, limit);

    // Preferred language per user.
    const langById = new Map<string, EmailLang>();
    if (batch.length > 0) {
      const ids = batch.map((c) => c.id);
      const { data: cfgs } = await supabase
        .from("user_model_config")
        .select("user_id, output_language")
        .in("user_id", ids);
      for (const c of (cfgs || []) as { user_id: string; output_language: string | null }[]) {
        langById.set(c.user_id, pickLang(c.output_language));
      }
    }

    const base = process.env.NEXT_PUBLIC_APP_URL || "https://radiogen.ai";
    let sent = 0;
    const errors: string[] = [];
    for (const p of batch) {
      try {
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: p.email as string,
        });
        if (linkData?.properties?.hashed_token) {
          const confirmUrl = `${base}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink`;
          await sendVerificationReminderEmail(p.email as string, p.name, langById.get(p.id) || "es", confirmUrl);
          try { await supabase.from("profiles").update({ verification_email_sent_at: new Date().toISOString() }).eq("id", p.id); } catch { /* ignore */ }
          sent += 1;
        } else {
          errors.push(`${p.email}: no link`);
        }
      } catch (e) {
        errors.push(`${p.email}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({ ok: true, sent, unverified: candidates.length, errors });
  } catch (error) {
    return toErrorResponse(error);
  }
}
