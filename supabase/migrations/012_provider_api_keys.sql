-- Per-provider API keys so different providers can be used for different tasks
ALTER TABLE public.global_model_config
  ADD COLUMN IF NOT EXISTS anthropic_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS google_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS deepseek_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS custom_api_key_encrypted text;
