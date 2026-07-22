-- ── Simplified hospital flow ─────────────────────────────────────────────
-- Radiologist-only hospital membership (no chief/section hierarchy).
-- Adds: per-radiologist subspecialties + approx reports/month captured at
-- signup, and a per-hospital signup token used to build the invite link.

alter table public.profiles
  add column if not exists subspecialties text[];

alter table public.profiles
  add column if not exists avg_reports_month integer;

alter table public.organizations
  add column if not exists signup_token uuid not null default gen_random_uuid();

create unique index if not exists organizations_signup_token_idx
  on public.organizations (signup_token);
