-- Add dictation_language to user_model_config
alter table public.user_model_config
  add column if not exists dictation_language text default 'auto';
