-- Priority-5 instrumentation:
-- 1) Traffic attribution per user (UTM params + referrer captured at signup),
--    to cross activation data with ad campaigns (e.g. Meta Ads).
-- 2) When the verification email was (last) sent, to measure the
--    sent → verified funnel precisely.
alter table public.profiles
  add column if not exists signup_utm jsonb,
  add column if not exists verification_email_sent_at timestamptz;
