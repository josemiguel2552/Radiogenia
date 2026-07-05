-- 24h post-signup onboarding "tools" email.
-- Tracks whether the onboarding email has been sent to each user so the cron
-- job never emails anyone twice.
alter table public.profiles
  add column if not exists onboarding_email_sent_at timestamptz;

-- Backfill: mark ALL existing users as already-sent so the first cron run does
-- NOT blast the whole existing user base. Only users who sign up AFTER this
-- migration will receive the 24h onboarding email.
update public.profiles
  set onboarding_email_sent_at = now()
  where onboarding_email_sent_at is null;

-- Partial index to make the cron's "not yet sent" scan cheap.
create index if not exists profiles_onboarding_pending_idx
  on public.profiles (created_at)
  where onboarding_email_sent_at is null;
