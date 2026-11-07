-- Monthly auto-debit (Razorpay Subscriptions) and payment reminders.
-- Safe to run before or after deploying the server; run it before anyone pays by auto-debit.

-- 1. Razorpay plan ids, one per tier + currency + amount, created by the server on first use.
--    Server only (service role): no policies, so the app can neither read nor write it.
CREATE TABLE IF NOT EXISTS public.razorpay_plans (
  tier TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount_minor INT NOT NULL,
  razorpay_plan_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tier, currency, amount_minor)
);
ALTER TABLE public.razorpay_plans ENABLE ROW LEVEL SECURITY;

-- 2. Firebase device tokens for push notifications. Written by the server for the signed-in user;
--    users can see and delete their own devices.
CREATE TABLE IF NOT EXISTS public.push_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT DEFAULT 'android',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens (user_id);
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_tokens_owner_read ON public.push_tokens;
CREATE POLICY push_tokens_owner_read ON public.push_tokens FOR SELECT USING (user_id = auth.uid()::text);
DROP POLICY IF EXISTS push_tokens_owner_delete ON public.push_tokens;
CREATE POLICY push_tokens_owner_delete ON public.push_tokens FOR DELETE USING (user_id = auth.uid()::text);

-- 3. Auto-debit lookups by Razorpay subscription id (webhook) and by renewal date (reminders)
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_rzp_sub
  ON public.customer_subscriptions ((metadata->>'razorpay_subscription_id'));
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_period_end
  ON public.customer_subscriptions (current_period_end);
