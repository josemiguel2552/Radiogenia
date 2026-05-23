-- Pilot metrics system: tracks report timing, adoption, edit rate, and NPS survey.

-- Mark organizations as pilot programs
alter table public.organizations
  add column if not exists is_pilot boolean not null default false;

-- Report-level metrics for clinical validation
create table if not exists public.report_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  report_start_at timestamptz,
  report_end_at timestamptz,
  duration_seconds numeric,
  dictation_chars integer default 0,
  manual_chars integer default 0,
  total_chars integer default 0,
  template_sections_total integer default 0,
  template_sections_filled integer default 0,
  ai_draft_length integer default 0,
  final_length integer default 0,
  edit_distance integer default 0,
  created_at timestamptz not null default now()
);

create index if not exists report_metrics_user_idx on public.report_metrics (user_id, created_at desc);
create index if not exists report_metrics_org_idx on public.report_metrics (org_id, created_at desc);

alter table public.report_metrics enable row level security;

create policy "Users can view own metrics"
  on public.report_metrics for select
  using (auth.uid() = user_id);

create policy "Users can insert own metrics"
  on public.report_metrics for insert
  with check (auth.uid() = user_id);

create policy "Users can update own metrics"
  on public.report_metrics for update
  using (auth.uid() = user_id);

create policy "Admin can view all metrics"
  on public.report_metrics for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- NPS survey responses (one per user)
create table if not exists public.pilot_survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  score integer not null check (score >= 1 and score <= 5),
  feedback_text text default '',
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.pilot_survey_responses enable row level security;

create policy "Users can view own survey"
  on public.pilot_survey_responses for select
  using (auth.uid() = user_id);

create policy "Users can insert own survey"
  on public.pilot_survey_responses for insert
  with check (auth.uid() = user_id);

create policy "Admin can view all surveys"
  on public.pilot_survey_responses for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
