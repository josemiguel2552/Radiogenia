import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`resend-confirm:${ip}`, RATE_LIMITS.auth);
    if (!rl.allowed) return rl.errorResponse!;

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email_required" }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("id, name, email_verified, approved")
      .eq("email", normalizedEmail)
      .maybeSingle();

    // Only resend for existing, approved, still-unverified accounts — but
    // always answer ok to avoid leaking whether an email is registered.
    if (profile && profile.approved && !profile.email_verified) {
      try {
        const { data: linkData } = await service.auth.admin.generateLink({
          type: "magiclink",
          email: normalizedEmail,
        });
        if (linkData?.properties?.hashed_token) {
          const base = process.env.NEXT_PUBLIC_APP_URL || "https://radiogen.ai";
          const confirmUrl = `${base}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink`;
          await sendWelcomeEmail(normalizedEmail, profile.name, "es", confirmUrl, null);
        }
      } catch (err) {
        console.error(`[resend-confirmation] error: ${err instanceof Error ? err.message : err}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
