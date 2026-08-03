-- ── Institutional (hospital) self-onboarding ────────────────────────────
-- Instead of inviting radiologists one by one by email, each hospital gets a
-- single onboarding link. The institution itself declares how many seats it
-- needs and which radiologists will use them, signs the institutional terms,
-- and pays by card or bank transfer. Access is provisioned once paid.

alter table public.organizations
  add column if not exists onboarding_token uuid not null default gen_random_uuid();

create unique index if not exists organizations_onboarding_token_idx
  on public.organizations (onboarding_token);

create table if not exists public.org_seat_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  seats integer not null check (seats >= 2),
  unit_price numeric(10,2) not null default 19.90,
  currency text not null default 'EUR',
  payment_method text not null check (payment_method in ('card', 'transfer')),
  -- pending: awaiting payment · paid: money received · active: seats provisioned
  status text not null default 'pending' check (status in ('pending', 'paid', 'active', 'cancelled')),
  contact_name text,
  contact_email text not null,
  billing_details text,
  emails jsonb not null default '[]'::jsonb,
  legal_accepted_at timestamptz,
  legal_version text,
  legal_signer_name text,
  legal_signer_role text,
  stripe_session_id text,
  stripe_subscription_id text,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists org_seat_orders_org_idx on public.org_seat_orders (org_id);
create index if not exists org_seat_orders_status_idx on public.org_seat_orders (status);
alter table public.org_seat_orders enable row level security;
-- No policies: only the service role (admin + onboarding APIs) may read/write.

create table if not exists public.org_seat_invites (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.org_seat_orders(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'activated', 'failed')),
  user_id uuid,
  error text,
  sent_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists org_seat_invites_order_idx on public.org_seat_invites (order_id);
alter table public.org_seat_invites enable row level security;

comment on table public.org_seat_orders is 'Institutional seat purchases made through the hospital onboarding link';
comment on table public.org_seat_invites is 'Radiologist seats to provision for a paid institutional order';
