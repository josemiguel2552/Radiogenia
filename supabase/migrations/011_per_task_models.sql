-- Per-task model overrides in global config
-- Allows admin to assign different models to findings, conclusion, recommendations, trace
alter table public.global_model_config
  add column if not exists findings_provider text,
  add column if not exists findings_model text,
  add column if not exists conclusion_provider text,
  add column if not exists conclusion_model text,
  add column if not exists recommendations_provider text,
  add column if not exists recommendations_model text,
  add column if not exists trace_provider text,
  add column if not exists trace_model text;
