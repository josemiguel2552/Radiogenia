import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";
import { sendWelcomeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Public hospital radiologist signup: a radiologist opens the invite link,
// fills the form, and gets IMMEDIATE access as a member of that hospital
// (unlimited reports + dictation via profiles.org_id). No chief/section
// hierarchy — every member is a plain radiologist.
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`hospital-signup:${ip}`, RATE_LIMITS.auth);
    if (!rl.allowed) return rl.errorResponse!;

    const body = await req.json();
    const token = typeof body.token === "string" ? body.token : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const subspecialties = Array.isArray(body.subspecialties)
      ? body.subspecialties.filter((s: unknown) => typeof s === "string" && s.trim()).map((s: string) => s.trim()).slice(0, 15)
      : [];
    const avgReportsMonth = Number.isFinite(Number(body.avgReportsMonth)) && Number(body.avgReportsMonth) >= 0
      ? Math.min(100000, Math.round(Number(body.avgReportsMonth)))
      : null;

    if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ error: "password_too_short" }, { status: 400 });
    if (subspecialties.length === 0) return NextResponse.json({ error: "subspecialty_required" }, { status: 400 });

    const service = createServiceClient();

    // Resolve token → hospital, and enforce seat limit.
    const { data: org } = await service
      .from("organizations")
      .select("id, name, is_active, max_seats, region")
      .eq("signup_token", token)
      .maybeSingle();
    if (!org || !org.is_active) return NextResponse.json({ error: "invalid_token" }, { status: 404 });

    const { count: activeCount } = await service
      .from("org_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id)
      .eq("is_active", true);
    if ((activeCount || 0) >= (org.max_seats || 50)) {
      return NextResponse.json({ error: "seats_full" }, { status: 409 });
    }

    // The address has to be confirmed before the account works. Created
    // unconfirmed so Supabase itself refuses the sign-in until the link is
    // clicked, rather than this code inventing a second gate alongside it.
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name },
    });
    if (authError) {
      if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
        return NextResponse.json({ error: "already_registered" }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    if (!authData.user) return NextResponse.json({ error: "signup_failed" }, { status: 500 });

    const userId = authData.user.id;

    await service.from("profiles").upsert({
      id: userId,
      email,
      name,
      role: "radiologist",
      subscription_plan: "free",
      approved: true,
      email_verified: false,
      billing_period_start: new Date().toISOString(),
      reports_used_this_month: 0,
      dictation_seconds_used: 0,
      subspecialties,
      avg_reports_month: avgReportsMonth,
      hospital: org.name,
    });

    // The hospital decides which regime its radiologists work under. Without
    // it the region fell back to the country on the profile — which this form
    // never asks for — and then to the IP the signup arrived through, so a
    // Latin American hospital could end up on the European feature set.
    if (org.region === "eu" || org.region === "us" || org.region === "open") {
      try {
        await service.from("profiles").update({ region_override: org.region }).eq("id", userId);
      } catch { /* column may predate the migration; region then infers as before */ }
    }

    await service.from("user_model_config").insert({ user_id: userId }).select().maybeSingle();

    // Membership row → sync trigger sets profiles.org_id → unlimited access.
    await service.from("org_members").upsert({
      org_id: org.id,
      user_id: userId,
      section_role: "radiologist",
      is_org_chief: false,
      is_active: true,
      deactivated_at: null,
    }, { onConflict: "org_id,user_id" });

    // Confirmation link. "signup" is the type meant for an unconfirmed user;
    // magiclink is the fallback, since it also confirms the address on use.
    let confirmUrl: string | null = null;
    const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    for (const type of ["signup", "magiclink"] as const) {
      try {
        const { data: linkData } = await service.auth.admin.generateLink(
          type === "signup" ? { type, email, password } : { type, email },
        );
        if (linkData?.properties?.hashed_token) {
          confirmUrl = `${base}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=${type}`;
          break;
        }
      } catch (err) {
        console.error(`[hospital-signup] ${type} link error: ${err}`);
      }
    }

    try {
      await sendWelcomeEmail(email, name, "es", confirmUrl, null);
    } catch (err) {
      console.error(`[hospital-signup] email error: ${err}`);
    }

    // needsConfirmation tells the page to say "check your email" instead of
    // signing them straight in, which would now fail.
    return NextResponse.json({ ok: true, email, needsConfirmation: true, confirmSent: !!confirmUrl });
  } catch (error) {
    return toErrorResponse(error);
  }
}
