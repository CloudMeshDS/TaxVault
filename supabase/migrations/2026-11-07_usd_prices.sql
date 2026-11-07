-- All plans are priced and charged in US dollars, whatever the user's country.
-- Pro US$5.99, Business US$8.99, CA Firm US$19.99 per month; annual = 10x monthly.
-- The server charges from src/constants/plans.ts; this table mirrors it for reporting.
-- Rupee and other-currency columns are cleared so no stale price is left behind.

UPDATE public.subscription_plans SET
  price_usd = v.monthly, price_annual_usd = v.annual,
  price_inr = 0, price_annual_inr = 0,
  price_nzd = 0, price_annual_nzd = 0,
  price_aud = 0, price_annual_aud = 0,
  price_cad = 0, price_annual_cad = 0,
  updated_at = NOW()
FROM (VALUES
  ('pro', 5.99, 59.90),
  ('business', 8.99, 89.90),
  ('enterprise', 19.99, 199.90)
) AS v(id, monthly, annual)
WHERE public.subscription_plans.id = v.id;
