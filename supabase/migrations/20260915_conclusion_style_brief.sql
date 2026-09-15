-- The "integrated" conclusion style (stored as 'grouped') is replaced by
-- 'brief': a single ultra-short paragraph instead of several paragraph-length
-- points. Everyone who was on the integrated style moves to it, since it is
-- the style that took its place in the UI.
--
-- Safe to run twice: the constraint is dropped by name before being recreated,
-- and the UPDATE matches nothing once it has run.

ALTER TABLE user_model_config
  DROP CONSTRAINT IF EXISTS user_model_config_conclusion_style_check;

UPDATE user_model_config
  SET conclusion_style = 'brief'
  WHERE conclusion_style IS DISTINCT FROM 'concise';

ALTER TABLE user_model_config
  ALTER COLUMN conclusion_style SET DEFAULT 'brief';

ALTER TABLE user_model_config
  ADD CONSTRAINT user_model_config_conclusion_style_check
  CHECK (conclusion_style IN ('concise', 'brief'));
