-- Add pending plan for deferred subscription changes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_plan text,
  ADD COLUMN IF NOT EXISTS pending_plan_effective_date timestamptz;
