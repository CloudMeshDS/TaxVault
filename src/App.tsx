import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Header } from './components/common/Header';
import { BottomNav, NavigationTab } from './components/common/BottomNav';
import { HomeScreen } from './components/home/HomeScreen';
import type { SettingSectionId } from './components/settings/SettingsView';
import { AuthScreen } from './components/auth/AuthScreen';
import { AndroidExitToast } from './components/common/AndroidExitToast';
import { PinLockModal } from './components/auth/PinLockModal';
import { useDoubleBackToExit } from './hooks/useDoubleBackToExit';

import { ExpenseRecord, IncomeRecord, SubscriptionTier, UserProfile, SupportedCountry } from './types';
import { calculateTaxPosition, detectDuplicateExpense, TAX_CONFIGS } from './services/taxRules';
import { storageService, DEFAULT_INDIAN_PROFILE, createCleanUserProfile } from './services/storageService';
import { supabaseService } from './services/supabaseService';
import { apiClient } from './services/apiClient';
import { ExtractedReceiptData, parseReceiptData } from './services/receiptOcr';
import { SubscriptionService } from './services/subscriptionService';
import { devicePermissions } from './services/devicePermissions';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ScanLine, Loader2 } from 'lucide-react';

import { activityLogService } from './services/activityLogService';
import { usageTrackingService } from './services/usageTrackingService';
import { authedFetch } from './services/apiBase';

// Screens and modals load on demand so sign-in and Home don't wait on PDF/Excel/report code
const ExpenseList = lazy(() => import('./components/expenses/ExpenseList').then((m) => ({ default: m.ExpenseList })));
const ReceiptScannerModal = lazy(() => import('./components/expenses/ReceiptScannerModal').then((m) => ({ default: m.ReceiptScannerModal })));
const ReceiptReviewModal = lazy(() => import('./components/expenses/ReceiptReviewModal').then((m) => ({ default: m.ReceiptReviewModal })));
const ExpenseDetailModal = lazy(() => import('./components/expenses/ExpenseDetailModal').then((m) => ({ default: m.ExpenseDetailModal })));
const DuplicateAlertModal = lazy(() => import('./components/expenses/DuplicateAlertModal').then((m) => ({ default: m.DuplicateAlertModal })));
const ReportsView = lazy(() => import('./components/reports/ReportsView').then((m) => ({ default: m.ReportsView })));
const CAShareView = lazy(() => import('./components/cashare/CAShareView').then((m) => ({ default: m.CAShareView })));
const AuthModal = lazy(() => import('./components/auth/AuthModal').then((m) => ({ default: m.AuthModal })));
const SubscriptionModal = lazy(() => import('./components/subscription/SubscriptionModal').then((m) => ({ default: m.SubscriptionModal })));
const ScanLimitModal = lazy(() => import('./components/subscription/ScanLimitModal').then((m) => ({ default: m.ScanLimitModal })));
const DevicePermissionModal = lazy(() => import('./components/common/DevicePermissionModal').then((m) => ({ default: m.DevicePermissionModal })));
const MileageTrackerModal = lazy(() => import('./components/mileage/MileageTrackerModal').then((m) => ({ default: m.MileageTrackerModal })));
const BankReconciliationModal = lazy(() => import('./components/banking/BankReconciliationModal').then((m) => ({ default: m.BankReconciliationModal })));
const InvoiceGeneratorModal = lazy(() => import('./components/invoicing/InvoiceGeneratorModal').then((m) => ({ default: m.InvoiceGeneratorModal })));
const TaxCalendarModal = lazy(() => import('./components/compliance/TaxCalendarModal').then((m) => ({ default: m.TaxCalendarModal })));
const ActivityAndUsageModal = lazy(() => import('./components/settings/ActivityAndUsageModal').then((m) => ({ default: m.ActivityAndUsageModal })));
const SupabaseSqlModal = lazy(() => import('./components/settings/SupabaseSqlModal').then((m) => ({ default: m.SupabaseSqlModal })));
const SettingsView = lazy(() => import('./components/settings/SettingsView').then((m) => ({ default: m.SettingsView })));

const TabFallback = () => (
  <div className="flex items-center justify-center py-20 text-slate-400">
    <Loader2 className="w-6 h-6 animate-spin" />
  </div>
);

const TAB_INDEX_MAP: Record<NavigationTab, number> = {
  home: 0,
  expenses: 1,
  reports: 2,
  cashare: 3,
  settings: 4,
};

