-- The second conclusion style becomes 'detailed': the reasoned one, which
-- reads the clinical context and the findings together and relates them,
-- replacing 'evolutive' (ordered by what changed against the prior study).
--
-- Everyone on any previous occupant of that slot ('evolutive', and 'brief' or
-- 'grouped'/'detailed' before it) moves to the new one, which is what the UI
-- now offers in its place. The concise style is untouched.
--
-- Safe to run twice: the constraint is dropped by name before being recreated,
-- and the UPDATE matches nothing once it has run.

ALTER TABLE user_model_config
  DROP CONSTRAINT IF EXISTS user_model_config_conclusion_style_check;

UPDATE user_model_config
  SET conclusion_style = 'detailed'
  WHERE conclusion_style IS DISTINCT FROM 'concise';

ALTER TABLE user_model_config
  ALTER COLUMN conclusion_style SET DEFAULT 'detailed';

ALTER TABLE user_model_config
  ADD CONSTRAINT user_model_config_conclusion_style_check
  CHECK (conclusion_style IN ('concise', 'detailed'));
