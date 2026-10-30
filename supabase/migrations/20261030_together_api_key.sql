-- API key for Together AI, stored encrypted like every other provider key.
--
-- Added so a model fine-tuned there can be selected per task (findings,
-- conclusion, and the rest) without borrowing the single `custom` endpoint,
-- which can only point at one place at a time.
alter table public.global_model_config
  add column if not exists together_api_key_encrypted text;
