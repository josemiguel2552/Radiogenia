-- ============================================================
-- Radiogenia — Clean production setup (single run)
-- Paste this in Supabase SQL Editor on a FRESH project
-- ============================================================

-- ##########################################################
-- PART 1 — Core schema (profiles, templates, reports, etc.)
-- ##########################################################

create extension if not exists "uuid-ossp";

-- Users profile table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  subscription_status text default 'free',
  role text not null default 'radiologist',
  subscription_plan text not null default 'free',
  reports_used_this_month integer not null default 0,
  billing_period_start timestamptz not null default now(),
  stripe_customer_id text,
  stripe_subscription_id text,
  dictation_seconds_used integer not null default 0,
  org_id uuid,
  approved boolean default false,
  pending_plan text,
  pending_plan_effective_date timestamptz,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

do $$
begin
  alter table public.profiles
    add constraint profiles_role_check check (role in ('admin', 'radiologist'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_subscription_plan_check
    check (subscription_plan in ('free', 'resident', 'starter', 'professional'));
exception when duplicate_object then null;
end $$;

alter table public.profiles enable row level security;

create index if not exists profiles_subscription_idx on public.profiles (subscription_plan);
create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id) where stripe_customer_id is not null;

-- User templates
create table if not exists public.user_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  modality text not null,
  base_template_id integer,
  structure jsonb not null,
  is_default boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_templates enable row level security;
drop policy if exists "Users can CRUD own templates" on public.user_templates;
create policy "Users can CRUD own templates" on public.user_templates for all using (auth.uid() = user_id);

-- User recommendations
create table if not exists public.user_recommendations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  trigger_keyword text not null,
  recommendation_text text not null,
  source text default 'manual' check (source in ('manual', 'pdf_extracted')),
  guideline_name text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_recommendations enable row level security;
drop policy if exists "Users can CRUD own recommendations" on public.user_recommendations;
create policy "Users can CRUD own recommendations" on public.user_recommendations for all using (auth.uid() = user_id);

-- User model configuration
create table if not exists public.user_model_config (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  provider text default 'claude' check (provider in ('claude', 'openai', 'deepseek', 'gemini', 'custom')),
  model_name text default 'claude-sonnet-4-20250514',
  api_key_encrypted text default '',
  custom_base_url text default '',
  findings_length text default 'standard' check (findings_length in ('concise', 'standard', 'detailed')),
  normal_fields_verbosity text default 'standard' check (normal_fields_verbosity in ('minimal', 'standard', 'explicit')),
  paraphrase_level text default 'light' check (paraphrase_level in ('none', 'light', 'free')),
  output_language text default 'es' check (output_language in ('es', 'en', 'pt', 'fr', 'de', 'it')),
  style_learning_enabled boolean default true,
  style_sample_count integer default 0,
  few_shot_count integer default 3,
  compact_normals boolean default false,
  dictation_language text default 'auto',
  conclusion_style text default 'grouped' check (conclusion_style in ('concise', 'grouped')),
  recommendations_enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_model_config enable row level security;
drop policy if exists "Users can CRUD own model config" on public.user_model_config;
create policy "Users can CRUD own model config" on public.user_model_config for all using (auth.uid() = user_id);

-- Style samples
create table if not exists public.style_samples (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  report_id uuid,
  findings_text text not null,
  conclusion_text text default '',
  modality text not null,
  study_type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.style_samples enable row level security;
drop policy if exists "Users can CRUD own style samples" on public.style_samples;
create policy "Users can CRUD own style samples" on public.style_samples for all using (auth.uid() = user_id);

-- Style patterns
create table if not exists public.style_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  modality text not null,
  study_type text not null,
  kind text not null check (kind in ('normal_phrase', 'conclusion_phrase', 'conclusion_sample')),
  label text,
  phrase text not null,
  frequency int not null default 1,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, modality, study_type, kind, phrase)
);

create index if not exists style_patterns_lookup_idx
  on public.style_patterns (user_id, modality, study_type, kind, frequency desc, last_seen_at desc);

alter table public.style_patterns enable row level security;
drop policy if exists "user manages own style_patterns" on public.style_patterns;
create policy "user manages own style_patterns" on public.style_patterns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Normality phrases
create table if not exists public.normality_phrases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  modality text not null,
  section_label text not null,
  phrase text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, modality, section_label)
);

create index if not exists normality_phrases_lookup_idx
  on public.normality_phrases (user_id, modality);

