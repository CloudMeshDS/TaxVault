import { ExpenseRecord, SupportedCountry, UserProfile } from '../types';
import { storageService, DEFAULT_PROFILES, DEFAULT_INDIAN_PROFILE } from './storageService';
import { supabaseService } from './supabaseService';
import { authedFetch } from './apiBase';

/**
 * TaxVault API Client
 * Connects the frontend UI directly to the backend REST API engine (/api/*)
 * with automatic fallback to direct Supabase Cloud queries (essential for mobile/Capacitor APK
 * and seamless multi-device synchronization) and local offline caching in storageService.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  source?: 'supabase' | 'cache' | 'fallback' | 'supabase-direct';
  count?: number;
  message?: string;
  error?: string;
}

export interface SupabaseStatusResponse {
  configured: boolean;
  connected: boolean;
  tablesReady: boolean;
  url: string;
  tableStatus?: string;
  message: string;
  error?: string;
}

export const apiClient = {
  /**
   * Health Check
   */
  async getHealth(): Promise<{ status: string; supabaseConfigured: boolean }> {
    try {
      const res = await authedFetch('/api/health');
      if (res.ok) return await res.json();
    } catch {}
    const cfg = supabaseService.getConfig();
    return { status: 'offline', supabaseConfigured: cfg.isConfigured };
  },

  /**
   * Supabase Connection & Table Migration Status
   */
  async getSupabaseStatus(): Promise<SupabaseStatusResponse> {
    try {
      const res = await authedFetch('/api/supabase/status');
      if (res.ok) return await res.json();
    } catch {}

    // Direct check via Supabase client
    try {
      const status = await supabaseService.checkConnection();
      return {
        configured: status.isConfigured,
        connected: status.isConnected,
        tablesReady: status.tablesReady,
        url: status.projectUrl,
        message: status.errorMessage || (status.isConnected ? 'Connected directly to Supabase' : 'Unable to connect to Supabase'),
        error: status.errorMessage,
      };
    } catch (err: any) {
      return {
        configured: false,
        connected: false,
        tablesReady: false,
        url: '',
        message: err?.message || 'Unable to connect to backend or Supabase',
      };
    }
  },

  /**
   * Fetch All Expenses (GET /api/expenses?userId=... -> Supabase Cloud direct fallback)
   */
  async getExpenses(userId?: string, userEmail?: string): Promise<{ expenses: ExpenseRecord[]; source: string }> {
    // 1. Try Backend API first if reachable
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (userEmail) params.append('userEmail', userEmail);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await authedFetch(`/api/expenses${qs}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          storageService.saveExpenses(json.data);
          return { expenses: json.data, source: json.source || 'api' };
        }
      }
    } catch (err) {
      // Backend API unreachable (e.g. Capacitor mobile APK or dev server offline)
    }

    // 2. Direct Supabase Cloud query (vital for cross-device consistency). RLS limits it to the
    //    signed-in user's rows; without a session it would return [] and wipe the local cache.
    try {
      const res = (await supabaseService.hasSession())
        ? await supabaseService.fetchExpenses(userId)
        : { expenses: [], error: 'No Supabase session' };
      if (!res.error && Array.isArray(res.expenses)) {
        if (res.expenses.length > 0 || userId) {
          storageService.saveExpenses(res.expenses);
          return { expenses: res.expenses, source: 'supabase-direct' };
        }
      }
    } catch (err) {
      console.warn('Direct Supabase getExpenses fallback error:', err);
    }

    // 3. Fallback to local storage if API is offline
    const cached = storageService.getExpenses();
    return { expenses: cached, source: 'offline-cache' };
  },

  /**
   * Create New Expense via API / Supabase Direct (POST /api/expenses)
   */
  async createExpense(expense: ExpenseRecord, profileId?: string): Promise<ExpenseRecord> {
    if (!expense || !expense.merchant?.trim() || Number(expense.amount) <= 0) {
      throw new Error('Cannot save blank or zero-amount expense');
    }

    // Ensure customerTaxId / userId is attached to profile
    if (profileId) {
      if (!expense.customerTaxId || !expense.customerTaxId.startsWith('usr_')) {
        expense.customerTaxId = profileId;
      }
      (expense as any).userId = profileId;
    }

    let savedRemote = false;

    // 1. Try Backend API
    try {
      const res = await authedFetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(expense),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          expense = json.data;
          savedRemote = true;
        }
      }
    } catch (err) {
      // Backend API unreachable
    }

    // 2. Direct Supabase Cloud upsert if not saved via API
    if (!savedRemote) {
      try {
        const sbRes = await supabaseService.upsertExpense(expense);
        if (sbRes.success) {
          expense.syncStatus = 'synced';
          savedRemote = true;
        }
      } catch (err) {
        console.warn('Direct Supabase createExpense fallback error:', err);
      }
    }

    // 3. Save to local offline storage cache
    const current = storageService.getExpenses();
    const existingIdx = current.findIndex((e) => e.id === expense.id);
    const updated = existingIdx >= 0
      ? current.map((e) => (e.id === expense.id ? expense : e))
      : [expense, ...current];
    storageService.saveExpenses(updated);

    return expense;
  },

  /**
   * Update Expense via API / Supabase Direct (PUT /api/expenses/:id)
   */
  async updateExpense(expense: ExpenseRecord, profileId?: string): Promise<ExpenseRecord> {
    if (profileId) {
      if (!expense.customerTaxId || !expense.customerTaxId.startsWith('usr_')) {
        expense.customerTaxId = profileId;
      }
      (expense as any).userId = profileId;
    }

    let savedRemote = false;

    // 1. Try Backend API
    try {
      const res = await authedFetch(`/api/expenses/${encodeURIComponent(expense.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(expense),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          expense = json.data;
          savedRemote = true;
        }
      }
    } catch (err) {
      // Backend API unreachable
    }

    // 2. Direct Supabase Cloud upsert if not saved via API
    if (!savedRemote) {
      try {
        const sbRes = await supabaseService.upsertExpense(expense);
        if (sbRes.success) {
          expense.syncStatus = 'synced';
        }
      } catch (err) {
        console.warn('Direct Supabase updateExpense fallback error:', err);
      }
    }

    // 3. Update local storage
    const current = storageService.getExpenses();
    const updated = current.map((e) => (e.id === expense.id ? expense : e));
    storageService.saveExpenses(updated);

    return expense;
  },

  /**
   * Soft-Delete Expense via API / Supabase Direct (DELETE /api/expenses/:id - sets status='deleted')
   */
  async deleteExpense(id: string): Promise<boolean> {
    let deletedRemote = false;

    // 1. Try Backend API
    try {
      const res = await authedFetch(`/api/expenses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        deletedRemote = true;
      }
    } catch (err) {
      // Backend API unreachable
    }

    // 2. Direct Supabase Cloud soft delete
    if (!deletedRemote) {
      try {
        await supabaseService.deleteExpense(id);
      } catch (err) {
        console.warn('Direct Supabase deleteExpense fallback error:', err);
      }
    }

    // 3. Update local cache
    const current = storageService.getExpenses();
    const updated = current.map((e) =>
      e.id === id
        ? {
            ...e,
            status: 'deleted' as const,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            syncStatus: 'deleted' as const,
            claimableBusinessAmount: 0,
            isDeductible: false,
          }
        : e
    );
    storageService.saveExpenses(updated);
    return true;
  },

  /**
   * Restore a soft-deleted expense (POST /api/expenses/:id/restore)
   */
  async restoreExpense(id: string): Promise<boolean> {
    let restoredRemote = false;

    // 1. Try Backend API
    try {
      const res = await authedFetch(`/api/expenses/${encodeURIComponent(id)}/restore`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        restoredRemote = true;
      }
    } catch (err) {
      // Backend API unreachable
    }

    // 2. Direct Supabase Cloud restore
    if (!restoredRemote) {
      try {
        await supabaseService.restoreExpense(id);
      } catch (err) {
        console.warn('Direct Supabase restoreExpense fallback error:', err);
      }
    }

    storageService.restoreExpense(id);
    return true;
  },

  /**
   * Fetch User Profile from Backend API / Supabase Direct (GET /api/profile)
   */
  async getProfile(email?: string, userId?: string): Promise<UserProfile | null> {
    // 1. Try Backend API
    try {
      const params = new URLSearchParams();
      if (email) params.append('email', email);
      if (userId) params.append('userId', userId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await authedFetch(`/api/profile${qs}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          storageService.saveUserProfile(json.data);
          return json.data;
        }
      }
    } catch (err) {
      // Backend API unreachable
    }

    // 2. Direct Supabase Cloud fetchProfile (RLS returns only the signed-in user's own profile)
    const hasSession = await supabaseService.hasSession();
    if (hasSession) {
      try {
        const res = await supabaseService.fetchProfile(userId, email);
        if (res.profile) {
          storageService.saveUserProfile(res.profile);
          return res.profile;
        }
      } catch (err) {
        console.warn('Direct Supabase getProfile fallback error:', err);
      }
    }

    if (hasSession && (email || userId)) return null;
    return storageService.getUserProfile();
  },

  /**
   * The signed-in user's plan and scan usage as recorded by the server (GET /api/subscription).
   * Null for on-device demo accounts or when offline.
   */
  async getSubscription(): Promise<UserProfile['subscription'] | null> {
    try {
      const res = await authedFetch('/api/subscription', { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return null;
  },

  /**
   * Update User Profile via API / Supabase Direct (PUT /api/profile)
   */
  async updateProfile(profile: UserProfile): Promise<UserProfile> {
    let savedRemote = false;

    // 1. Try Backend API
    try {
      const res = await authedFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          profile = json.data;
          savedRemote = true;
        }
      }
    } catch (err) {
      // Backend API unreachable
    }

    // 2. Direct Supabase Cloud upsertProfile
    if (!savedRemote) {
      try {
        await supabaseService.upsertProfile(profile);
      } catch (err) {
        console.warn('Direct Supabase updateProfile fallback error:', err);
      }
    }

    storageService.saveUserProfile(profile);
    return profile;
  },

  /**
   * Reset / Seed realistic sample data for any country (POST /api/seed-country/:country)
   */
  async seedCountryData(country: SupportedCountry = 'NZ'): Promise<{ success: boolean; count: number; profile?: UserProfile; expenses?: ExpenseRecord[] }> {
    try {
      const res = await authedFetch(`/api/seed-country/${encodeURIComponent(country)}`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.expenses) storageService.saveExpenses(json.expenses);
        if (json.profile) storageService.saveUserProfile(json.profile);
        return { success: true, count: json.count || 0, profile: json.profile, expenses: json.expenses };
      }
    } catch (err) {
      console.warn(`API seed-country for ${country} failed, using local fallback:`, err);
    }
    // Demo accounts and offline use: seed the on-device store (the server only seeds signed-in accounts)
    const targetProfile = DEFAULT_PROFILES[country] || DEFAULT_INDIAN_PROFILE;
    storageService.resetToSampleData();
    storageService.saveUserProfile(targetProfile);
    return { success: true, count: storageService.getExpenses().length, profile: targetProfile };
  },

  /**
   * Reset to Realistic Indian Sample Data via API (POST /api/seed-indian)
   */
  async seedIndianData(): Promise<{ success: boolean; count: number }> {
    return this.seedCountryData('IN');
  },

  /**
   * Clear All Data via API (POST /api/reset-data)
   */
  async clearAllData(userId?: string): Promise<boolean> {
    try {
      const res = await authedFetch('/api/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        storageService.clearAllData();
        return true;
      }
    } catch (err) {
      console.warn('API reset-data failed:', err);
    }
    storageService.clearAllData();
    return true;
  },

  /**
   * AI Natural Language Search Query (POST /api/ai-search)
   */
  async parseSearchQuery(query: string): Promise<any> {
    try {
      const res = await authedFetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.filter || {};
      }
    } catch (err) {
      console.warn('AI search API error:', err);
    }
    return null;
  },

  /**
   * Aggregate Reports Metrics via API (GET /api/reports)
   */
  async getReportsMetrics(): Promise<any> {
    try {
      const res = await authedFetch('/api/reports', {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (err) {
      console.warn('API getReportsMetrics failed:', err);
    }
    return null;
  },
};
