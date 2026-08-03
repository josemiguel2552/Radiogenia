import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

/**
 * Diagnostic: which Stripe account fields feed the invoice header.
 *
 * Stripe prints the merchant block as legal name → public/DBA name →
 * address, and it is not always obvious which dashboard setting holds a
 * given string. This returns the identity fields (no keys, no secrets) so
 * the owner can see exactly which one to edit.
 */
export async function GET() {
  try {
    await requireAdmin();

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

    // GET /v1/account returns the account the API key belongs to. Called
    // directly (rather than via the SDK) because the typed helper requires
    // an explicit account id, which is exactly what we're trying to learn.
    const res = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Stripe HTTP ${res.status}` }, { status: 502 });
    }
    const acct = (await res.json()) as Stripe.Account;

    const fields = {
      "business_profile.name (Public business name / Doing business as)": acct.business_profile?.name ?? null,
      "settings.dashboard.display_name (Account name)": acct.settings?.dashboard?.display_name ?? null,
      "company.name (Legal business name)": acct.company?.name ?? null,
      "business_profile.support_email": acct.business_profile?.support_email ?? null,
      "business_profile.url": acct.business_profile?.url ?? null,
      "settings.payments.statement_descriptor (bank statement)": acct.settings?.payments?.statement_descriptor ?? null,
      "email (account email)": acct.email ?? null,
    };

    // Point straight at whichever field carries a handle-looking value.
    const suspicious = Object.entries(fields)
      .filter(([, v]) => typeof v === "string" && v.includes("@") && !v.includes("."))
      .map(([k, v]) => ({ field: k, value: v }));

    return NextResponse.json({ fields, suspicious });
  } catch (error) {
    return toErrorResponse(error);
  }
}
