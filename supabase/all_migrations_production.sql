-- ============================================
-- Migration: 000_full_setup.sql
-- ============================================
-- ============================================================
-- Radiogen.ai — Full database setup
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ##########################################################
-- 001 — Initial schema
-- ##########################################################

create extension if not exists "uuid-ossp";

-- Users profile table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  subscription_status text default 'free',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reports enable row level security;
drop policy if exists "Users can CRUD own reports" on public.reports;
create policy "Users can CRUD own reports" on public.reports for all using (auth.uid() = user_id);

-- Function to handle new user registration
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


-- ##########################################################
-- 002 — Style learning (patterns + initial AI output)
-- ##########################################################

alter table public.reports
  add column if not exists initial_findings_text text,
  add column if not exists initial_conclusion_text text;

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
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.user_model_config alter column style_learning_enabled set default true;
update public.user_model_config set style_learning_enabled = true where style_learning_enabled = false;


-- ##########################################################
-- 003 — Normality phrases (user-customized)
-- ##########################################################

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
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ##########################################################
-- 004 — Admin roles + global model config
-- ##########################################################

alter table public.profiles
  add column if not exists role text not null default 'radiologist';

-- Add check constraint safely
do $$
begin
  alter table public.profiles
    add constraint profiles_role_check check (role in ('admin', 'radiologist'));
exception when duplicate_object then null;
end $$;

create table if not exists public.global_model_config (
  id uuid primary key default gen_random_uuid(),
  provider text default 'deepseek' check (provider in ('claude','openai','deepseek','gemini','custom')),
  model_name text default 'deepseek-chat',
  api_key_encrypted text default '',
  custom_base_url text default '',
  findings_provider text,
  findings_model text,
  conclusion_provider text,
  conclusion_model text,
  recommendations_provider text,
  recommendations_model text,
  trace_provider text,
  trace_model text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create unique index if not exists global_model_config_singleton
  on public.global_model_config ((true));

insert into public.global_model_config (id)
  values (gen_random_uuid())
  on conflict do nothing;

alter table public.global_model_config enable row level security;

drop policy if exists "Authenticated users can read global config" on public.global_model_config;
create policy "Authenticated users can read global config"
  on public.global_model_config for select
  using (auth.role() = 'authenticated');

drop policy if exists "Only admin can update global config" on public.global_model_config;
create policy "Only admin can update global config"
  on public.global_model_config for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin can see all profiles
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can view own or admin views all" on public.profiles;
create policy "Users can view own or admin views all"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin can read all reports
drop policy if exists "Users can CRUD own reports" on public.reports;
drop policy if exists "Users or admin can read reports" on public.reports;
create policy "Users or admin can read reports"
  on public.reports for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Users can insert own reports" on public.reports;
create policy "Users can insert own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own reports" on public.reports;
create policy "Users can update own reports"
  on public.reports for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own reports" on public.reports;
create policy "Users can delete own reports"
  on public.reports for delete
  using (auth.uid() = user_id);


-- ##########################################################
-- 005 — Subscriptions & usage tracking
-- ##########################################################

alter table public.profiles
  add column if not exists subscription_plan text not null default 'free',
  add column if not exists reports_used_this_month integer not null default 0,
  add column if not exists billing_period_start timestamptz not null default now(),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists dictation_seconds_used integer not null default 0;

-- Add check constraint safely
do $$
begin
  alter table public.profiles
    add constraint profiles_subscription_plan_check check (subscription_plan in ('free', 'starter', 'professional'));
exception when duplicate_object then null;
end $$;

create index if not exists profiles_subscription_idx on public.profiles (subscription_plan);
create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id) where stripe_customer_id is not null;

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

create or replace function public.increment_report_usage(uid uuid)
returns void as $$
begin
  update public.profiles
  set reports_used_this_month = reports_used_this_month + 1
  where id = uid;
end;
$$ language plpgsql security definer;


-- ##########################################################
-- 006 — Admin user setup (change email if needed)
-- ##########################################################

update public.profiles
set role = 'admin', subscription_plan = 'professional'
where email = 'jose_miguel2552@hotmail.com';


-- ##########################################################
-- 007 — Global templates
-- ##########################################################

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

drop policy if exists "Authenticated users can read global templates" on public.global_templates;
create policy "Authenticated users can read global templates"
  on public.global_templates for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated can insert global templates" on public.global_templates;
