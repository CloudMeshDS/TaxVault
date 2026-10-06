-- ========================================================
-- TaxVault Mobile - Supabase Database Schema
-- Run this in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ========================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  country TEXT DEFAULT 'NZ',
  entity_type TEXT DEFAULT 'sole_trader',
  tax_number TEXT,
  gst_registered BOOLEAN DEFAULT TRUE,
  gst_number TEXT,
  base_currency TEXT DEFAULT 'NZD',
  financial_year_ending TEXT DEFAULT '2027-03-31',
  accountant_email TEXT,
  accountant_name TEXT,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  biometric_enabled BOOLEAN DEFAULT FALSE,
  device_platform TEXT DEFAULT 'ios',
  last_backup_date TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  merchant TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  original_amount NUMERIC(12, 2),
  original_currency TEXT,
  exchange_rate NUMERIC(10, 4),
  gst_amount NUMERIC(12, 2) DEFAULT 0,
  is_deductible BOOLEAN DEFAULT TRUE,
  deductible_percentage NUMERIC(5, 2) DEFAULT 100,
  receipt_url TEXT,
  receipt_file_name TEXT,
  receipt_number TEXT,
  payment_method TEXT,
  notes TEXT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Incomes Table
CREATE TABLE IF NOT EXISTS public.incomes (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  client TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  gst_amount NUMERIC(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'NZD',
  invoice_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

-- 5. Open API Policies for Anon/Publishable Client Keys
-- (Allows reading and writing expenses, incomes, and profiles)
DROP POLICY IF EXISTS "Public access to profiles" ON public.profiles;
CREATE POLICY "Public access to profiles" ON public.profiles
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to expenses" ON public.expenses;
CREATE POLICY "Public access to expenses" ON public.expenses
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to incomes" ON public.incomes;
CREATE POLICY "Public access to incomes" ON public.incomes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON public.incomes(date DESC);