alter table public.normality_phrases enable row level security;
drop policy if exists "user manages own normality_phrases" on public.normality_phrases;
create policy "user manages own normality_phrases" on public.normality_phrases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reports
create table if not exists public.reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  study_type text not null,
  modality text not null,
  contrast_option text default 'default',
  raw_dictation text default '',
  findings_text text default '',
  conclusion_text text default '',
  recommendations_text text default '',
  template_snapshot jsonb,
  model_config_snapshot jsonb,
  initial_findings_text text,
  initial_conclusion_text text,
  clinical_context text default '',
  generation_duration_ms int,
  provider_used text,
  model_used text,
  had_corrections boolean default false,
  error_reported boolean default false,
  error_report_note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reports enable row level security;

-- Global model config (singleton)
create table if not exists public.global_model_config (
  id uuid primary key default gen_random_uuid(),
  provider text default 'deepseek' check (provider in ('claude','openai','deepseek','gemini','custom')),
  model_name text default 'deepseek-chat',
  api_key_encrypted text default '',
  custom_base_url text default '',
  whisper_api_key_encrypted text default '',
  findings_provider text,
  findings_model text,
  conclusion_provider text,
  conclusion_model text,
  recommendations_provider text,
  recommendations_model text,
  trace_provider text,
  trace_model text,
  anthropic_api_key_encrypted text,
  google_api_key_encrypted text,
  deepseek_api_key_encrypted text,
  custom_api_key_encrypted text,
  dictation_correction_provider text,
  dictation_correction_model text,
  improve_writing_provider text,
  improve_writing_model text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create unique index if not exists global_model_config_singleton
  on public.global_model_config ((true));

insert into public.global_model_config (id)
  values (gen_random_uuid())
  on conflict do nothing;

alter table public.global_model_config enable row level security;

-- Global templates
create table if not exists public.global_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  modality text not null,
  base_template_id integer,
  structure jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.global_templates enable row level security;

-- Signatures
create table if not exists public.signatures (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  label text not null,
  body text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists signatures_user_idx on public.signatures (user_id);

alter table public.signatures enable row level security;
drop policy if exists "users manage own signatures" on public.signatures;
create policy "users manage own signatures"
  on public.signatures for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Audit logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  action text not null check (action in (
    'generate_findings', 'generate_conclusion', 'save_report', 'report_error', 'correction_logged'
  )),
  provider text,
  model text,
  duration_ms int,
  had_corrections boolean default false,
  input_tokens int default 0,
  output_tokens int default 0,
  estimated_cost_usd numeric default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_idx
  on public.audit_logs (user_id, created_at desc);
create index if not exists audit_logs_report_idx
  on public.audit_logs (report_id) where report_id is not null;
create index if not exists idx_audit_logs_cost_month
  on public.audit_logs (created_at, estimated_cost_usd)
  where estimated_cost_usd is not null;

alter table public.audit_logs enable row level security;

-- User hidden templates
create table if not exists public.user_hidden_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  global_template_id uuid not null references public.global_templates(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, global_template_id)
);

alter table public.user_hidden_templates enable row level security;

-- Waitlist
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  country text not null,
  hospital text not null,
  role text not null check (role in ('attending', 'resident')),
  created_at timestamptz default now(),
  unique(email)
);

alter table public.waitlist enable row level security;


-- ##########################################################
-- PART 2 — Functions & triggers
-- ##########################################################

