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
