-- Subscription plans and usage tracking

-- Add subscription columns to profiles
alter table public.profiles
  add column if not exists subscription_plan text not null default 'free'
    check (subscription_plan in ('free', 'starter', 'professional')),
  add column if not exists reports_used_this_month integer not null default 0,
  add column if not exists billing_period_start timestamptz not null default now(),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- Index for subscription lookups
create index if not exists profiles_subscription_idx on public.profiles (subscription_plan);
create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id) where stripe_customer_id is not null;

-- Function to reset monthly usage when billing period rolls over
create or replace function public.check_and_reset_billing_period()
returns trigger as $$
begin
  if new.billing_period_start + interval '1 month' <= now() then
    new.reports_used_this_month := 0;
    new.billing_period_start := now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger check_billing_period
  before update on public.profiles
  for each row execute procedure public.check_and_reset_billing_period();

-- Atomic increment function for report usage
create or replace function public.increment_report_usage(uid uuid)
returns void as $$
begin
  update public.profiles
  set reports_used_this_month = reports_used_this_month + 1
  where id = uid;
end;
$$ language plpgsql security definer;
