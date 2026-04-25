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
