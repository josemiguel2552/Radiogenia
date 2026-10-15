-- Whether a hospital's radiologists may use voice dictation.
--
-- Some institutions buy the platform for structured reporting alone, and some
-- cannot allow microphone capture on their workstations at all. Until now
-- dictation came with every hospital seat and there was no way to withhold it.
--
-- Defaults to true so every hospital that already exists keeps working exactly
-- as it does today: switching it off has to be a deliberate act.
alter table public.organizations
  add column if not exists dictation_enabled boolean not null default true;

comment on column public.organizations.dictation_enabled is
  'When false, members of this organization cannot use voice dictation; the transcription endpoints refuse them and the interface hides the microphone.';
