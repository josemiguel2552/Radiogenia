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
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      await supabase.from("profiles").upsert({
        id: userId,
        email,
        role: isAdmin ? "admin" : "radiologist",
        subscription_plan: isAdmin ? "professional" : "free",
      });
      return isAdmin ? "admin" : "radiologist";
    }

    if (isAdmin && profile.role !== "admin") {
      await supabase
        .from("profiles")
        .update({ role: "admin", subscription_plan: "professional" })
        .eq("id", userId);
      return "admin";
    }

    if (isAdmin) return "admin";
    return profile.role;
  } catch {
    return isAdmin ? "admin" : "radiologist";
  }
}