export default function App() {
  // 1. Data State
  const [profile, setProfile] = useState<UserProfile>(() =>
    SubscriptionService.withCurrentUsagePeriod(storageService.getUserProfile())
  );
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => storageService.getExpenses());
  const [incomes, setIncomes] = useState<IncomeRecord[]>(() => storageService.getIncomes());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (
        hash.includes('type=recovery') ||
        hash.includes('access_token=') ||
        search.includes('type=recovery') ||
        search.includes('recovery')
      ) {
        return false;
      }
    }
    return storageService.isAuthenticated();
  });

  // 2. Navigation State with fluid directional screen transition
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [tabDirection, setTabDirection] = useState<'right' | 'left' | 'glide'>('glide');

  const handleSelectTab = useCallback((nextTab: NavigationTab) => {
    setActiveTab((current) => {
      if (nextTab === current) return current;
      const oldIdx = TAB_INDEX_MAP[current] ?? 0;
      const newIdx = TAB_INDEX_MAP[nextTab] ?? 0;
      setTabDirection(newIdx > oldIdx ? 'right' : 'left');
      return nextTab;
    });
  }, []);

  // 3. Offline & Sync Status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 5. Security App Lock
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => Boolean(profile.biometricLock));

  // 6. Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerInitialMode, setScannerInitialMode] = useState<'camera' | 'upload' | 'picker'>('camera');

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [extractedCandidate, setExtractedCandidate] = useState<ExtractedReceiptData | null>(null);

  // Fast direct OCR processing state (for native camera capture)
  const [isProcessingReceipt, setIsProcessingReceipt] = useState<boolean>(false);
  const [processingStatusText, setProcessingStatusText] = useState<string>('Reading invoice text...');

  const [selectedExpenseForDetail, setSelectedExpenseForDetail] = useState<ExpenseRecord | null>(null);

  const [duplicateAlertData, setDuplicateAlertData] = useState<{
    isOpen: boolean;
    candidate: ExpenseRecord | null;
    existing: ExpenseRecord | null;
  }>({
    isOpen: false,
    candidate: null,
    existing: null,
  });

  // 7. Cloud Auth & Subscription Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [subscriptionReason, setSubscriptionReason] = useState<string | undefined>(undefined);
  const [isScanLimitModalOpen, setIsScanLimitModalOpen] = useState(false);

  // 8. Smart Tax Suite Modals (Mileage, Banking, Invoicing, Tax Calendar)
  const [isMileageOpen, setIsMileageOpen] = useState(false);
  const [isBankReconOpen, setIsBankReconOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isTaxCalendarOpen, setIsTaxCalendarOpen] = useState(false);
  const [isPermissionPromptOpen, setIsPermissionPromptOpen] = useState(false);

  // 9. Activity Audit Trail & Supabase Schema Modals
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityModalTab, setActivityModalTab] = useState<'activity' | 'usage'>('activity');
  const [isSupabaseSqlModalOpen, setIsSupabaseSqlModalOpen] = useState(false);

  // 10. Settings Section Navigation (for Android back navigation inside Settings)
  const [settingsSection, setSettingsSection] = useState<SettingSectionId | null>(null);

  // 10. Android & Mobile Back Button Navigation Handler
  const handleBackAction = useCallback((): boolean => {
    // 0. Direct OCR processing modal
    if (isProcessingReceipt) {
      setIsProcessingReceipt(false);
      return true;
    }

    // 0a. Permission prompt modal
    if (isPermissionPromptOpen) {
      setIsPermissionPromptOpen(false);
      return true;
    }

    // 0b. Scan limit modal
    if (isScanLimitModalOpen) {
      setIsScanLimitModalOpen(false);
      return true;
    }

    // 1. Duplicate alert modal
    if (duplicateAlertData.isOpen) {
      setDuplicateAlertData({ isOpen: false, candidate: null, existing: null });
      return true;
    }

    // 2. Expense Detail modal
    if (selectedExpenseForDetail) {
      setSelectedExpenseForDetail(null);
      return true;
    }

    // 3. Receipt Review modal
    if (isReviewOpen) {
      setIsReviewOpen(false);
      return true;
    }

    // 4. Scanner modal
    if (isScannerOpen) {
      setIsScannerOpen(false);
      return true;
    }

    // 5. Auth modal
    if (isAuthOpen) {
      setIsAuthOpen(false);
      return true;
    }

    // 6. Subscription modal
    if (isSubscriptionOpen) {
      setIsSubscriptionOpen(false);
      return true;
    }

    // 7. Activity Log & Supabase Schema Modals
    if (isActivityModalOpen) {
      setIsActivityModalOpen(false);
      return true;
    }
    if (isSupabaseSqlModalOpen) {
      setIsSupabaseSqlModalOpen(false);
      return true;
    }

    // 8. Smart Tax Suite modals
    if (isMileageOpen) {
      setIsMileageOpen(false);
      return true;
    }
    if (isBankReconOpen) {
      setIsBankReconOpen(false);
      return true;
    }
    if (isInvoiceOpen) {
      setIsInvoiceOpen(false);
      return true;
    }
    if (isTaxCalendarOpen) {
      setIsTaxCalendarOpen(false);
      return true;
    }

    // 9. If inside Settings detail section -> back to Settings root list
    if (activeTab === 'settings' && settingsSection !== null) {
      setSettingsSection(null);
      return true;
    }

    // 10. If on secondary tab (expenses, reports, cashare, settings) -> back to Home tab
    if (activeTab !== 'home') {
      setActiveTab('home');
      return true;
    }

    // 11. Already at Root (Home tab with no open modals) -> Return false so double-back exit takes over
    return false;
  }, [
    isPermissionPromptOpen,
    isScanLimitModalOpen,
    duplicateAlertData.isOpen,
    selectedExpenseForDetail,
    isReviewOpen,
    isScannerOpen,
    isAuthOpen,
    isSubscriptionOpen,
    isActivityModalOpen,
    isSupabaseSqlModalOpen,
    isMileageOpen,
    isBankReconOpen,
    isInvoiceOpen,
    isTaxCalendarOpen,
    activeTab,
    settingsSection,
  ]);

  const { showExitToast } = useDoubleBackToExit({
    onBackAction: handleBackAction,
    exitTimeoutMs: 2000,
  });

  // Permissions are requested just-in-time when the user uses the camera or uploads files

  // Calculate Metrics
  const taxResult = useMemo(() => {
    return calculateTaxPosition(expenses, profile.country, incomes);
  }, [expenses, profile.country, incomes]);

  // Review Needed Count (for badges)
  const reviewCount = useMemo(() => {
    return expenses.filter(
      (e) => e.caReviewStatus === 'Needs CA Review' || e.calculationMismatch
    ).length;
  }, [expenses]);

  // Initial load from backend API (GET /api/expenses, GET /api/profile)
  useEffect(() => {
    let isMounted = true;
    async function loadDataFromApi() {
      try {
        setIsSyncing(true);
        const storedProfile = storageService.getUserProfile();
        const authed = storageService.isAuthenticated();
        // Signed-out visitors only see the auth screen; never pull an unscoped expense list for them
        if (!authed || !storedProfile?.id) return;

        const [apiExpenses, apiProfile] = await Promise.all([
          apiClient.getExpenses(storedProfile.id, storedProfile.email),
          storedProfile.email ? apiClient.getProfile(storedProfile.email, storedProfile.id) : Promise.resolve(null),
        ]);
        if (isMounted) {
          if (apiExpenses && Array.isArray(apiExpenses.expenses)) {
            setExpenses(apiExpenses.expenses);
          }
          if (apiProfile && apiProfile.email?.toLowerCase() === storedProfile.email?.toLowerCase()) {
            setProfile(SubscriptionService.withCurrentUsagePeriod(apiProfile));
          }
        }
      } catch (err) {
        console.warn('Initial API load fallback:', err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    }
    loadDataFromApi();
    return () => {
      isMounted = false;
    };
  }, []);

  // Network Event Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [expenses, profile]);

  const processSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const payload = storageService.generateBackupPayload();
      await authedFetch('/api/backup/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupPayload: payload }),
      }).catch(() => {});

      storageService.setLastBackupTimestamp(new Date().toISOString());
      setProfile((prev) => ({ ...prev, lastBackupDate: new Date().toISOString() }));
    } finally {
      setIsSyncing(false);
    }
  }, [profile]);

  // Duplicate Check Helper
  const checkDuplicate = (candidate: {
    merchant: string;
    date: string;
    amount: number;
    invoiceNumber?: string;
  }) => {
    return detectDuplicateExpense(candidate, expenses);
  };

  const createEmptyCandidate = (country: SupportedCountry = 'NZ'): ExtractedReceiptData => ({
    merchant: '',
    invoiceNumber: '',
    receiptNumber: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    vendorAddress: '',
    vendorPhone: '',
    country,
    vendorTaxId: '',
    customerTaxId: profile.taxId || profile.gstin || '',
    vendorGSTIN: '',
    customerGSTIN: profile.taxId || profile.gstin || '',
    state: profile.state || (country === 'NZ' ? 'Auckland' : 'Maharashtra (27)'),
    paymentMethod: 'Credit Card',
    subtotal: 0,
    discount: 0,
    taxableAmount: 0,
    taxAmount: 0,
    gstAmount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    totalAmount: 0,
    category: 'Office Supplies',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 0,
    items: [],
    confidenceScores: { total: 100, merchant: 100, date: 100, taxAmount: 100, items: 100 },
    gstTreatment: 'Likely eligible',
    calculationMismatch: false,
    isManualEntry: true,
  });

  const openManualExpenseEntry = () => {
    setIsScanLimitModalOpen(false);
    setIsScannerOpen(false);
    setExtractedCandidate(createEmptyCandidate(profile.country || 'NZ'));
    setIsReviewOpen(true);
  };

  const incrementScanCount = (count: number = 1) => {
    setProfile((prev) => {
      const current = SubscriptionService.withCurrentUsagePeriod(prev);
      const updated: UserProfile = {
        ...current,
        subscription: {
          ...current.subscription,
          receiptsScannedThisMonth: (current.subscription?.receiptsScannedThisMonth || 0) + count,
        },
      };
      storageService.saveUserProfile(updated);
      apiClient.updateProfile(updated).catch(() => {});
      return updated;
    });
  };

  // Receipt Scanner Finished -> Proceeds to Step 2 Review
  const handleReceiptProcessed = (extracted: ExtractedReceiptData) => {
    if (!extracted.isManualEntry) {
      incrementScanCount(1);
    }
    setExtractedCandidate(extracted);
    setIsReviewOpen(true);
  };

  // Save Expense Handler (Checks duplicate first)
  const handleSaveExpense = (newExpense: ExpenseRecord) => {
    const cleanMerchant = newExpense?.merchant?.trim();
    const cleanAmount = Number(newExpense?.amount);
    if (!cleanMerchant || isNaN(cleanAmount) || cleanAmount <= 0) {
      console.warn('Rejected blank or zero-amount expense:', newExpense);
      return;
    }

    const dup = checkDuplicate(newExpense);
    if (dup.isDuplicate && dup.matchedExpense) {
      setDuplicateAlertData({
        isOpen: true,
        candidate: newExpense,
        existing: dup.matchedExpense,
      });
      return;
    }

    // Direct save via API
    saveExpenseDirect(newExpense);
  };

  // Mileage claim as expense
  const handleLogMileageAsExpense = (mileageExpense: ExpenseRecord) => {
    if (mileageExpense?.merchant?.trim() && Number(mileageExpense.amount) > 0) {
      saveExpenseDirect(mileageExpense);
    }
  };

  // Bank transaction converted to expense
  const handleAddExpenseFromBank = (bankExpense: ExpenseRecord) => {
    if (bankExpense?.merchant?.trim() && Number(bankExpense.amount) > 0) {
      saveExpenseDirect(bankExpense);
    }
  };

  // Record income from client invoice
  const handleRecordIncome = (income: IncomeRecord) => {
    if (!income || !income.client?.trim() || isNaN(Number(income.amount)) || Number(income.amount) <= 0) {
      return;
    }
    const updated = [income, ...storageService.getIncomes()];
    storageService.saveIncomes(updated);
    setIncomes(updated);
  };

  // Batch upload receipts handler
  const handleBatchReceiptsProcessed = (extractedList: ExtractedReceiptData[]) => {
    const validList = (extractedList || []).filter(
      (item) => item && item.merchant?.trim() && Number(item.totalAmount) > 0
    );
    if (validList.length === 0) return;

    incrementScanCount(validList.length);
    const taxRate = TAX_CONFIGS[profile.country]?.standardGSTRate || 0.15;
    const newExpenses: ExpenseRecord[] = validList.map((extracted, idx) => {
      const taxAmount = extracted.taxAmount || extracted.gstAmount || Math.round(extracted.totalAmount * taxRate * 100) / 100;
      return {
        id: `exp-${Date.now()}-${idx}`,
        merchant: extracted.merchant.trim(),
        invoiceNumber: extracted.invoiceNumber,
        date: extracted.date,
        category: extracted.category,
        expenseType: extracted.expenseType,
        businessPercentage: extracted.businessPercentage,
        claimableBusinessAmount: extracted.claimableBusinessAmount || extracted.totalAmount,
        subtotal: extracted.subtotal,
        discount: extracted.discount || 0,
        taxableAmount: extracted.taxableAmount || extracted.subtotal,
        taxAmount,
        cgst: 0,
        sgst: 0,
        igst: 0,
        cess: 0,
        roundOff: 0,
        amount: extracted.totalAmount,
        paymentMethod: 'Other',
        country: profile.country || 'IN',
        currency: profile.defaultCurrency || 'INR',
        customerTaxId: profile.id,
        items: extracted.items.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.total,
        })),
        receiptUrl: extracted.originalImage,
        receiptFileName: extracted.receiptFileName,
        gstTreatment: 'Likely eligible',
        caReviewStatus: 'Reviewed',
        confidenceScores: extracted.confidenceScores,
        syncStatus: 'synced',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const updated = [...newExpenses, ...expenses];
    setExpenses(updated);
    storageService.saveExpenses(updated);

    // Sync each batch expense to remote Supabase Cloud / API
    newExpenses.forEach((exp) => {
      apiClient.createExpense(exp, profile.id).catch(() => {});
    });
  };

  const saveExpenseDirect = async (expense: ExpenseRecord) => {
    const cleanMerchant = expense?.merchant?.trim();
    const cleanAmount = Number(expense?.amount);
    if (!expense || !cleanMerchant || isNaN(cleanAmount) || cleanAmount <= 0) {
      console.warn('saveExpenseDirect rejected blank expense:', expense);
      return;
    }

    // Attach user profile metadata for seamless multi-device sync
    if (profile.id) {
      if (!expense.customerTaxId || !expense.customerTaxId.startsWith('usr_')) {
        expense.customerTaxId = profile.id;
      }
      (expense as any).userId = profile.id;
    }
    if (profile.country && !expense.country) {
      expense.country = profile.country;
    }
    if (profile.defaultCurrency && !expense.currency) {
      expense.currency = profile.defaultCurrency;
    }

    // Navigate immediately to Expenses for snappy UX
    setIsReviewOpen(false);
    setDuplicateAlertData({ isOpen: false, candidate: null, existing: null });
    handleSelectTab('expenses');

    // Optimistic update
    const optimistic = [expense, ...expenses.filter(e => e.id !== expense.id)];
    setExpenses(optimistic);

    // Audit log activity
    activityLogService.logActivity({
      userId: profile.id,
      entityType: 'expense',
      entityId: expense.id,
      action: 'create',
      description: `Created voucher: ${expense.merchant} (${expense.currency || '$'}${expense.amount})`,
      status: 'success',
      changes: { merchant: expense.merchant, amount: expense.amount, category: expense.category },
    });

    // Call API / Supabase
    try {
      setIsSyncing(true);
      const saved = await apiClient.createExpense(expense, profile.id);
      setExpenses((prev) => prev.map((e) => (e.id === expense.id ? saved : e)));
    } catch (err) {
      console.warn('API create expense error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Update Expense Handler (PUT /api/expenses/:id)
  const handleUpdateExpense = async (updated: ExpenseRecord) => {
    const list = expenses.map((e) => (e.id === updated.id ? updated : e));
    setExpenses(list);
    if (selectedExpenseForDetail?.id === updated.id) {
      setSelectedExpenseForDetail(updated);
    }

    // Audit log activity
    activityLogService.logActivity({
      userId: profile.id,
      entityType: 'expense',
      entityId: updated.id,
      action: 'update',
      description: `Updated expense: ${updated.merchant} (${updated.currency || '$'}${updated.amount})`,
      status: 'success',
      changes: { merchant: updated.merchant, amount: updated.amount, caReviewStatus: updated.caReviewStatus },
    });

    try {
      setIsSyncing(true);
      await apiClient.updateExpense(updated, profile.id);
    } catch (err) {
      console.warn('API update expense error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Soft-Delete Expense Handler (DELETE /api/expenses/:id - marks status='deleted' without purging record)
  const handleDeleteExpense = async (id: string) => {
    const target = expenses.find((e) => e.id === id);
    const now = new Date().toISOString();

    // Mark status as 'deleted' without purging the record so it reflects in the list
    const updatedExpenses = expenses.map((e) =>
      e.id === id
        ? {
            ...e,
            status: 'deleted' as const,
            isDeleted: true,
            deletedAt: now,
            syncStatus: 'deleted' as const,
            claimableBusinessAmount: 0,
            isDeductible: false,
          }
        : e
    );
    setExpenses(updatedExpenses);

    if (selectedExpenseForDetail?.id === id) {
      setSelectedExpenseForDetail(null);
    }

    // Audit log activity
    activityLogService.logActivity({
      userId: profile.id,
      entityType: 'expense',
      entityId: id,
      action: 'delete',
      description: `Marked expense for ${target?.merchant || 'Vendor'} (${target?.currency || '$'}${target?.amount || 0}) as deleted`,
      status: 'warning',
      changes: target ? { status: 'deleted', merchant: target.merchant, amount: target.amount } : undefined,
    });

    try {
      setIsSyncing(true);
      await apiClient.deleteExpense(id);
    } catch (err) {
      console.warn('API delete expense error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Restore Soft-Deleted Expense Handler
  const handleRestoreExpense = async (id: string) => {
    const target = expenses.find((e) => e.id === id);
    const isBiz = target?.expenseType === 'Business';
    const isMixed = target?.expenseType === 'Mixed';
    const claimable = isBiz
      ? (target?.amount || 0)
      : isMixed
      ? Math.round((target?.amount || 0) * ((target?.businessPercentage || 50) / 100))
      : 0;

    const updatedExpenses = expenses.map((e) =>
      e.id === id
        ? {
            ...e,
            status: 'active' as const,
            isDeleted: false,
            deletedAt: undefined,
            syncStatus: 'synced' as const,
            claimableBusinessAmount: claimable,
            isDeductible: isBiz,
          }
        : e
    );
    setExpenses(updatedExpenses);

    if (selectedExpenseForDetail?.id === id) {
      setSelectedExpenseForDetail(null);
    }

    // Audit log activity
    activityLogService.logActivity({
      userId: profile.id,
      entityType: 'expense',
      entityId: id,
      action: 'update',
      description: `Restored expense for ${target?.merchant || 'Vendor'} (${target?.currency || '$'}${target?.amount || 0}) to active`,
      status: 'success',
      changes: target ? { status: 'active', merchant: target.merchant } : undefined,
    });

    try {
      setIsSyncing(true);
      await apiClient.restoreExpense(id);
    } catch (err) {
      console.warn('API restore expense error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Profile Update Handler (PUT /api/profile)
  const handleUpdateProfile = async (updated: UserProfile) => {
    setProfile(updated);

    // Audit log activity
    activityLogService.logActivity({
      userId: updated.id,
      entityType: 'profile',
      action: 'update',
      description: `Updated business profile: ${updated.businessName} (${updated.country})`,
      status: 'success',
      changes: { country: updated.country, businessName: updated.businessName, taxId: updated.taxId },
    });

    try {
      setIsSyncing(true);
      await apiClient.updateProfile(updated);
    } catch (err) {
      console.warn('API update profile error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Reset & Clear Handlers via API
  const handleResetData = async () => {
    try {
      setIsSyncing(true);
      await apiClient.seedIndianData();
      const freshExpenses = await apiClient.getExpenses(profile.id, profile.email);
      const freshProfile = await apiClient.getProfile(profile.email, profile.id);
      setExpenses(freshExpenses.expenses);
      if (freshProfile) setProfile(SubscriptionService.withCurrentUsagePeriod(freshProfile));
    } catch (err) {
      console.warn('Reset data error:', err);
      storageService.resetToSampleData();
      setProfile(storageService.getUserProfile());
      setExpenses(storageService.getExpenses());
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = async () => {
    try {
      setIsSyncing(true);
      await apiClient.clearAllData(profile.id);
      setExpenses([]);
      setIncomes([]);
    } catch (err) {
      console.warn('Clear data error:', err);
      storageService.clearAllData();
      setExpenses([]);
      setIncomes([]);
    } finally {
      setIsSyncing(false);
    }
  };

  // Fast Receipt OCR Process Handler (processes native photo capture directly)
  const processCapturedReceipt = async (dataUrl: string, fileName?: string) => {
    setIsProcessingReceipt(true);
    setProcessingStatusText('Reading receipt and detecting tax details...');
    try {
      const extracted = await parseReceiptData(
        dataUrl,
        profile.taxId || profile.gstin || '',
        profile.country || 'NZ'
      );
      extracted.originalImage = dataUrl;
      if (fileName) {
        extracted.receiptFileName = fileName;
      }
      setIsProcessingReceipt(false);
      handleReceiptProcessed(extracted);
    } catch (err) {
      console.error('Failed to parse receipt:', err);
      setIsProcessingReceipt(false);
      const empty = createEmptyCandidate(profile.country || 'NZ');
      empty.originalImage = dataUrl;
      handleReceiptProcessed(empty);
    }
  };

  // Quick Trigger Handlers
  const openScannerCamera = async () => {
    const scanCheck = SubscriptionService.canScanReceipt(profile);
    if (!scanCheck.allowed) {
      setIsScanLimitModalOpen(true);
      return;
    }
    devicePermissions.markPromptShown();
    setIsPermissionPromptOpen(false);

    // On native mobile (Android APK or iOS): Open device camera directly and as fast as possible!
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await CapCamera.getPhoto({
          quality: 92,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });

        if (photo?.dataUrl) {
          await processCapturedReceipt(photo.dataUrl);
        }
        return;
      } catch (err: any) {
        const msg = String(err?.message || err || '').toLowerCase();
        // If user cancelled / dismissed camera, return cleanly
        if (msg.includes('cancel') || msg.includes('user cancelled') || msg.includes('cancelled')) {
          return;
        }
        console.warn('Native camera capture fallback:', err);
        setScannerInitialMode('picker');
        setIsScannerOpen(true);
        return;
      }
    }

    // Web / desktop browser fallback
    setScannerInitialMode('camera');
    setIsScannerOpen(true);
  };

  const openScannerUpload = () => {
    const scanCheck = SubscriptionService.canScanReceipt(profile);
    if (!scanCheck.allowed) {
      setIsScanLimitModalOpen(true);
      return;
    }
    setScannerInitialMode('upload');
    setIsScannerOpen(true);
  };

  const openSubscriptionModal = (reason?: string) => {
    setSubscriptionReason(reason);
    setIsSubscriptionOpen(true);
  };

  const handleUpdateSubscription = (tier: SubscriptionTier, billingCycle: 'monthly' | 'annual') => {
    const updated: UserProfile = {
      ...profile,
      subscription: {
        ...profile.subscription,
        tier,
        billingCycle,
        status: 'active',
        monthlyReceiptLimit: tier === 'free' ? 10 : 999999,
      },
    };
    setProfile(updated);
    storageService.saveUserProfile(updated);
    apiClient.updateProfile(updated).catch(() => {});
  };

  const handleAuthenticated = async (updatedFields?: Partial<UserProfile>) => {
    storageService.setAuthenticated(true);
    let activeProfile = profile;
    if (updatedFields) {
      const currentEmail = (profile.email || '').toLowerCase().trim();
      const nextEmail = (updatedFields.email || '').toLowerCase().trim();
      const isSwitchingUser = Boolean(nextEmail && currentEmail && nextEmail !== currentEmail);

      let updated: UserProfile;
      if (isSwitchingUser || !profile.email) {
        const country = updatedFields.country || 'IN';
        const base = createCleanUserProfile(nextEmail || 'user@taxvault.app', updatedFields.fullName, country, updatedFields.id);
        updated = SubscriptionService.withCurrentUsagePeriod({
          ...base,
          ...updatedFields,
        });
      } else {
        updated = {
          ...profile,
          ...updatedFields,
        };
      }
      activeProfile = updated;
      setProfile(updated);
      storageService.saveUserProfile(updated);
      apiClient.updateProfile(updated).catch(() => {});
    }
    setIsAuthenticated(true);
    setIsAuthOpen(false);

    // Immediate cross-device cloud sync: pull the authenticated user's expenses from Supabase Cloud
    try {
      setIsSyncing(true);
      const [cloudData, serverSubscription] = await Promise.all([
        apiClient.getExpenses(activeProfile.id, activeProfile.email),
        apiClient.getSubscription(),
      ]);
      if (cloudData && Array.isArray(cloudData.expenses)) {
        setExpenses(cloudData.expenses);
        storageService.saveExpenses(cloudData.expenses);
      }
      // The plan shown is the one the server has on record, not whatever the profile carried in
      if (serverSubscription) {
        setProfile((prev) => {
          const synced = { ...prev, subscription: { ...prev.subscription, ...serverSubscription } };
          storageService.saveUserProfile(synced);
          return synced;
        });
      }
    } catch (err) {
      console.warn('Post-login cloud sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = async () => {
    setIsAuthOpen(false);
    storageService.setAuthenticated(false);
    await supabaseService.signOut().catch(() => {});
    storageService.clearUserProfile();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('taxvault_is_authenticated_v3');
        localStorage.removeItem('taxvault_user_profile_v3');
        localStorage.removeItem('taxvault_last_auth_email');
        sessionStorage.clear();
      } catch {}
    }
    setProfile(DEFAULT_INDIAN_PROFILE);
    setExpenses([]);
    storageService.saveExpenses([]);
    setIsAuthenticated(false);
    setActiveTab('home');
    setSettingsSection(null);
  };

  // Export Excel helper
  const handleExportExcel = async () => {
    try {
      const { ExportClient } = await import('./services/exportClient');
      const fy = (profile?.financialYear || 'Current').replace(/\s+/g, '_');
      const result = await ExportClient.downloadProExport('xlsx', {
        profile,
        expenses,
        taxResult,
        fileName: `TaxVault_Expenses_${fy}.xlsx`,
      });
      if (!result.ok) {
        if (result.reason === 'pro_required') openSubscriptionModal(result.message);
        else window.alert(result.message);
        return;
      }

      activityLogService.logActivity({
        userId: profile.id,
        entityType: 'export',
        action: 'export_excel',
        description: `Exported multi-sheet Excel CA tax audit pack (${expenses.length} expenses)`,
        status: 'success',
        metadata: { expenseCount: expenses.length, financialYear: profile.financialYear },
      });
      usageTrackingService.recordExportUsage(profile.id);
    } catch (err) {
      console.error('Failed to export Excel:', err);
    }
  };

  // DEFAULT SCREEN GATE: If user is not logged in, show default screen as login & signup.
  // Without login, user cannot use any other functions.
  if (!isAuthenticated) {
    return (
      <AuthScreen
        onAuthenticated={handleAuthenticated}
        currentProfile={profile}
      />
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Biometric / PIN Lock Screen */}
      {isAppLocked && (
        <PinLockModal
          isOpen={isAppLocked}
          correctPin={profile.appPin || '1234'}
          onUnlock={() => setIsAppLocked(false)}
        />
      )}

      {/* Main Container: Fully responsive automatically based on device width */}
      <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col min-h-[100dvh]">
        {/* Header */}
        <Header
          profile={profile}
          onOpenSubscription={() => openSubscriptionModal()}
          onOpenAuth={() => setIsAuthOpen(true)}
        />

        {/* Content Body Based on Active Tab with fluid transition and bottom nav clearance */}
        <main className="flex-1 overflow-y-auto pb-28 sm:pb-24">
          <Suspense fallback={<TabFallback />}>
          <div
            key={activeTab}
            className={`min-h-full ${
              tabDirection === 'right'
                ? 'screen-slide-right'
                : tabDirection === 'left'
                ? 'screen-slide-left'
                : 'screen-enter-glide'
            }`}
          >
            {activeTab === 'home' && (
              <HomeScreen
                profile={profile}
                expenses={expenses}
                taxResult={taxResult}
                onOpenScanner={openScannerCamera}
                onTriggerUpload={openScannerUpload}
                onOpenManualEntry={openManualExpenseEntry}
                onNavigateToExpenses={() => handleSelectTab('expenses')}
                onSelectExpense={(exp) => setSelectedExpenseForDetail(exp)}
                onOpenSubscription={() => openSubscriptionModal()}
                onOpenAuth={() => setIsAuthOpen(true)}
                onOpenMileage={() => setIsMileageOpen(true)}
                onOpenBankReconciliation={() => setIsBankReconOpen(true)}
                onOpenInvoiceGenerator={() => setIsInvoiceOpen(true)}
                onOpenTaxCalendar={() => setIsTaxCalendarOpen(true)}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpenseList
                expenses={expenses}
                profile={profile}
                onOpenScanner={openScannerCamera}
                onOpenManualEntry={openManualExpenseEntry}
                onSelectExpense={(exp) => setSelectedExpenseForDetail(exp)}
                onExportExcel={handleExportExcel}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                profile={profile}
                expenses={expenses}
                taxResult={taxResult}
                onOpenSubscription={openSubscriptionModal}
              />
            )}

            {activeTab === 'cashare' && (
              <CAShareView
                profile={profile}
                expenses={expenses}
                taxResult={taxResult}
                onUpdateProfile={handleUpdateProfile}
                onSelectExpense={(exp) => setSelectedExpenseForDetail(exp)}
                onOpenSubscription={openSubscriptionModal}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                profile={profile}
                onUpdateProfile={handleUpdateProfile}
                onResetData={handleResetData}
                onClearData={handleClearData}
                onSignOut={handleSignOut}
                onOpenSubscription={() => openSubscriptionModal()}
                onOpenAuth={() => setIsAuthOpen(true)}
                onOpenPermissions={() => setIsPermissionPromptOpen(true)}
                activeSection={settingsSection}
                onSelectSection={setSettingsSection}
                onOpenActivityLogs={(tab = 'activity') => {
                  setActivityModalTab(tab);
                  setIsActivityModalOpen(true);
                }}
                onOpenSupabaseSql={() => setIsSupabaseSqlModalOpen(true)}
              />
            )}
          </div>
          </Suspense>
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          reviewCount={reviewCount}
        />
      </div>

      <Suspense fallback={null}>
      {/* MODAL 1: Receipt Scanner (Camera, PDF, Crop/Rotate, Batch) */}
      {isScannerOpen && (
        <ReceiptScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          profile={profile}
          onReceiptProcessed={handleReceiptProcessed}
          onBatchReceiptsProcessed={handleBatchReceiptsProcessed}
          initialMode={scannerInitialMode}
          onOpenManualEntry={openManualExpenseEntry}
          onOpenSubscription={openSubscriptionModal}
        />
      )}

      {/* MODAL 2: Receipt Review Screen (THE MOST IMPORTANT SCREEN) */}
      {isReviewOpen && extractedCandidate && (
        <ReceiptReviewModal
          isOpen={isReviewOpen}
          onClose={() => {
            setIsReviewOpen(false);
            setExtractedCandidate(null);
          }}
          extractedData={extractedCandidate}
          profile={profile}
          onSaveExpense={handleSaveExpense}
          onTriggerDuplicateCheck={checkDuplicate}
        />
      )}

      {/* MODAL 3: Expense Detail View (View voucher, line items, CA status, delete) */}
      {selectedExpenseForDetail && (
      <ExpenseDetailModal
        isOpen={Boolean(selectedExpenseForDetail)}
        onClose={() => setSelectedExpenseForDetail(null)}
        expense={selectedExpenseForDetail}
        profile={profile}
        onUpdateExpense={handleUpdateExpense}
        onDeleteExpense={handleDeleteExpense}
        onRestoreExpense={handleRestoreExpense}
      />
      )}

      {/* MODAL 4: Duplicate Detection Alert */}
      {duplicateAlertData.isOpen && (
      <DuplicateAlertModal
        isOpen={duplicateAlertData.isOpen}
        onClose={() => setDuplicateAlertData({ isOpen: false, candidate: null, existing: null })}
        existingExpense={duplicateAlertData.existing}
        newExpenseCandidate={duplicateAlertData.candidate}
        onSaveAnyway={() => {
          if (duplicateAlertData.candidate) {
            saveExpenseDirect(duplicateAlertData.candidate);
          }
        }}
      />
      )}

      {/* MODAL 5: Cloud Authentication (Email Login, Signup, Biometrics, PIN) */}
      {isAuthOpen && (
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthenticated={handleAuthenticated}
        onSignOut={handleSignOut}
        platform={profile.devicePlatform || 'desktop'}
        currentProfile={profile}
      />
      )}

      {/* MODAL 6: Subscription & Tier Upgrade (Free vs Pro vs Enterprise) */}
      {isSubscriptionOpen && (
      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => {
          setIsSubscriptionOpen(false);
          setSubscriptionReason(undefined);
        }}
        profile={profile}
        taxConfig={TAX_CONFIGS[profile.country] || TAX_CONFIGS['NZ']}
        onUpdateSubscription={handleUpdateSubscription}
        initialReason={subscriptionReason}
      />
      )}

      {/* MODAL 7: Mileage & Vehicle Logbook Tracker */}
      {isMileageOpen && (
      <MileageTrackerModal
        isOpen={isMileageOpen}
        onClose={() => setIsMileageOpen(false)}
        profile={profile}
        onLogMileageAsExpense={handleLogMileageAsExpense}
      />
      )}

      {/* MODAL 8: Bank Statement CSV Reconciliation */}
      {isBankReconOpen && (
      <BankReconciliationModal
        isOpen={isBankReconOpen}
        onClose={() => setIsBankReconOpen(false)}
        profile={profile}
        expenses={expenses}
        onAddExpenseFromBank={handleAddExpenseFromBank}
      />
      )}

      {/* MODAL 9: Client Sales Invoice Generator */}
      {isInvoiceOpen && (
      <InvoiceGeneratorModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        profile={profile}
        onRecordIncome={handleRecordIncome}
      />
      )}

      {/* MODAL 10: Statutory Tax Compliance Calendar */}
      {isTaxCalendarOpen && (
      <TaxCalendarModal
        isOpen={isTaxCalendarOpen}
        onClose={() => setIsTaxCalendarOpen(false)}
        profile={profile}
      />
      )}

      {/* Device Permissions Request Modal */}
      {isPermissionPromptOpen && (
      <DevicePermissionModal
        isOpen={isPermissionPromptOpen}
        onClose={() => setIsPermissionPromptOpen(false)}
        onPermissionsGranted={() => setIsPermissionPromptOpen(false)}
      />
      )}

      {/* Android Double-Back to Exit Confirmation Toast */}
      <AndroidExitToast isVisible={showExitToast} />

      {/* MODAL 11: Scan Limit Reached Modal (Prompt to Buy Pro or Enter Manually) */}
      {isScanLimitModalOpen && (
      <ScanLimitModal
        isOpen={isScanLimitModalOpen}
        onClose={() => setIsScanLimitModalOpen(false)}
        profile={profile}
        onUpgradeToPro={() => openSubscriptionModal('AI Receipt Scan Limit Reached')}
        onEnterManually={openManualExpenseEntry}
      />
      )}

      {/* MODAL 12: Direct Camera Capture AI Processing Overlay */}
      {isProcessingReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none modal-backdrop-animation">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl border border-slate-200/80 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping" />
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-600 shadow-md">
                <ScanLine className="w-8 h-8 animate-pulse text-emerald-600" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">AI Reading Receipt</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {processingStatusText}
              </p>
            </div>

            <div className="text-[11px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-200/70 py-1.5 px-3 rounded-full flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>Extracting totals & GST details...</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 13: Activity Audit Logs & Customer Token/Request Usage */}
      {isActivityModalOpen && (
      <ActivityAndUsageModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        profile={profile}
        initialTab={activityModalTab}
        onOpenSubscription={() => openSubscriptionModal('AI Token Usage Quotas')}
      />
      )}

      {/* MODAL 14: Supabase PostgreSQL Schema & Multi-Country DDL */}
      {isSupabaseSqlModalOpen && (
      <SupabaseSqlModal
        isOpen={isSupabaseSqlModalOpen}
        onClose={() => setIsSupabaseSqlModalOpen(false)}
        supabaseUrl={(import.meta as any).env?.VITE_SUPABASE_URL || 'https://supabase.com/dashboard'}
      />
      )}
      </Suspense>
    </div>
  );
}
