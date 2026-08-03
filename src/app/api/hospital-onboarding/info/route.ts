import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { toErrorResponse } from "@/lib/api-error";
import { SEAT_PRICE_EUR, MIN_SEATS } from "@/lib/hospital-terms";

export const dynamic = "force-dynamic";

/** Public: resolve an onboarding token to the institution it belongs to. */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token") || "";
    if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

    const service = createServiceClient();
    const { data: org } = await service
      .from("organizations")
      .select("id, name, is_active")
      .eq("onboarding_token", token)
      .maybeSingle();

    if (!org || !org.is_active) {
      return NextResponse.json({ error: "invalid_token" }, { status: 404 });
    }

    // Any order already placed through this link (so a reload doesn't look
    // like nothing happened).
    const { data: lastOrder } = await service
      .from("org_seat_orders")
      .select("id, seats, status, payment_method, created_at")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      orgName: org.name,
      seatPrice: SEAT_PRICE_EUR,
      minSeats: MIN_SEATS,
      lastOrder: lastOrder || null,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
