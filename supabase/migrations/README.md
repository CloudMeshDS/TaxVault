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
| `incomes`, `mileage_trips`, `client_invoices`, `bank_transactions` | `user_id` | owner: all operations |
| `customer_subscriptions`, `subscription_transactions`, `customer_usage` | `user_id` | owner: **read only**. The server writes them after verifying a payment / counting an AI scan |
| `token_request_logs`, `activity_logs` | `user_id` | owner: read + insert only (append-only ledgers) |
| `customer_agreements` | `user_id` / `user_email` | owner: read own; insert own. Anonymous sign-up consent is written by the server |
| `subscription_plans`, `country_terms` | — | everyone can read; only the service role writes |

Owner columns default to `auth.uid()`, so a signed-in client's inserts are owned by it automatically.

## Plans and scan quota

The server is the only source of truth for a user's plan (`customer_subscriptions`) and monthly
AI scan count (`customer_usage`). `profiles.subscription` and the app's local profile are display
copies that the server never trusts (the column used to default to "pro"; it now defaults to free).

- `POST /api/razorpay/create-order` prices the plan on the server and tags the order with the user id.
- `POST /api/razorpay/verify-payment` checks the signature, fetches the order from Razorpay, requires
  it to be paid, for this user, for at least the plan price, and not used before; only then does it
  write `customer_subscriptions` + `subscription_transactions`.
- `POST /api/receipt-ocr` (Gemini) needs a signed-in user and returns `402 SCAN_LIMIT` once a free
  user has used 10 AI scans this month. Demo accounts get the built-in sample receipts and manual entry.
- `POST /api/exports/pdf|xlsx|zip` builds the PDF report, Excel register and CA zip pack on the
  server for paid plans only (`402 PRO_REQUIRED` otherwise). The free plan exports CSV, made in the
  app. The PDF/Excel/zip generators (`src/services/exportService.ts`) are imported only by the
  server, so they are not in the app bundle.

**Existing plans are reset.** Before this change the app wrote its own `customer_subscriptions`
rows with no verified payment, so step 3 sets every paid plan to free unless the server recorded
it (`payment_method = 'razorpay'`). The old plan is kept in `metadata.previous_plan_id`. To
re-activate a customer you know has paid, after checking the payment in the Razorpay dashboard:

```sql
UPDATE public.customer_subscriptions
SET plan_id = 'pro', payment_method = 'razorpay', current_period_end = NOW() + INTERVAL '30 days'
WHERE user_id = '<auth user uuid>';
```

Run step 3 soon after step 2: until it runs, the old open policies still let a client write its
own plan row.

## Where the API runs

The `/api` routes live in `server/api.ts` and run in two places:

- **Supabase Edge Function `api`**, used by the Android/iOS apps (`npm run build:mobile` reads
  `.env.mobile`, which points `VITE_API_BASE_URL` at
  `https://egtmuxewuremxgodpjxj.supabase.co/functions/v1`). Redeploy after changing `server/`:

  ```bash
  npm run build:edge && npx supabase functions deploy api --project-ref egtmuxewuremxgodpjxj --use-api
  ```

  Its secrets (Gemini, Razorpay, SMTP) are set with `npx supabase secrets set`; Supabase provides
  the `SUPABASE_*` values itself. The CLI must be logged in as the account that owns the project
  (cloudmeshdigitalsolutions@gmail.com).
- **`npm run dev` / `npm start`** (`server.ts`), which also serves the web app, reading `.env`.

## Server environment

| Variable | Needed for |
|----------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | everything above (server-only, never in the app) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | real upgrades. Without them upgrades are refused |
| `ALLOW_SIMULATED_PAYMENTS=true` | local testing only: accept fake payments when no Razorpay secret is set |
| `TERMS_ADMIN_EMAILS` | comma-separated emails allowed to edit Terms & Conditions |

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