-- Handle new user registration
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  insert into public.user_model_config (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_model_config_updated_at on public.user_model_config;
create trigger update_model_config_updated_at
  before update on public.user_model_config
  for each row execute procedure public.update_updated_at();

-- Style sample count sync
create or replace function public.update_style_sample_count()
returns trigger as $$
begin
  if (TG_OP = 'DELETE') then
    update public.user_model_config
    set style_sample_count = (select count(*) from public.style_samples where user_id = old.user_id)
    where user_id = old.user_id;
    return old;
  else
    update public.user_model_config
    set style_sample_count = (select count(*) from public.style_samples where user_id = new.user_id)
    where user_id = new.user_id;
    return new;
  end if;
end;
$$ language plpgsql security definer;

drop trigger if exists on_style_sample_change on public.style_samples;
create trigger on_style_sample_change
  after insert or delete on public.style_samples
  for each row execute procedure public.update_style_sample_count();

-- Billing period reset
create or replace function public.check_and_reset_billing_period()
returns trigger as $$
begin
  if new.billing_period_start + interval '1 month' <= now() then
    new.reports_used_this_month := 0;
    new.dictation_seconds_used := 0;
    new.billing_period_start := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists check_billing_period on public.profiles;
create trigger check_billing_period
  before update on public.profiles
  for each row execute procedure public.check_and_reset_billing_period();

-- Increment report usage
create or replace function public.increment_report_usage(uid uuid)
returns void as $$
begin
  update public.profiles
  set reports_used_this_month = reports_used_this_month + 1
  where id = uid;
end;
$$ language plpgsql security definer;

-- Increment dictation seconds
create or replace function public.increment_dictation_seconds(uid uuid, seconds integer)
returns void as $$
begin
  update public.profiles
  set dictation_seconds_used = dictation_seconds_used + seconds
  where id = uid;
end;
$$ language plpgsql security definer;


-- ##########################################################
-- PART 3 — RLS policies (core tables)
-- ##########################################################

-- Profiles: user sees own, admin sees all
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can view own or admin views all" on public.profiles;
create policy "Users can view own or admin views all"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Reports: user CRUD own, admin reads all
drop policy if exists "Users or admin can read reports" on public.reports;
create policy "Users or admin can read reports"
  on public.reports for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Users can insert own reports" on public.reports;
create policy "Users can insert own reports"
  on public.reports for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own reports" on public.reports;
create policy "Users can update own reports"
  on public.reports for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own reports" on public.reports;
create policy "Users can delete own reports"
  on public.reports for delete using (auth.uid() = user_id);

-- Global model config
drop policy if exists "Authenticated users can read global config" on public.global_model_config;
create policy "Authenticated users can read global config"
  on public.global_model_config for select
  using (auth.role() = 'authenticated');

drop policy if exists "Only admin can update global config" on public.global_model_config;
create policy "Only admin can update global config"
  on public.global_model_config for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Global templates
drop policy if exists "Authenticated users can read global templates" on public.global_templates;
create policy "Authenticated users can read global templates"
  on public.global_templates for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated can insert global templates" on public.global_templates;
create policy "Authenticated can insert global templates"
  on public.global_templates for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can update global templates" on public.global_templates;
create policy "Authenticated can update global templates"
  on public.global_templates for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete global templates" on public.global_templates;
create policy "Authenticated can delete global templates"
  on public.global_templates for delete using (auth.role() = 'authenticated');

-- Audit logs
drop policy if exists "users read own audit_logs" on public.audit_logs;
create policy "users read own audit_logs" on public.audit_logs
  for select using (auth.uid() = user_id);
drop policy if exists "users insert own audit_logs" on public.audit_logs;
create policy "users insert own audit_logs" on public.audit_logs
  for insert with check (auth.uid() = user_id);
drop policy if exists "admins read all audit_logs" on public.audit_logs;
create policy "admins read all audit_logs" on public.audit_logs
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- User hidden templates
drop policy if exists "Users manage own hidden templates" on public.user_hidden_templates;
create policy "Users manage own hidden templates"
  on public.user_hidden_templates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ##########################################################
-- PART 4 — Hospital multi-tenant (tables first, then functions & policies)
-- ##########################################################

-- Organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  billing_email text,
  stripe_customer_id text,
  stripe_subscription_id text,
  max_seats integer not null default 50,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- Add FK from profiles.org_id now that organizations table exists
do $$
begin
  alter table public.profiles
    add constraint profiles_org_id_fkey foreign key (org_id) references public.organizations(id) on delete set null;
exception when duplicate_object then null;
end $$;

-- Org sections
create table if not exists public.org_sections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, slug)
);

alter table public.org_sections enable row level security;

-- Org members
create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  section_id uuid references public.org_sections(id) on delete set null,
  is_org_chief boolean not null default false,
  section_role text not null default 'radiologist'
    check (section_role in ('section_chief', 'section_editor', 'radiologist')),
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  deactivated_at timestamptz,
  unique (org_id, user_id)
);

create index if not exists org_members_user_idx on public.org_members (user_id, is_active);
create index if not exists org_members_org_section_idx on public.org_members (org_id, section_id, is_active);

alter table public.org_members enable row level security;

-- Org templates
create table if not exists public.org_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  section_id uuid not null references public.org_sections(id) on delete cascade,
  name text not null,
  modality text not null,
  base_template_id integer,
  structure jsonb not null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.org_templates enable row level security;

-- Org normality phrases
create table if not exists public.org_normality_phrases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  section_id uuid not null references public.org_sections(id) on delete cascade,
  modality text not null,
  section_label text not null,
  phrase text not null,
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (section_id, modality, section_label)
);

alter table public.org_normality_phrases enable row level security;

-- Org recommendations
create table if not exists public.org_recommendations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  section_id uuid not null references public.org_sections(id) on delete cascade,
  trigger_keyword text not null,
  recommendation_text text not null,
  source text default 'manual' check (source in ('manual', 'pdf_extracted')),
  guideline_name text default '',
  category text default 'all',
  modality text default 'all',
  title text,
  text text,
  tags text[] default '{}',
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

