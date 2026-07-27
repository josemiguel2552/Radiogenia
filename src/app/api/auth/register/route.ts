import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`auth-register:${ip}`, RATE_LIMITS.auth);
    if (!rl.allowed) return rl.errorResponse!;

    const { email, password, firstName, lastName, country, hospital, role, plan, utm } = await req.json();

    // Sanitized traffic attribution (which channel/campaign brought this user).
    const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "referrer"];
    let signupUtm: Record<string, string> | null = null;
    if (utm && typeof utm === "object" && !Array.isArray(utm)) {
      const clean: Record<string, string> = {};
      for (const k of UTM_KEYS) {
        const v = (utm as Record<string, unknown>)[k];
        if (typeof v === "string" && v) clean[k] = v.slice(0, 300);
      }
      if (Object.keys(clean).length > 0) signupUtm = clean;
    }

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

    // Card-first billing: every signup must activate a plan before using the
    // platform (15-day Starter trial with card, or Professional charged
    // immediately). Email verification stays deferred (7-day grace), but the
    // dashboard is paywalled until checkout completes.
    const pendingPlan = plan === "professional" ? "professional" : "starter";

    await service.from("profiles").upsert({
      id: userId,
      email: normalizedEmail,
      role: "radiologist",
      subscription_plan: "free",
      approved: true,
      email_verified: false,
      billing_period_start: new Date().toISOString(),
      reports_used_this_month: 0,
      dictation_seconds_used: 0,
      ...(fullName ? { name: fullName } : {}),
      ...(country ? { country } : {}),
      ...(hospital ? { hospital } : {}),
      ...(role ? { professional_role: role } : {}),
      pending_checkout_plan: pendingPlan,
    });

    // Best-effort attribution stamp (separate update: must never break signup,
    // e.g. if the migration adding the column hasn't been applied yet).
    if (signupUtm) {
      try { await service.from("profiles").update({ signup_utm: signupUtm }).eq("id", userId); } catch { /* ignore */ }
    }

    await service.from("user_model_config").insert({ user_id: userId }).select().maybeSingle();

    let confirmUrl: string | null = null;
    try {
      const { data: linkData } = await service.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
      });
      if (linkData?.properties?.hashed_token) {
        const base = process.env.NEXT_PUBLIC_APP_URL || "https://radiogen.ai";
        confirmUrl = `${base}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink&plan=${pendingPlan}`;
      }
    } catch (err) {
      console.error(`[register] confirm link error: ${err}`);
    }

    try {
      await sendWelcomeEmail(normalizedEmail, fullName, "es", confirmUrl, pendingPlan);
      if (confirmUrl) {
        try { await service.from("profiles").update({ verification_email_sent_at: new Date().toISOString() }).eq("id", userId); } catch { /* ignore */ }
      }
    } catch (err) {
      console.error(`[register] email error: ${err}`);
    }

    return NextResponse.json({ ok: true, approved: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
