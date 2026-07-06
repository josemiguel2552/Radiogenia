-- One-time broadcast of the onboarding email to users already registered.
-- Uses its OWN column so it never interferes with the daily 24h cron (which
-- keys off onboarding_email_sent_at). NOT backfilled: every current user is a
-- candidate until they actually receive the broadcast.
alter table public.profiles
  add column if not exists onboarding_broadcast_at timestamptz;

-- Cheap scan for "not yet broadcast".
create index if not exists profiles_onboarding_broadcast_pending_idx
  on public.profiles (created_at)
  where onboarding_broadcast_at is null;
