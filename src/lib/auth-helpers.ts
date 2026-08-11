import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { resolveRegion, regionFeatures, type Region, type RegionFeatures } from "@/lib/region";
import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/encryption";
import { PLANS, type AIProvider, type UserRole, type SubscriptionPlan, type OrgMembership, type SectionRole, type StaffType } from "@/lib/types";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export interface TaskModelOverride {
  provider: AIProvider;
  modelName: string;
}

export interface GlobalAIConfig {
  provider: AIProvider;
  modelName: string;
  apiKey: string;
  customBaseUrl?: string;
  whisperApiKey?: string;
  providerKeys?: Partial<Record<AIProvider, string>>;
  findingsComboEnabled?: boolean;
  taskOverrides?: {
    findings?: TaskModelOverride;
    conclusion?: TaskModelOverride;
    trace?: TaskModelOverride;
    dictation_correction?: TaskModelOverride;
    improve_writing?: TaskModelOverride;
    data_augmentation?: TaskModelOverride;
    classify?: TaskModelOverride;
    chatbot?: TaskModelOverride;
  };
}

export const COMBO_PROVIDER_VALUE = "combo";

export function resolveApiKey(config: GlobalAIConfig, taskProvider: AIProvider): string {
  if (config.providerKeys?.[taskProvider]) return config.providerKeys[taskProvider]!;
  if (taskProvider === "openai" && config.provider !== "openai" && config.whisperApiKey) {
    return config.whisperApiKey;
  }
  if (taskProvider !== config.provider && taskProvider !== "openai" && process.env.NODE_ENV === "development") {
    console.warn(`[resolveApiKey] No specific key for "${taskProvider}", falling back to main provider key (${config.provider})`);
  }
  return config.apiKey;
}

export async function getGlobalAIConfig(): Promise<GlobalAIConfig> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("global_model_config")
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Global model config not found");
  }

  let apiKey = "";
  try {
    apiKey = data.api_key_encrypted ? decrypt(data.api_key_encrypted) : "";
  } catch {
    throw new Error("Failed to decrypt global API key");
  }

  if (!apiKey) {
    throw new Error("No global API key configured. Contact your administrator.");
  }

  let whisperApiKey = "";
  try {
    whisperApiKey = data.whisper_api_key_encrypted ? decrypt(data.whisper_api_key_encrypted) : "";
  } catch { /* optional field */ }

  const providerKeys: Partial<Record<AIProvider, string>> = {};
  const keyMap: [string, AIProvider][] = [
    ["anthropic_api_key_encrypted", "claude"],
    ["google_api_key_encrypted", "gemini"],
    ["deepseek_api_key_encrypted", "deepseek"],
    ["openrouter_api_key_encrypted", "openrouter"],
    ["custom_api_key_encrypted", "custom"],
  ];
  for (const [col, prov] of keyMap) {
    try {
      const val = data[col] ? decrypt(data[col]) : "";
      if (val) providerKeys[prov] = val;
    } catch { /* optional */ }
  }

  const taskOverrides: GlobalAIConfig["taskOverrides"] = {};
  if (data.findings_provider && data.findings_model && data.findings_provider !== COMBO_PROVIDER_VALUE) {
    taskOverrides.findings = { provider: data.findings_provider as AIProvider, modelName: data.findings_model };
  }
  if (data.conclusion_provider && data.conclusion_model) {
    taskOverrides.conclusion = { provider: data.conclusion_provider as AIProvider, modelName: data.conclusion_model };
  }
  if (data.trace_provider && data.trace_model) {
    taskOverrides.trace = { provider: data.trace_provider as AIProvider, modelName: data.trace_model };
  }
  if (data.dictation_correction_provider && data.dictation_correction_model) {
    taskOverrides.dictation_correction = { provider: data.dictation_correction_provider as AIProvider, modelName: data.dictation_correction_model };
  }
  if (data.improve_writing_provider && data.improve_writing_model) {
    taskOverrides.improve_writing = { provider: data.improve_writing_provider as AIProvider, modelName: data.improve_writing_model };
  }
  if (data.data_augmentation_provider && data.data_augmentation_model) {
    taskOverrides.data_augmentation = { provider: data.data_augmentation_provider as AIProvider, modelName: data.data_augmentation_model };
  }
  if (data.classify_provider && data.classify_model) {
    taskOverrides.classify = { provider: data.classify_provider as AIProvider, modelName: data.classify_model };
  }
  if (data.chatbot_provider && data.chatbot_model) {
    taskOverrides.chatbot = { provider: data.chatbot_provider as AIProvider, modelName: data.chatbot_model };
  }

  return {
    provider: data.provider as AIProvider,
    modelName: data.model_name,
    apiKey,
    customBaseUrl: data.custom_base_url || undefined,
    whisperApiKey,
    providerKeys: Object.keys(providerKeys).length > 0 ? providerKeys : undefined,
    findingsComboEnabled: data.findings_provider === COMBO_PROVIDER_VALUE,
    taskOverrides: Object.keys(taskOverrides).length > 0 ? taskOverrides : undefined,
  };
}

