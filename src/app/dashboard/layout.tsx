import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ensureProfile, isUserApproved } from "@/lib/ensure-profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const role = await ensureProfile(user.id, user.email || "");

  const approved = await isUserApproved(user.id);
  if (!approved) redirect("/auth/not-approved");

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("pending_checkout_plan")
    .eq("id", user.id)
    .single();

  if (profile?.pending_checkout_plan) {
    const plan = profile.pending_checkout_plan;
    if (plan === "resident") {
      redirect("/auth/verify-resident");
    } else {
      redirect(`/auth/pending-payment?plan=${encodeURIComponent(plan)}`);
    }
  }

  return (
    <DashboardShell user={user} role={role}>
      {children}
    </DashboardShell>
  );
}
