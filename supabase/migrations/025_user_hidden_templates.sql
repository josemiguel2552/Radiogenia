-- Per-user hidden templates: allows users to hide global templates without deleting them
CREATE TABLE IF NOT EXISTS user_hidden_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  global_template_id uuid NOT NULL REFERENCES global_templates(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, global_template_id)
);

ALTER TABLE user_hidden_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hidden templates"
  ON user_hidden_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
