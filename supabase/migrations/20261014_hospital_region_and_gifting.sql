-- Two things an admin could not previously decide when creating a hospital.
--
-- 1. REGION. Which legal regime the hospital's radiologists fall under, and
--    therefore which feature set they get. Until now this was inferred from
--    each radiologist's own country, or failing that from the IP the signup
--    came through — so a hospital in Latin America whose members signed up
--    over a European edge got the EU documentation-only interface.
--    NULL keeps the old behaviour: infer per user.
--
-- 2. BILLING MODE. Whether the institution is buying seats or being given
--    them. A gifted hospital's onboarding link must not ask for payment.
--
-- Safe to run twice.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'paid';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_region_check'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_region_check
      CHECK (region IS NULL OR region IN ('eu', 'us', 'open'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_billing_mode_check'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_billing_mode_check
      CHECK (billing_mode IN ('paid', 'gifted'));
  END IF;
END $$;

-- The region a radiologist was given by the hospital that invited them.
-- Written only by server-side signup code, never by the user: it decides
-- which features the account may use, so it is not something an account
-- holder gets to set for themselves.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS region_override text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_region_override_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_region_override_check
      CHECK (region_override IS NULL OR region_override IN ('eu', 'us', 'open'));
  END IF;
END $$;
