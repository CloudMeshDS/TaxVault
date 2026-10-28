import React, { useState, useMemo } from 'react';
import {
  Camera,
  Upload,
  Receipt,
  Sparkles,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Calendar,
  Filter,
  Clock,
  RotateCcw,
  Check,
  PenTool,
  Layers,
  BarChart3,
  Car,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { ExpenseRecord, SupportedCountry, TaxCalculationResult, UserProfile } from '../../types';
import {
  CATEGORY_MAP,
  calculateTaxPosition,
  detectRecurringExpenses,
  formatCurrency,
  FiscalQuarter,
  getQuarterBounds,
  getAllQuartersForFY,
  getCurrentFiscalQuarter,
  calculateQuarterlyBreakdown,
} from '../../services/taxRules';
import { SubscriptionService } from '../../services/subscriptionService';
import { pressable } from '../../utils/a11y';
import { formatDisplayDate } from '../../utils/format';

export type PeriodFilterMode = 'month' | 'quarter' | 'fy' | 'cy' | 'range' | 'all';

interface HomeScreenProps {
  profile: UserProfile;
  expenses: ExpenseRecord[];
  taxResult: TaxCalculationResult;
  onOpenScanner: () => void;
  onTriggerUpload: () => void;
  onOpenManualEntry?: () => void;
  onNavigateToExpenses: () => void;
  onSelectExpense: (expense: ExpenseRecord) => void;
  onOpenSubscription?: () => void;
  onOpenAuth?: () => void;
  onOpenMileage?: () => void;
  onOpenBankReconciliation?: () => void;
  onOpenInvoiceGenerator?: () => void;
  onOpenTaxCalendar?: () => void;
}

const MONTHS_LIST = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const AVAILABLE_YEARS = [2027, 2026, 2025, 2024, 2023];
const AVAILABLE_FYS = ['FY 2026-27', 'FY 2025-26', 'FY 2024-25'];

function getFYBounds(fy: string, country: SupportedCountry): { start: string; end: string } {
  const startYear = parseInt(fy.replace(/[^0-9]/g, '').slice(0, 4), 10) || 2026;
  const endYear = startYear + 1;

  if (country === 'AU') {
    return {
      start: `${startYear}-07-01`,
      end: `${endYear}-06-30`,
    };
  }

  // NZ, IN, CA default: 1 April to 31 March
  return {
    start: `${startYear}-04-01`,
    end: `${endYear}-03-31`,
  };
}

function getCYBounds(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

function getMonthBounds(year: number, month: number): { start: string; end: string } {
  const mStr = String(month).padStart(2, '0');
  const daysInMonth = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${mStr}-01`,
    end: `${year}-${mStr}-${String(daysInMonth).padStart(2, '0')}`,
  };
}

function parseDateToISO(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  const ymd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return trimmed;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  expenses,
  taxResult,
  onOpenScanner,
  onTriggerUpload,
  onOpenManualEntry,
  onNavigateToExpenses,
  onSelectExpense,
  onOpenSubscription,
  onOpenAuth,
  onOpenMileage,
  onOpenBankReconciliation,
  onOpenInvoiceGenerator,
  onOpenTaxCalendar,
}) => {
  // Period Filter State - default to 'all' so all uploaded receipts immediately reflect
  const [periodMode, setPeriodMode] = useState<PeriodFilterMode>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const now = new Date();
    return now.getMonth() + 1; // 1-12
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<FiscalQuarter>(() => getCurrentFiscalQuarter(profile.country));
  const [selectedQuarterFY, setSelectedQuarterFY] = useState<string>(profile.financialYear || 'FY 2026-27');
  const [selectedFY, setSelectedFY] = useState<string>(profile.financialYear || 'FY 2026-27');
  const [selectedCY, setSelectedCY] = useState<number>(() => new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  // Check recurring expenses (e.g., Adobe, Airtel broadband)
  const recurringItems = useMemo(() => detectRecurringExpenses(expenses), [expenses]);
  const scanUsage = SubscriptionService.getScanUsage(profile);
  const formatShortDate = (value?: string) => formatDisplayDate(value, profile.country);

  const fmt = (amount: number, showDecimals: boolean = false) =>
    formatCurrency(
      amount,
      profile.defaultCurrency || (profile.country === 'IN' ? 'INR' : 'NZD'),
      profile.currencySymbol || (profile.country === 'IN' ? '₹' : '$'),
      showDecimals
    );

  const taxLabel =
    profile.country === 'US'
      ? 'Sales Tax'
      : profile.country === 'CA'
      ? 'GST/HST'
      : 'GST Found';

  // Comprehensive 4-Quarter breakdown memo for the selected FY
  const quarterlyOverview = useMemo(() => {
    return calculateQuarterlyBreakdown(expenses, selectedQuarterFY, profile.country);
  }, [expenses, selectedQuarterFY, profile.country]);

  // Filtered Expenses by selected period (excludes soft-deleted records)
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (exp.status === 'deleted' || exp.isDeleted) return false;
      if (!exp.date) return true;
      if (periodMode === 'all') return true;

      const expIso = parseDateToISO(exp.date);
      if (!expIso) return true;

      if (periodMode === 'month') {
        const bounds = getMonthBounds(selectedYear, selectedMonth);
        return expIso >= bounds.start && expIso <= bounds.end;
      }

      if (periodMode === 'quarter') {
        const bounds = getQuarterBounds(selectedQuarter, selectedQuarterFY, profile.country);
        return expIso >= bounds.start && expIso <= bounds.end;
      }

      if (periodMode === 'fy') {
        const bounds = getFYBounds(selectedFY, profile.country);
        return expIso >= bounds.start && expIso <= bounds.end;
      }

      if (periodMode === 'cy') {
        const bounds = getCYBounds(selectedCY);
        return expIso >= bounds.start && expIso <= bounds.end;
      }

      if (periodMode === 'range') {
        if (customStartDate && expIso < customStartDate) return false;
        if (customEndDate && expIso > customEndDate) return false;
        return true;
      }

      return true;
    });
  }, [
    expenses,
    periodMode,
    selectedYear,
    selectedMonth,
    selectedQuarter,
    selectedQuarterFY,
    selectedFY,
    selectedCY,
    customStartDate,
    customEndDate,
    profile.country,
  ]);

  // Recalculate metrics dynamically for filtered period
  const currentTaxResult = useMemo(() => {
    return calculateTaxPosition(filteredExpenses, profile.country);
  }, [filteredExpenses, profile.country]);

  // Dynamic Badge Label
  const periodBadgeLabel = useMemo(() => {
    if (periodMode === 'month') {
      const m = MONTHS_LIST.find((item) => item.value === selectedMonth)?.label || 'Month';
      return `${m} ${selectedYear}`;
    }
    if (periodMode === 'quarter') {
      const bounds = getQuarterBounds(selectedQuarter, selectedQuarterFY, profile.country);
      return `${bounds.shortLabel} ${selectedQuarterFY} (${bounds.monthsLabel})`;
    }
    if (periodMode === 'fy') {
      return selectedFY;
    }
    if (periodMode === 'cy') {
      return `CY ${selectedCY}`;
    }
    if (periodMode === 'range') {
      if (customStartDate && customEndDate) {
        return `${customStartDate} → ${customEndDate}`;
      }
      return 'Custom Range';
    }
    return 'All Time';
  }, [periodMode, selectedMonth, selectedYear, selectedQuarter, selectedQuarterFY, selectedFY, selectedCY, customStartDate, customEndDate, profile.country]);

  // Recent 5 expenses matching the filtered period (or fallback to latest active expenses)
  const recentExpenses = useMemo(() => {
    const list = filteredExpenses.length > 0
      ? filteredExpenses
      : expenses.filter((exp) => exp.status !== 'deleted' && !exp.isDeleted);
    return list.slice(0, 5);
  }, [filteredExpenses, expenses]);

  return (
    <div className="px-4 pt-4 space-y-6 pb-28 max-w-xl mx-auto select-none">
      {/* 1. Scan allowance (free plan only; paid plans manage this in Settings) */}
      {onOpenSubscription && !scanUsage.unlimited && (
        <div
          {...pressable(onOpenSubscription)}
          className="group cursor-pointer bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 transition-colors hover:border-slate-300"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-slate-700">
                {scanUsage.remaining === 0
                  ? 'No AI scans left this month'
                  : `${scanUsage.remaining} of ${scanUsage.limit} AI scans left this month`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
              <div
                className={`h-full rounded-full ${scanUsage.remaining === 0 ? 'bg-rose-500' : 'bg-brand'}`}
                style={{ width: `${Math.min(100, (scanUsage.used / Math.max(1, scanUsage.limit)) * 100)}%` }}
              />
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
        </div>
      )}

      {/* 2. Recurring Expense Notification Banner (if any detected) */}
      {recurringItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-600/30 rounded-2xl p-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-amber-700">Recurring Expense Detected</div>
            <p className="text-amber-700/80 mt-0.5 leading-relaxed">
              We noticed <strong className="text-slate-900">{recurringItems[0].merchant}</strong> ({fmt(recurringItems[0].averageAmount)}) repeats every month.
            </p>
          </div>
        </div>
      )}

      {/* 3. DYNAMIC PERIOD FILTER SELECTOR (Month, Year, FY, CY, Date Range) */}
      <div className="space-y-3">
        {/* Total for the selected period; the period chip opens the period picker */}
        <section className="bg-white border border-slate-200 rounded-3xl p-5" aria-label="Expense summary">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-500">Total expenses</span>
            <button
              type="button"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              aria-expanded={isFilterExpanded}
              className="h-9 pl-3 pr-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Change period"
            >
              <span className="whitespace-nowrap">{periodBadgeLabel}</span>
              <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="mt-1 text-[2.5rem] leading-tight font-bold text-slate-900 tracking-tight font-mono break-all">
            {fmt(currentTaxResult.totalExpenses)}
          </div>
          <div className="text-sm text-slate-500">
            {filteredExpenses.length} {filteredExpenses.length === 1 ? 'receipt' : 'receipts'}
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
              <dt className="text-xs text-slate-500">Business</dt>
              <dd className="text-sm font-semibold text-slate-900 font-mono truncate">{fmt(currentTaxResult.businessExpenses)}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
              <dt className="text-xs text-slate-500">Personal</dt>
              <dd className="text-sm font-semibold text-slate-900 font-mono truncate">{fmt(currentTaxResult.personalExpenses)}</dd>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-3 py-2.5">
              <dt className="text-xs text-emerald-800">{taxLabel}</dt>
              <dd className="text-sm font-semibold text-emerald-800 font-mono truncate">{fmt(currentTaxResult.totalGstIdentified)}</dd>
            </div>
          </dl>
        </section>

        {/* Period picker */}
        {isFilterExpanded && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">Period</span>
            <button
              type="button"
              onClick={() => setIsFilterExpanded(false)}
              className="text-sm font-semibold text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>

          <div
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
          >
            <button
              onClick={() => {
                setPeriodMode('all');
                setIsFilterExpanded(false);
              }}
              className={`h-9 px-3.5 rounded-full text-sm font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                periodMode === 'all'
                  ? 'bg-slate-900 text-slate-50'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="whitespace-nowrap">All Time</span>
            </button>

            <button
              onClick={() => {
                setPeriodMode('month');
                setIsFilterExpanded(true);
              }}
              className={`h-9 px-3.5 rounded-full text-sm font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                periodMode === 'month'
                  ? 'bg-slate-900 text-slate-50'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Month</span>
            </button>

            <button
              onClick={() => {
                setPeriodMode('quarter');
                setIsFilterExpanded(true);
              }}
              className={`h-9 px-3.5 rounded-full text-sm font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                periodMode === 'quarter'
                  ? 'bg-slate-900 text-slate-50'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Quarter</span>
            </button>

            <button
              onClick={() => {
                setPeriodMode('fy');
                setIsFilterExpanded(true);
              }}
              className={`h-9 px-3.5 rounded-full text-sm font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                periodMode === 'fy'
                  ? 'bg-slate-900 text-slate-50'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="whitespace-nowrap">Financial Year</span>
            </button>

            <button
              onClick={() => {
                setPeriodMode('cy');
                setIsFilterExpanded(true);
              }}
              className={`h-9 px-3.5 rounded-full text-sm font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                periodMode === 'cy'
                  ? 'bg-slate-900 text-slate-50'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="whitespace-nowrap">Calendar Year</span>
            </button>

            <button
              onClick={() => {
                setPeriodMode('range');
                setIsFilterExpanded(true);
              }}
              className={`h-9 px-3.5 rounded-full text-sm font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                periodMode === 'range'
                  ? 'bg-slate-900 text-slate-50'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Date Range</span>
            </button>
          </div>

          {/* Interactive Parameters Drawer */}
          {isFilterExpanded && periodMode !== 'all' && (
            <div className="pt-2 border-t border-slate-200 animate-in fade-in duration-150 space-y-2">
              {/* Option 1: Month & Year Picker */}
              {periodMode === 'month' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Select Month</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {MONTHS_LIST.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Select Year</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {AVAILABLE_YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Option 1b: Quarter & FY Picker with 4-Quarter Overview Matrix */}
              {periodMode === 'quarter' && (
                <div className="space-y-2.5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Financial Year</label>
                      <select
                        value={selectedQuarterFY}
                        onChange={(e) => setSelectedQuarterFY(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {AVAILABLE_FYS.map((fy) => (
                          <option key={fy} value={fy}>
                            {fy}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Select Quarter</label>
                      <div className="grid grid-cols-4 gap-1">
                        {(['Q1', 'Q2', 'Q3', 'Q4'] as FiscalQuarter[]).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setSelectedQuarter(q)}
                            className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              selectedQuarter === q
                                ? 'bg-brand text-slate-900 shadow-xs font-black'
                                : 'bg-slate-50 text-slate-500 hover:text-white border border-slate-200'
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4-Quarter Snapshot Matrix */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {quarterlyOverview.quarters.map((qData) => {
                      const isCurrent = qData.quarter === selectedQuarter;
                      return (
                        <button
                          key={qData.quarter}
                          type="button"
                          onClick={() => setSelectedQuarter(qData.quarter)}
                          className={`p-2 rounded-xl text-left transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-50 border border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/40'
                              : 'bg-slate-50 border border-slate-200 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-bold ${isCurrent ? 'text-emerald-700' : 'text-slate-700'}`}>
                              {qData.quarter}
                            </span>
                            <span className="text-slate-500 text-xs">{qData.info.monthsLabel}</span>
                          </div>
                          <div className="text-xs font-mono font-bold text-white mt-1 truncate">
                            {fmt(qData.totalExpenses)}
                          </div>
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            {qData.expenseCount} recs · {qData.percentageOfAnnual.toFixed(0)}%
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Option 2: Financial Year (FY) Picker */}
              {periodMode === 'fy' && (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Select Financial Year ({profile.country} Rules)</span>
                    <span className="text-emerald-700 font-mono">
                      {profile.country === 'AU' ? '1 Jul – 30 Jun' : '1 Apr – 31 Mar'}
                    </span>
                  </div>
                  <select
                    value={selectedFY}
                    onChange={(e) => setSelectedFY(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {AVAILABLE_FYS.map((fy) => (
                      <option key={fy} value={fy}>
                        {fy} ({profile.country === 'AU' ? '1 Jul – 30 Jun' : '1 Apr – 31 Mar'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Option 3: Calendar Year (CY) Picker */}
              {periodMode === 'cy' && (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Select Calendar Year</span>
                    <span className="text-emerald-700 font-mono">1 Jan – 31 Dec</span>
                  </div>
                  <select
                    value={selectedCY}
                    onChange={(e) => setSelectedCY(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {AVAILABLE_YEARS.map((y) => (
                      <option key={y} value={y}>
                        Calendar Year {y} (1 Jan {y} – 31 Dec {y})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Option 4: Custom Date Range Picker */}
              {periodMode === 'range' && (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">From Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">To Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Range preset shortcuts */}
                  <div className="flex items-center gap-1.5 pt-1 text-xs flex-wrap">
                    <span className="text-slate-500">Presets:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        const weekAgo = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000);
                        setCustomStartDate(weekAgo.toISOString().split('T')[0]);
                        setCustomEndDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-white cursor-pointer"
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        const monthAgo = new Date(d.getTime() - 30 * 24 * 60 * 60 * 1000);
                        setCustomStartDate(monthAgo.toISOString().split('T')[0]);
                        setCustomEndDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-white cursor-pointer"
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        const startMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                        setCustomStartDate(startMonth);
                        setCustomEndDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-white cursor-pointer"
                    >
                      This Month
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* 4. Quick actions */}
      <section aria-label="Quick actions" className="space-y-3">
        <button
          type="button"
          onClick={onOpenScanner}
          className="w-full h-14 bg-brand hover:bg-brand-strong active:scale-[0.99] text-white font-semibold rounded-2xl flex items-center justify-center gap-2.5 transition-all cursor-pointer text-base"
        >
          <Camera className="w-5 h-5 shrink-0" />
          <span>Scan a receipt</span>
        </button>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Add manually', icon: PenTool, onClick: onOpenManualEntry },
            { label: 'Upload file', icon: Upload, onClick: onTriggerUpload },
            { label: 'All expenses', icon: Receipt, onClick: onNavigateToExpenses },
          ].map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="bg-white border border-slate-200 hover:border-slate-300 active:scale-[0.98] rounded-2xl py-3 px-2 flex flex-col items-center gap-1.5 cursor-pointer transition-all min-w-0"
            >
              <Icon className="w-5 h-5 text-emerald-700 shrink-0" />
              <span className="text-xs font-medium text-slate-700 truncate max-w-full">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Tools (Mileage, Bank reconciliation, Invoicing, Tax calendar) */}
      {(onOpenMileage || onOpenBankReconciliation || onOpenInvoiceGenerator || onOpenTaxCalendar) && (
        <section aria-labelledby="home-tools-heading" className="space-y-3">
          <h2 id="home-tools-heading" className="text-base font-semibold text-slate-900">Tools</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Mileage log', hint: 'Track business trips', icon: Car, onClick: onOpenMileage },
              { label: 'Bank matching', hint: 'Match a bank CSV', icon: Building2, onClick: onOpenBankReconciliation },
              { label: 'Invoices', hint: 'Bill your clients', icon: FileSpreadsheet, onClick: onOpenInvoiceGenerator },
              { label: 'Tax calendar', hint: 'Upcoming deadlines', icon: Calendar, onClick: onOpenTaxCalendar },
            ].filter((tool) => tool.onClick).map(({ label, hint, icon: Icon, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="bg-white border border-slate-200 hover:border-slate-300 active:scale-[0.98] rounded-2xl p-4 flex flex-col items-start gap-3 text-left cursor-pointer transition-all min-w-0"
              >
                <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{label}</span>
                  <span className="block text-xs text-slate-500">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 5. Recent expenses in the selected period */}
      <section aria-labelledby="home-recent-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="home-recent-heading" className="text-base font-semibold text-slate-900">Recent</h2>
          <button
            type="button"
            onClick={onNavigateToExpenses}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer transition-colors py-1"
          >
            See all
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="px-6 py-10 text-center bg-white border border-slate-200 rounded-2xl">
            <Receipt className="w-9 h-9 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">No expenses yet</p>
            <p className="text-sm text-slate-500 mt-1">Scan a receipt or add one manually to get started.</p>
          </div>
        ) : (
          <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
            {recentExpenses.map((exp) => {
              const catInfo = CATEGORY_MAP[exp.category] || CATEGORY_MAP['Other'];
              const hasTax = exp.cgst > 0 || exp.igst > 0 || (exp.taxAmount && exp.taxAmount > 0) || (exp.gstAmount && exp.gstAmount > 0) || exp.vendorGSTIN || exp.vendorTaxId;
              return (
                <li
                  key={exp.id}
                  {...pressable(() => onSelectExpense(exp))}
                  className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-slate-50 active:bg-slate-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg shrink-0" aria-hidden="true">
                      {catInfo.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-900 truncate">{exp.merchant}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {formatShortDate(exp.date)} · {exp.category}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-semibold text-sm text-slate-900 font-mono">{fmt(exp.amount)}</div>
                    <div className="text-xs text-slate-500">
                      {exp.expenseType === 'Mixed' ? `${exp.businessPercentage}% business` : exp.expenseType}
                      {hasTax ? ` · ${exp.taxType || (profile.country === 'US' ? 'Tax' : 'GST')}` : ''}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
