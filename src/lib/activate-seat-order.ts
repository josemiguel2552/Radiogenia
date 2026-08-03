import { createServiceClient } from "@/lib/supabase/service";
import { sendHospitalSeatWelcome } from "@/lib/email";
import { randomBytes } from "crypto";

/**
 * Provision every seat of a paid institutional order: create each
 * radiologist's account as a member of the hospital (unlimited usage via
 * profiles.org_id) and email them a link to choose their own password.
 *
 * Idempotent: seats already activated are skipped, so it is safe to call
 * again from the Stripe webhook and from the admin "transfer received"
 * action without duplicating accounts or emails.
 */
export async function activateSeatOrder(orderId: string): Promise<{ activated: number; errors: string[] }> {
  const service = createServiceClient();
  const errors: string[] = [];
  let activated = 0;

  const { data: order } = await service
    .from("org_seat_orders")
    .select("id, org_id, seats, status")
    .eq("id", orderId)
    .single();
  if (!order) return { activated: 0, errors: ["order_not_found"] };

  const { data: orgRow } = await service
    .from("organizations")
    .select("name")
    .eq("id", order.org_id)
    .single();
  const orgName = orgRow?.name || "";

  // Seats bought define the ceiling for this hospital.
  await service
    .from("organizations")
    .update({ max_seats: order.seats })
    .eq("id", order.org_id);

  const { data: invites } = await service
    .from("org_seat_invites")
    .select("id, email, status, user_id")
    .eq("order_id", orderId);

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://radiogen.ai";

  for (const inv of invites || []) {
    if (inv.status === "activated") continue;
    try {
      // Reuse an existing account with that email if there is one; otherwise
      // create it with a throwaway password the user never learns — they set
      // their own through the recovery link below.
      let userId = inv.user_id as string | null;
      if (!userId) {
        const { data: created, error: createErr } = await service.auth.admin.createUser({
          email: inv.email,
          password: randomBytes(24).toString("base64url"),
          email_confirm: true,
        });
        if (createErr) {
          const exists = createErr.message?.includes("already been registered")
            || createErr.message?.includes("already exists");
          if (!exists) throw new Error(createErr.message);
          const { data: found } = await service
            .from("profiles")
            .select("id")
            .eq("email", inv.email)
            .maybeSingle();
          userId = found?.id ?? null;
          if (!userId) throw new Error("existing account not found");
        } else {
          userId = created.user?.id ?? null;
        }
      }
      if (!userId) throw new Error("no user id");

      await service.from("profiles").upsert({
        id: userId,
        email: inv.email,
        role: "radiologist",
        org_id: order.org_id,
        approved: true,
        email_verified: true,
        subscription_plan: "free", // org membership grants unlimited use
        reports_used_this_month: 0,
        dictation_seconds_used: 0,
        billing_period_start: new Date().toISOString(),
      });

      await service.from("org_members").upsert(
        {
          org_id: order.org_id,
          user_id: userId,
          section_role: "radiologist",
          staff_type: "attending",
          is_active: true,
        },
        { onConflict: "org_id,user_id" },
      );

      await service.from("user_model_config").insert({ user_id: userId }).select().maybeSingle();

      // Password-setting link (Supabase recovery flow routed through our callback).
      let setPasswordUrl = `${base}/auth/forgot-password`;
      try {
        const { data: link } = await service.auth.admin.generateLink({
          type: "recovery",
          email: inv.email,
        });
        if (link?.properties?.hashed_token) {
          setPasswordUrl = `${base}/auth/callback?token_hash=${link.properties.hashed_token}&type=recovery`;
        }
      } catch { /* fall back to the public reset page */ }

      await sendHospitalSeatWelcome(inv.email, orgName, setPasswordUrl);

      await service
        .from("org_seat_invites")
        .update({
          status: "activated",
          user_id: userId,
          sent_at: new Date().toISOString(),
          activated_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", inv.id);
      activated += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${inv.email}: ${msg}`);
      await service
        .from("org_seat_invites")
        .update({ status: "failed", error: msg })
        .eq("id", inv.id);
    }
  }

  await service
    .from("org_seat_orders")
    .update({ status: "active", activated_at: new Date().toISOString() })
    .eq("id", orderId);

  return { activated, errors };
}
