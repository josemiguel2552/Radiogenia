import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendOnboardingToolsEmail, sendReportTypesEmail, sendGuidelinesEmail, sendLimitReachedEmail } from "@/lib/email";
import { PLANS } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * Sends the 24h onboarding email to the requesting admin's own inbox, so they
 * can preview how it renders in a real email client. Admin-only; never touches
 * the onboarding_email_sent_at flag, so it doesn't interfere with the cron.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "No email on account" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const lang = (body?.lang === "en" || body?.lang === "pt") ? body.lang : "es";
    const type = body?.type === "report_types" ? "report_types"
      : body?.type === "guidelines" ? "guidelines"
      : body?.type === "limit" ? "limit"
      : "tools";
    // Optional recipient override (admin-only), e.g. to send to mail-tester.com
    // for a deliverability score. Falls back to the admin's own inbox.
    const toOverride = typeof body?.to === "string" && /^\S+@\S+\.\S+$/.test(body.to.trim())
      ? body.to.trim()
      : null;
    const recipient = toOverride || user.email;

    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    if (type === "report_types") {
      await sendReportTypesEmail(recipient, profile?.name ?? null, lang);
    } else if (type === "guidelines") {
      await sendGuidelinesEmail(recipient, profile?.name ?? null, lang);
    } else if (type === "limit") {
      // Sample data: a free-plan user who just ran out.
      const renewal = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000);
      const locale = lang === "en" ? "en-US" : lang === "pt" ? "pt-BR" : "es-ES";
      await sendLimitReachedEmail(recipient, profile?.name ?? null, lang, {
        planLabel: PLANS.free.label,
        used: PLANS.free.reports,
        limit: PLANS.free.reports,
        renewalDate: renewal.toLocaleDateString(locale, { day: "numeric", month: "long" }),
        nextPlan: { label: PLANS.starter.label, reports: PLANS.starter.reports, dictationMinutes: PLANS.starter.dictationMinutes, price: PLANS.starter.price },
      });
    } else {
      await sendOnboardingToolsEmail(recipient, profile?.name ?? null, lang);
    }
    return NextResponse.json({ ok: true, sentTo: recipient });
  } catch (error) {
    return toErrorResponse(error);
  }
}
