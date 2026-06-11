-- Add configurable model override for classification/staging task
ALTER TABLE global_model_config
  ADD COLUMN IF NOT EXISTS classify_provider text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS classify_model text DEFAULT NULL;