export async function getUserRole(userId: string): Promise<UserRole> {
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("role, email")
    .eq("id", userId)
    .single();

  if (data?.email && ADMIN_EMAILS.includes(data.email.toLowerCase())) {
    return "admin";
  }
  return (data?.role as UserRole) || "radiologist";
}

export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const role = await getUserRole(user.id);
  if (role !== "admin") throw new Error("Forbidden");

  return { userId: user.id };
}

export async function checkReportLimit(userId: string): Promise<{ allowed: boolean; used: number; limit: number; plan: SubscriptionPlan }> {
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role, email, subscription_plan, reports_used_this_month, billing_period_start, org_id, approved, referral_bonus_expires_at, stripe_subscription_id")
    .eq("id", userId)
    .single();

  const isAdmin = profile?.role === "admin"
    || (profile?.email && ADMIN_EMAILS.includes(profile.email.toLowerCase()));
  if (isAdmin) {
    return { allowed: true, used: 0, limit: 999999, plan: "professional" };
  }

  // Revoked/blocked accounts (e.g. a deactivated hospital radiologist) cannot
  // generate at all — enforced server-side, not just via the UI redirect.
  if (profile && profile.approved === false) {
    return { allowed: false, used: 0, limit: 0, plan: "free" };
  }

  if (profile?.org_id) {
    if (await isExpiredTrialAccount(profile.email, profile.org_id)) {
      return { allowed: false, used: 0, limit: 0, plan: "free" };
    }
    // Hospital members: unlimited, counter renews on the 1st of the month.
    const used = isCalendarMonthStale(profile.billing_period_start) ? 0 : (profile.reports_used_this_month || 0);
    return { allowed: true, used, limit: 999999, plan: "professional" };
  }

  let plan = (profile?.subscription_plan || "free") as SubscriptionPlan;

  if (
    profile?.referral_bonus_expires_at &&
    new Date(profile.referral_bonus_expires_at).getTime() <= Date.now() &&
    !profile.stripe_subscription_id &&
    plan !== "free"
  ) {
    plan = "free";
    await service
      .from("profiles")
      .update({
        subscription_plan: "free",
        reports_used_this_month: 0,
        dictation_seconds_used: 0,
        billing_period_start: new Date().toISOString(),
        referral_bonus_expires_at: null,
      })
      .eq("id", userId);
  }

  // Card-first billing: without an active subscription (or trial, which the
  // Stripe webhook maps to its paid plan) there is no free usage at all.
  if (plan === "free") {
    return { allowed: false, used: 0, limit: 0, plan: "free" };
  }

  const planConfig = PLANS[plan];
  const periodStart = new Date(profile?.billing_period_start || Date.now());
  const nextPeriod = new Date(periodStart);
  nextPeriod.setMonth(nextPeriod.getMonth() + 1);
  const needsReset = nextPeriod.getTime() <= Date.now();
  const rawUsed = needsReset ? 0 : (profile?.reports_used_this_month ?? 0);
  const used = Math.max(0, rawUsed);
  const effectiveLimit = rawUsed < 0 ? planConfig.reports + Math.abs(rawUsed) : planConfig.reports;

  return {
    allowed: used < effectiveLimit,
    used,
    limit: effectiveLimit,
    plan,
  };
}

