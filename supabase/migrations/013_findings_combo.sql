-- Enable the GPT-4 Mini + DeepSeek Reasoner combo pipeline for findings
alter table public.global_model_config
  add column if not exists findings_combo_enabled boolean not null default false;
