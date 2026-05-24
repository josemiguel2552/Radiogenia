-- CLEANUP: Remove all demo pilot data created by 20260524_pilot_demo_data.sql
-- Run this when the demo is no longer needed.

-- 1. Remove NPS surveys
DELETE FROM public.pilot_nps_surveys
WHERE org_id = 'demo-pilot-org-001';

-- 2. Remove report metrics
DELETE FROM public.report_metrics
WHERE org_id = 'demo-pilot-org-001';

-- 3. Remove org memberships
DELETE FROM public.org_members
WHERE org_id = 'demo-pilot-org-001';

-- 4. Remove profiles
DELETE FROM public.profiles
WHERE id IN (
  'demo-user-001','demo-user-002','demo-user-003','demo-user-004','demo-user-005',
  'demo-user-006','demo-user-007','demo-user-008','demo-user-009','demo-user-010'
);

-- 5. Remove organization
DELETE FROM public.organizations
WHERE id = 'demo-pilot-org-001';
