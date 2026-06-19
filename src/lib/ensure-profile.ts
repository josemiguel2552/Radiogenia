import { createServiceClient } from "@/lib/supabase/service";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function ensureProfile(userId: string, email: string): Promise<string> {
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

  try {
    const supabase = createServiceClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, approved")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      await supabase.from("profiles").upsert({
        id: userId,
        email,
        role: isAdmin ? "admin" : "radiologist",
        subscription_plan: isAdmin ? "professional" : "free",
        approved: true,
      });
    } else if (isAdmin && profile.role !== "admin") {
      await supabase
        .from("profiles")
        .update({ role: "admin", subscription_plan: "professional", approved: true })
        .eq("id", userId);
    }

    // Ensure user_model_config exists (trigger may have failed)
    const { data: cfg } = await supabase
      .from("user_model_config")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!cfg) {
      await supabase.from("user_model_config").insert({ user_id: userId });
    }

    if (isAdmin) return "admin";
    return profile?.role || "radiologist";
  } catch {
    return isAdmin ? "admin" : "radiologist";
  }
}

export async function isUserApproved(userId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("profiles")
      .select("approved, email_verified")
      .eq("id", userId)
      .single();
    return data?.approved === true && data?.email_verified !== false;
  } catch {
    return false;
  }
}
