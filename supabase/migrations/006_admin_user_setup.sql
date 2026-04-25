-- Promote admin user and exempt from subscription limits

-- Set jose_miguel2552@hotmail.com as admin
update public.profiles
set role = 'admin', subscription_plan = 'professional'
where email = 'jose_miguel2552@hotmail.com';

-- Admin users bypass report limits — handled in application code
-- (admin role check in auth-helpers.ts)
