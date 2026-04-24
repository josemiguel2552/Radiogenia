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
