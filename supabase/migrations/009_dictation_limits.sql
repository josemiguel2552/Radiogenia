-- Voice dictation usage tracking (seconds used per billing period)

alter table public.profiles
  add column if not exists dictation_seconds_used integer not null default 0;

-- Atomic increment function for dictation seconds
create or replace function public.increment_dictation_seconds(uid uuid, seconds integer)
returns void as $$
begin
  update public.profiles
  set dictation_seconds_used = dictation_seconds_used + seconds
  where id = uid;
end;
$$ language plpgsql security definer;

-- Update the billing period reset trigger to also reset dictation seconds
create or replace function public.check_and_reset_billing_period()
returns trigger as $$
begin
  if new.billing_period_start + interval '1 month' <= now() then
    new.reports_used_this_month := 0;
    new.dictation_seconds_used := 0;
    new.billing_period_start := now();
  end if;
  return new;
end;
$$ language plpgsql;
