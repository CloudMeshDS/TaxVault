-- ==============================================================================
-- Remove the built-in app PIN (safe to apply any time)
-- Run in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- ==============================================================================

-- Every profile used to get app_pin '1234' by default, and the lock screen even showed it.
-- The app now has no default PIN: the lock only turns on once the user chooses one.
ALTER TABLE public.profiles ALTER COLUMN app_pin DROP DEFAULT;

-- Profiles that never turned the lock on don't need the placeholder PIN stored
UPDATE public.profiles
SET app_pin = NULL
WHERE app_pin = '1234' AND COALESCE(biometric_lock, false) = false;
