# Supabase migrations

Run each file in the Supabase dashboard: **SQL Editor → New query → paste → Run**, in this order.

| # | File | What it does | Safe to run before the new app/server is deployed? |
|---|------|--------------|------------------------------|
| 1 | `2026-10-21_security_hardening.sql` | Drops `reset_password_for_email` (anyone with the anon key could reset any account's password). | Yes |
| 2 | — | **Deploy the server and app** from the commit that adds `authedFetch` / `requireUser`. Set `SUPABASE_SERVICE_ROLE_KEY` in the server's environment (never in the app). | — |
| 3 | `2026-10-21_rls_per_user.sql` | Replaces every `USING (true)` policy with per-user owner policies, adds `incomes.user_id`, locks down `SECURITY DEFINER` / logging functions. | **No.** Run it only after step 2. |

Step 3 before step 2 breaks the old server: it queries with the anon key and no user context,
so it would see no rows. After step 2 the server verifies the caller's Supabase access token
and uses the service role scoped to that user, so it works with or without step 3. Step 3
then closes the direct `/rest/v1` hole: anyone holding the anon key from the app bundle.

## Ownership model

| Table | Owner column | Policy |
|-------|--------------|--------|
| `profiles` | `id` | `id = auth.uid()` — the Supabase auth user id *is* the profile id |
| `expenses` | `customer_tax_id` | `customer_tax_id = auth.uid()` (GST/tax numbers live in `customer_gstin`) |
| `incomes`, `mileage_trips`, `client_invoices`, `bank_transactions`, `customer_subscriptions`, `customer_usage` | `user_id` | owner: all operations |
| `subscription_transactions`, `token_request_logs`, `activity_logs` | `user_id` | owner: read + insert only (append-only ledgers) |
| `customer_agreements` | `user_id` / `user_email` | owner: read own; insert own. Anonymous sign-up consent is written by the server |
| `subscription_plans`, `country_terms` | — | everyone can read; only the service role writes |

Owner columns default to `auth.uid()`, so a signed-in client's inserts are owned by it automatically.

## Demo accounts

The "Instant Demo Accounts" on the sign-in screen (`usr_in_8821`, `usr_nz_101`, …) have no
Supabase auth user and no session. They are **on-device demo mode**: the server answers their
data requests with `401`, the app skips direct Supabase calls without a session, and everything
(including "Load Demo / Sample Receipts") lives in the device's local storage. They never read or
write cloud rows. Real Supabase demo users were rejected: their password would have to ship in
the app, making that account's data public anyway.

## Existing data after step 3

Rows not owned by a real auth user stay in the database but are only visible to the service role:

- expenses whose `customer_tax_id` is a demo id (`usr_…`), a tax number, or `NULL`
- all `incomes` rows created before step 3 (the table had no owner column)
- profiles whose `id` is not an auth user id (e.g. created by sign-up without a returned user)

To hand one to a user, set its owner column to that user's id from **Authentication → Users**,
e.g. `UPDATE public.incomes SET user_id = '<uuid>' WHERE id IN (...);`

## Verify after applying step 3

```sql
-- Only the two public catalogues may have USING (true):
SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;

-- Must return 0 rows:
SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE');
```

And from a terminal, with the anon key from the app (expect `[]`):

```bash
curl "$SUPABASE_URL/rest/v1/expenses?select=id&limit=5" -H "apikey: $ANON_KEY"
```
