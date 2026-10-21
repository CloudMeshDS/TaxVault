-- ==============================================================================
-- TaxVault International - Multi-Jurisdiction PostgreSQL Schema & Migration
-- Supported Countries: New Zealand (NZ), Australia (AU), Canada (CA), USA (US), India (IN)
-- Modules:
--   1. Profiles (Business & Identity)
--   2. Expenses & Incomes (Universal Multi-Jurisdiction Tax Engine)
--   3. Subscription Master (Plans, Limits, Multi-Currency Pricing)
--   4. Customer Subscriptions (Active Tiers, Renewal Dates, Billing Cycles)
--   5. Subscription Transactions (Payment Ledger, Gateways, GST/Invoices)
--   6. Customer Token & Request Usage (Quota Tracking per Period)
--   7. Token Request Logs (Granular AI/API Request & Latency Ledger)
--   8. Activity Logs (Audit Trail of All User & System Activities)
--   9. Automatic Triggers & per-user RLS Security Policies (section 18)
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Project Dashboard (https://supabase.com/dashboard)
-- 2. Click "SQL Editor" on the left navigation bar
-- 3. Click "+ New Query", paste this entire script, and click "Run"
-- ==============================================================================

-- ==============================================================================
-- 1. PROFILES TABLE (Universal Multi-Country Business Identity)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  business_name TEXT DEFAULT 'TaxVault Business',
  business_type TEXT DEFAULT 'Sole Trader',
  country TEXT DEFAULT 'NZ', -- 'NZ' | 'AU' | 'CA' | 'US' | 'IN'
  default_currency TEXT DEFAULT 'NZD',
  currency_symbol TEXT DEFAULT '$',
  financial_year TEXT DEFAULT 'FY 2026-27',
  tax_authority TEXT DEFAULT 'Inland Revenue Department (IRD)',
  
  -- Primary & Secondary Tax IDs
  tax_id TEXT DEFAULT '', -- IRD Number (NZ) / ABN (AU) / CRA BN (CA) / EIN (US) / PAN (IN)
  secondary_tax_id TEXT DEFAULT '', -- GST Number (NZ) / TFN (AU) / State ID (US) / GSTIN (IN)
  
  -- Indian aliases for backward compatibility
  pan TEXT DEFAULT 'AAAPS1234K',
  gstin TEXT DEFAULT '27AABCU9603R1ZM',
  
  accountant_name TEXT DEFAULT 'Tax Accountant / Advisor',
  accountant_email TEXT,
  accountant_phone TEXT,
  biometric_lock BOOLEAN DEFAULT FALSE,
  app_pin TEXT DEFAULT '1234',
  subscription JSONB DEFAULT '{"tier":"free","billingCycle":"monthly","status":"active","receiptsScannedThisMonth":0,"monthlyReceiptLimit":10}'::jsonb,
  last_backup_date TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Legacy columns
  entity_type TEXT DEFAULT 'Sole Trader',
  tax_number TEXT DEFAULT '',
  gst_registered BOOLEAN DEFAULT TRUE,
  gst_number TEXT DEFAULT '',
  base_currency TEXT DEFAULT 'NZD',
  financial_year_ending TEXT DEFAULT '2027-03-31',
  mfa_enabled BOOLEAN DEFAULT FALSE,
  biometric_enabled BOOLEAN DEFAULT FALSE,
  device_platform TEXT DEFAULT 'android'
);

-- Ensure multi-country profile columns exist safely
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'NZ';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT DEFAULT 'TaxVault Business';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'Sole Trader';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_id TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_tax_id TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_authority TEXT DEFAULT 'Inland Revenue Department (IRD)';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'NZD';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency_symbol TEXT DEFAULT '$';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS financial_year TEXT DEFAULT 'FY 2026-27';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pan TEXT DEFAULT 'AAAPS1234K';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gstin TEXT DEFAULT '27AABCU9603R1ZM';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS biometric_lock BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS app_pin TEXT DEFAULT '1234';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription JSONB DEFAULT '{"tier":"free","billingCycle":"monthly","status":"active","receiptsScannedThisMonth":0,"monthlyReceiptLimit":10}'::jsonb;


