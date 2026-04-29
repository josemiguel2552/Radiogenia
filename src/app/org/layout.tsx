import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: member } = await supabase
    .from("org_members")
    .select("is_org_chief, section_role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!member) redirect("/dashboard");

  const hasAccess = member.is_org_chief || member.section_role === "section_chief";
  if (!hasAccess) redirect("/dashboard");

  return <>{children}</>;
}
