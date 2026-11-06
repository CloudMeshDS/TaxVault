-- Daily-scan plans: Pro 10/day ₹465, Business 20/day ₹699, CA Firm 100/day ₹1,499.
-- Annual = 10x monthly. Free stays at 10 AI scans per calendar month.
--
-- Run BEFORE deploying the server that sells the "business" plan: customer_subscriptions.plan_id
-- references this table, so activating Business fails until its row exists.
-- The server charges and enforces from src/constants/plans.ts; this table mirrors it for reporting.
-- Razorpay charges INR only, so the other currency columns are cleared rather than left stale.

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS daily_receipt_limit INT; -- AI scans in any rolling 24 hours (NULL = not limited per day)

INSERT INTO public.subscription_plans (
  id, plan_code, name, tagline, description, billing_cycle,
  price_inr, price_usd, price_nzd, price_aud, price_cad,
  price_annual_inr, price_annual_usd, price_annual_nzd, price_annual_aud, price_annual_cad,
  monthly_receipt_limit, daily_receipt_limit, features, badge, sort_order, is_active
) VALUES
(
  'pro', 'tax_compliance_pro', 'Tax Compliance Pro', 'For freelancers and sole traders',
  '10 AI receipt scans per day, CA audit packs and cloud backup.', 'monthly',
  465, 0, 0, 0, 0,
  4650, 0, 0, 0, 0,
  -1, 10,
  '["10 AI receipt scans per day", "CA audit PDF, with receipt photos", "Multi-sheet Excel tax workbook", "Accountant share link & audit ZIP pack", "Cloud backup & sync across devices"]'::jsonb,
  'Most popular', 2, TRUE
),
(
  'business', 'business_daily_20', 'Business', 'For busy small businesses',
  '20 AI receipt scans per day, CA audit packs and cloud backup.', 'monthly',
  699, 0, 0, 0, 0,
  6990, 0, 0, 0, 0,
  -1, 20,
  '["20 AI receipt scans per day", "CA audit PDF, with receipt photos", "Multi-sheet Excel tax workbook", "Accountant share link & audit ZIP pack", "Cloud backup & sync across devices"]'::jsonb,
  NULL, 3, TRUE
),
(
  'enterprise', 'firm_multi_entity', 'CA Firm & Multi-Entity', 'For accountants and high-volume teams',
  '100 AI receipt scans per day, CA audit packs and cloud backup.', 'monthly',
  1499, 0, 0, 0, 0,
  14990, 0, 0, 0, 0,
  -1, 100,
  '["100 AI receipt scans per day", "CA audit PDF, with receipt photos", "Multi-sheet Excel tax workbook", "Accountant share link & audit ZIP pack", "Cloud backup & sync across devices"]'::jsonb,
  NULL, 4, TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  price_inr = EXCLUDED.price_inr,
  price_usd = EXCLUDED.price_usd,
  price_nzd = EXCLUDED.price_nzd,
  price_aud = EXCLUDED.price_aud,
  price_cad = EXCLUDED.price_cad,
  price_annual_inr = EXCLUDED.price_annual_inr,
  price_annual_usd = EXCLUDED.price_annual_usd,
  price_annual_nzd = EXCLUDED.price_annual_nzd,
  price_annual_aud = EXCLUDED.price_annual_aud,
  price_annual_cad = EXCLUDED.price_annual_cad,
  monthly_receipt_limit = EXCLUDED.monthly_receipt_limit,
  daily_receipt_limit = EXCLUDED.daily_receipt_limit,
  features = EXCLUDED.features,
  badge = EXCLUDED.badge,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- The daily limit counts successful scans per user in the last 24 hours.
CREATE INDEX IF NOT EXISTS idx_token_request_logs_user_type_time
  ON public.token_request_logs (user_id, request_type, created_at DESC);
