-- 5-day post-signup "extract recommendations from guidelines" email. Same
-- pattern as the 24h/48h emails: own dedupe column, backfilled to now() for
-- existing users so only users who sign up after this migration receive it.
alter table public.profiles
  add column if not exists guidelines_email_sent_at timestamptz;

update public.profiles
  set guidelines_email_sent_at = now()
  where guidelines_email_sent_at is null;

create index if not exists profiles_guidelines_pending_idx
  on public.profiles (created_at)
  where guidelines_email_sent_at is null;
