-- Card-first trial billing: the free plan becomes a 15-day trial (card
-- required) that converts into Starter unless canceled. These columns
-- track trial state for the day-14 charge-reminder email and to prevent
-- a second trial for the same account.

alter table public.profiles add column if not exists trial_used_at timestamptz;
alter table public.profiles add column if not exists trial_ends_at timestamptz;
alter table public.profiles add column if not exists trial_reminder_sent_at timestamptz;

comment on column public.profiles.trial_used_at is 'Set when the user starts their (only) 15-day trial';
comment on column public.profiles.trial_ends_at is 'When the current/last trial converts to a paid Starter charge';
comment on column public.profiles.trial_reminder_sent_at is 'Day-14 charge reminder email sent (once per trial)';
