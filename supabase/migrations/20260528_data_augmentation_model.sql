-- Add configurable model override for data augmentation task
ALTER TABLE global_model_config
  ADD COLUMN IF NOT EXISTS data_augmentation_provider text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data_augmentation_model text DEFAULT NULL;
