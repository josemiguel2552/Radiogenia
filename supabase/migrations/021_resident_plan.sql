-- Add resident plan and verification system

-- 1. Update subscription_plan check constraint to include 'resident'
alter table public.profiles
  drop constraint if exists profiles_subscription_plan_check;

alter table public.profiles
  add constraint profiles_subscription_plan_check
  check (subscription_plan in ('free', 'resident', 'starter', 'professional'));

-- 2. Resident verification requests
create table if not exists public.resident_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_url text not null,
  institution_name text not null default '',
  residency_start date not null,
  residency_end date not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists resident_verifications_user_idx
  on public.resident_verifications (user_id);
create index if not exists resident_verifications_status_idx
  on public.resident_verifications (status);

alter table public.resident_verifications enable row level security;

create policy "users read own verifications"
  on public.resident_verifications for select
  using (auth.uid() = user_id);

create policy "users create own verifications"
  on public.resident_verifications for insert
  with check (auth.uid() = user_id);

create policy "admin full access on resident_verifications"
  on public.resident_verifications for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 3. Storage bucket for resident documents (run in Supabase dashboard)
-- insert into storage.buckets (id, name, public) values ('resident-docs', 'resident-docs', false);
