-- Per-task model override for the differential-diagnosis assistant.
--
-- This task is the one that sends images, so only a provider with a vision
-- API can serve it. The application refuses a provider without one rather
-- than answering about an image it never received; these columns just let an
-- admin point the task at a specific model.
--
-- Safe to run twice.

ALTER TABLE global_model_config
  ADD COLUMN IF NOT EXISTS differential_provider text,
  ADD COLUMN IF NOT EXISTS differential_model text;
