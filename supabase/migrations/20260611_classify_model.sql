-- Add configurable model override for classification/staging and chatbot tasks
ALTER TABLE global_model_config
  ADD COLUMN IF NOT EXISTS classify_provider text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS classify_model text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS chatbot_provider text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS chatbot_model text DEFAULT NULL;
