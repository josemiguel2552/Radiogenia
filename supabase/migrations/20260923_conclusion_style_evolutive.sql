-- The second conclusion style becomes 'evolutive': ordered by what changed
-- against the prior study, replacing the ultra-short single paragraph.
--
-- Everyone on the previous occupant of that slot ('brief', and 'grouped' or
-- 'detailed' before it) moves to the new one, which is what the UI now offers
-- in its place. The concise style is untouched.
--
-- Safe to run twice: the constraint is dropped by name before being recreated,
-- and the UPDATE matches nothing once it has run.

ALTER TABLE user_model_config
  DROP CONSTRAINT IF EXISTS user_model_config_conclusion_style_check;

UPDATE user_model_config
  SET conclusion_style = 'evolutive'
  WHERE conclusion_style IS DISTINCT FROM 'concise';

ALTER TABLE user_model_config
  ALTER COLUMN conclusion_style SET DEFAULT 'evolutive';

ALTER TABLE user_model_config
  ADD CONSTRAINT user_model_config_conclusion_style_check
  CHECK (conclusion_style IN ('concise', 'evolutive'));