alter table public.org_recommendations enable row level security;

-- Support tickets
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default '',
  body text not null,
  category text not null default 'general'
    check (category in ('error', 'question', 'complaint', 'general')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_reply text,
  admin_user_id uuid references auth.users(id),
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_org_idx on public.support_tickets (org_id, status);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id);

alter table public.support_tickets enable row level security;

-- User template imports
create table if not exists public.user_template_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_template_id uuid not null references public.org_templates(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, org_template_id)
);

create index if not exists user_template_imports_user_idx
  on public.user_template_imports (user_id);

alter table public.user_template_imports enable row level security;

-- User recommendation imports
create table if not exists public.user_recommendation_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_recommendation_id uuid not null references public.org_recommendations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, org_recommendation_id)
);

alter table public.user_recommendation_imports enable row level security;

-- Resident verifications
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


-- ##########################################################
-- PART 5 — Helper functions (need tables above to exist)
-- ##########################################################

create or replace function public.can_edit_org_section(uid uuid, sid uuid)
returns boolean as $$
  select exists (
    select 1 from public.org_members
    where user_id = uid and is_active = true
    and (
      is_org_chief = true
      or (section_id = sid and section_role in ('section_chief', 'section_editor'))
    )
  );
$$ language sql security definer stable;

create or replace function public.get_user_org(uid uuid)
returns table (org_id uuid, section_id uuid, is_org_chief boolean, section_role text) as $$
  select org_id, section_id, is_org_chief, section_role
  from public.org_members
  where user_id = uid and is_active = true
  limit 1;
$$ language sql security definer stable;


-- ##########################################################
-- PART 6 — RLS policies (multi-tenant)
-- ##########################################################

-- Organizations
create policy "admin full access on organizations"
  on public.organizations for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "org members read own org"
  on public.organizations for select
  using (exists (select 1 from public.org_members where org_id = organizations.id and user_id = auth.uid() and is_active = true));

-- Org sections
create policy "admin full access on org_sections"
  on public.org_sections for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "org members view sections"
  on public.org_sections for select
  using (exists (select 1 from public.org_members where org_id = org_sections.org_id and user_id = auth.uid() and is_active = true));

create policy "org_chief manages sections"
  on public.org_sections for all
  using (exists (
    select 1 from public.org_members
    where org_id = org_sections.org_id and user_id = auth.uid() and is_org_chief = true and is_active = true
  ));

-- Org members
create policy "admin full access on org_members"
  on public.org_members for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "org members view members"
  on public.org_members for select
  using (org_id in (select om.org_id from public.org_members om where om.user_id = auth.uid() and om.is_active = true));

create policy "org_chief manages all members"
  on public.org_members for all
  using (exists (
    select 1 from public.org_members om
    where om.org_id = org_members.org_id and om.user_id = auth.uid() and om.is_org_chief = true and om.is_active = true
  ));

create policy "section_chief manages section members"
  on public.org_members for insert
  with check (
    exists (
      select 1 from public.org_members om
      where om.org_id = org_members.org_id
        and om.user_id = auth.uid()
        and om.section_role = 'section_chief'
        and om.section_id = org_members.section_id
        and om.is_active = true
    )
    and org_members.section_role in ('radiologist', 'section_editor')
    and org_members.is_org_chief = false
  );

create policy "section_chief updates section members"
  on public.org_members for update
  using (
    exists (
      select 1 from public.org_members om
      where om.org_id = org_members.org_id
        and om.user_id = auth.uid()
        and om.section_role = 'section_chief'
        and om.section_id = org_members.section_id
        and om.is_active = true
    )
  );

-- Org templates
create policy "org members read all org templates"
  on public.org_templates for select
  using (exists (select 1 from public.org_members where org_id = org_templates.org_id and user_id = auth.uid() and is_active = true));

create policy "section editors manage templates"
  on public.org_templates for insert
  with check (public.can_edit_org_section(auth.uid(), org_templates.section_id));

create policy "section editors update templates"
  on public.org_templates for update
  using (public.can_edit_org_section(auth.uid(), org_templates.section_id));

create policy "section editors delete templates"
  on public.org_templates for delete
  using (public.can_edit_org_section(auth.uid(), org_templates.section_id));

create policy "admin full access on org_templates"
  on public.org_templates for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Org normality phrases
create policy "org members read org normality phrases"
  on public.org_normality_phrases for select
  using (exists (select 1 from public.org_members where org_id = org_normality_phrases.org_id and user_id = auth.uid() and is_active = true));

