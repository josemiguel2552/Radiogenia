-- Add staff_type to org_members to distinguish attending physicians from residents.

alter table public.org_members
  add column if not exists staff_type text not null default 'attending'
  check (staff_type in ('attending', 'resident'));