create policy "Authenticated can insert global templates"
  on public.global_templates for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can update global templates" on public.global_templates;
create policy "Authenticated can update global templates"
  on public.global_templates for update
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete global templates" on public.global_templates;
create policy "Authenticated can delete global templates"
  on public.global_templates for delete
  using (auth.role() = 'authenticated');

-- Clean up old default user templates (now served from global_templates)
delete from public.user_templates where is_default = true;


-- ##########################################################
-- 008 — Whisper API key
-- ##########################################################

alter table public.global_model_config
  add column if not exists whisper_api_key_encrypted text default '';


-- ##########################################################
-- 009 — Dictation limits (column created in 005, function here)
-- ##########################################################

create or replace function public.increment_dictation_seconds(uid uuid, seconds integer)
returns void as $$
begin
  update public.profiles
  set dictation_seconds_used = dictation_seconds_used + seconds
  where id = uid;
end;
$$ language plpgsql security definer;


-- ##########################################################
-- 011 — Per-task model overrides
-- ##########################################################

alter table public.global_model_config
  add column if not exists findings_provider text,
  add column if not exists findings_model text,
  add column if not exists conclusion_provider text,
  add column if not exists conclusion_model text,
  add column if not exists recommendations_provider text,
  add column if not exists recommendations_model text,
  add column if not exists trace_provider text,
  add column if not exists trace_model text;


-- ##########################################################
-- 012 — Per-provider API keys
-- ##########################################################

alter table public.global_model_config
  add column if not exists anthropic_api_key_encrypted text,
  add column if not exists google_api_key_encrypted text,
  add column if not exists deepseek_api_key_encrypted text,
  add column if not exists custom_api_key_encrypted text;


-- ##########################################################
-- 013 — Audit logs + report training metadata
-- ##########################################################

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
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_idx
  on public.audit_logs (user_id, created_at desc);
create index if not exists audit_logs_report_idx
  on public.audit_logs (report_id) where report_id is not null;

alter table public.audit_logs enable row level security;

drop policy if exists "users read own audit_logs" on public.audit_logs;
create policy "users read own audit_logs" on public.audit_logs
  for select using (auth.uid() = user_id);
drop policy if exists "users insert own audit_logs" on public.audit_logs;
create policy "users insert own audit_logs" on public.audit_logs
  for insert with check (auth.uid() = user_id);

alter table public.reports
  add column if not exists generation_duration_ms int,
  add column if not exists provider_used text,
  add column if not exists model_used text,
  add column if not exists had_corrections boolean default false,
  add column if not exists error_reported boolean default false,
  add column if not exists error_report_note text;


-- ##########################################################
-- 014 — Clinical context
-- ##########################################################

alter table public.reports
  add column if not exists clinical_context text default '';

-- ##########################################################
-- 015 — Signatures (per-user, multiple allowed, one active)
-- ##########################################################

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


-- ##########################################################
-- 016 — Dictation language preference
-- ##########################################################

alter table public.user_model_config
  add column if not exists dictation_language text default 'auto';


-- ##########################################################
-- 017 — Admin access to all reports & audit logs
-- ##########################################################

drop policy if exists "admins read all reports" on public.reports;
create policy "admins read all reports" on public.reports
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "admins read all audit_logs" on public.audit_logs;
create policy "admins read all audit_logs" on public.audit_logs
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );


-- ##########################################################
-- 018 — Allow correction_logged action in audit_logs
-- ##########################################################

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check
  CHECK (action IN (
    'generate_findings', 'generate_conclusion', 'save_report', 'report_error', 'correction_logged'
  ));


