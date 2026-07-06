-- 5-day (120h) post-signup "extract recommendations from guidelines" email. Its
-- own dedupe column. Backfill only users ALREADY past the 5-day threshold, so
-- users still within the window keep a NULL flag and receive it on schedule.
alter table public.profiles
  add column if not exists guidelines_email_sent_at timestamptz;

update public.profiles
  set guidelines_email_sent_at = now()
  where guidelines_email_sent_at is null
    and created_at <= now() - interval '120 hours';

create index if not exists profiles_guidelines_pending_idx
  on public.profiles (created_at)
  where guidelines_email_sent_at is null;
