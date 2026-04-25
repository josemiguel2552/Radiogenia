-- Add dedicated Whisper API key to global config (independent of text generation provider)
alter table public.global_model_config
  add column if not exists whisper_api_key_encrypted text default '';
