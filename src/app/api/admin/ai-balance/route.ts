import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin, getGlobalAIConfig } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Live AI provider balance / spend for the admin overview.
 *
 * What each provider actually allows (verified against their current docs):
 *   - DeepSeek: real prepaid balance via GET /user/balance with the normal
 *     API key. This is a true "saldo".
 *   - OpenAI: no credit-balance endpoint exists. With an ADMIN key we can
 *     read month-to-date COST via the Admin API; otherwise nothing.
 *   - Anthropic: same — no balance endpoint; month-to-date cost via the
 *     Admin API cost report when an admin key is configured.
 *
 * On top of that, our own logged spend (audit_logs.estimated_cost_usd) is
 * always available per provider, so the card is useful even with no admin
 * keys at all. Keys never leave the server; only figures are returned.
 */

type ProviderCard = {
  provider: "deepseek" | "openai" | "claude";
  /** Real prepaid balance in USD-equivalent, when the provider exposes it. */
  balance: number | null;
  balanceCurrency: string | null;
  /** Provider-reported month-to-date spend (admin key required). */
  providerSpendMtd: number | null;
  /** Our own logged month-to-date spend — always available. */
  loggedSpendMtd: number;
  status: "ok" | "no_key" | "unsupported" | "error";
  detail?: string;
};

const MONTH_START = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

async function deepseekBalance(apiKey: string): Promise<Partial<ProviderCard>> {
  try {
    const res = await fetch("https://api.deepseek.com/user/balance", {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!res.ok) return { status: "error", detail: `HTTP ${res.status}` };
    const data = await res.json() as {
      is_available?: boolean;
      balance_infos?: { currency?: string; total_balance?: string }[];
    };
    // Prefer USD when the account holds several currencies.
    const infos = data.balance_infos || [];
    const usd = infos.find((b) => (b.currency || "").toUpperCase() === "USD");
    const pick = usd || infos[0];
    if (!pick) return { status: "error", detail: "empty balance_infos" };
    return {
      balance: Number(pick.total_balance ?? 0),
      balanceCurrency: (pick.currency || "USD").toUpperCase(),
      status: "ok",
      detail: data.is_available === false ? "insufficient" : undefined,
    };
  } catch (e) {
    return { status: "error", detail: e instanceof Error ? e.message : "network" };
  }
}

async function openaiSpend(adminKey: string): Promise<Partial<ProviderCard>> {
  try {
    const start = Math.floor(MONTH_START().getTime() / 1000);
    const res = await fetch(
      `https://api.openai.com/v1/organization/costs?start_time=${start}&limit=31`,
      { headers: { Authorization: `Bearer ${adminKey}`, Accept: "application/json" } },
    );
    if (!res.ok) return { status: "error", detail: `HTTP ${res.status}` };
    const data = await res.json() as {
      data?: { results?: { amount?: { value?: number } }[] }[];
    };
    let total = 0;
    for (const bucket of data.data || []) {
      for (const r of bucket.results || []) total += Number(r.amount?.value || 0);
    }
    return { providerSpendMtd: total, status: "ok" };
  } catch (e) {
    return { status: "error", detail: e instanceof Error ? e.message : "network" };
  }
}

async function anthropicSpend(adminKey: string): Promise<Partial<ProviderCard>> {
  try {
    const startingAt = MONTH_START().toISOString().slice(0, 10);
    const res = await fetch(
      `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${startingAt}&limit=31`,
      {
        headers: {
          "x-api-key": adminKey,
          "anthropic-version": "2023-06-01",
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) return { status: "error", detail: `HTTP ${res.status}` };
    const data = await res.json() as {
      data?: { results?: { amount?: string | number; currency?: string }[] }[];
    };
    let total = 0;
    for (const bucket of data.data || []) {
      for (const r of bucket.results || []) total += Number(r.amount || 0);
    }
    return { providerSpendMtd: total, status: "ok" };
  } catch (e) {
    return { status: "error", detail: e instanceof Error ? e.message : "network" };
  }
}

export async function GET() {
  try {
    await requireAdmin();

    // Our own month-to-date spend per provider (always available).
    const logged: Record<string, number> = { deepseek: 0, openai: 0, claude: 0 };
    try {
      const service = createServiceClient();
      const { data } = await service
        .from("audit_logs")
        .select("provider, estimated_cost_usd")
        .gte("created_at", MONTH_START().toISOString())
        .not("estimated_cost_usd", "is", null)
        .limit(100000);
      for (const r of (data || []) as { provider: string | null; estimated_cost_usd: number | null }[]) {
        const key = r.provider === "anthropic" ? "claude" : (r.provider || "");
        if (key in logged) logged[key] += Number(r.estimated_cost_usd || 0);
      }
    } catch { /* audit table optional */ }

    const config = await getGlobalAIConfig();
    const keyFor = (p: "deepseek" | "openai" | "claude"): string | undefined => {
      if (config.providerKeys?.[p]) return config.providerKeys[p];
      if (p === config.provider) return config.apiKey;
      if (p === "openai" && config.whisperApiKey) return config.whisperApiKey;
      return undefined;
    };

    const cards: ProviderCard[] = [];

    // ── DeepSeek: real balance ──
    const dsKey = keyFor("deepseek");
    cards.push({
      provider: "deepseek",
      balance: null, balanceCurrency: null, providerSpendMtd: null,
      loggedSpendMtd: logged.deepseek,
      status: "no_key",
      ...(dsKey ? await deepseekBalance(dsKey) : {}),
    } as ProviderCard);

    // ── OpenAI: cost only, and only with an Admin key ──
    const openaiAdmin = process.env.OPENAI_ADMIN_KEY;
    cards.push({
      provider: "openai",
      balance: null, balanceCurrency: null, providerSpendMtd: null,
      loggedSpendMtd: logged.openai,
      status: openaiAdmin ? "no_key" : "unsupported",
      detail: openaiAdmin ? undefined : "no_admin_key",
      ...(openaiAdmin ? await openaiSpend(openaiAdmin) : {}),
    } as ProviderCard);

    // ── Anthropic: cost only, and only with an Admin key ──
    const anthropicAdmin = process.env.ANTHROPIC_ADMIN_KEY;
    cards.push({
      provider: "claude",
      balance: null, balanceCurrency: null, providerSpendMtd: null,
      loggedSpendMtd: logged.claude,
      status: anthropicAdmin ? "no_key" : "unsupported",
      detail: anthropicAdmin ? undefined : "no_admin_key",
      ...(anthropicAdmin ? await anthropicSpend(anthropicAdmin) : {}),
    } as ProviderCard);

    return NextResponse.json({ generatedAt: new Date().toISOString(), providers: cards });
  } catch (error) {
    return toErrorResponse(error);
  }
}
