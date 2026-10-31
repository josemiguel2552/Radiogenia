-- Fine-tuning jobs we have launched, so they are visible from any device.
--
-- The provider's own list endpoint is the other record, but it could not be
-- read reliably: a job that exists and cannot be listed looks exactly like no
-- job at all, and that is how a queued run disappeared from the panel after a
-- refresh. Keeping the ids here means the panel can always ask after a job by
-- id, whatever the list does.
--
-- Admin-only: written and read through the service client behind
-- requireAdmin(), never from the browser. RLS is on with no policy, so a user
-- token cannot reach it even if the table name is guessed.
create table if not exists public.finetune_jobs (
  id uuid primary key default gen_random_uuid(),
  -- "openai" | "together"
  provider text not null,
  -- The provider's own job id.
  job_id text not null,
  base_model text,
  -- Last status we saw, normalised: queued | running | succeeded | failed |
  -- cancelled | unknown. A cache of the provider's answer, not the truth.
  status text not null default 'queued',
  -- The model name to use once it is ready.
  fine_tuned_model text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, job_id)
);

create index if not exists finetune_jobs_provider_idx
  on public.finetune_jobs (provider, created_at desc);

alter table public.finetune_jobs enable row level security;
