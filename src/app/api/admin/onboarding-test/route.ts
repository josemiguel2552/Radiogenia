import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendOnboardingToolsEmail, sendReportTypesEmail } from "@/lib/email";
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
    const type = body?.type === "report_types" ? "report_types" : "tools";
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
    } else {
      await sendOnboardingToolsEmail(recipient, profile?.name ?? null, lang);
    }
    return NextResponse.json({ ok: true, sentTo: recipient });
  } catch (error) {
    return toErrorResponse(error);
  }
}
