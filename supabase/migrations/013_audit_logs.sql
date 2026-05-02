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
