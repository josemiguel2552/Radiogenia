-- Add text columns to report_metrics to store original AI output and final edited text.
-- This enables side-by-side comparison of AI draft vs radiologist corrections in pilot reviews.

alter table public.report_metrics
  add column if not exists ai_findings_text text default '',
  add column if not exists final_findings_text text default '',
  add column if not exists ai_conclusion_text text default '',
  add column if not exists final_conclusion_text text default '',
  add column if not exists recommendations_text text default '',
  add column if not exists study_type text default '';
