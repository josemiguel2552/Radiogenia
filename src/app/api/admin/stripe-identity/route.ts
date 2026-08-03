import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

/** Walk the whole account object and report every path holding `needle`. */
function findPaths(node: unknown, needle: string, path = "", out: { path: string; value: string }[] = []) {
  if (typeof node === "string") {
    if (node.toLowerCase().includes(needle)) out.push({ path: path || "(root)", value: node });
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => findPaths(v, needle, `${path}[${i}]`, out));
    return out;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      findPaths(v, needle, path ? `${path}.${k}` : k, out);
    }
  }
  return out;
}

/**
 * Diagnostic: which Stripe account fields feed the invoice header.
 *
 * Stripe prints the merchant block as legal name → public/DBA name →
 * address, and it is not always obvious which dashboard setting holds a
 * given string. This returns the identity fields (no keys, no secrets) so
 * the owner can see exactly which one to edit.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    // ?find=<text> searches the entire account object for that string and
    // returns the exact field path(s) holding it.
    const needle = (new URL(req.url).searchParams.get("find") || "").toLowerCase();

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

    const matches = needle ? findPaths(acct, needle) : undefined;

    return NextResponse.json({ fields, suspicious, ...(needle ? { needle, matches } : {}) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
