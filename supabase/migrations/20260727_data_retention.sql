-- Data retention for lapsed subscribers: when a subscription ends (cancelled
-- trial or stopped payments) the account keeps its data for 90 days so the
-- user can reactivate and recover templates/reports; after that a daily job
-- permanently deletes the account.

alter table public.profiles add column if not exists subscription_ended_at timestamptz;

comment on column public.profiles.subscription_ended_at is 'When the user''s subscription/trial access ended; start of the 90-day retention window (cleared on reactivation)';
