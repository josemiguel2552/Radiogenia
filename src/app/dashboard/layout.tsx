import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ensureProfile, isUserApproved } from "@/lib/ensure-profile";

// Days of unverified-access grace remaining since signup (7-day window).
function graceDaysLeft(createdAt: string): number {
  const GRACE_MS = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - Date.parse(createdAt);
  return Math.max(0, Math.ceil((GRACE_MS - elapsed) / (24 * 60 * 60 * 1000)));
}

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
    .select("pending_checkout_plan, email_verified, created_at")
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

  // Deferred verification: unverified users get in (7-day grace from signup)
  // with a persistent banner; the shell shows days left + a resend button.
  const verifyDaysLeft = profile && profile.email_verified === false
    ? graceDaysLeft(profile.created_at || "")
    : null;

  return (
    <DashboardShell user={user} role={role} verifyDaysLeft={verifyDaysLeft}>
      {children}
    </DashboardShell>
  );
}
