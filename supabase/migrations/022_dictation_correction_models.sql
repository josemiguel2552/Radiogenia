-- Add configurable model overrides for dictation correction and improve writing
ALTER TABLE global_model_config
  ADD COLUMN IF NOT EXISTS dictation_correction_provider text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dictation_correction_model text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS improve_writing_provider text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS improve_writing_model text DEFAULT NULL;
