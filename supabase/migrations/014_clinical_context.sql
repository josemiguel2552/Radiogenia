-- Add clinical_context column to reports for training data completeness
alter table public.reports
  add column if not exists clinical_context text default '';