export async function checkDictationLimit(userId: string): Promise<{
  allowed: boolean;
  usedSeconds: number;
  limitSeconds: number;
  plan: SubscriptionPlan;
}> {
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role, email, subscription_plan, dictation_seconds_used, billing_period_start, org_id, approved, referral_bonus_expires_at, stripe_subscription_id")
    .eq("id", userId)
    .single();

  const isAdmin = profile?.role === "admin"
    || (profile?.email && ADMIN_EMAILS.includes(profile.email.toLowerCase()));
  if (isAdmin) {
    return { allowed: true, usedSeconds: 0, limitSeconds: 999999 * 60, plan: "professional" };
  }

  if (profile && profile.approved === false) {
    return { allowed: false, usedSeconds: 0, limitSeconds: 0, plan: "free" };
  }

  if (profile?.org_id) {
    if (await isExpiredTrialAccount(profile.email, profile.org_id)) {
      return { allowed: false, usedSeconds: 0, limitSeconds: 0, plan: "free" };
    }
    const usedSeconds = isCalendarMonthStale(profile.billing_period_start) ? 0 : (profile.dictation_seconds_used || 0);
    return { allowed: true, usedSeconds, limitSeconds: 999999 * 60, plan: "professional" };
  }

  let plan = (profile?.subscription_plan || "free") as SubscriptionPlan;

  if (
    profile?.referral_bonus_expires_at &&
    new Date(profile.referral_bonus_expires_at).getTime() <= Date.now() &&
    !profile.stripe_subscription_id &&
    plan !== "free"
  ) {
    plan = "free";
    await service
      .from("profiles")
      .update({
        subscription_plan: "free",
        reports_used_this_month: 0,
        dictation_seconds_used: 0,
        billing_period_start: new Date().toISOString(),
        referral_bonus_expires_at: null,
      })
      .eq("id", userId);
  }

  // Card-first billing: without an active subscription there is no free usage.
  if (plan === "free") {
    return { allowed: false, usedSeconds: 0, limitSeconds: 0, plan: "free" };
  }

  const planConfig = PLANS[plan];
  const limitSeconds = planConfig.dictationMinutes * 60;
  const periodStart = new Date(profile?.billing_period_start || Date.now());
  const nextPeriod = new Date(periodStart);
  nextPeriod.setMonth(nextPeriod.getMonth() + 1);
  const needsReset = nextPeriod.getTime() <= Date.now();
  const rawUsedSeconds = needsReset ? 0 : (profile?.dictation_seconds_used ?? 0);
  const usedSeconds = Math.max(0, rawUsedSeconds);
  const effectiveLimitSeconds = rawUsedSeconds < 0 ? limitSeconds + Math.abs(rawUsedSeconds) : limitSeconds;

  return {
    allowed: usedSeconds < effectiveLimitSeconds,
    usedSeconds,
    limitSeconds: effectiveLimitSeconds,
    plan,
  };
}

/** Card-first billing: whether the account may use AI features at all
    (any active plan, an org membership, or admin). Blocks unpaid accounts
    from calling AI endpoints directly even with a live session. */
export async function hasPlatformAccess(userId: string): Promise<boolean> {
  const res = await checkReportLimit(userId);
  return res.plan !== "free";
}

function isBillingPeriodStale(periodStart: string | null): boolean {
  if (!periodStart) return true;
  const next = new Date(periodStart);
  next.setMonth(next.getMonth() + 1);
  return next.getTime() <= Date.now();
}

// Hospital trial accounts (shared demo login, email trial-<org>@radiogen.ai)
// are unlimited like org members but must stop working when the hospital's
// 30-day trial window ends — even if a browser session is still alive.
async function isExpiredTrialAccount(email: string | null | undefined, orgId: string | null | undefined): Promise<boolean> {
  if (!email || !orgId) return false;
  if (!email.startsWith("trial-") || !email.endsWith("@radiogen.ai")) return false;
  try {
    const service = createServiceClient();
    const { data } = await service.from("organizations").select("trial_expires_at").eq("id", orgId).maybeSingle();
    return !!data?.trial_expires_at && new Date(data.trial_expires_at).getTime() < Date.now();
  } catch {
    return false;
  }
}

// Hospital (org) members reset their usage counters on a fixed CALENDAR month
// (renews on the 1st), unlike individual users whose window rolls from their
// own billing_period_start. The counter is display/metrics only for org
// members — access is unlimited — but the reset cadence must be the 1st.
function isCalendarMonthStale(periodStart: string | null): boolean {
  if (!periodStart) return true;
  const p = new Date(periodStart);
  const now = new Date();
  return p.getUTCFullYear() !== now.getUTCFullYear() || p.getUTCMonth() !== now.getUTCMonth();
}

export async function incrementReportUsage(userId: string): Promise<void> {
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("reports_used_this_month, dictation_seconds_used, billing_period_start, org_id")
    .eq("id", userId)
    .single();

  if (!data) return;

  const stale = data.org_id
    ? isCalendarMonthStale(data.billing_period_start)
    : isBillingPeriodStale(data.billing_period_start);
  const { error } = await service
    .from("profiles")
    .update({
      reports_used_this_month: stale ? 1 : (data.reports_used_this_month ?? 0) + 1,
      ...(stale ? { dictation_seconds_used: 0, billing_period_start: new Date().toISOString() } : {}),
    })
    .eq("id", userId);

  if (error) console.error("[incrementReportUsage]", error.message);
}

