import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import type { AIProvider, UserRole } from "@/lib/types";

export interface GlobalAIConfig {
  provider: AIProvider;
  modelName: string;
  apiKey: string;
  customBaseUrl?: string;
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

  return {
    provider: data.provider as AIProvider,
    modelName: data.model_name,
    apiKey,
    customBaseUrl: data.custom_base_url || undefined,
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
