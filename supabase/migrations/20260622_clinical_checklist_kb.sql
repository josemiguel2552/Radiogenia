-- Add clinical checklist knowledge base column to global_model_config
ALTER TABLE global_model_config
  ADD COLUMN IF NOT EXISTS clinical_checklist_kb text DEFAULT '';
