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
