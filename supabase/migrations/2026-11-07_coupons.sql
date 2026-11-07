-- Coupon codes for paid plans.
-- Server only (service role): RLS is on with no policies, so the app can neither list codes nor
-- write redemptions. The server checks a code, prices the order with it and records each use.
--
-- Add a code, for example 20% off any plan, monthly or annual, until the end of 2026, 500 uses:
--   INSERT INTO public.coupons (code, description, percent_off, expires_at, max_redemptions)
--   VALUES ('WELCOME20', '20% off', 20, '2026-12-31T23:59:59Z', 500);
-- US$2 off Business annual only:
--   INSERT INTO public.coupons (code, description, amount_off_usd, tiers, billing_cycles)
--   VALUES ('BIZ2', 'US$2 off', 2, '{business}', '{annual}');
-- Switch a code off:  UPDATE public.coupons SET active = false WHERE code = 'WELCOME20';
--
-- On a monthly plan the discount applies to every monthly charge while that auto-pay runs.
-- No order is ever charged less than US$1.00.

CREATE TABLE IF NOT EXISTS public.coupons (
  code TEXT PRIMARY KEY CHECK (code = upper(code) AND code ~ '^[A-Z0-9_-]{3,32}$'),
  description TEXT,
  percent_off NUMERIC(5,2) CHECK (percent_off > 0 AND percent_off <= 100),
  amount_off_usd NUMERIC(10,2) CHECK (amount_off_usd > 0),
  tiers TEXT[],            -- NULL = every paid plan; else e.g. '{pro,business}'
  billing_cycles TEXT[],   -- NULL = monthly and annual; else '{monthly}' or '{annual}'
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  max_redemptions INT CHECK (max_redemptions > 0),  -- NULL = no overall limit
  per_user_limit INT NOT NULL DEFAULT 1 CHECK (per_user_limit > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((percent_off IS NULL) <> (amount_off_usd IS NULL))
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL REFERENCES public.coupons(code) ON UPDATE CASCADE,
  user_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  discount_usd NUMERIC(10,2) NOT NULL,
  payment_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_code ON public.coupon_redemptions (code);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON public.coupon_redemptions (user_id, code);
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
