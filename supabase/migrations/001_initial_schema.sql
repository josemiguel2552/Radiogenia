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
  style_learning_enabled boolean default false,
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
