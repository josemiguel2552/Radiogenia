import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ensureProfile } from "@/lib/ensure-profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const role = await ensureProfile(user.id, user.email || "");

  return (
    <DashboardShell user={user} role={role}>
      {children}
    </DashboardShell>
  );
}
