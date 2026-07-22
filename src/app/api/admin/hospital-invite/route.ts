import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";
import { sendHospitalInviteEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Admin sends the hospital invite email (from info@radiogen.ai) to one or more
// radiologist addresses. Returns a per-address result so the UI can confirm
// what was sent and offer resend for any that failed.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const { org_id, emails, lang } = await req.json();
    if (!org_id) return NextResponse.json({ error: "Missing org_id" }, { status: 400 });

    const list: string[] = Array.isArray(emails)
      ? [...new Set(emails.map((e: unknown) => String(e).trim().toLowerCase()).filter((e: string) => /^\S+@\S+\.\S+$/.test(e)))]
      : [];
    if (list.length === 0) return NextResponse.json({ error: "no_valid_emails" }, { status: 400 });
    if (list.length > 50) return NextResponse.json({ error: "too_many" }, { status: 400 });

    const { data: org } = await service
      .from("organizations")
      .select("name, signup_token, is_active")
      .eq("id", org_id)
      .maybeSingle();
    if (!org || !org.is_active) return NextResponse.json({ error: "invalid_org" }, { status: 404 });

    const origin = req.nextUrl.origin;
    const inviteUrl = `${origin}/hospital-signup?token=${org.signup_token}`;
    const emailLang = lang === "en" || lang === "pt" ? lang : "es";

    const results = await Promise.all(list.map(async (email) => {
      try {
        await sendHospitalInviteEmail(email, org.name, inviteUrl, emailLang);
        return { email, sent: true };
      } catch (e) {
        return { email, sent: false, error: e instanceof Error ? e.message : "send_failed" };
      }
    }));

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return toErrorResponse(error);
  }
}
