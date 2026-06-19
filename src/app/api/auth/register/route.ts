import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";
import { sendWelcomeEmail, sendPendingApprovalEmail } from "@/lib/email";

const LATAM_COUNTRIES = new Set([
  "Argentina", "Bolivia", "Brasil", "Chile", "Colombia", "Costa Rica", "Cuba",
  "Ecuador", "El Salvador", "Guatemala", "Honduras", "México",
  "Nicaragua", "Panamá", "Paraguay", "Perú", "Puerto Rico",
  "República Dominicana", "Uruguay", "Venezuela",
]);

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`auth-register:${ip}`, RATE_LIMITS.auth);
    if (!rl.allowed) return rl.errorResponse!;

    const { email, password, firstName, lastName, country, hospital, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "email_password_required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "password_too_short" }, { status: 400 });
    }

    const service = createServiceClient();
    const normalizedEmail = email.trim().toLowerCase();

    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
        return NextResponse.json({ error: "already_registered" }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "signup_failed" }, { status: 500 });
    }

    const userId = authData.user.id;
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

    const autoApprove = LATAM_COUNTRIES.has(country || "") && role !== "resident";

    await service.from("profiles").upsert({
      id: userId,
      email: normalizedEmail,
      role: "radiologist",
      subscription_plan: "free",
      approved: autoApprove,
      email_verified: false,
      billing_period_start: new Date().toISOString(),
      reports_used_this_month: 0,
      dictation_seconds_used: 0,
      ...(fullName ? { name: fullName } : {}),
      ...(country ? { country } : {}),
      ...(hospital ? { hospital } : {}),
      ...(role ? { professional_role: role } : {}),
    });

    await service.from("user_model_config").insert({ user_id: userId }).select().maybeSingle();

    let confirmUrl: string | null = null;
    if (autoApprove) {
      try {
        const { data: linkData } = await service.auth.admin.generateLink({
          type: "magiclink",
          email: normalizedEmail,
        });
        if (linkData?.properties?.hashed_token) {
          const base = process.env.NEXT_PUBLIC_APP_URL || "https://radiogen.ai";
          confirmUrl = `${base}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink`;
        }
      } catch (err) {
        console.error(`[register] confirm link error: ${err}`);
      }
    }

    const emailFn = autoApprove ? sendWelcomeEmail : sendPendingApprovalEmail;
    emailFn(normalizedEmail, fullName, "es", confirmUrl).catch((err) =>
      console.error(`[register] email error: ${err}`)
    );

    return NextResponse.json({ ok: true, approved: autoApprove });
  } catch (error) {
    return toErrorResponse(error);
  }
}
