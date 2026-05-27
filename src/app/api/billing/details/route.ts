import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import Stripe from "stripe";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function GET() {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ paymentMethod: null, nextInvoice: null, invoices: [] });
    }

    const customerId = profile.stripe_customer_id;

    const [paymentMethods, upcomingInvoice, invoicesList] = await Promise.allSettled([
      stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 }),
      stripe.invoices.createPreview({ customer: customerId }).catch(() => null),
      stripe.invoices.list({ customer: customerId, limit: 12, status: "paid" }),
    ]);

    let paymentMethod = null;
    if (paymentMethods.status === "fulfilled" && paymentMethods.value.data.length > 0) {
      const pm = paymentMethods.value.data[0];
      const card = pm.card;
      if (card) {
        paymentMethod = {
          brand: card.brand,
          last4: card.last4,
          expMonth: card.exp_month,
          expYear: card.exp_year,
        };
      }
    }

    let nextInvoice = null;
    if (upcomingInvoice.status === "fulfilled" && upcomingInvoice.value) {
      const inv = upcomingInvoice.value;
      nextInvoice = {
        amountDue: inv.amount_due / 100,
        currency: inv.currency,
        dueDate: inv.next_payment_attempt
          ? new Date(inv.next_payment_attempt * 1000).toISOString()
          : inv.period_end
            ? new Date(inv.period_end * 1000).toISOString()
            : null,
      };
    }

    let invoices: { id: string; date: string; amount: number; currency: string; pdf: string | null; status: string }[] = [];
    if (invoicesList.status === "fulfilled") {
      invoices = invoicesList.value.data.map((inv) => ({
        id: inv.id,
        date: new Date((inv.created ?? 0) * 1000).toISOString(),
        amount: (inv.amount_paid ?? 0) / 100,
        currency: inv.currency ?? "usd",
        pdf: inv.invoice_pdf ?? null,
        status: inv.status ?? "unknown",
      }));
    }

    return NextResponse.json({ paymentMethod, nextInvoice, invoices });
  } catch (error) {
    return toErrorResponse(error);
  }
}
