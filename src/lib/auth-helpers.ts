import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { PLANS, type AIProvider, type UserRole, type SubscriptionPlan } from "@/lib/types";

export interface GlobalAIConfig {
  provider: AIProvider;
  modelName: string;
  apiKey: string;
  customBaseUrl?: string;
  whisperApiKey?: string;
}

export async function getGlobalAIConfig(): Promise<GlobalAIConfig> {
  const supabase = await createClient();
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
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
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
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, subscription_plan, reports_used_this_month, billing_period_start")
    .eq("id", userId)
    .single();

  if (profile?.role === "admin") {
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
