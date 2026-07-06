-- 48h post-signup "report types" email. Same pattern as the 24h onboarding
-- email: its own dedupe column, backfilled to now() for existing users so the
-- first cron run doesn't mass-send to the current base — only users who sign up
-- after this migration receive it (48h after signing up).
alter table public.profiles
  add column if not exists report_types_email_sent_at timestamptz;

update public.profiles
  set report_types_email_sent_at = now()
  where report_types_email_sent_at is null;

create index if not exists profiles_report_types_pending_idx
  on public.profiles (created_at)
  where report_types_email_sent_at is null;
