-- Consent records: stores acceptance of legal documents by org members.
-- Required for LGPD / LATAM data protection compliance — proof that hospital users accepted
-- terms, privacy policy, and data processing agreement.

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  document_type text not null
    check (document_type in ('terms_of_use', 'privacy_policy', 'data_processing', 'ai_disclaimer')),
  document_version text not null default '1.0',
  ip_address text,
  user_agent text,
  accepted_at timestamptz not null default now(),
  unique (user_id, document_type, document_version)
);

create index if not exists consent_records_user_idx on public.consent_records (user_id);

alter table public.consent_records enable row level security;

create policy "Users can view own consent records"
  on public.consent_records for select
  using (auth.uid() = user_id);

create policy "Users can insert own consent records"
  on public.consent_records for insert
  with check (auth.uid() = user_id);

create policy "Admin can view all consent records"
  on public.consent_records for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Add consent_accepted flag to org_members for quick checks
alter table public.org_members
  add column if not exists consent_accepted_at timestamptz;
