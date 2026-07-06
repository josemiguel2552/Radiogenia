-- 48h post-signup "report types" email. Its own dedupe column. Backfill only
-- users who are ALREADY past the 48h threshold (so we don't retroactively email
-- the old base); users still within the window keep a NULL flag so they receive
-- it on schedule.
alter table public.profiles
  add column if not exists report_types_email_sent_at timestamptz;

update public.profiles
  set report_types_email_sent_at = now()
  where report_types_email_sent_at is null
    and created_at <= now() - interval '48 hours';

create index if not exists profiles_report_types_pending_idx
  on public.profiles (created_at)
  where report_types_email_sent_at is null;