export async function incrementDictationUsage(userId: string, seconds: number): Promise<number> {
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("dictation_seconds_used, reports_used_this_month, billing_period_start, org_id")
    .eq("id", userId)
    .single();

  if (!data) return seconds;

  const stale = data.org_id
    ? isCalendarMonthStale(data.billing_period_start)
    : isBillingPeriodStale(data.billing_period_start);
  const newUsed = stale ? seconds : (data.dictation_seconds_used ?? 0) + seconds;
  const { error } = await service
    .from("profiles")
    .update({
      dictation_seconds_used: newUsed,
      ...(stale ? { reports_used_this_month: 0, billing_period_start: new Date().toISOString() } : {}),
    })
    .eq("id", userId);

  if (error) console.error("[incrementDictationUsage]", error.message);
  return newUsed;
}

export async function checkDocumentLimit(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  plan: SubscriptionPlan;
}> {
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role, email, subscription_plan, org_id")
    .eq("id", userId)
    .single();

  const isAdmin = profile?.role === "admin"
    || (profile?.email && ADMIN_EMAILS.includes(profile.email.toLowerCase()));
  if (isAdmin) {
    return { allowed: true, used: 0, limit: 999999, plan: "professional" };
  }

  if (profile?.org_id) {
    return { allowed: true, used: 0, limit: 999999, plan: "professional" };
  }

  const plan = (profile?.subscription_plan || "free") as SubscriptionPlan;

  // Card-first billing: no free usage without an active subscription.
  if (plan === "free") {
    return { allowed: false, used: 0, limit: 0, plan: "free" };
  }

  const planConfig = PLANS[plan];

  return {
    allowed: true,
    used: 0,
    limit: planConfig.guidelineDocuments,
    plan,
  };
}

/* ── Organization membership helpers ─────────────────────────── */

export async function getOrgMembership(userId: string): Promise<OrgMembership | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("org_members")
    .select("org_id, section_id, is_org_chief, section_role, staff_type, organizations(name), org_sections(name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;

  const org = data.organizations as unknown as { name: string } | null;
  const sec = data.org_sections as unknown as { name: string } | null;

  return {
    org_id: data.org_id,
    org_name: org?.name || "",
    section_id: data.section_id,
    section_name: sec?.name || null,
    is_org_chief: data.is_org_chief,
    section_role: data.section_role as SectionRole,
    staff_type: (data.staff_type as StaffType) || "attending",
  };
}

export async function requireOrgMembership(userId: string): Promise<OrgMembership> {
  const membership = await getOrgMembership(userId);
  if (!membership) throw new Error("User is not a member of any organization");
  return membership;
}

export async function requireOrgRole(
  userId: string,
  opts: { chief?: boolean; sectionRoles?: SectionRole[]; sectionId?: string },
): Promise<OrgMembership> {
  const membership = await requireOrgMembership(userId);

  if (opts.chief && membership.is_org_chief) return membership;

  if (opts.sectionRoles?.includes(membership.section_role)) {
    if (!opts.sectionId || membership.section_id === opts.sectionId) {
      return membership;
    }
  }

  if (membership.is_org_chief) return membership;

  throw new Error("Insufficient org permissions");
}


/* ── Regional feature policy ─────────────────────────────────── */

/**
 * Resolve the region governing a user's features from their declared account
 * country, falling back to the connection country only when none was given.
 */
export const REGION_VIEW_COOKIE = "rg_region_view";

export async function getUserRegion(userId: string, connectionCountry?: string | null): Promise<Region> {
  // Admins can preview either interface (see REGION_VIEW_COOKIE). The override
  // is honoured only after confirming the role server-side, so a forged cookie
  // cannot unlock restricted features for anyone else.
  try {
    const jar = await cookies();
    const view = jar.get(REGION_VIEW_COOKIE)?.value;
    if (view === "open" || view === "eu" || view === "us") {
      if ((await getUserRole(userId)) === "admin") return view;
    }
  } catch { /* not in a request context — fall through */ }

  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("country")
    .eq("id", userId)
    .maybeSingle();
  return resolveRegion(data?.country, connectionCountry);
}

/**
 * Guard for interpretive features (classification, follow-up
 * recommendations, clinical checks, case assistant): these are clinical
 * decision support and are not offered where that would make the product a
 * regulated medical device. Returns null when allowed, or the response to
 * return when it is not.
 */
export async function requireRegionFeature(
  userId: string,
  feature: keyof RegionFeatures,
  connectionCountry?: string | null,
): Promise<NextResponse | null> {
  const region = await getUserRegion(userId, connectionCountry);
  if (regionFeatures(region)[feature]) return null;
  return NextResponse.json(
    {
      error: "This feature is not available in your region",
      code: "REGION_RESTRICTED",
      region,
    },
    { status: 451 },
  );
}
