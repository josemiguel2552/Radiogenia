export const maxDuration = 15;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { toErrorResponse } from "@/lib/api-error";

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get profile to check for Stripe subscription
    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("id", user.id)
      .single();

    // Cancel Stripe subscription if exists
    if (profile?.stripe_subscription_id) {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (stripeKey) {
        try {
          const Stripe = (await import("stripe")).default;
          const stripe = new Stripe(stripeKey);
          await stripe.subscriptions.cancel(profile.stripe_subscription_id);
        } catch { /* subscription may already be cancelled */ }
      }
    }

    // Delete user (cascades to profiles, org_members, etc.)
    const { error } = await service.auth.admin.deleteUser(user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
