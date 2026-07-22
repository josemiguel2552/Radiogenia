import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";

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
      .select("id, name, is_active, max_seats")
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

    // Create the auth user with the chosen password (immediate access — no
    // email verification gate for hospital members).
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
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
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      billing_period_start: new Date().toISOString(),
      reports_used_this_month: 0,
      dictation_seconds_used: 0,
      subspecialties,
      avg_reports_month: avgReportsMonth,
      hospital: org.name,
    });

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

    return NextResponse.json({ ok: true, email });
  } catch (error) {
    return toErrorResponse(error);
  }
}
