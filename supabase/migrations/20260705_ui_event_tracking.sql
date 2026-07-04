-- UI event tracking: allow lightweight product-analytics events in audit_logs.
-- Any action prefixed "ui_" is accepted, so adding new tracked buttons/tools
-- does not require a migration. The API route keeps its own whitelist.

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check
  CHECK (
    action IN (
      'generate_findings', 'generate_conclusion', 'save_report', 'report_error', 'correction_logged'
    )
    OR action LIKE 'ui\_%'
  );
