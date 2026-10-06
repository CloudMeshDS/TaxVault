import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/common/Header';
import { BottomNav, NavigationTab } from './components/common/BottomNav';
import { TaxDashboard } from './components/dashboard/TaxDashboard';
import { ExpenseList } from './components/expenses/ExpenseList';
import { ReceiptScannerModal } from './components/expenses/ReceiptScannerModal';
import { AccountantReportView } from './components/reports/AccountantReportView';
import { CurrencyConverterModal } from './components/currency/CurrencyConverterModal';
import { TaxSettingsModal } from './components/settings/TaxSettingsModal';
import { AuthModal } from './components/auth/AuthModal';
import { SubscriptionModal } from './components/subscription/SubscriptionModal';
import { AndroidInstallModal } from './components/android/AndroidInstallModal';

import { CountryTaxConfig, ExpenseRecord, IncomeRecord, SubscriptionTier, UserProfile } from './types';
import { TAX_CONFIGS, calculateTaxPosition } from './services/taxRules';
import { storageService } from './services/storageService';
import { ExportService } from './services/exportService';
import { currencyService } from './services/currencyService';
import { supabaseService } from './services/supabaseService';

export default function App() {
  // 1. Core Profile & Data State
  const [profile, setProfile] = useState<UserProfile>(() => storageService.getUserProfile());
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => storageService.getExpenses());
  const [incomes, setIncomes] = useState<IncomeRecord[]>(() => storageService.getIncomes());

  // 2. Navigation State
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  // 3. Offline Accessibility & Sync State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 4. Modals
  const [scannerOpen, setScannerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionReason, setSubscriptionReason] = useState<string | undefined>(undefined);
  const [androidInstallOpen, setAndroidInstallOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Active statutory country configuration
  const taxConfig: CountryTaxConfig = useMemo(() => {
    return TAX_CONFIGS[profile.country] || TAX_CONFIGS.NZ;
  }, [profile.country]);

  // Compute progressive tax position and GST metrics
  const taxResult = useMemo(() => {
    const grossIncomeTotal = incomes.reduce((sum, item) => sum + item.amount, 0);
    return calculateTaxPosition(grossIncomeTotal, expenses, profile.country, profile.gstRegistered);
  }, [incomes, expenses, profile.country, profile.gstRegistered]);

  // Network and PWA Install listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processOfflineSync();
    };
    const handleOffline = () => setIsOnline(false);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Initial rates warm-up
    currencyService.fetchLiveRates(profile.baseCurrency);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [profile.baseCurrency]);

  // Load data dynamically from Supabase Cloud Database on startup
  useEffect(() => {
    async function loadCloudData() {
      try {
        const [profileRes, expensesRes, incomesRes] = await Promise.all([
          supabaseService.fetchProfile(),
          supabaseService.fetchExpenses(),
          supabaseService.fetchIncomes(),
        ]);

        if (profileRes.profile) {
          setProfile(profileRes.profile);
          storageService.saveUserProfile(profileRes.profile);
        }
        if (expensesRes.expenses && expensesRes.expenses.length > 0) {
          setExpenses(expensesRes.expenses);
          storageService.saveExpenses(expensesRes.expenses);
        }
        if (incomesRes.incomes && incomesRes.incomes.length > 0) {
          setIncomes(incomesRes.incomes);
          storageService.saveIncomes(incomesRes.incomes);
        }
      } catch (err) {
        console.warn('Initial Supabase cloud data load:', err);
      }
    }

    loadCloudData();
  }, []);

  // Offline sync runner
  const processOfflineSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const pendingExpenses = expenses.filter(e => e.syncStatus === 'pending');
      if (pendingExpenses.length > 0) {
        await fetch('/api/backup/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupPayload: storageService.generateBackupPayload() }),
        }).catch(() => {});

        // Sync with Supabase APIs
        await supabaseService.syncAll(profile, expenses, incomes).catch(() => {});

        const updated = expenses.map(e => ({ ...e, syncStatus: 'synced' as const }));
        setExpenses(updated);
        storageService.saveExpenses(updated);
      } else {
        // Periodic sync to Supabase
        await supabaseService.syncAll(profile, expenses, incomes).catch(() => {});
      }
      storageService.setLastBackupTimestamp(new Date().toISOString());
      setProfile(prev => ({ ...prev, lastBackupDate: new Date().toISOString() }));
    } finally {
      setIsSyncing(false);
    }
  }, [expenses, incomes, profile]);

  const handleManualBackup = async () => {
    setIsSyncing(true);
    try {
      await processOfflineSync();
      await new Promise(r => setTimeout(r, 600));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleOnline = () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    if (nextState) {
      processOfflineSync();
    }
  };

  const handleSaveExpense = (newExpense: ExpenseRecord) => {
    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses);
    storageService.saveExpenses(updatedExpenses);

    // Sync single record with Supabase API
    supabaseService.upsertExpense(newExpense).catch(() => {});

    // Increment monthly receipts count in subscription tracker
    const currentCount = profile.subscription?.receiptsScannedThisMonth || 0;
    const updatedProfile: UserProfile = {
      ...profile,
      subscription: {
        ...profile.subscription,
        receiptsScannedThisMonth: currentCount + 1,
      },
    };
    setProfile(updatedProfile);
    storageService.saveUserProfile(updatedProfile);

    if (isOnline) {
      processOfflineSync();
    }
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    storageService.saveExpenses(updated);

    // Delete in Supabase
    supabaseService.deleteExpense(id).catch(() => {});
  };

  const handlePullFromSupabase = async () => {
    const res = await supabaseService.fetchExpenses();
    if (res.expenses && res.expenses.length > 0) {
      const mergedMap = new Map<string, ExpenseRecord>();
      expenses.forEach(e => mergedMap.set(e.id, e));
      res.expenses.forEach(e => mergedMap.set(e.id, e));
      const mergedList = Array.from(mergedMap.values()).sort((a, b) => b.date.localeCompare(a.date));
      setExpenses(mergedList);
      storageService.saveExpenses(mergedList);
      return { success: true, count: res.expenses.length };
    }
    return { success: false, error: res.error || 'No remote expenses found in Supabase table' };
  };

  const handleUpdateProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    storageService.saveUserProfile(newProfile);
  };

  const handleOpenSubscription = (reason?: string) => {
    setSubscriptionReason(reason);
    setSubscriptionOpen(true);
  };

  const handleUpdateSubscription = (tier: SubscriptionTier, billingCycle: 'monthly' | 'annual') => {
    const updated: UserProfile = {
      ...profile,
      subscription: {
        ...profile.subscription,
        tier,
        billingCycle,
        monthlyReceiptLimit: tier === 'free' ? 10 : Infinity,
      },
    };
    setProfile(updated);
    storageService.saveUserProfile(updated);
  };

  const handleInstallNativePrompt = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleExportCSV = () => {
    ExportService.generateCSV(expenses);
  };

  const pendingCount = expenses.filter(e => e.syncStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Header with brand, country, desktop nav, and actions */}
      <Header
        profile={profile}
        taxConfig={taxConfig}
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenBackup={handleManualBackup}
        onOpenSubscription={() => handleOpenSubscription()}
        onOpenAndroidInstall={() => setAndroidInstallOpen(true)}
        isSyncing={isSyncing}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingCount={pendingCount}
      />

      {/* Main Content: Full responsive container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-28 md:pb-12">
        {activeTab === 'dashboard' && (
          <TaxDashboard
            profile={profile}
            taxConfig={taxConfig}
            expenses={expenses}
            incomes={incomes}
            taxResult={taxResult}
            onOpenScanner={() => setScannerOpen(true)}
            onOpenAccountantReport={() => setActiveTab('accountant')}
            onOpenExpenses={() => setActiveTab('expenses')}
            onOpenCurrency={() => setActiveTab('currency')}
            onOpenSubscription={() => handleOpenSubscription('Upgrade to Compliance Pro for unlimited scans & CA audit exports')}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseList
            expenses={expenses}
            taxConfig={taxConfig}
            onOpenScanner={() => setScannerOpen(true)}
            onDeleteExpense={handleDeleteExpense}
            onExportCSV={handleExportCSV}
          />
        )}

        {activeTab === 'accountant' && (
          <AccountantReportView
            profile={profile}
            taxConfig={taxConfig}
            expenses={expenses}
            incomes={incomes}
            taxResult={taxResult}
            onUpdateProfile={handleUpdateProfile}
            onOpenSubscription={(reason) => handleOpenSubscription(reason)}
          />
        )}

        {activeTab === 'currency' && (
          <CurrencyConverterModal taxConfig={taxConfig} />
        )}

        {activeTab === 'settings' && (
          <TaxSettingsModal
            profile={profile}
            taxConfig={taxConfig}
            expenses={expenses}
            incomes={incomes}
            onUpdateProfile={handleUpdateProfile}
            onManualBackup={handleManualBackup}
            onPullFromSupabase={handlePullFromSupabase}
            isSyncing={isSyncing}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenSubscription={() => handleOpenSubscription()}
            onOpenAndroidInstall={() => setAndroidInstallOpen(true)}
          />
        )}
      </main>

      {/* Mobile Tab Navigation (docked at bottom on mobile screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800">
        <BottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingCount={pendingCount}
        />
      </div>

      {/* Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        taxConfig={taxConfig}
        profile={profile}
        onSaveExpense={handleSaveExpense}
        onOpenSubscription={() => handleOpenSubscription('Monthly 10-receipt free limit reached. Upgrade to Pro for unlimited scans.')}
        isOnline={isOnline}
      />

      {/* MFA / Biometric Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(overrides) => {
          if (overrides) {
            handleUpdateProfile({ ...profile, ...overrides });
          }
        }}
        platform={profile.devicePlatform || 'desktop'}
        currentProfile={profile}
      />

      {/* Subscription & Pricing Paywall Modal */}
      <SubscriptionModal
        isOpen={subscriptionOpen}
        onClose={() => setSubscriptionOpen(false)}
        profile={profile}
        taxConfig={taxConfig}
        onUpdateSubscription={handleUpdateSubscription}
        initialReason={subscriptionReason}
      />

      {/* Android APK & WebAPK Installer Modal */}
      <AndroidInstallModal
        isOpen={androidInstallOpen}
        onClose={() => setAndroidInstallOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallNativePrompt={handleInstallNativePrompt}
      />
    </div>
  );
}