create policy "section editors manage normality phrases"
  on public.org_normality_phrases for insert
  with check (public.can_edit_org_section(auth.uid(), org_normality_phrases.section_id));

create policy "section editors update normality phrases"
  on public.org_normality_phrases for update
  using (public.can_edit_org_section(auth.uid(), org_normality_phrases.section_id));

create policy "section editors delete normality phrases"
  on public.org_normality_phrases for delete
  using (public.can_edit_org_section(auth.uid(), org_normality_phrases.section_id));

create policy "admin full access on org_normality_phrases"
  on public.org_normality_phrases for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Org recommendations
create policy "org members read org recommendations"
  on public.org_recommendations for select
  using (exists (select 1 from public.org_members where org_id = org_recommendations.org_id and user_id = auth.uid() and is_active = true));

create policy "section editors manage recommendations"
  on public.org_recommendations for insert
  with check (public.can_edit_org_section(auth.uid(), org_recommendations.section_id));

create policy "section editors update recommendations"
  on public.org_recommendations for update
  using (public.can_edit_org_section(auth.uid(), org_recommendations.section_id));

create policy "section editors delete recommendations"
  on public.org_recommendations for delete
  using (public.can_edit_org_section(auth.uid(), org_recommendations.section_id));

create policy "admin full access on org_recommendations"
  on public.org_recommendations for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Support tickets
create policy "users manage own tickets"
  on public.support_tickets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "admin full access on support_tickets"
  on public.support_tickets for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "org_chief reads org tickets"
  on public.support_tickets for select
  using (
    org_id is not null
    and exists (
      select 1 from public.org_members
      where org_id = support_tickets.org_id and user_id = auth.uid() and is_org_chief = true and is_active = true
    )
  );

-- User template imports
create policy "users manage own imports"
  on public.user_template_imports for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "admin full access on user_template_imports"
  on public.user_template_imports for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- User recommendation imports
create policy "users manage own recommendation imports"
  on public.user_recommendation_imports for all
  using (auth.uid() = user_id);

create policy "admin full access on user_recommendation_imports"
  on public.user_recommendation_imports for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Resident verifications
create policy "users read own verifications"
  on public.resident_verifications for select
  using (auth.uid() = user_id);

create policy "users create own verifications"
  on public.resident_verifications for insert
  with check (auth.uid() = user_id);

create policy "admin full access on resident_verifications"
  on public.resident_verifications for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Reports: supervisor read access
create policy "section_chief reads section reports"
  on public.reports for select
  using (
    exists (
      select 1 from public.org_members chief
      join public.org_members member
        on member.org_id = chief.org_id
        and member.section_id = chief.section_id
        and member.user_id = reports.user_id
        and member.is_active = true
      where chief.user_id = auth.uid()
        and chief.section_role = 'section_chief'
        and chief.is_active = true
    )
  );

create policy "org_chief reads all org reports"
  on public.reports for select
  using (
    exists (
      select 1 from public.org_members chief
      join public.org_members member
        on member.org_id = chief.org_id
        and member.user_id = reports.user_id
        and member.is_active = true
      where chief.user_id = auth.uid()
        and chief.is_org_chief = true
        and chief.is_active = true
    )
  );


-- ##########################################################
-- PART 7 — Sync trigger for profiles.org_id
-- ##########################################################

create or replace function public.sync_profile_org_id()
returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    update public.profiles set org_id = null
    where id = old.user_id
      and not exists (select 1 from public.org_members where user_id = old.user_id and is_active = true and id != old.id);
    return old;
  end if;

  if TG_OP = 'INSERT' and new.is_active = true then
    update public.profiles set org_id = new.org_id where id = new.user_id;
    return new;
  end if;

  if TG_OP = 'UPDATE' then
    if new.is_active = true then
      update public.profiles set org_id = new.org_id where id = new.user_id;
    else
      update public.profiles set org_id = null
      where id = new.user_id
        and not exists (select 1 from public.org_members where user_id = new.user_id and is_active = true and id != new.id);
    end if;
    return new;
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_profile_org_id on public.org_members;
create trigger trg_sync_profile_org_id
  after insert or update or delete on public.org_members
  for each row execute function public.sync_profile_org_id();


-- ##########################################################
-- PART 8 — Admin setup (change email to yours)
-- ##########################################################

-- This runs AFTER data import. If importing data, skip this.
-- update public.profiles
-- set role = 'admin', subscription_plan = 'professional', approved = true
-- where email = 'jose_miguel2552@hotmail.com';


-- ============================================================
-- DONE! Schema is ready.
-- Next: import your data from the old project.
-- ============================================================
