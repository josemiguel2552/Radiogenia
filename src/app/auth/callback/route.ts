import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const inviteCode = searchParams.get("invite");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    if (inviteCode) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const service = createServiceClient();

          const { data: invitation } = await service
            .from("invitations")
            .select("id, code, max_uses, used_count, owner_id")
            .eq("code", inviteCode.toUpperCase().trim())
            .maybeSingle();

          if (invitation && invitation.used_count < invitation.max_uses && invitation.owner_id !== user.id) {
            const { data: profile } = await service
              .from("profiles")
              .select("invitation_code")
              .eq("id", user.id)
              .maybeSingle();

            if (!profile?.invitation_code) {
              const bonusExpires = new Date();
              bonusExpires.setDate(bonusExpires.getDate() + 30);
              const bonusExpiresIso = bonusExpires.toISOString();

              await service
                .from("invitations")
                .update({ used_count: invitation.used_count + 1 })
                .eq("id", invitation.id)
                .eq("used_count", invitation.used_count);

              await service
                .from("invitation_redemptions")
                .insert({ invitation_id: invitation.id, redeemed_by: user.id });

              await service
                .from("profiles")
                .update({
                  subscription_plan: "starter",
                  billing_period_start: new Date().toISOString(),
                  reports_used_this_month: 0,
                  dictation_seconds_used: 0,
                  approved: true,
                  invited_by: invitation.owner_id,
                  invitation_code: invitation.code,
                  referral_bonus_expires_at: bonusExpiresIso,
                })
                .eq("id", user.id);

              await service
                .from("profiles")
                .update({
                  subscription_plan: "starter",
                  billing_period_start: new Date().toISOString(),
                  reports_used_this_month: 0,
                  dictation_seconds_used: 0,
                  referral_bonus_expires_at: bonusExpiresIso,
                })
                .eq("id", invitation.owner_id);
            }
          }
        }
      } catch { /* invitation redemption is best-effort */ }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
