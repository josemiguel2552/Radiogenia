-- Per-task model override for the conclusion fact-check pass: lets the
-- admin point the self-consistency verification (conclusion vs. findings)
-- at a cheap model, independent of whichever model drafts the conclusion.
alter table public.global_model_config
  add column if not exists conclusion_verify_provider text,
  add column if not exists conclusion_verify_model text;
