import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";
import { HOSPITAL_TERMS_VERSION, SEAT_PRICE_EUR, MIN_SEATS } from "@/lib/hospital-terms";
import { sendHospitalTransferInstructions, sendHospitalOrderNotice } from "@/lib/email";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Public: an institution orders seats through its onboarding link.
 *
 * Records the order (seats, radiologist emails, signed terms) and then either
 * opens Stripe Checkout for a per-seat subscription, or — for bank transfer —
 * emails the bank details and leaves the order pending until the admin
 * confirms the money arrived. Seats are only provisioned once paid.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`hospital-onboarding:${ip}`, RATE_LIMITS.auth);
    if (!rl.allowed) return rl.errorResponse!;

    const body = await req.json();
    const token = typeof body.token === "string" ? body.token : "";
    const seats = Math.max(MIN_SEATS, Math.min(200, Math.round(Number(body.seats) || 0)));
    const paymentMethod = body.paymentMethod === "transfer" ? "transfer" : "card";
    const contactName = typeof body.contactName === "string" ? body.contactName.trim().slice(0, 200) : "";
    const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim().toLowerCase() : "";
    const billingDetails = typeof body.billingDetails === "string" ? body.billingDetails.trim().slice(0, 2000) : "";
    const signerRole = typeof body.signerRole === "string" ? body.signerRole.trim().slice(0, 200) : "";
    const acceptedTerms = body.acceptedTerms === true;

    const emails: string[] = Array.isArray(body.emails)
      ? body.emails
          .filter((e: unknown) => typeof e === "string" && e.trim())
          .map((e: string) => e.trim().toLowerCase())
      : [];

    if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });
    if (!contactName) return NextResponse.json({ error: "contact_name_required" }, { status: 400 });
    if (!contactEmail || !/^\S+@\S+\.\S+$/.test(contactEmail)) {
      return NextResponse.json({ error: "invalid_contact_email" }, { status: 400 });
    }
    if (!acceptedTerms) return NextResponse.json({ error: "terms_required" }, { status: 400 });
    if (seats < MIN_SEATS) return NextResponse.json({ error: "min_seats" }, { status: 400 });

    const unique = Array.from(new Set(emails));
    if (unique.length !== seats) return NextResponse.json({ error: "emails_count_mismatch" }, { status: 400 });
    if (unique.some((e) => !/^\S+@\S+\.\S+$/.test(e))) {
      return NextResponse.json({ error: "invalid_radiologist_email" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: org } = await service
      .from("organizations")
      .select("id, name, is_active")
      .eq("onboarding_token", token)
      .maybeSingle();
    if (!org || !org.is_active) return NextResponse.json({ error: "invalid_token" }, { status: 404 });

    const { data: order, error: orderErr } = await service
      .from("org_seat_orders")
      .insert({
        org_id: org.id,
        seats,
        unit_price: SEAT_PRICE_EUR,
        currency: "EUR",
        payment_method: paymentMethod,
        status: "pending",
        contact_name: contactName,
        contact_email: contactEmail,
        billing_details: billingDetails || null,
        emails: unique,
        legal_accepted_at: new Date().toISOString(),
        legal_version: HOSPITAL_TERMS_VERSION,
        legal_signer_name: contactName,
        legal_signer_role: signerRole || null,
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      if (orderErr?.message?.includes("org_seat_orders")) {
        return NextResponse.json({ error: "migration_pending" }, { status: 503 });
      }
      return NextResponse.json({ error: orderErr?.message || "order_failed" }, { status: 500 });
    }

    // Seats to provision once the money is in.
    await service.from("org_seat_invites").insert(
      unique.map((email) => ({ order_id: order.id, org_id: org.id, email })),
    );

    // Tell the owner a new institutional order landed (best-effort).
    sendHospitalOrderNotice(org.name, seats, paymentMethod, contactName, contactEmail).catch(() => {});

    if (paymentMethod === "transfer") {
      await sendHospitalTransferInstructions(contactEmail, org.name, seats, SEAT_PRICE_EUR);
      return NextResponse.json({ ok: true, method: "transfer", orderId: order.id });
    }

    // ── Card: per-seat subscription via Stripe Checkout ──
    const key = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID_HOSPITAL_SEAT;
    if (!key || !priceId) {
      return NextResponse.json({ error: "stripe_not_configured", orderId: order.id }, { status: 503 });
    }

    const stripe = new Stripe(key);
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://radiogen.ai";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: contactEmail,
      line_items: [{ price: priceId, quantity: seats }],
      payment_method_collection: "always",
      subscription_data: { metadata: { seat_order_id: order.id, org_id: org.id } },
      metadata: { seat_order_id: order.id, org_id: org.id },
      success_url: `${origin}/hospital-onboarding/${token}?paid=1`,
      cancel_url: `${origin}/hospital-onboarding/${token}?cancelled=1`,
    });

    await service
      .from("org_seat_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return NextResponse.json({ ok: true, method: "card", url: session.url, orderId: order.id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
