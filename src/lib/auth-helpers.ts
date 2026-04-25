import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/encryption";
import { PLANS, type AIProvider, type UserRole, type SubscriptionPlan } from "@/lib/types";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export interface GlobalAIConfig {
  provider: AIProvider;
  modelName: string;
  apiKey: string;
  customBaseUrl?: string;
  whisperApiKey?: string;
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

  return {
    provider: data.provider as AIProvider,
    modelName: data.model_name,
    apiKey,
    customBaseUrl: data.custom_base_url || undefined,
    whisperApiKey,
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
    .select("role, email, subscription_plan, reports_used_this_month, billing_period_start")
    .eq("id", userId)
    .single();

  const isAdmin = profile?.role === "admin"
    || (profile?.email && ADMIN_EMAILS.includes(profile.email.toLowerCase()));
  if (isAdmin) {
    return { allowed: true, used: 0, limit: 999999, plan: "professional" };
  }

  const plan = (profile?.subscription_plan || "free") as SubscriptionPlan;
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
    .select("role, email, subscription_plan, dictation_seconds_used, billing_period_start")
    .eq("id", userId)
    .single();

  const isAdmin = profile?.role === "admin"
    || (profile?.email && ADMIN_EMAILS.includes(profile.email.toLowerCase()));
  if (isAdmin) {
    return { allowed: true, usedSeconds: 0, limitSeconds: 999999 * 60, plan: "professional" };
  }

  const plan = (profile?.subscription_plan || "free") as SubscriptionPlan;
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
