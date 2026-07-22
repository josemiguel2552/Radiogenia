import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// Hospital trial link: /hospital-trial?token=<org.trial_token>
// Anyone with the link enters the app directly — no registration, no login —
// via a per-hospital shared trial account with unlimited tools until the
// hospital's trial_expires_at (30 days from creation). The onboarding
// assistant shows automatically on every new browser (localStorage-based),
// which is exactly the desired demo behavior.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  const fail = (msg: string) =>
    NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(msg)}`);

  if (!token) return fail("Enlace de prueba no válido");

  const service = createServiceClient();
  const { data: org } = await service
    .from("organizations")
    .select("id, name, is_active, trial_expires_at")
    .eq("trial_token", token)
    .maybeSingle();

  if (!org || !org.is_active) return fail("Enlace de prueba no válido");
  if (org.trial_expires_at && new Date(org.trial_expires_at).getTime() < Date.now()) {
    return fail("El periodo de prueba de este enlace ha finalizado. Contacta con info@radiogen.ai");
  }

  // Find or create the hospital's shared trial account.
  const trialEmail = `trial-${org.id}@radiogen.ai`;
  const { data: existing } = await service
    .from("profiles")
    .select("id")
    .eq("email", trialEmail)
    .maybeSingle();

  let userId = existing?.id as string | undefined;
  if (!userId) {
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email: trialEmail,
      email_confirm: true,
      user_metadata: { name: `Prueba — ${org.name}` },
    });
    if (createErr || !created.user) return fail("No se pudo iniciar la prueba. Inténtalo de nuevo.");
    userId = created.user.id;
    await service.from("user_model_config").insert({ user_id: userId }).select().maybeSingle();
  }

  // Unlimited access: org_id directly on the profile (billing bypass) WITHOUT
  // an org_members row — the trial account doesn't consume a seat and doesn't
  // appear in the hospital team or its member metrics.
  await service.from("profiles").upsert({
    id: userId,
    email: trialEmail,
    name: `Prueba — ${org.name}`,
    role: "radiologist",
    subscription_plan: "free",
    approved: true,
    email_verified: true,
    org_id: org.id,
  });

  // Mint a session without any login form: magic-link token consumed here.
  const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
    type: "magiclink",
    email: trialEmail,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkErr || !tokenHash) return fail("No se pudo iniciar la prueba. Inténtalo de nuevo.");

  const supabase = await createClient();
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (verifyErr) return fail("No se pudo iniciar la prueba. Inténtalo de nuevo.");

  return NextResponse.redirect(`${origin}/dashboard`);
}
