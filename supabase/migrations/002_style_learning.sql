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
  kind text not null check (kind in ('normal_phrase', 'conclusion_phrase')),
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
