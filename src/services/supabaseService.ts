import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { ExpenseRecord, IncomeRecord, UserProfile } from '../types';

export interface SupabaseSyncStatus {
  isConfigured: boolean;
  isConnected: boolean;
  tablesReady: boolean;
  projectUrl: string;
  errorMessage?: string;
  lastChecked?: string;
  recordsSynced?: number;
}

export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- TaxVault Mobile - Supabase Database Schema
-- Run this in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ========================================================

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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to profiles" ON public.profiles;
CREATE POLICY "Public access to profiles" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to expenses" ON public.expenses;
CREATE POLICY "Public access to expenses" ON public.expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to incomes" ON public.incomes;
CREATE POLICY "Public access to incomes" ON public.incomes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
`;

export function profileToSupabaseRow(p: UserProfile) {
  return {
    id: p.id || 'usr_taxvault_admin',
    full_name: p.fullName,
    email: p.email,
    country: p.country,
    entity_type: p.entityType,
    tax_number: p.taxNumber,
    gst_registered: p.gstRegistered,
    gst_number: p.gstNumber || p.taxNumber,
    base_currency: p.baseCurrency,
    financial_year_ending: p.financialYearEnding,
    accountant_email: p.accountantEmail || null,
    accountant_name: p.accountantName || null,
    mfa_enabled: p.mfaEnabled,
    biometric_enabled: p.biometricEnabled,
    device_platform: p.devicePlatform,
    last_backup_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function supabaseRowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    fullName: row.full_name || '',
    email: row.email || '',
    country: row.country || 'NZ',
    entityType: row.entity_type || 'sole_trader',
    taxNumber: row.tax_number || '',
    gstRegistered: Boolean(row.gst_registered),
    gstNumber: row.gst_number || '',
    baseCurrency: row.base_currency || 'NZD',
    financialYearEnding: row.financial_year_ending || '2027-03-31',
    accountantEmail: row.accountant_email || undefined,
    accountantName: row.accountant_name || undefined,
    mfaEnabled: Boolean(row.mfa_enabled),
    biometricEnabled: Boolean(row.biometric_enabled),
    devicePlatform: row.device_platform || 'ios',
    lastBackupDate: row.last_backup_date || new Date().toISOString(),
    subscription: {
      tier: 'pro',
      billingCycle: 'monthly',
      status: 'active',
      receiptsScannedThisMonth: 0,
      monthlyReceiptLimit: Infinity,
      renewsOn: '2027-03-31',
    },
  };
}

export function expenseToSupabaseRow(exp: ExpenseRecord) {
  return {
    id: exp.id,
    date: exp.date,
    merchant: exp.merchant,
    category: exp.category,
    description: exp.description || '',
    amount: exp.amount,
    original_amount: exp.originalAmount ?? null,
    original_currency: exp.originalCurrency ?? null,
    exchange_rate: exp.exchangeRate ?? null,
    gst_amount: exp.gstAmount || 0,
    is_deductible: exp.isDeductible,
    deductible_percentage: exp.deductiblePercentage ?? 100,
    receipt_url: exp.receiptUrl ?? null,
    receipt_file_name: exp.receiptFileName ?? null,
    receipt_number: exp.receiptNumber ?? null,
    payment_method: exp.paymentMethod || 'Credit Card',
    notes: exp.notes ?? null,
    sync_status: 'synced',
    created_at: exp.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function supabaseRowToExpense(row: any): ExpenseRecord {
  return {
    id: String(row.id),
    date: String(row.date),
    merchant: String(row.merchant || ''),
    category: row.category || 'Office & Admin',
    description: String(row.description || ''),
    amount: Number(row.amount || 0),
    originalAmount: row.original_amount != null ? Number(row.original_amount) : undefined,
    originalCurrency: row.original_currency || undefined,
    exchangeRate: row.exchange_rate != null ? Number(row.exchange_rate) : undefined,
    gstAmount: Number(row.gst_amount || 0),
    isDeductible: Boolean(row.is_deductible ?? true),
    deductiblePercentage: Number(row.deductible_percentage ?? 100),
    receiptUrl: row.receipt_url || undefined,
    receiptFileName: row.receipt_file_name || undefined,
    receiptNumber: row.receipt_number || undefined,
    paymentMethod: row.payment_method || 'Credit Card',
    notes: row.notes || undefined,
    syncStatus: 'synced',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function incomeToSupabaseRow(inc: IncomeRecord) {
  return {
    id: inc.id,
    date: inc.date,
    client: inc.client,
    description: inc.description || '',
    amount: inc.amount,
    gst_amount: inc.gstAmount || 0,
    currency: inc.currency || 'NZD',
    invoice_number: inc.invoiceNumber || null,
    created_at: inc.createdAt || new Date().toISOString(),
  };
}

export function supabaseRowToIncome(row: any): IncomeRecord {
  return {
    id: row.id,
    date: row.date,
    client: row.client,
    description: row.description || '',
    amount: Number(row.amount || 0),
    gstAmount: Number(row.gst_amount || 0),
    currency: row.currency || 'NZD',
    invoiceNumber: row.invoice_number || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private url: string = '';
  private key: string = '';

  constructor() {
    this.init();
  }

  private init() {
    const metaEnvUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const metaEnvKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    this.url = metaEnvUrl || localStorage.getItem('taxvault_supabase_url') || '';
    this.key = metaEnvKey || localStorage.getItem('taxvault_supabase_key') || '';

    if (this.url && this.key) {
      try {
        this.client = createClient(this.url, this.key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
        });
      } catch (err) {
        console.warn('Failed to initialize Supabase client:', err);
        this.client = null;
      }
    }
  }

  public getClient(): SupabaseClient | null {
    if (!this.client) {
      this.init();
    }
    return this.client;
  }

  public getConfig() {
    return {
      url: this.url,
      key: this.key,
      isConfigured: Boolean(this.url && this.key),
    };
  }

  public setCustomCredentials(url: string, key: string) {
    this.url = url.trim();
    this.key = key.trim();
    localStorage.setItem('taxvault_supabase_url', this.url);
    localStorage.setItem('taxvault_supabase_key', this.key);
    this.client = null;
    this.init();
  }

  /**
   * Health and connectivity check to Supabase
   */
  public async checkConnection(): Promise<SupabaseSyncStatus> {
    const client = this.getClient();
    if (!client || !this.url || !this.key) {
      return {
        isConfigured: false,
        isConnected: false,
        tablesReady: false,
        projectUrl: this.url || '',
        errorMessage: 'Supabase credentials not configured',
      };
    }

    try {
      // 1. Check API authentication via Auth settings
      const authRes = await fetch(`${this.url}/auth/v1/settings`, {
        headers: { apikey: this.key },
      });

      if (!authRes.ok) {
        const errText = await authRes.text();
        return {
          isConfigured: true,
          isConnected: false,
          tablesReady: false,
          projectUrl: this.url,
          errorMessage: `Supabase authentication failed (${authRes.status}): ${errText}`,
        };
      }

      // 2. Check if tables exist
      const { data, error } = await client.from('expenses').select('id').limit(1);

      if (error) {
        const isMissingTable = error.code === 'PGRST205' || error.message?.includes('schema cache');
        return {
          isConfigured: true,
          isConnected: true,
          tablesReady: !isMissingTable,
          projectUrl: this.url,
          errorMessage: isMissingTable
            ? "Connected to Supabase, but the 'expenses' table has not been created yet."
            : error.message,
          lastChecked: new Date().toISOString(),
        };
      }

      return {
        isConfigured: true,
        isConnected: true,
        tablesReady: true,
        projectUrl: this.url,
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        isConfigured: true,
        isConnected: false,
        tablesReady: false,
        projectUrl: this.url,
        errorMessage: err?.message || 'Network error connecting to Supabase',
      };
    }
  }

  /**
   * Supabase Auth: Sign in with Email and Password
   */
  public async signInWithEmail(email: string, password: string) {
    const client = this.getClient();
    if (!client) return { user: null, session: null, error: 'Supabase client not initialized' };

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      return { user: data.user, session: data.session, error: null };
    } catch (err: any) {
      return { user: null, session: null, error: err?.message || 'Authentication failed' };
    }
  }

  /**
   * Supabase Auth: Sign up with Email and Password
   */
  public async signUpWithEmail(email: string, password: string) {
    const client = this.getClient();
    if (!client) return { user: null, session: null, error: 'Supabase client not initialized' };

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      return { user: data.user, session: data.session, error: null };
    } catch (err: any) {
      return { user: null, session: null, error: err?.message || 'Sign up failed' };
    }
  }

  /**
   * Supabase Auth: Sign Out
   */
  public async signOut() {
    const client = this.getClient();
    if (client) {
      await client.auth.signOut().catch(() => {});
    }
  }

  /**
   * Supabase Auth: Get Current Authenticated User
   */
  public async getCurrentUser(): Promise<User | null> {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data } = await client.auth.getUser();
      return data?.user || null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch user profile from Supabase
   */
  public async fetchProfile(): Promise<{ profile: UserProfile | null; error?: string }> {
    const client = this.getClient();
    if (!client) return { profile: null, error: 'Supabase not initialized' };

    try {
      const { data, error } = await client.from('profiles').select('*').limit(1).maybeSingle();
      if (error) {
        return { profile: null, error: error.message };
      }
      if (data) {
        return { profile: supabaseRowToProfile(data) };
      }
      return { profile: null };
    } catch (err: any) {
      return { profile: null, error: err?.message };
    }
  }

  /**
   * Upsert user profile to Supabase
   */
  public async upsertProfile(profile: UserProfile): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not initialized' };

    try {
      const row = profileToSupabaseRow(profile);
      const { error } = await client.from('profiles').upsert(row);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  /**
   * Fetch all expenses from Supabase
   */
  public async fetchExpenses(): Promise<{ expenses: ExpenseRecord[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { expenses: [], error: 'Supabase not initialized' };

    try {
      const { data, error } = await client
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        return { expenses: [], error: error.message };
      }

      const expenses = (data || []).map(supabaseRowToExpense);
      return { expenses };
    } catch (err: any) {
      return { expenses: [], error: err?.message || 'Failed to fetch expenses' };
    }
  }

  /**
   * Upsert a single expense record to Supabase
   */
  public async upsertExpense(expense: ExpenseRecord): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const row = expenseToSupabaseRow(expense);
      const { error } = await client.from('expenses').upsert(row);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to save expense' };
    }
  }

  /**
   * Delete an expense from Supabase
   */
  public async deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const { error } = await client.from('expenses').delete().eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete expense' };
    }
  }

  /**
   * Fetch all incomes from Supabase
   */
  public async fetchIncomes(): Promise<{ incomes: IncomeRecord[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { incomes: [], error: 'Supabase not initialized' };

    try {
      const { data, error } = await client
        .from('incomes')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        return { incomes: [], error: error.message };
      }

      const incomes = (data || []).map(supabaseRowToIncome);
      return { incomes };
    } catch (err: any) {
      return { incomes: [], error: err?.message || 'Failed to fetch incomes' };
    }
  }

  /**
   * Upsert an income record to Supabase
   */
  public async upsertIncome(income: IncomeRecord): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const row = incomeToSupabaseRow(income);
      const { error } = await client.from('incomes').upsert(row);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  /**
   * Sync all local data (expenses, incomes, profile) to Supabase
   */
  public async syncAll(
    profile: UserProfile,
    expenses: ExpenseRecord[],
    incomes: IncomeRecord[]
  ): Promise<{ success: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, count: 0, error: 'Supabase not initialized' };

    try {
      let syncedCount = 0;

      // 1. Sync Profile
      try {
        await client.from('profiles').upsert(profileToSupabaseRow(profile));
      } catch {
        // ignore profile error if table missing
      }

      // 2. Sync Expenses
      if (expenses.length > 0) {
        const rows = expenses.map(expenseToSupabaseRow);
        const { error } = await client.from('expenses').upsert(rows);
        if (error) {
          return { success: false, count: 0, error: error.message };
        }
        syncedCount += expenses.length;
      }

      // 3. Sync Incomes
      if (incomes.length > 0) {
        const incomeRows = incomes.map(incomeToSupabaseRow);
        try {
          await client.from('incomes').upsert(incomeRows);
        } catch {
          // ignore if table missing
        }
      }

      return { success: true, count: syncedCount };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || 'Sync failed' };
    }
  }
}

export const supabaseService = new SupabaseService();
