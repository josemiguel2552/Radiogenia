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
    .select("pending_checkout_plan, email_verified, created_at, subscription_plan, org_id")
    .eq("id", user.id)
    .single();

  // Card-first billing: nobody uses the platform without a subscription (or
  // an active 7-day trial, which Stripe reports as the Starter plan).
  // Hospital/org members and admins are exempt.
  const needsSubscription =
    role !== "admin" &&
    !profile?.org_id &&
    (profile?.subscription_plan || "free") === "free";

  if (needsSubscription) {
    const pending = profile?.pending_checkout_plan;
    // "resident" was retired from the offer — route legacy pendings to the trial.
    const plan = pending && pending !== "resident" && pending !== "free" ? pending : "starter";
    redirect(`/auth/pending-payment?plan=${encodeURIComponent(plan)}`);
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
