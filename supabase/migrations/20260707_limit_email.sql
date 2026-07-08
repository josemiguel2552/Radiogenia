-- "Limit reached → upgrade" email: sent once per billing cycle, the first time
-- a user runs out of monthly reports. This column dedupes it (compared against
-- billing_period_start, so a new cycle allows a new send).
alter table public.profiles
  add column if not exists limit_email_sent_at timestamptz;
