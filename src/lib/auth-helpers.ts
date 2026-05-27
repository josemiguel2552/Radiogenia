import { createClient } from "@/lib/supabase/server";
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
    .select("role, email, subscription_plan, reports_used_this_month, billing_period_start, org_id, referral_bonus_expires_at, stripe_subscription_id")
    .eq("id", userId)
    .single();

  const isAdmin = profile?.role === "admin"
    || (profile?.email && ADMIN_EMAILS.includes(profile.email.toLowerCase()));
  if (isAdmin) {
    return { allowed: true, used: 0, limit: 999999, plan: "professional" };
  }

  if (profile?.org_id) {
    return { allowed: true, used: profile.reports_used_this_month || 0, limit: 999999, plan: "professional" };
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

  const planConfig = PLANS[plan];
  const periodStart = new Date(profile?.billing_period_start || Date.now());
  const needsReset = periodStart.getTime() + 30 * 24 * 60 * 60 * 1000 < Date.now();
  const used = needsReset ? 0 : (profile?.reports_used_this_month || 0);

  return {
    allowed: used < planConfig.reports,
    used,
    limit: planConfig.reports,
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
    .select("role, email, subscription_plan, dictation_seconds_used, billing_period_start, org_id, referral_bonus_expires_at, stripe_subscription_id")
    .eq("id", userId)
    .single();

  const isAdmin = profile?.role === "admin"
    || (profile?.email && ADMIN_EMAILS.includes(profile.email.toLowerCase()));
  if (isAdmin) {
    return { allowed: true, usedSeconds: 0, limitSeconds: 999999 * 60, plan: "professional" };
  }

  if (profile?.org_id) {
    return { allowed: true, usedSeconds: profile.dictation_seconds_used || 0, limitSeconds: 999999 * 60, plan: "professional" };
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

  const planConfig = PLANS[plan];
  const limitSeconds = planConfig.dictationMinutes * 60;
  const periodStart = new Date(profile?.billing_period_start || Date.now());
  const needsReset = periodStart.getTime() + 30 * 24 * 60 * 60 * 1000 < Date.now();
  const usedSeconds = needsReset ? 0 : (profile?.dictation_seconds_used || 0);

  return {
    allowed: usedSeconds < limitSeconds,
    usedSeconds,
    limitSeconds,
    plan,
  };
}

function isBillingPeriodStale(periodStart: string | null): boolean {
  if (!periodStart) return true;
  return new Date(periodStart).getTime() + 30 * 24 * 60 * 60 * 1000 < Date.now();
}

export async function incrementReportUsage(userId: string): Promise<void> {
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("reports_used_this_month, dictation_seconds_used, billing_period_start")
    .eq("id", userId)
    .single();

  if (!data) return;

  const stale = isBillingPeriodStale(data.billing_period_start);
  const { error } = await service
    .from("profiles")
    .update({
      reports_used_this_month: stale ? 1 : (data.reports_used_this_month || 0) + 1,
      ...(stale ? { dictation_seconds_used: 0, billing_period_start: new Date().toISOString() } : {}),
    })
    .eq("id", userId);

  if (error) console.error("[incrementReportUsage]", error.message);
}

export async function incrementDictationUsage(userId: string, seconds: number): Promise<number> {
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("dictation_seconds_used, reports_used_this_month, billing_period_start")
    .eq("id", userId)
    .single();

  if (!data) return seconds;

  const stale = isBillingPeriodStale(data.billing_period_start);
  const newUsed = stale ? seconds : (data.dictation_seconds_used || 0) + seconds;
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

