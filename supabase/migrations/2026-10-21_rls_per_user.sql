-- ==============================================================================
-- TaxVault security hardening, part 2: per-user Row Level Security
-- Run in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- APPLY ORDER (see supabase/migrations/README.md):
--   1. 2026-10-21_security_hardening.sql (drops reset_password_for_email)
--   2. Deploy the server + app build that sends `Authorization: Bearer <token>` and has
--      SUPABASE_SERVICE_ROLE_KEY set on the server. The server then reads/writes with the
--      service role (which bypasses RLS) scoped to the verified user.
--   3. This file.
-- Applying this before step 2 makes the old server (anon key, no user context) see no rows.
--
-- Ownership model:
--   profiles.id                         = auth.uid()  (Supabase auth user id, as text)
--   expenses.customer_tax_id            = auth.uid()
--   every other user table's user_id    = auth.uid()
-- Rows owned by anything else (old demo ids like 'usr_in_8821', tax numbers, NULL) stay in the
-- database but are only visible to the service role.
--
-- Safe to re-run.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ownership columns
-- ------------------------------------------------------------------------------
-- incomes had no owner column at all; existing income rows cannot be attributed and become
-- invisible to app users (they remain in the table for the service role).
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Default the owner to the caller, so direct inserts from a signed-in client are owned by them
-- even if the client forgets to send the column. The server always sets it explicitly.
ALTER TABLE public.expenses ALTER COLUMN customer_tax_id SET DEFAULT (auth.uid())::text;
ALTER TABLE public.incomes ALTER COLUMN user_id SET DEFAULT (auth.uid())::text;
ALTER TABLE public.mileage_trips ALTER COLUMN user_id SET DEFAULT (auth.uid())::text;
ALTER TABLE public.client_invoices ALTER COLUMN user_id SET DEFAULT (auth.uid())::text;
ALTER TABLE public.bank_transactions ALTER COLUMN user_id SET DEFAULT (auth.uid())::text;
ALTER TABLE public.activity_logs ALTER COLUMN user_id SET DEFAULT (auth.uid())::text;

CREATE INDEX IF NOT EXISTS idx_expenses_customer_tax_id ON public.expenses(customer_tax_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user ON public.incomes(user_id);

-- ------------------------------------------------------------------------------
-- 2. Enable RLS and drop EVERY existing policy on the app tables
-- ------------------------------------------------------------------------------
-- Permissive policies are OR'ed together, so a single leftover `USING (true)` policy (under
-- any name) would keep the table public. Drop them all, then recreate only owner policies.
DO $$
DECLARE
  t TEXT;
  p RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'expenses', 'incomes', 'subscription_plans', 'customer_subscriptions',
    'subscription_transactions', 'customer_usage', 'token_request_logs', 'activity_logs',
    'mileage_trips', 'client_invoices', 'bank_transactions', 'country_terms', 'customer_agreements'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Owner policies (signed-in users only; the anon role gets no policy = no rows)
--    `(select auth.uid())` is evaluated once per statement instead of once per row.
-- ------------------------------------------------------------------------------
CREATE POLICY "Owner access to profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (id = (SELECT auth.uid())::text)
  WITH CHECK (id = (SELECT auth.uid())::text);

CREATE POLICY "Owner access to expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (customer_tax_id = (SELECT auth.uid())::text)
  WITH CHECK (customer_tax_id = (SELECT auth.uid())::text);

CREATE POLICY "Owner access to incomes" ON public.incomes
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())::text)
  WITH CHECK (user_id = (SELECT auth.uid())::text);

CREATE POLICY "Owner access to mileage trips" ON public.mileage_trips
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())::text)
  WITH CHECK (user_id = (SELECT auth.uid())::text);

CREATE POLICY "Owner access to client invoices" ON public.client_invoices
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())::text)
  WITH CHECK (user_id = (SELECT auth.uid())::text);

CREATE POLICY "Owner access to bank transactions" ON public.bank_transactions
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())::text)
  WITH CHECK (user_id = (SELECT auth.uid())::text);

-- Plan, payments and scan quota: owners can only READ. The server writes them with the service
-- role after verifying a Razorpay payment / counting an AI scan, so a user cannot grant
-- themselves a paid plan or reset their quota.
CREATE POLICY "Owner read customer subscriptions" ON public.customer_subscriptions
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner read customer usage" ON public.customer_usage
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner read subscription transactions" ON public.subscription_transactions
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid())::text);

