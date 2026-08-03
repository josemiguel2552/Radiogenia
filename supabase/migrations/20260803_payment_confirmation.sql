-- Payment confirmation for the admin panel: stamp every successful
-- subscription charge so the owner can see, per user, that the money was
-- actually collected (and how much) without opening Stripe.

alter table public.profiles add column if not exists last_payment_at timestamptz;
alter table public.profiles add column if not exists last_payment_amount numeric(10,2);

comment on column public.profiles.last_payment_at is 'When the last subscription invoice was successfully paid';
comment on column public.profiles.last_payment_amount is 'Amount of the last successfully paid invoice, in the invoice currency';
