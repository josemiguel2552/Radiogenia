-- ── Hospital trial links ─────────────────────────────────────────────────
-- Each hospital gets a shareable trial link: anyone opening it enters the
-- app directly (no registration/login) via a per-hospital trial account,
-- with unlimited tools for 30 days from hospital creation.

alter table public.organizations
  add column if not exists trial_token uuid not null default gen_random_uuid();

alter table public.organizations
  add column if not exists trial_expires_at timestamptz not null default (now() + interval '30 days');

create unique index if not exists organizations_trial_token_idx
  on public.organizations (trial_token);
