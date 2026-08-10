import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Admin: retry a failed subscription charge on demand.
 *
 * Stripe retries failed invoices on its own schedule over several days, but
 * when a customer says "I've topped up my card now" there is no reason to
 * wait for the next automatic attempt. This charges the customer's open
 * invoice immediately and reports what happened, returning the hosted
 * invoice URL so the customer can be sent a direct payment link if the
 * card still declines.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", userId)
      .single();
    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "no_stripe_customer" }, { status: 400 });
    }

    const stripe = new Stripe(key);

    // The oldest still-unpaid invoice is the one blocking the account.
    const { data: invoices } = await stripe.invoices.list({
      customer: profile.stripe_customer_id,
      status: "open",
      limit: 5,
    });
    const invoice = invoices[invoices.length - 1];
    if (!invoice?.id) {
      return NextResponse.json({ ok: false, error: "no_open_invoice" }, { status: 404 });
    }

    try {
      const paid = await stripe.invoices.pay(invoice.id);
      const success = paid.status === "paid";
      if (success) {
        // The invoice.paid webhook also records this, but updating here means
        // the panel reflects it immediately even if the webhook lags.
        try {
          await service
            .from("profiles")
            .update({
              last_payment_at: new Date().toISOString(),
              last_payment_amount: (paid.amount_paid ?? 0) / 100,
              last_payment_failed_at: null,
              last_invoice_url: null,
            })
            .eq("id", userId);
        } catch { /* columns may predate migration */ }
      }
      return NextResponse.json({
        ok: success,
        status: paid.status,
        amount: (paid.amount_paid ?? 0) / 100,
        invoiceUrl: paid.hosted_invoice_url || null,
      });
    } catch (payErr) {
      // A declined card is an expected outcome here, not a server fault.
      const message = payErr instanceof Error ? payErr.message : "payment_failed";
      return NextResponse.json({
        ok: false,
        declined: true,
        error: message,
        invoiceUrl: invoice.hosted_invoice_url || null,
      });
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
