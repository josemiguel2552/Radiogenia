-- Update org_recommendations to match the new schema (category, modality, title, text, tags)
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS category text DEFAULT 'all';
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS modality text DEFAULT 'all';
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS text text;
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);
ALTER TABLE public.org_recommendations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Migrate old data if any exists (trigger_keyword → title, recommendation_text → text)
UPDATE public.org_recommendations
SET title = trigger_keyword, text = recommendation_text
WHERE title IS NULL AND trigger_keyword IS NOT NULL;

-- User imports table for org recommendations (same pattern as user_template_imports)
CREATE TABLE IF NOT EXISTS public.user_recommendation_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_recommendation_id uuid NOT NULL REFERENCES public.org_recommendations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_recommendation_id)
);

ALTER TABLE public.user_recommendation_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own recommendation imports"
  ON public.user_recommendation_imports FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "admin full access on user_recommendation_imports"
  ON public.user_recommendation_imports FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
