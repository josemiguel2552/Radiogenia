-- Add OpenRouter as a supported AI provider
ALTER TABLE public.global_model_config
  ADD COLUMN IF NOT EXISTS openrouter_api_key_encrypted text;
