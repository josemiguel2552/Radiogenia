import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendActivationReminderEmail } from "@/lib/email";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * Admin: nudge a "Sin activar" user to finish signing up. Sends an email with
 * a magic link that verifies their email AND drops them straight into Stripe
 * Checkout for the 7-day Starter trial (or their originally chosen plan) —
 * one click from inbox to card form.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("email, name, subscription_plan, org_id, role, pending_checkout_plan")
      .eq("id", userId)
      .single();

    if (!profile?.email) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (profile.role === "admin" || profile.org_id || (profile.subscription_plan && profile.subscription_plan !== "free")) {
      return NextResponse.json({ error: "User does not need activation" }, { status: 400 });
    }

    const plan = profile.pending_checkout_plan === "professional" ? "professional" : "starter";

    const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
    });
    if (linkErr || !linkData?.properties?.hashed_token) {
      return NextResponse.json({ error: linkErr?.message || "Could not generate link" }, { status: 500 });
    }

    const base = process.env.NEXT_PUBLIC_APP_URL || "https://radiogen.ai";
    const activateUrl = `${base}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink&plan=${plan}`;

    let lang: "es" | "en" | "pt" = "es";
    try {
      const { data: cfg } = await service
        .from("user_model_config")
        .select("output_language")
        .eq("user_id", userId)
        .maybeSingle();
      if (cfg?.output_language === "en") lang = "en";
      else if (cfg?.output_language === "pt") lang = "pt";
    } catch { /* default es */ }

    await sendActivationReminderEmail(profile.email, profile.name, lang, activateUrl);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