-- ==============================================================================
-- 2. EXPENSES TABLE (Universal Multi-Jurisdiction Voucher & Tax Engine)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  merchant TEXT NOT NULL,
  invoice_number TEXT,
  receipt_number TEXT,
  date DATE NOT NULL,
  time TEXT DEFAULT '12:00',
  vendor_address TEXT,
  vendor_phone TEXT,
  
  -- Multi-Country Jurisdiction & Tax Identification
  country TEXT DEFAULT 'NZ', -- 'NZ' | 'AU' | 'CA' | 'US' | 'IN'
  currency TEXT DEFAULT 'NZD',
  vendor_tax_id TEXT, -- Universal Tax ID (IRD / ABN / CRA BN / EIN / GSTIN)
  customer_tax_id TEXT,
  vendor_gstin TEXT, -- Indian alias
  customer_gstin TEXT, -- Indian alias
  state TEXT, -- State / Province / Territory
  payment_method TEXT DEFAULT 'Credit Card',
  
  -- Financial Breakdown
  subtotal NUMERIC(12, 2) DEFAULT 0,
  discount NUMERIC(12, 2) DEFAULT 0,
  taxable_amount NUMERIC(12, 2) DEFAULT 0,
  tax_type TEXT DEFAULT 'GST', -- 'GST' | 'HST' | 'PST' | 'Sales Tax' | 'CGST+SGST' | 'IGST'
  tax_rate NUMERIC(5, 2) DEFAULT 15.00,
  tax_amount NUMERIC(12, 2) DEFAULT 0, -- Total tax in local currency
  
  -- Specific Country Breakdown Columns
  gst_amount NUMERIC(12, 2) DEFAULT 0, -- NZ 15% / AU 10% / CA 5%
  pst_amount NUMERIC(12, 2) DEFAULT 0, -- Canada Provincial Sales Tax / QST
  hst_amount NUMERIC(12, 2) DEFAULT 0, -- Canada Harmonized Sales Tax (13-15%)
  sales_tax_amount NUMERIC(12, 2) DEFAULT 0, -- US State/Local Sales Tax
  cgst NUMERIC(12, 2) DEFAULT 0, -- India Central GST
  sgst NUMERIC(12, 2) DEFAULT 0, -- India State GST
  igst NUMERIC(12, 2) DEFAULT 0, -- India Integrated GST
  cess NUMERIC(12, 2) DEFAULT 0, -- India Cess
  round_off NUMERIC(12, 2) DEFAULT 0,
  amount NUMERIC(12, 2) NOT NULL, -- Total in local currency
  
  -- Cost Heads / Category & Business Usage
  category TEXT NOT NULL,
  expense_type TEXT DEFAULT 'Business', -- 'Business' | 'Personal' | 'Mixed'
  business_percentage NUMERIC(5, 2) DEFAULT 100,
  claimable_business_amount NUMERIC(12, 2) DEFAULT 0,
  
  -- Line Items & Confidence
  items JSONB DEFAULT '[]'::jsonb,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  
  -- Digital Voucher Attachments
  receipt_url TEXT,
  receipt_file_name TEXT,
  receipt_thumbnail TEXT,
  
  -- Compliance & Review Status
  gst_treatment TEXT DEFAULT 'Likely eligible',
  ca_review_status TEXT DEFAULT 'Not Reviewed',
  ca_notes TEXT,
  user_notes TEXT,
  calculation_mismatch BOOLEAN DEFAULT FALSE,
  mismatch_reason TEXT,
  
  -- Recurring Metadata
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT DEFAULT 'monthly',
  
  -- Status & Soft-Delete Lifecycle
  status TEXT DEFAULT 'active', -- 'active' | 'deleted' | 'archived'
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  -- Sync & Timestamps
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Legacy / Safe Fallback metadata
  description TEXT,
  original_amount NUMERIC(12, 2),
  original_currency TEXT,
  exchange_rate NUMERIC(10, 4),
  is_deductible BOOLEAN DEFAULT TRUE,
  deductible_percentage NUMERIC(5, 2) DEFAULT 100,
  notes TEXT
);

