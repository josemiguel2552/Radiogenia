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

// Days left on a still-running trial; null once the end date has passed.
function trialDaysRemaining(endsAt: string): number | null {
  const msLeft = Date.parse(endsAt) - Date.now();
  if (!Number.isFinite(msLeft) || msLeft <= 0) return null;
  return Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
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

  // Cancelled-during-trial: the shell shows a subtle "X days left — click to
  // keep your subscription" banner. Best-effort: trial_ends_at may predate
  // the trial-billing migration.
  let trialCancelledDaysLeft: number | null = null;
  try {
    const { data: trialRow } = await service
      .from("profiles")
      .select("pending_plan, trial_ends_at")
      .eq("id", user.id)
      .single();
    if (trialRow?.pending_plan === "free" && trialRow.trial_ends_at) {
      trialCancelledDaysLeft = trialDaysRemaining(trialRow.trial_ends_at);
    }
  } catch { /* ignore */ }

  return (
    <DashboardShell user={user} role={role} verifyDaysLeft={verifyDaysLeft} trialCancelledDaysLeft={trialCancelledDaysLeft}>
      {children}
    </DashboardShell>
  );
}
