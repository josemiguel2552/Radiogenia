-- Allow admin users to read ALL reports (not just their own) for training data & audit
-- This is a safety net: the admin API uses the service client which bypasses RLS,
-- but if SUPABASE_SERVICE_KEY is misconfigured, this policy ensures access.

-- Admin can read all reports
create policy "admins read all reports" on public.reports
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Admin can read all audit_logs
create policy "admins read all audit_logs" on public.audit_logs
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