-- Safely add all columns to existing expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'NZ';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NZD';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS time TEXT DEFAULT '12:00';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vendor_address TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vendor_phone TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vendor_tax_id TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS customer_tax_id TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vendor_gstin TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS customer_gstin TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT 'GST';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 15.00;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS pst_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS hst_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS sales_tax_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS cgst NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS sgst NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS igst NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS cess NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS round_off NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS expense_type TEXT DEFAULT 'Business';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS business_percentage NUMERIC(5, 2) DEFAULT 100;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS claimable_business_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS confidence_scores JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_thumbnail TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS gst_treatment TEXT DEFAULT 'Likely eligible';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS ca_review_status TEXT DEFAULT 'Not Reviewed';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS ca_notes TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS user_notes TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS calculation_mismatch BOOLEAN DEFAULT FALSE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS mismatch_reason TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurring_frequency TEXT DEFAULT 'monthly';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;


-- ==============================================================================
-- 3. INCOMES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.incomes (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  client TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  gst_amount NUMERIC(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'NZD',
  invoice_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL;


-- ==============================================================================
-- 4. SUBSCRIPTION MASTER (Plans, Quotas & Multi-Currency Pricing)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY, -- 'free' | 'pro' | 'enterprise'
  plan_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  billing_cycle TEXT DEFAULT 'monthly', -- 'monthly' | 'annual' | 'lifetime'
  
  -- Monthly Pricing by Currency
  price_inr NUMERIC(10, 2) DEFAULT 0,
  price_usd NUMERIC(10, 2) DEFAULT 0,
  price_nzd NUMERIC(10, 2) DEFAULT 0,
  price_aud NUMERIC(10, 2) DEFAULT 0,
  price_cad NUMERIC(10, 2) DEFAULT 0,
  
  -- Annual Pricing by Currency (Discounted)
  price_annual_inr NUMERIC(10, 2) DEFAULT 0,
  price_annual_usd NUMERIC(10, 2) DEFAULT 0,
  price_annual_nzd NUMERIC(10, 2) DEFAULT 0,
  price_annual_aud NUMERIC(10, 2) DEFAULT 0,
  price_annual_cad NUMERIC(10, 2) DEFAULT 0,
  
  -- Monthly Usage Quotas (-1 denotes unlimited)
  monthly_receipt_limit INT DEFAULT 10,
  monthly_token_limit BIGINT DEFAULT 50000,
  monthly_request_limit INT DEFAULT 20,
  monthly_export_limit INT DEFAULT 5,
  
  -- Features & Capabilities List
  features JSONB DEFAULT '[]'::jsonb,
  badge TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 5. CUSTOMER SUBSCRIPTIONS (Active User Plans, Term & Status)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT DEFAULT 'active', -- 'active' | 'trial' | 'past_due' | 'canceled' | 'expired'
  billing_cycle TEXT DEFAULT 'monthly', -- 'monthly' | 'annual'
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  payment_method TEXT DEFAULT 'UPI', -- 'UPI' | 'Credit Card' | 'Stripe' | 'Razorpay' | 'In-App Purchase'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 6. SUBSCRIPTION TRANSACTIONS (Payment & Invoice Ledger)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subscription_id TEXT REFERENCES public.customer_subscriptions(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'succeeded', -- 'pending' | 'succeeded' | 'failed' | 'refunded'
  billing_cycle TEXT DEFAULT 'monthly', -- 'monthly' | 'annual'
  payment_gateway TEXT DEFAULT 'razorpay', -- 'razorpay' | 'stripe' | 'apple_iap' | 'google_play' | 'manual'
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_signature TEXT,
  receipt_number TEXT,
  invoice_url TEXT,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  tax_details JSONB DEFAULT '{}'::jsonb, -- Breakdown of GST/HST/Sales Tax
  error_code TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 7. CUSTOMER TOKEN / REQUEST USAGE (Periodic Aggregation & Quotas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customer_usage (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days')::date,
  scans_used INT DEFAULT 0,
  scans_limit INT DEFAULT 10,
  tokens_used BIGINT DEFAULT 0,
  tokens_limit BIGINT DEFAULT 50000,
  requests_count INT DEFAULT 0,
  requests_limit INT DEFAULT 100,
  exports_count INT DEFAULT 0,
  exports_limit INT DEFAULT 5,
  storage_bytes_used BIGINT DEFAULT 0,
  storage_bytes_limit BIGINT DEFAULT 104857600, -- 100 MB default
  last_request_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unq_user_period UNIQUE(user_id, period_start)
);


-- ==============================================================================
-- 8. TOKEN REQUEST LOGS (Granular AI & API Request Ledger)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.token_request_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- 'receipt_ocr' | 'tax_categorization' | 'chat_assistant' | 'report_export' | 'bank_match'
  model_name TEXT DEFAULT 'gemini-2.5-flash',
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  latency_ms INT DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
  status TEXT DEFAULT 'success', -- 'success' | 'failed' | 'rate_limited'
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 9. ACTIVITY LOGS (Comprehensive Audit Trail of All Activities)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL, -- 'expense' | 'income' | 'subscription' | 'profile' | 'export' | 'auth' | 'ai_scan' | 'tax_report' | 'settings'
  entity_id TEXT,
  action TEXT NOT NULL, -- 'create' | 'update' | 'delete' | 'scan_receipt' | 'export_pdf' | 'export_excel' | 'share_ca' | 'upgrade_plan' | 'downgrade_plan' | 'login' | 'logout' | 'sync_cloud' | 'api_key_update'
  description TEXT NOT NULL,
  status TEXT DEFAULT 'success', -- 'success' | 'warning' | 'error'
  changes JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  device_platform TEXT DEFAULT 'android',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 10. MILEAGE TRIPS TABLE (Vehicle & Mileage Logbook Deductions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.mileage_trips (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  purpose TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  distance NUMERIC(10, 2) NOT NULL,
  unit TEXT DEFAULT 'km', -- 'km' | 'miles'
  rate_per_unit NUMERIC(10, 4) NOT NULL,
  tax_deduction NUMERIC(12, 2) NOT NULL,
  vehicle TEXT,
  odometer_start NUMERIC(10, 2),
  odometer_end NUMERIC(10, 2),
  notes TEXT,
  logged_as_expense_id TEXT REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 11. CLIENT INVOICES TABLE (Sales Invoices & Accounts Receivable)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.client_invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  date DATE NOT NULL,
  due_date DATE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_address TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'draft', -- 'draft' | 'sent' | 'paid'
  synced_income_id TEXT REFERENCES public.incomes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 12. BANK TRANSACTIONS TABLE (Reconciliation Feed & Statement Matching)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT DEFAULT 'debit', -- 'debit' | 'credit'
  matched_expense_id TEXT REFERENCES public.expenses(id) ON DELETE SET NULL,
  match_status TEXT DEFAULT 'unmatched', -- 'matched' | 'unmatched'
  category_guess TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 13. DATABASE TRIGGERS & PROCEDURES (Auto Timestamps & Auto Activity Logging)
-- ==============================================================================

-- Trigger function to update updated_at automatically
CREATE OR REPLACE FUNCTION public.fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach timestamp triggers
DROP TRIGGER IF EXISTS trg_profiles_timestamp ON public.profiles;
CREATE TRIGGER trg_profiles_timestamp BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_expenses_timestamp ON public.expenses;
CREATE TRIGGER trg_expenses_timestamp BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_sub_plans_timestamp ON public.subscription_plans;
CREATE TRIGGER trg_sub_plans_timestamp BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_cust_sub_timestamp ON public.customer_subscriptions;
CREATE TRIGGER trg_cust_sub_timestamp BEFORE UPDATE ON public.customer_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_cust_usage_timestamp ON public.customer_usage;
CREATE TRIGGER trg_cust_usage_timestamp BEFORE UPDATE ON public.customer_usage
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_mileage_trips_timestamp ON public.mileage_trips;
CREATE TRIGGER trg_mileage_trips_timestamp BEFORE UPDATE ON public.mileage_trips
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_client_invoices_timestamp ON public.client_invoices;
CREATE TRIGGER trg_client_invoices_timestamp BEFORE UPDATE ON public.client_invoices
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_bank_transactions_timestamp ON public.bank_transactions;
CREATE TRIGGER trg_bank_transactions_timestamp BEFORE UPDATE ON public.bank_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

-- Stored Function: record_activity_log
CREATE OR REPLACE FUNCTION public.record_activity_log(
  p_user_id TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_action TEXT,
  p_description TEXT,
  p_status TEXT DEFAULT 'success',
  p_changes JSONB DEFAULT '{}'::jsonb,
  p_device_platform TEXT DEFAULT 'android',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TEXT AS $$
DECLARE
  v_log_id TEXT;
  v_safe_user_id TEXT := NULL;
BEGIN
  -- Verify p_user_id exists in profiles; fallback to NULL to protect foreign key constraint
  IF p_user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
      v_safe_user_id := p_user_id;
    END IF;
  END IF;

  INSERT INTO public.activity_logs (
    user_id,
    entity_type,
    entity_id,
    action,
    description,
    status,
    changes,
    device_platform,
    metadata,
    created_at
  ) VALUES (
    v_safe_user_id,
    p_entity_type,
    p_entity_id,
    p_action,
    p_description,
    p_status,
    p_changes,
    p_device_platform,
    p_metadata,
    NOW()
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: record_token_usage
CREATE OR REPLACE FUNCTION public.record_token_usage(
  p_user_id TEXT,
  p_request_type TEXT,
  p_model_name TEXT,
  p_prompt_tokens INT,
  p_completion_tokens INT,
  p_latency_ms INT DEFAULT 0,
  p_estimated_cost_usd NUMERIC DEFAULT 0,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TEXT AS $$
DECLARE
  v_total_tokens INT;
  v_log_id TEXT;
  v_period_start DATE;
BEGIN
  v_total_tokens := COALESCE(p_prompt_tokens, 0) + COALESCE(p_completion_tokens, 0);
  v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- 1. Insert granular token log
  INSERT INTO public.token_request_logs (
    user_id,
    request_type,
    model_name,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    latency_ms,
    estimated_cost_usd,
    status,
    error_message,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_request_type,
    p_model_name,
    COALESCE(p_prompt_tokens, 0),
    COALESCE(p_completion_tokens, 0),
    v_total_tokens,
    p_latency_ms,
    p_estimated_cost_usd,
    p_status,
    p_error_message,
    p_metadata,
    NOW()
  ) RETURNING id INTO v_log_id;
  
  -- 2. Upsert customer usage counters for the current period
  INSERT INTO public.customer_usage (
    user_id,
    period_start,
    period_end,
    scans_used,
    tokens_used,
    requests_count,
    last_request_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_period_start,
    (v_period_start + INTERVAL '1 month - 1 day')::DATE,
    CASE WHEN p_request_type = 'receipt_ocr' THEN 1 ELSE 0 END,
    v_total_tokens,
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, period_start) DO UPDATE SET
    tokens_used = customer_usage.tokens_used + v_total_tokens,
    requests_count = customer_usage.requests_count + 1,
    scans_used = customer_usage.scans_used + (CASE WHEN p_request_type = 'receipt_ocr' THEN 1 ELSE 0 END),
    last_request_at = NOW(),
    updated_at = NOW();

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;


-- ==============================================================================
-- 11. AUTOMATIC AUDIT TRIGGERS (Auto-Log Changes)
-- ==============================================================================

-- Auto-log Expense changes
CREATE OR REPLACE FUNCTION public.fn_log_expense_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id TEXT := NULL;
BEGIN
  -- Look up valid profile ID if customer_tax_id or customer_gstin matches a profile
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.customer_tax_id IS NOT NULL THEN
      SELECT id INTO v_user_id FROM public.profiles
      WHERE id = NEW.customer_tax_id
         OR tax_id = NEW.customer_tax_id
         OR secondary_tax_id = NEW.customer_tax_id
         OR pan = NEW.customer_tax_id
         OR gstin = NEW.customer_tax_id
      LIMIT 1;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_activity_log(
      v_user_id,
      'expense',
      NEW.id,
      'create',
      'Created expense for ' || COALESCE(NEW.merchant, 'Vendor') || ' (' || COALESCE(NEW.currency, '') || ' ' || NEW.amount || ')',
      'success',
      jsonb_build_object('merchant', NEW.merchant, 'amount', NEW.amount, 'category', NEW.category)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.record_activity_log(
      v_user_id,
      'expense',
      NEW.id,
      'update',
      'Updated expense ' || COALESCE(NEW.merchant, 'Vendor') || ' (' || COALESCE(NEW.currency, '') || ' ' || NEW.amount || ')',
      'success',
      jsonb_build_object('before_amount', OLD.amount, 'after_amount', NEW.amount, 'category', NEW.category)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.record_activity_log(
      NULL,
      'expense',
      OLD.id,
      'delete',
      'Deleted expense for ' || COALESCE(OLD.merchant, 'Vendor') || ' (' || COALESCE(OLD.currency, '') || ' ' || OLD.amount || ')',
      'warning',
      jsonb_build_object('merchant', OLD.merchant, 'amount', OLD.amount)
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql
-- Runs as its owner so audit rows (some with user_id NULL) are written despite the caller's RLS.
-- Trigger functions cannot be called through the REST API.
SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_audit_expenses ON public.expenses;
CREATE TRIGGER trg_audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.fn_log_expense_activity();


-- ==============================================================================
-- 12. ROW LEVEL SECURITY: see section 18 at the end of this file (it also covers
--     country_terms and customer_agreements, which are created below).
-- ==============================================================================


-- ==============================================================================
-- 15. HIGH-PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_country ON public.expenses(country);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_tax_id ON public.expenses(vendor_tax_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_type ON public.expenses(expense_type);

CREATE INDEX IF NOT EXISTS idx_cust_sub_user_id ON public.customer_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_cust_sub_status ON public.customer_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_sub_tx_user_id ON public.subscription_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_tx_status ON public.subscription_transactions(status);
CREATE INDEX IF NOT EXISTS idx_sub_tx_created ON public.subscription_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cust_usage_user ON public.customer_usage(user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_token_logs_user ON public.token_request_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_logs_type ON public.token_request_logs(request_type);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);

CREATE INDEX IF NOT EXISTS idx_mileage_trips_date ON public.mileage_trips(date DESC);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_user ON public.mileage_trips(user_id);

CREATE INDEX IF NOT EXISTS idx_client_invoices_date ON public.client_invoices(date DESC);
CREATE INDEX IF NOT EXISTS idx_client_invoices_user ON public.client_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_number ON public.client_invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_bank_tx_date ON public.bank_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_tx_user ON public.bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_status ON public.bank_transactions(match_status);


-- ==============================================================================
-- 14. SEED SUBSCRIPTION MASTER PLANS
-- ==============================================================================
INSERT INTO public.subscription_plans (
  id,
  plan_code,
  name,
  tagline,
  description,
  billing_cycle,
  price_inr,
  price_usd,
  price_nzd,
  price_aud,
  price_cad,
  price_annual_inr,
  price_annual_usd,
  price_annual_nzd,
  price_annual_aud,
  price_annual_cad,
  monthly_receipt_limit,
  monthly_token_limit,
  monthly_request_limit,
  monthly_export_limit,
  features,
  badge,
  sort_order
) VALUES
(
  'free',
  'starter_free',
  'Starter Free',
  'Basic personal tracking for individuals & freelancers',
  'Entry level personal tracking with 10 free AI receipt scans per month.',
  'monthly',
  0.00, 0.00, 0.00, 0.00, 0.00,
  0.00, 0.00, 0.00, 0.00, 0.00,
  10,
  50000,
  25,
  5,
  '[
    "Up to 10 AI receipt scans per month",
    "Basic multi-country tax categorization",
    "Standard CSV expense export",
    "Single currency tracking",
    "On-device storage & standard security"
  ]'::jsonb,
  'FREE FOREVER',
  1
),
(
  'pro',
  'tax_compliance_pro',
  'Tax Compliance Pro',
  'Full tax season automation for contractors & small businesses',
  'Unlimited neural OCR scans, Chartered Accountant audit packs, and multi-currency tools.',
  'monthly',
  1199.00, 14.99, 24.99, 22.99, 19.99,
  11999.00, 149.00, 249.00, 229.00, 199.00,
  -1, -- Unlimited
  2000000, -- 2M tokens/month
  1000,
  -1, -- Unlimited exports
  '[
    "Unlimited receipt scans & neural OCR",
    "Official Chartered Accountant Audit PDF with sign-off",
    "Multi-sheet Excel (.xlsx) tax audit pack",
    "Direct CA Reviewer Link & 6-digit PIN sharing",
    "Live multi-currency spot rate conversions",
    "AES-256 encrypted cloud backup vault",
    "New Zealand IRD, Australia ATO, Canada CRA, US IRS & India GST rules"
  ]'::jsonb,
  'RECOMMENDED FOR TAX SEASON',
  2
),
(
  'enterprise',
  'firm_multi_entity',
  'CA Firm & Multi-Entity',
  'For accounting practices, multiple trading entities & advisory firms',
  'Designed for tax professionals managing multiple clients and trading entities with API sync.',
  'monthly',
  3199.00, 39.99, 64.99, 59.99, 54.99,
  31999.00, 399.00, 649.00, 599.00, 549.00,
  -1, -- Unlimited
  10000000, -- 10M tokens/month
  10000,
  -1, -- Unlimited exports
  '[
    "Everything in Tax Compliance Pro",
    "Multiple trading entities & distinct tax identification numbers",
    "Direct Xero, MYOB & QuickBooks API synchronization",
    "Dedicated Chartered Accountant reviewer channel",
    "Priority AI neural OCR queue",
    "Comprehensive immutable audit trail & activity log export",
    "Dedicated SLA & personalized tax advisor onboarding"
  ]'::jsonb,
  'FOR FIRMS & TEAMS',
  3
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
  monthly_token_limit = EXCLUDED.monthly_token_limit,
  monthly_request_limit = EXCLUDED.monthly_request_limit,
  monthly_export_limit = EXCLUDED.monthly_export_limit,
  features = EXCLUDED.features,
  badge = EXCLUDED.badge,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ==============================================================================
-- 15. PASSWORD RESET
-- ==============================================================================
-- Passwords are changed only via Supabase recovery sessions (supabase.auth.updateUser).
-- Do not add a SECURITY DEFINER function that sets passwords by email: callable with the
-- public anon key, it lets anyone take over any account.

-- ==============================================================================
-- 16. COUNTRY TERMS (Statutory Terms & Conditions by Jurisdiction)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.country_terms (
  country TEXT PRIMARY KEY,
  country_name TEXT NOT NULL,
  tax_authority TEXT NOT NULL,
  governing_law TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '2026.1',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 17. CUSTOMER AGREEMENTS (Consent & Terms Acceptance Audit Trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customer_agreements (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  country TEXT NOT NULL,
  tax_authority TEXT NOT NULL,
  terms_version TEXT NOT NULL DEFAULT '2026.1',
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  device_platform TEXT DEFAULT 'web',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cust_agr_email ON public.customer_agreements(user_email);
CREATE INDEX IF NOT EXISTS idx_cust_agr_user ON public.customer_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_cust_agr_country ON public.customer_agreements(country);
CREATE INDEX IF NOT EXISTS idx_cust_agr_date ON public.customer_agreements(agreed_at DESC);

-- ==============================================================================
-- 18. ROW LEVEL SECURITY (per-user ownership)
-- ==============================================================================
-- profiles.id = auth.uid(); expenses.customer_tax_id = auth.uid(); other tables' user_id = auth.uid().
-- The anon role has no policy on user tables, so the public anon key cannot read any user's rows.
-- The TaxVault server verifies the caller's token and uses the service role (bypasses RLS).
ALTER TABLE public.expenses ALTER COLUMN customer_tax_id SET DEFAULT (auth.uid())::text;
ALTER TABLE public.incomes ALTER COLUMN user_id SET DEFAULT (auth.uid())::text;
ALTER TABLE public.mileage_trips ALTER COLUMN user_id SET DEFAULT (auth.uid())::text;
ALTER TABLE public.client_invoices ALTER COLUMN user_id SET DEFAULT (auth.uid())::text;
ALTER TABLE public.bank_transactions ALTER COLUMN user_id SET DEFAULT (auth.uid())::text;
ALTER TABLE public.activity_logs ALTER COLUMN user_id SET DEFAULT (auth.uid())::text;
CREATE INDEX IF NOT EXISTS idx_expenses_customer_tax_id ON public.expenses(customer_tax_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user ON public.incomes(user_id);

-- Enable RLS and drop every existing policy (permissive policies are OR'ed, so any leftover
-- `USING (true)` policy would keep a table public).
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
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY "Owner access to profiles" ON public.profiles FOR ALL TO authenticated
  USING (id = (SELECT auth.uid())::text) WITH CHECK (id = (SELECT auth.uid())::text);
CREATE POLICY "Owner access to expenses" ON public.expenses FOR ALL TO authenticated
  USING (customer_tax_id = (SELECT auth.uid())::text) WITH CHECK (customer_tax_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner access to incomes" ON public.incomes FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())::text) WITH CHECK (user_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner access to mileage trips" ON public.mileage_trips FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())::text) WITH CHECK (user_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner access to client invoices" ON public.client_invoices FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())::text) WITH CHECK (user_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner access to bank transactions" ON public.bank_transactions FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())::text) WITH CHECK (user_id = (SELECT auth.uid())::text);
-- Plan, payments and scan quota: read-only for owners; written by the server (service role).
CREATE POLICY "Owner read customer subscriptions" ON public.customer_subscriptions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner read customer usage" ON public.customer_usage FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())::text);

-- Ledgers / audit trails: read and append own rows only.
CREATE POLICY "Owner read subscription transactions" ON public.subscription_transactions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner read token request logs" ON public.token_request_logs FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner insert token request logs" ON public.token_request_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner read activity logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner insert activity logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid())::text);
CREATE POLICY "Owner read customer agreements" ON public.customer_agreements FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())::text OR lower(user_email) = lower((SELECT auth.jwt() ->> 'email')));
CREATE POLICY "Owner insert customer agreements" ON public.customer_agreements FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid())::text);

-- Public catalogues: readable by everyone, writable only by the service role.
CREATE POLICY "Public read subscription plans" ON public.subscription_plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read country terms" ON public.country_terms FOR SELECT TO anon, authenticated USING (true);

REVOKE EXECUTE ON FUNCTION public.fn_log_expense_activity() FROM PUBLIC, anon, authenticated;

-- Logging helpers run with the caller's rights (RLS applies) and are not callable by anon.
REVOKE EXECUTE ON FUNCTION public.record_activity_log(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_activity_log(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.record_token_usage(TEXT, TEXT, TEXT, INT, INT, INT, NUMERIC, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_token_usage(TEXT, TEXT, TEXT, INT, INT, INT, NUMERIC, TEXT, TEXT, JSONB) TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
