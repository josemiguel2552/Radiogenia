import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { activateSeatOrder } from "@/lib/activate-seat-order";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Admin: institutional seat orders placed through the onboarding links. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();
    const orgId = req.nextUrl.searchParams.get("orgId");

    let query = service
      .from("org_seat_orders")
      .select("id, org_id, seats, unit_price, currency, payment_method, status, contact_name, contact_email, billing_details, emails, legal_accepted_at, legal_version, legal_signer_role, activated_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (orgId) query = query.eq("org_id", orgId);

    const { data: orders, error } = await query;
    if (error) {
      if (error.message?.includes("org_seat_orders")) {
        return NextResponse.json({ orders: [], migration: false });
      }
      throw error;
    }

    // Per-order seat status, and the hospital name.
    const ids = (orders || []).map((o) => o.id);
    const invitesByOrder: Record<string, { email: string; status: string; error: string | null }[]> = {};
    if (ids.length > 0) {
      const { data: invites } = await service
        .from("org_seat_invites")
        .select("order_id, email, status, error")
        .in("order_id", ids);
      for (const inv of invites || []) {
        (invitesByOrder[inv.order_id] ||= []).push({ email: inv.email, status: inv.status, error: inv.error });
      }
    }

    const orgIds = Array.from(new Set((orders || []).map((o) => o.org_id)));
    const orgNames: Record<string, string> = {};
    if (orgIds.length > 0) {
      const { data: orgs } = await service.from("organizations").select("id, name").in("id", orgIds);
      for (const o of orgs || []) orgNames[o.id] = o.name;
    }

    return NextResponse.json({
      orders: (orders || []).map((o) => ({
        ...o,
        orgName: orgNames[o.org_id] || "—",
        invites: invitesByOrder[o.id] || [],
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Admin: confirm a bank transfer arrived → provision the seats. */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { orderId, action } = await req.json();
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const service = createServiceClient();

    if (action === "cancel") {
      await service.from("org_seat_orders").update({ status: "cancelled" }).eq("id", orderId);
      return NextResponse.json({ ok: true });
    }

    // Default action: mark paid and activate every seat (idempotent).
    await service.from("org_seat_orders").update({ status: "paid" }).eq("id", orderId);
    const result = await activateSeatOrder(orderId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return toErrorResponse(error);
  }
}
