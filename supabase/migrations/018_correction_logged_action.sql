-- Allow 'correction_logged' action in audit_logs
-- Drop and recreate the check constraint to include the new action type
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check
  CHECK (action IN (
    'generate_findings', 'generate_conclusion', 'save_report', 'report_error', 'correction_logged'
  ));