-- profiles.subscription is a display copy that owners can edit; the server never trusts it.
-- Its old default claimed every new profile was on "pro".
ALTER TABLE public.profiles ALTER COLUMN subscription SET DEFAULT '{"tier":"free","billingCycle":"monthly","status":"active","receiptsScannedThisMonth":0,"monthlyReceiptLimit":10}'::jsonb;

-- Before this change the app wrote its own plan rows, with no verified payment. Reset every paid
-- plan the server did not record itself (the server sets payment_method = 'razorpay' only after
-- verifying a Razorpay payment). The previous plan is kept in metadata. Safe to re-run: verified
-- plans are never touched.
UPDATE public.customer_subscriptions
SET plan_id = 'free',
    current_period_end = NULL,
    cancel_at_period_end = FALSE,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'reset_reason', 'unverified plan reset by 2026-10-21_rls_per_user.sql',
      'previous_plan_id', plan_id,
      'reset_at', NOW()
    ),
    updated_at = NOW()
WHERE plan_id <> 'free' AND payment_method IS DISTINCT FROM 'razorpay';

-- Ledgers / audit trails: owners can read and append, never edit or delete.

CREATE POLICY "Owner read token request logs" ON public.token_request_logs
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner insert token request logs" ON public.token_request_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid())::text);

CREATE POLICY "Owner read activity logs" ON public.activity_logs
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner insert activity logs" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid())::text);

-- Subscription plans: public catalogue, read-only for everyone (written by the service role).
CREATE POLICY "Public read subscription plans" ON public.subscription_plans
  FOR SELECT TO anon, authenticated USING (true);

DO $$
BEGIN
  -- Country terms: public read-only (edited through the server with the service role).
  IF to_regclass('public.country_terms') IS NOT NULL THEN
    CREATE POLICY "Public read country terms" ON public.country_terms
      FOR SELECT TO anon, authenticated USING (true);
  END IF;

  -- Consent records hold emails, IPs and user agents. Owners can read theirs and record new
  -- ones for themselves; anonymous sign-up consent is recorded by the server.
  IF to_regclass('public.customer_agreements') IS NOT NULL THEN
    CREATE POLICY "Owner read customer agreements" ON public.customer_agreements
      FOR SELECT TO authenticated
      USING (
        user_id = (SELECT auth.uid())::text
        OR lower(user_email) = lower((SELECT auth.jwt() ->> 'email'))
      );
    CREATE POLICY "Owner insert customer agreements" ON public.customer_agreements
      FOR INSERT TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid())::text);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. Functions
-- ------------------------------------------------------------------------------
-- The expense audit trigger writes activity_logs rows (sometimes with user_id NULL, e.g. on
-- delete) that the caller's own RLS policies would reject. Run it as its owner so audit logging
-- keeps working. Trigger functions cannot be called through the REST API.
-- (Databases created from the in-app SQL have no audit trigger, so this is skipped there.)
DO $$
BEGIN
  IF to_regprocedure('public.fn_log_expense_activity()') IS NOT NULL THEN
    ALTER FUNCTION public.fn_log_expense_activity() SECURITY DEFINER SET search_path = public, pg_temp;
    -- Firing a trigger needs no EXECUTE grant, so no client role needs one.
    REVOKE EXECUTE ON FUNCTION public.fn_log_expense_activity() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- record_activity_log / record_token_usage take a p_user_id argument. As SECURITY DEFINER and
-- callable by anon they let anyone forge log and usage rows for any user. Make them run with
-- the caller's rights (so RLS applies: a user can only log for themselves) and remove anon.
-- record_token_usage also bumps customer_usage (the scan quota), so it is server-only.
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('record_activity_log', 'record_token_usage')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', f.sig);
    IF f.proname = 'record_token_usage' THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    ELSE
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
    END IF;
  END LOOP;
END $$;

-- Any other SECURITY DEFINER function in `public` bypasses RLS for whoever can call it over
-- /rest/v1/rpc. None is needed by the app, so take it away from client roles and report it.
-- (Trigger functions are skipped: they cannot be called via RPC and need no EXECUTE grant to fire.)
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype <> 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    RAISE NOTICE 'Revoked client EXECUTE on SECURITY DEFINER function %', f.sig;
  END LOOP;
END $$;

-- New functions in `public` should not be callable by anon unless granted explicitly.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

-- ------------------------------------------------------------------------------
-- 5. Verify (run after applying; expected results in comments)
-- ------------------------------------------------------------------------------
-- No policy may be `USING (true)` except the two public catalogues:
--   SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;
--   -> only "Public read subscription plans" and "Public read country terms" have qual = 'true'.
-- No SECURITY DEFINER function callable by anon:
--   SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE');
--   -> 0 rows.
