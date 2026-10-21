-- ==============================================================================
-- TaxVault security hardening, part 1 (safe to apply immediately)
-- Run in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- ==============================================================================

-- reset_password_for_email(target_email, new_plain_password) was SECURITY DEFINER and
-- granted to `anon`. Because the anon key ships inside the app, anyone could call
--   POST /rest/v1/rpc/reset_password_for_email
-- and set a new password for ANY registered email address (full account takeover).
--
-- Passwords are now changed only through Supabase's emailed recovery link, which creates
-- an authenticated session (supabase.auth.updateUser), or through the TaxVault server,
-- which verifies that session token first. Nothing in the app calls this function any more.

-- Drops every version of the function, whatever its argument list, and does nothing if there is
-- none (some databases never had it, or have it under a different signature).
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'reset_password_for_email'
  LOOP
    EXECUTE format('DROP FUNCTION %s', f.sig);
    RAISE NOTICE 'Dropped %', f.sig;
  END LOOP;
END $$;

-- ==============================================================================
-- Part 2 (NOT included here): Row Level Security
-- Every table currently has a policy `FOR ALL TO anon, authenticated USING (true)`,
-- so anyone holding the public anon key can read, edit or delete every user's data.
-- Locking this down requires the server to query as the signed-in user (or with the
-- service role after verifying the user's token). Applying strict policies before that
-- server change would break the app, so it is tracked as a separate change.
-- ==============================================================================
