-- Anonymous market-intelligence archive: when legacy accounts are purged
-- from the admin panel, their country/hospital/role and signup date are
-- preserved here (no name or email — GDPR-friendly).

create table if not exists public.signup_archive (
  id uuid primary key default gen_random_uuid(),
  country text,
  hospital text,
  professional_role text,
  plan text,
  signup_at timestamptz,
  deleted_at timestamptz not null default now()
);

alter table public.signup_archive enable row level security;
-- No policies: only the service role (admin APIs) can read/write.
