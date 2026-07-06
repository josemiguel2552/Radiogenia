import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendOnboardingToolsEmail, sendReportTypesEmail, sendGuidelinesEmail } from "@/lib/email";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Admin: manually send one lifecycle email to one user and stamp the matching
 * flag, so the email log shows it as sent and the cron won't re-send it. Used
 * to fix cases where a user missed an email that was already due.
 */

type EmailLang = "es" | "en" | "pt";
function pickLang(o?: string | null): EmailLang {
  return o === "en" ? "en" : o === "pt" ? "pt" : "es";
}

const TYPES = {
  tools: { column: "onboarding_email_sent_at", send: sendOnboardingToolsEmail },
  report_types: { column: "report_types_email_sent_at", send: sendReportTypesEmail },
  guidelines: { column: "guidelines_email_sent_at", send: sendGuidelinesEmail },
} as const;

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const body = await req.json().catch(() => ({}));
    const userId = typeof body?.userId === "string" ? body.userId : null;
    const type = (body?.type in TYPES ? body.type : null) as keyof typeof TYPES | null;
    if (!userId || !type) {
      return NextResponse.json({ error: "userId and valid type required" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", userId)
      .single();
    if (!profile?.email) {
      return NextResponse.json({ error: "User has no email" }, { status: 400 });
    }

    const { data: cfg } = await supabase
      .from("user_model_config")
      .select("output_language")
      .eq("user_id", userId)
      .maybeSingle();
    const lang = pickLang(cfg?.output_language);

    await TYPES[type].send(profile.email, profile.name ?? null, lang);
    await supabase
      .from("profiles")
      .update({ [TYPES[type].column]: new Date().toISOString() })
      .eq("id", userId);

    return NextResponse.json({ ok: true, sentTo: profile.email });
  } catch (error) {
    return toErrorResponse(error);
  }
}
