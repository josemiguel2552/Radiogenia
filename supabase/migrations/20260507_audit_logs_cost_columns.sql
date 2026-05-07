-- Add cost tracking columns to audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS input_tokens INT DEFAULT 0;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS output_tokens INT DEFAULT 0;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS duration_ms INT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC DEFAULT 0;

-- Index for cost aggregation queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_cost_month
  ON audit_logs (created_at, estimated_cost_usd)
  WHERE estimated_cost_usd IS NOT NULL;