-- ============================================
-- Migration: 001_initial_schema.sql
-- ============================================
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  subscription_status text default 'free',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- User templates
create table public.user_templates (
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
create policy "Users can CRUD own templates" on public.user_templates for all using (auth.uid() = user_id);

-- User recommendations
create table public.user_recommendations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  trigger_keyword text not null,
  recommendation_text text not null,
  source text default 'manual' check (source in ('manual', 'pdf_extracted')),
  guideline_name text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_recommendations enable row level security;
create policy "Users can CRUD own recommendations" on public.user_recommendations for all using (auth.uid() = user_id);

-- User model configuration
create table public.user_model_config (
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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_model_config enable row level security;
create policy "Users can CRUD own model config" on public.user_model_config for all using (auth.uid() = user_id);

-- Style samples
create table public.style_samples (
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
create policy "Users can CRUD own style samples" on public.style_samples for all using (auth.uid() = user_id);

-- Reports
create table public.reports (
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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reports enable row level security;
create policy "Users can CRUD own reports" on public.reports for all using (auth.uid() = user_id);

-- Function to handle new user registration
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  insert into public.user_model_config (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_model_config_updated_at
  before update on public.user_model_config
  for each row execute procedure public.update_updated_at();

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

create trigger on_style_sample_change
  after insert or delete on public.style_samples
  for each row execute procedure public.update_style_sample_count();


-- ============================================
-- Migration: 002_style_learning.sql
-- ============================================
-- Continuous style learning
-- Stores the initial AI output so it can be diffed against the radiologist's
-- corrected report, and the extracted phrase patterns per study type.

-- 1. Initial AI output (pre-edit) for diffing ------------------------------
alter table public.reports
  add column if not exists initial_findings_text text,
  add column if not exists initial_conclusion_text text;

-- 2. Extracted phrases per user / modality / study type -------------------
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
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Update check constraint to allow conclusion_sample kind ----------------
-- If the table existed with the old constraint, we need to update it.
do $$
begin
  -- Drop old check constraint if it exists
  alter table public.style_patterns drop constraint if exists style_patterns_kind_check;
  -- Add new check constraint
  alter table public.style_patterns
    add constraint style_patterns_kind_check
    check (kind in ('normal_phrase', 'conclusion_phrase', 'conclusion_sample'));
exception when others then
  null; -- ignore if constraint doesn't exist or table is new
end $$;

-- 4. Enable style learning by default for existing users --------------------
alter table public.user_model_config alter column style_learning_enabled set default true;
update public.user_model_config set style_learning_enabled = true where style_learning_enabled = false;


-- ============================================
-- Migration: 003_normality_phrases.sql
-- ============================================
-- User-customized normality phrases per anatomical section and modality.
-- Overrides the hardcoded defaults in src/lib/normality-defaults.ts.

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

create policy "user manages own normality_phrases" on public.normality_phrases
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================
-- Migration: 004_admin_roles.sql
-- ============================================
-- Add role column to profiles
alter table public.profiles
  add column if not exists role text not null default 'radiologist'
  check (role in ('admin', 'radiologist'));

-- Global model config (singleton — one row for the whole platform)
create table if not exists public.global_model_config (
  id uuid primary key default gen_random_uuid(),
  provider text default 'deepseek' check (provider in ('claude','openai','deepseek','gemini','custom')),
  model_name text default 'deepseek-chat',
  api_key_encrypted text default '',
  custom_base_url text default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Only one row allowed
create unique index if not exists global_model_config_singleton
  on public.global_model_config ((true));

-- Seed the initial row
insert into public.global_model_config (id)
  values (gen_random_uuid())
  on conflict do nothing;

-- RLS
alter table public.global_model_config enable row level security;

create policy "Authenticated users can read global config"
  on public.global_model_config for select
  using (auth.role() = 'authenticated');

create policy "Only admin can update global config"
  on public.global_model_config for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Allow admin to see all profiles (for user management)
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own or admin views all"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Allow admin to read all reports (for stats)
drop policy if exists "Users can CRUD own reports" on public.reports;
create policy "Users or admin can read reports"
  on public.reports for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
create policy "Users can insert own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);
create policy "Users can update own reports"
  on public.reports for update
  using (auth.uid() = user_id);
create policy "Users can delete own reports"
  on public.reports for delete
  using (auth.uid() = user_id);


-- ============================================
-- Migration: 005_subscriptions.sql
-- ============================================
-- Subscription plans and usage tracking

-- Add subscription columns to profiles
alter table public.profiles
  add column if not exists subscription_plan text not null default 'free'
    check (subscription_plan in ('free', 'starter', 'professional')),
  add column if not exists reports_used_this_month integer not null default 0,
  add column if not exists billing_period_start timestamptz not null default now(),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- Index for subscription lookups
create index if not exists profiles_subscription_idx on public.profiles (subscription_plan);
create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id) where stripe_customer_id is not null;

-- Function to reset monthly usage when billing period rolls over
create or replace function public.check_and_reset_billing_period()
returns trigger as $$
begin
  if new.billing_period_start + interval '1 month' <= now() then
    new.reports_used_this_month := 0;
    new.billing_period_start := now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger check_billing_period
  before update on public.profiles
  for each row execute procedure public.check_and_reset_billing_period();

-- Atomic increment function for report usage
create or replace function public.increment_report_usage(uid uuid)
returns void as $$
begin
  update public.profiles
  set reports_used_this_month = reports_used_this_month + 1
  where id = uid;
end;
$$ language plpgsql security definer;


-- ============================================
-- Migration: 006_admin_user_setup.sql
-- ============================================
-- Promote admin user and exempt from subscription limits

-- Set jose_miguel2552@hotmail.com as admin
update public.profiles
set role = 'admin', subscription_plan = 'professional'
where email = 'jose_miguel2552@hotmail.com';

-- Admin users bypass report limits — handled in application code
-- (admin role check in auth-helpers.ts)


-- ============================================
-- Migration: 007_global_templates.sql
-- ============================================
-- Global templates: admin-managed, visible to all users.
-- Users see these plus their own custom templates in user_templates.

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

create policy "Authenticated users can read global templates"
  on public.global_templates for select
  using (auth.role() = 'authenticated');

create policy "Authenticated can insert global templates"
  on public.global_templates for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated can update global templates"
  on public.global_templates for update
  using (auth.role() = 'authenticated');

create policy "Authenticated can delete global templates"
  on public.global_templates for delete
  using (auth.role() = 'authenticated');

-- Remove old default templates from all users (they will now come from global_templates)
delete from public.user_templates where is_default = true;


-- ============================================
-- Migration: 008_whisper_api_key.sql
-- ============================================
-- Add dedicated Whisper API key to global config (independent of text generation provider)
alter table public.global_model_config
  add column if not exists whisper_api_key_encrypted text default '';


-- ============================================
-- Migration: 009_dictation_limits.sql
-- ============================================
-- Voice dictation usage tracking (seconds used per billing period)

alter table public.profiles
  add column if not exists dictation_seconds_used integer not null default 0;

-- Atomic increment function for dictation seconds
create or replace function public.increment_dictation_seconds(uid uuid, seconds integer)
returns void as $$
begin
  update public.profiles
  set dictation_seconds_used = dictation_seconds_used + seconds
  where id = uid;
end;
$$ language plpgsql security definer;

-- Update the billing period reset trigger to also reset dictation seconds
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


-- ============================================
-- Migration: 010_compact_normals.sql
-- ============================================
-- Add compact_normals option to user_model_config
alter table public.user_model_config
  add column if not exists compact_normals boolean default false;


-- ============================================
-- Migration: 011_per_task_models.sql
-- ============================================
-- Per-task model overrides in global config
-- Allows admin to assign different models to findings, conclusion, recommendations, trace
alter table public.global_model_config
  add column if not exists findings_provider text,
  add column if not exists findings_model text,
  add column if not exists conclusion_provider text,
  add column if not exists conclusion_model text,
  add column if not exists recommendations_provider text,
  add column if not exists recommendations_model text,
  add column if not exists trace_provider text,
  add column if not exists trace_model text;


-- ============================================
-- Migration: 012_provider_api_keys.sql
-- ============================================
-- Per-provider API keys so different providers can be used for different tasks
ALTER TABLE public.global_model_config
  ADD COLUMN IF NOT EXISTS anthropic_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS google_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS deepseek_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS custom_api_key_encrypted text;


-- ============================================
-- Migration: 013_audit_logs.sql
-- ============================================
-- Audit log table — immutable, append-only event trail
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  action text not null check (action in (
    'generate_findings', 'generate_conclusion', 'save_report', 'report_error'
  )),
  provider text,
  model text,
  duration_ms int,
  had_corrections boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_idx
  on public.audit_logs (user_id, created_at desc);
create index if not exists audit_logs_report_idx
  on public.audit_logs (report_id) where report_id is not null;

alter table public.audit_logs enable row level security;
create policy "users read own audit_logs" on public.audit_logs
  for select using (auth.uid() = user_id);
create policy "users insert own audit_logs" on public.audit_logs
  for insert with check (auth.uid() = user_id);

-- Add generation metadata to reports table
alter table public.reports
  add column if not exists generation_duration_ms int,
  add column if not exists provider_used text,
  add column if not exists model_used text,
  add column if not exists had_corrections boolean default false,
  add column if not exists error_reported boolean default false,
  add column if not exists error_report_note text;


-- ============================================
-- Migration: 014_clinical_context.sql
-- ============================================
-- Add clinical_context column to reports for training data completeness
alter table public.reports
  add column if not exists clinical_context text default '';


-- ============================================
-- Migration: 015_signatures.sql
-- ============================================
-- Signatures table (per-user, multiple allowed, one active at a time)
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

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'signatures' and policyname = 'users manage own signatures'
  ) then
    create policy "users manage own signatures"
      on public.signatures for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


-- ============================================
-- Migration: 016_dictation_language.sql
-- ============================================
-- Add dictation_language to user_model_config
alter table public.user_model_config
  add column if not exists dictation_language text default 'auto';


-- ============================================
-- Migration: 017_admin_reports_access.sql
-- ============================================
-- Allow admin users to read ALL reports (not just their own) for training data & audit
-- This is a safety net: the admin API uses the service client which bypasses RLS,
-- but if SUPABASE_SERVICE_KEY is misconfigured, this policy ensures access.

-- Admin can read all reports
drop policy if exists "admins read all reports" on public.reports;
create policy "admins read all reports" on public.reports
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Admin can read all audit_logs
drop policy if exists "admins read all audit_logs" on public.audit_logs;
create policy "admins read all audit_logs" on public.audit_logs
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );


-- ============================================
-- Migration: 018_correction_logged_action.sql
-- ============================================
-- Allow 'correction_logged' action in audit_logs
-- Drop and recreate the check constraint to include the new action type
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check
  CHECK (action IN (
    'generate_findings', 'generate_conclusion', 'save_report', 'report_error', 'correction_logged'
  ));


-- ============================================
-- Migration: 019_hospital_multi_tenant.sql
-- ============================================
-- Hospital multi-tenant: organizations, sections, members, shared resources, support tickets
-- Individual subscriber model is untouched — all changes are additive.

-- ══════════════════════════════════════════════════════════════
-- 1. Organizations
-- ══════════════════════════════════════════════════════════════
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

create policy "admin full access on organizations"
  on public.organizations for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "org members read own org"
  on public.organizations for select
  using (exists (select 1 from public.org_members where org_id = organizations.id and user_id = auth.uid() and is_active = true));

-- ══════════════════════════════════════════════════════════════
-- 2. Sections within an organization
-- ══════════════════════════════════════════════════════════════
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

-- ══════════════════════════════════════════════════════════════
-- 3. Organization members
-- ══════════════════════════════════════════════════════════════
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

-- ══════════════════════════════════════════════════════════════
-- 4. Shared templates (per section)
-- ══════════════════════════════════════════════════════════════
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

create policy "org members read all org templates"
  on public.org_templates for select
  using (exists (
    select 1 from public.org_members where org_id = org_templates.org_id and user_id = auth.uid() and is_active = true
  ));

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

-- ══════════════════════════════════════════════════════════════
-- 5. Shared normality phrases (per section)
-- ══════════════════════════════════════════════════════════════
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

create policy "org members read org normality phrases"
  on public.org_normality_phrases for select
  using (exists (
    select 1 from public.org_members where org_id = org_normality_phrases.org_id and user_id = auth.uid() and is_active = true
  ));

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

-- ══════════════════════════════════════════════════════════════
-- 6. Shared recommendations (per section)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.org_recommendations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  section_id uuid not null references public.org_sections(id) on delete cascade,
  trigger_keyword text not null,
  recommendation_text text not null,
  source text default 'manual' check (source in ('manual', 'pdf_extracted')),
  guideline_name text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.org_recommendations enable row level security;

create policy "org members read org recommendations"
  on public.org_recommendations for select
  using (exists (
    select 1 from public.org_members where org_id = org_recommendations.org_id and user_id = auth.uid() and is_active = true
  ));

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

-- ══════════════════════════════════════════════════════════════
-- 7. Support tickets
-- ══════════════════════════════════════════════════════════════
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

-- ══════════════════════════════════════════════════════════════
-- 8. Helper functions for RLS
-- ══════════════════════════════════════════════════════════════

-- Check if a user can edit resources in a given section
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

-- Get a user's org membership (returns null if not in any org)
create or replace function public.get_user_org(uid uuid)
returns table (org_id uuid, section_id uuid, is_org_chief boolean, section_role text) as $$
  select org_id, section_id, is_org_chief, section_role
  from public.org_members
  where user_id = uid and is_active = true
  limit 1;
$$ language sql security definer stable;

-- ══════════════════════════════════════════════════════════════
-- 9. Denormalized org_id on profiles for fast billing bypass
-- ══════════════════════════════════════════════════════════════
alter table public.profiles
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

-- Trigger to keep profiles.org_id in sync with org_members
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

-- ══════════════════════════════════════════════════════════════
-- 10. Additive RLS on reports for supervisor read access
-- ══════════════════════════════════════════════════════════════
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

-- ══════════════════════════════════════════════════════════════
-- 11. Update 000_full_setup reference
-- ══════════════════════════════════════════════════════════════
-- No changes to 000_full_setup.sql needed. This migration is purely additive.
-- All existing tables, RLS policies, triggers, and functions remain untouched.


-- ============================================
-- Migration: 020_user_template_imports.sql
-- ============================================
-- User template imports: radiologists choose which org templates appear in their reporting module
-- Each user explicitly imports org templates from any section in their hospital.

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

create policy "users manage own imports"
  on public.user_template_imports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admin full access on user_template_imports"
  on public.user_template_imports for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


-- ============================================
-- Migration: 021_resident_plan.sql
-- ============================================
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


-- ============================================
-- Migration: 022_dictation_correction_models.sql
-- ============================================
-- Add configurable model overrides for dictation correction and improve writing
ALTER TABLE global_model_config
  ADD COLUMN IF NOT EXISTS dictation_correction_provider text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dictation_correction_model text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS improve_writing_provider text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS improve_writing_model text DEFAULT NULL;


-- ============================================
-- Migration: 023_conclusion_style.sql
-- ============================================
-- Conclusion style preference per user
ALTER TABLE user_model_config
  ADD COLUMN IF NOT EXISTS conclusion_style text DEFAULT 'grouped'
  CHECK (conclusion_style IN ('concise', 'grouped'));


-- ============================================
-- Migration: 024_recommendations_enabled.sql
-- ============================================
ALTER TABLE user_model_config
ADD COLUMN IF NOT EXISTS recommendations_enabled boolean DEFAULT true;


-- ============================================
-- Migration: 025_user_hidden_templates.sql
-- ============================================
-- Per-user hidden templates: allows users to hide global templates without deleting them
CREATE TABLE IF NOT EXISTS user_hidden_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  global_template_id uuid NOT NULL REFERENCES global_templates(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, global_template_id)
);

ALTER TABLE user_hidden_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hidden templates"
  ON user_hidden_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- Migration: 026_waitlist_and_approval.sql
-- ============================================
-- Waitlist table for pre-launch signups
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  country text NOT NULL,
  hospital text NOT NULL,
  role text NOT NULL CHECK (role IN ('attending', 'resident')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Approve gate on profiles: existing users are approved, new ones are not
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- Mark all existing profiles as approved
UPDATE profiles SET approved = true WHERE approved = false OR approved IS NULL;


-- ============================================
-- Migration: 20260507_audit_logs_cost_columns.sql
-- ============================================
-- Add cost tracking columns to audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS input_tokens INT DEFAULT 0;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS output_tokens INT DEFAULT 0;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS duration_ms INT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC DEFAULT 0;

-- Index for cost aggregation queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_cost_month
  ON audit_logs (created_at, estimated_cost_usd)
  WHERE estimated_cost_usd IS NOT NULL;


-- ============================================
-- Migration: 20260507_org_recommendations_update.sql
-- ============================================
-- Update org_recommendations to match the new schema (category, modality, title, text, tags)
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS category text DEFAULT 'all';
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS modality text DEFAULT 'all';
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS text text;
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Migrate old data if any exists (trigger_keyword → title, recommendation_text → text)
UPDATE public.org_recommendations
SET title = trigger_keyword, text = recommendation_text
WHERE title IS NULL AND trigger_keyword IS NOT NULL;

-- User imports table for org recommendations (same pattern as user_template_imports)
CREATE TABLE IF NOT EXISTS public.user_recommendation_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_recommendation_id uuid NOT NULL REFERENCES public.org_recommendations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_recommendation_id)
);

ALTER TABLE public.user_recommendation_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own recommendation imports"
  ON public.user_recommendation_imports FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "admin full access on user_recommendation_imports"
  ON public.user_recommendation_imports FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ============================================
-- Migration: 20260508_pending_plan.sql
-- ============================================
-- Add pending plan for deferred subscription changes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_plan text,
  ADD COLUMN IF NOT EXISTS pending_plan_effective_date timestamptz;


