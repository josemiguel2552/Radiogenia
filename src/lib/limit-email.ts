import { createServiceClient } from "@/lib/supabase/service";
import { sendLimitReachedEmail } from "@/lib/email";
import { PLANS, type SubscriptionPlan } from "@/lib/types";

type EmailLang = "es" | "en" | "pt";
function pickLang(o?: string | null): EmailLang {
  return o === "en" ? "en" : o === "pt" ? "pt" : "es";
}

const NEXT_PLAN: Partial<Record<SubscriptionPlan, SubscriptionPlan>> = {
  free: "starter",
  resident: "starter",
  starter: "professional",
};

const LOCALE: Record<EmailLang, string> = { es: "es-ES", en: "en-US", pt: "pt-BR" };

/**
 * Fires the "you've run out of reports" upgrade email the FIRST time a user
 * hits their monthly limit in each billing cycle (deduped via
 * profiles.limit_email_sent_at vs billing_period_start). Individual, verified
 * users only. Never throws — a failed email must not affect the request.
 */
export async function maybeSendLimitEmail(userId: string, used: number, limit: number): Promise<void> {
  try {
    const service = createServiceClient();
    const { data: p, error } = await service
      .from("profiles")
      .select("email, name, role, org_id, email_verified, subscription_plan, billing_period_start, limit_email_sent_at")
      .eq("id", userId)
      .single();

    if (error || !p?.email) return; // includes "column missing" (migration not applied)
    if (p.role === "admin" || p.org_id || p.email_verified === false) return;

    // Once per billing cycle: skip if already sent within the current period.
    const periodStart = p.billing_period_start ? Date.parse(p.billing_period_start) : 0;
    if (p.limit_email_sent_at && Date.parse(p.limit_email_sent_at) >= periodStart) return;

    const plan = (p.subscription_plan || "free") as SubscriptionPlan;
    const nextKey = NEXT_PLAN[plan];
    const next = nextKey ? PLANS[nextKey] : null;

    const { data: cfg } = await service
      .from("user_model_config")
      .select("output_language")
      .eq("user_id", userId)
      .maybeSingle();
    const lang = pickLang(cfg?.output_language);

    const renewal = new Date((periodStart || Date.now()));
    renewal.setMonth(renewal.getMonth() + 1);
    const renewalDate = renewal.toLocaleDateString(LOCALE[lang], { day: "numeric", month: "long" });

    await sendLimitReachedEmail(p.email, p.name ?? null, lang, {
      planLabel: PLANS[plan]?.label || plan,
      used,
      limit,
      renewalDate,
      nextPlan: next ? { label: next.label, reports: next.reports, dictationMinutes: next.dictationMinutes, price: next.price } : null,
    });

    await service
      .from("profiles")
      .update({ limit_email_sent_at: new Date().toISOString() })
      .eq("id", userId);
  } catch {
    /* never break the caller over an upsell email */
  }
}
