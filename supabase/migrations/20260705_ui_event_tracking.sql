-- UI event tracking: allow lightweight product-analytics events in audit_logs.
-- Any action prefixed "ui_" is accepted, so adding new tracked buttons/tools
-- does not require a migration. The API route keeps its own whitelist.
--
-- Robust version: the action CHECK may exist under different auto-generated
-- names depending on which setup script created the table, so drop ALL check
-- constraints on the table before adding the definitive one.

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.audit_logs'::regclass and contype = 'c'
  loop
    execute format('alter table public.audit_logs drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.audit_logs add constraint audit_logs_action_check
  check (
    action in (
      'generate_findings', 'generate_conclusion', 'save_report', 'report_error', 'correction_logged'
    )
    or action like 'ui\_%'
  );
