-- CLEANUP: Remove all demo pilot data created by 20260524_pilot_demo_data.sql
-- Run this when the demo is no longer needed.

-- 1. Remove NPS surveys
DELETE FROM public.pilot_survey_responses
WHERE org_id = 'a0681e56-3187-41d7-a927-ef23940e7446';

-- 2. Remove report metrics
DELETE FROM public.report_metrics
WHERE org_id = 'a0681e56-3187-41d7-a927-ef23940e7446';

-- 3. Remove org memberships
DELETE FROM public.org_members
WHERE org_id = 'a0681e56-3187-41d7-a927-ef23940e7446';

-- 4. Remove profiles
DELETE FROM public.profiles
WHERE id IN (
  'a72aec60-f235-4460-95e5-597b4001a005',
  'c927101b-088e-43ff-b0dd-92f27a17ac95',
  'a1c15de8-e79c-4711-ab23-12b55b4ae4fa',
  '8c0a7b92-3f82-4245-a145-5583d52758e5',
  'bd44be01-0cb1-430c-971f-dfc8337a9b2a',
  '7894a952-3370-43ee-b35a-86320935f381',
  'ea881976-35f9-4355-a395-d2a6abc2f75c',
  '7ac930c2-0b05-4646-8504-d9fdae01cbf2',
  'c60032ac-a673-40bd-9be7-f8ce72158970',
  '71b61e0c-5467-45d2-ae09-0d1deb731fb7'
);

-- 5. Remove organization
DELETE FROM public.organizations
WHERE id = 'a0681e56-3187-41d7-a927-ef23940e7446';
