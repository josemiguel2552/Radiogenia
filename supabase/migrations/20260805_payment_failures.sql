-- Failed subscription charges: record the failure and the hosted invoice URL
-- so the owner can see who didn't pay, retry the charge from the admin panel,
-- and send the customer a direct payment link.

alter table public.profiles add column if not exists last_payment_failed_at timestamptz;
alter table public.profiles add column if not exists last_invoice_url text;

comment on column public.profiles.last_payment_failed_at is 'When the most recent subscription charge failed (cleared on a successful payment)';
comment on column public.profiles.last_invoice_url is 'Hosted Stripe invoice URL the customer can use to pay a failed charge';
