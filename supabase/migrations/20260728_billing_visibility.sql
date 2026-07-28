-- Billing visibility in the admin Users section: record WHEN a user
-- scheduled their cancellation (cleared if they reactivate).

alter table public.profiles add column if not exists subscription_cancelled_at timestamptz;

comment on column public.profiles.subscription_cancelled_at is 'When the user scheduled the cancellation of their subscription/trial (null if reactivated)';
