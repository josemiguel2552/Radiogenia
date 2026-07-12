-- Enterprise plan contact-form leads (landing page pricing section →
-- "Solicitar cotización"). Kept separate from `waitlist` (which has a
-- UNIQUE(email) constraint and NOT NULL country/hospital that don't fit a
-- free-text sales inquiry that the same person might submit more than once).
create table if not exists public.enterprise_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists enterprise_inquiries_created_idx
  on public.enterprise_inquiries (created_at desc);

-- Locked down to the service-role client only (same posture as `waitlist`):
-- RLS enabled, no policies defined.
alter table public.enterprise_inquiries enable row level security;
