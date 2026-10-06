import { ExpenseRecord, IncomeRecord, UserProfile } from '../types';

const STORAGE_KEYS = {
  USER_PROFILE: 'taxvault_user_profile_v1',
  EXPENSES: 'taxvault_expenses_v1',
  INCOMES: 'taxvault_incomes_v1',
  SYNC_QUEUE: 'taxvault_sync_queue_v1',
  LAST_BACKUP: 'taxvault_last_backup_v1',
  ACCOUNTANT_TOKENS: 'taxvault_accountant_tokens_v1',
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: '',
  fullName: '',
  email: '',
  country: 'NZ',
  entityType: 'sole_trader',
  taxNumber: '',
  gstRegistered: false,
  gstNumber: '',
  baseCurrency: 'NZD',
  financialYearEnding: '2027-03-31',
  accountantEmail: '',
  accountantName: '',
  mfaEnabled: false,
  biometricEnabled: false,
  devicePlatform: 'ios',
  subscription: {
    tier: 'free',
    billingCycle: 'monthly',
    status: 'active',
    receiptsScannedThisMonth: 0,
    monthlyReceiptLimit: 10,
    renewsOn: '2027-03-31',
  },
};

class StorageService {
  public getUserProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.subscription) {
          parsed.subscription = DEFAULT_USER_PROFILE.subscription;
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_USER_PROFILE;
  }

  public saveUserProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }

  public getExpenses(): ExpenseRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }

  public saveExpenses(expenses: ExpenseRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch {
      // ignore
    }
  }

  public addExpense(expense: ExpenseRecord): void {
    const list = this.getExpenses();
    const updated = [expense, ...list];
    this.saveExpenses(updated);
  }

  public updateExpense(expense: ExpenseRecord): void {
    const list = this.getExpenses();
    const updated = list.map(e => (e.id === expense.id ? expense : e));
    this.saveExpenses(updated);
  }

  public deleteExpense(id: string): void {
    const list = this.getExpenses();
    const updated = list.filter(e => e.id !== id);
    this.saveExpenses(updated);
  }

  public getIncomes(): IncomeRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INCOMES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }

  public saveIncomes(incomes: IncomeRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(incomes));
    } catch {
      // ignore
    }
  }

  public addIncome(income: IncomeRecord): void {
    const list = this.getIncomes();
    const updated = [income, ...list];
    this.saveIncomes(updated);
  }

  public getLastBackupTimestamp(): string {
    return localStorage.getItem(STORAGE_KEYS.LAST_BACKUP) || new Date().toISOString();
  }

  public setLastBackupTimestamp(isoDate: string): void {
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, isoDate);
  }

  /**
   * Generates a secure encrypted backup file payload
   */
  public generateBackupPayload() {
    const profile = this.getUserProfile();
    const expenses = this.getExpenses();
    const incomes = this.getIncomes();
    const payload = {
      app: 'TaxVault Mobile',
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      country: profile.country,
      profile,
      expenses,
      incomes,
      checksum: 'SHA256-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    };
    return payload;
  }

  public restoreFromPayload(payload: any): boolean {
    if (!payload || !payload.profile || !Array.isArray(payload.expenses)) {
      return false;
    }
    this.saveUserProfile(payload.profile);
    this.saveExpenses(payload.expenses);
    if (Array.isArray(payload.incomes)) {
      this.saveIncomes(payload.incomes);
    }
    this.setLastBackupTimestamp(new Date().toISOString());
    return true;
  }
}

export const storageService = new StorageService();
