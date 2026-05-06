ALTER TABLE user_model_config
ADD COLUMN IF NOT EXISTS recommendations_enabled boolean DEFAULT true;
