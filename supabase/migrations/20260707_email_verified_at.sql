-- Deferred email verification: track WHEN each user verified, to measure the
-- signup → verification funnel (Priority 1 instrumentation).
alter table public.profiles
  add column if not exists email_verified_at timestamptz;

-- Backfill: users already verified get a best-guess stamp (their signup date)
-- so the column is never null for verified users; exact times start accruing
-- from now on.
update public.profiles
  set email_verified_at = created_at
  where email_verified = true and email_verified_at is null;
