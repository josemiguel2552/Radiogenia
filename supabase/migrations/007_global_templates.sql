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
