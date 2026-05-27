import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const service = createServiceClient();
    const { data, error } = await service
      .from("resident_verifications")
      .select("*, profiles(email, name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return dbErrorResponse(error);

    const verifications = (data || []).map((v) => {
      const profile = v.profiles as unknown as { email: string; name: string } | null;
      return {
        ...v,
        profiles: undefined,
        user_email: profile?.email || "",
        user_name: profile?.name || "",
      };
    });

    return NextResponse.json(verifications);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAdmin();

    const service = createServiceClient();
    const { id, status, admin_notes } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing verification id" }, { status: 400 });
    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Status must be approved or rejected" }, { status: 400 });
    }

    // Update verification record
    const { error: updateError } = await service
      .from("resident_verifications")
      .update({
        status,
        admin_notes: admin_notes || null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // If approved, upgrade user to resident plan
    if (status === "approved") {
      const { data: verification } = await service
        .from("resident_verifications")
        .select("user_id")
        .eq("id", id)
        .single();

      if (verification) {
        const { data: profile } = await service
          .from("profiles")
          .select("subscription_plan")
          .eq("id", verification.user_id)
          .single();

        // Only upgrade if user is on free plan (don't downgrade from higher plans)
        if (profile && (profile.subscription_plan === "free" || profile.subscription_plan === "resident")) {
          await service
            .from("profiles")
            .update({
              subscription_plan: "resident",
              billing_period_start: new Date().toISOString(),
              reports_used_this_month: 0,
              dictation_seconds_used: 0,
            })
            .eq("id", verification.user_id);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
