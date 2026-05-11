-- Conclusion style preference per user
ALTER TABLE user_model_config
  ADD COLUMN IF NOT EXISTS conclusion_style text DEFAULT 'grouped'
  CHECK (conclusion_style IN ('concise', 'grouped'));
