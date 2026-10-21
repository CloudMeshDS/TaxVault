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
  const formatShortDate = (value?: string) => {
    const iso = parseDateToISO(value);
    const d = /^d{4}-d{2}-d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : null;
    return d && !isNaN(d.getTime())
      ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : value || '';
  };

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
    <div className="p-4 space-y-4 pb-24 max-w-xl mx-auto select-none">
      {/* 1. Subscription Plan & Usage Banner */}
      {onOpenSubscription && (
        <div
          onClick={onOpenSubscription}
          className="group cursor-pointer bg-amber-50/70 hover:bg-amber-50 border border-amber-200/80 hover:border-amber-300 rounded-2xl p-2.5 flex items-center justify-between gap-2 transition-all"
        >
          <div className="flex items-center gap-2 text-xs">
            <div className="w-8 h-8 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  !scanUsage.unlimited && scanUsage.remaining === 0
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : 'text-amber-800 bg-white border-amber-200'
                }`}>
                  {scanUsage.unlimited
                    ? 'Unlimited Scans'
                    : `${scanUsage.used}/${scanUsage.limit} scans this month`}
                </span>
                <span className="font-semibold text-slate-700 text-[11px]">
                  {profile.subscription?.tier === 'pro'
                    ? 'Tax Compliance Pro'
                    : profile.subscription?.tier === 'enterprise'
                    ? 'CA Firm Enterprise'
                    : 'Starter Plan (Free)'}
                </span>
              </div>
              <div className="text-[10px] text-slate-600">
                {scanUsage.unlimited
                  ? 'Official CA audit packs & multi-currency enabled'
                  : scanUsage.remaining === 0
                  ? 'Monthly limit reached. Manual entry still works, or upgrade for unlimited.'
                  : `${scanUsage.remaining} AI scans left. Upgrade for unlimited & CA audit packs.`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform shrink-0">
            <span>{profile.subscription?.tier === 'free' ? 'Upgrade' : 'Manage'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* 2. Recurring Expense Notification Banner (if any detected) */}
      {recurringItems.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-600/30 rounded-2xl p-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-amber-200">Recurring Expense Detected</div>
            <p className="text-amber-300/80 mt-0.5 leading-relaxed">
              We noticed <strong className="text-slate-900">{recurringItems[0].merchant}</strong> ({fmt(recurringItems[0].averageAmount)}) repeats every month.
            </p>
          </div>
        </div>
      )}

      {/* 3. DYNAMIC PERIOD FILTER SELECTOR (Month, Year, FY, CY, Date Range) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wide uppercase text-neutral-400">
              Expense Summary
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Filter className="w-2.5 h-2.5" />
              <span>{periodBadgeLabel}</span>
            </span>
          </div>
          <span className="text-[11px] text-emerald-400 font-medium font-mono">
            {filteredExpenses.length} {filteredExpenses.length === 1 ? 'receipt' : 'receipts'}
          </span>
        </div>

        {/* Quick One-Tap Filter Mode Pills & Options Toggle */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-2.5 space-y-2 shadow-sm">
          {/* Top header bar with Options toggle - always visible in portrait & landscape */}
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-neutral-800/60">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
              Filter By Period
            </span>
            <button
              type="button"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/70 border border-emerald-800/70 px-2.5 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
              title="Show or customize period options"
            >
              <span>{isFilterExpanded ? 'Hide Options' : 'Options'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`} />
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                periodMode === 'all'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm font-bold'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <span className="whitespace-nowrap">All Time</span>
            </button>

            <button
              onClick={() => {
                setPeriodMode('month');
                setIsFilterExpanded(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                periodMode === 'month'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm font-bold'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                periodMode === 'quarter'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm font-bold'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                periodMode === 'fy'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm font-bold'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <span className="whitespace-nowrap">Financial Year</span>
            </button>

            <button
              onClick={() => {
                setPeriodMode('cy');
                setIsFilterExpanded(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                periodMode === 'cy'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm font-bold'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <span className="whitespace-nowrap">Calendar Year</span>
            </button>

            <button
              onClick={() => {
                setPeriodMode('range');
                setIsFilterExpanded(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                periodMode === 'range'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm font-bold'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Date Range</span>
            </button>
          </div>

          {/* Interactive Parameters Drawer */}
          {isFilterExpanded && (
            <div className="pt-2 border-t border-neutral-800/80 animate-in fade-in duration-150 space-y-2">
              {/* Option 1: Month & Year Picker */}
              {periodMode === 'month' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Select Month</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {MONTHS_LIST.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Select Year</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                      <label className="text-[10px] text-neutral-400 block mb-1">Financial Year</label>
                      <select
                        value={selectedQuarterFY}
                        onChange={(e) => setSelectedQuarterFY(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {AVAILABLE_FYS.map((fy) => (
                          <option key={fy} value={fy}>
                            {fy}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Select Quarter</label>
                      <div className="grid grid-cols-4 gap-1">
                        {(['Q1', 'Q2', 'Q3', 'Q4'] as FiscalQuarter[]).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setSelectedQuarter(q)}
                            className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              selectedQuarter === q
                                ? 'bg-emerald-500 text-neutral-950 shadow-xs font-black'
                                : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
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
                              ? 'bg-emerald-950/70 border border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/40'
                              : 'bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`font-bold ${isCurrent ? 'text-emerald-400' : 'text-neutral-300'}`}>
                              {qData.quarter}
                            </span>
                            <span className="text-neutral-500 text-[9px]">{qData.info.monthsLabel}</span>
                          </div>
                          <div className="text-xs font-mono font-bold text-white mt-1 truncate">
                            {fmt(qData.totalExpenses)}
                          </div>
                          <div className="text-[9px] text-neutral-400 truncate mt-0.5">
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
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>Select Financial Year ({profile.country} Rules)</span>
                    <span className="text-emerald-400 font-mono">
                      {profile.country === 'AU' ? '1 Jul – 30 Jun' : '1 Apr – 31 Mar'}
                    </span>
                  </div>
                  <select
                    value={selectedFY}
                    onChange={(e) => setSelectedFY(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>Select Calendar Year</span>
                    <span className="text-emerald-400 font-mono">1 Jan – 31 Dec</span>
                  </div>
                  <select
                    value={selectedCY}
                    onChange={(e) => setSelectedCY(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                      <label className="text-[10px] text-neutral-400 block mb-1">From Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">To Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Range preset shortcuts */}
                  <div className="flex items-center gap-1.5 pt-1 text-[10px] flex-wrap">
                    <span className="text-neutral-500">Presets:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        const weekAgo = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000);
                        setCustomStartDate(weekAgo.toISOString().split('T')[0]);
                        setCustomEndDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
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
                      className="px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
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
                      className="px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                    >
                      This Month
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Big Total Expenses Hero Card with Period Dropdown Trigger */}
        <div className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-50/60 border border-neutral-800 rounded-3xl p-5 shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Total Expenses</span>
              {/* Filter Trigger Button right where user highlighted */}
              <button
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="px-2.5 py-1 rounded-xl bg-neutral-800/90 hover:bg-neutral-800 border border-neutral-700/80 hover:border-emerald-500/50 text-emerald-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs whitespace-nowrap shrink-0"
                title="Click to change period (Month, Year, FY, CY, Date Range)"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="whitespace-nowrap">{periodBadgeLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>

          <div className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums break-all">
            {fmt(currentTaxResult.totalExpenses)}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800/80 grid grid-cols-3 gap-2 text-left">
            {/* Business */}
            <div className="space-y-0.5">
              <div className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                <span>Business</span>
              </div>
              <div className="text-sm font-bold text-blue-400 font-mono">
                {fmt(currentTaxResult.businessExpenses)}
              </div>
            </div>

            {/* Personal */}
            <div className="space-y-0.5">
              <div className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                <span>Personal</span>
              </div>
              <div className="text-sm font-bold text-purple-400 font-mono">
                {fmt(currentTaxResult.personalExpenses)}
              </div>
            </div>

            {/* Tax Identified */}
            <div className="space-y-0.5">
              <div className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>{taxLabel}</span>
              </div>
              <div className="text-sm font-bold text-emerald-400 font-mono">
                {fmt(currentTaxResult.totalGstIdentified)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Primary & Secondary Actions (Large, intuitive buttons) */}
      <div className="space-y-2.5 pt-1">
        {/* PRIMARY ACTION BUTTONS: [ + Scan Receipt ] and [ + Enter Manually ] */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={onOpenScanner}
            className="w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:scale-[0.98] text-neutral-950 font-black py-4 px-5 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all cursor-pointer group whitespace-nowrap"
          >
            <div className="w-8 h-8 rounded-xl bg-neutral-950/15 flex items-center justify-center shrink-0">
              <Camera className="w-4.5 h-4.5 text-neutral-950 stroke-[2.5] group-hover:scale-110 transition-transform shrink-0" />
            </div>
            <span className="text-sm tracking-tight whitespace-nowrap font-black">Scan Receipt</span>
          </button>

          <button
            onClick={onOpenManualEntry}
            className="w-full bg-neutral-900 hover:bg-neutral-850 active:scale-[0.98] border border-emerald-500/40 hover:border-emerald-500 text-white font-extrabold py-4 px-5 rounded-2xl shadow-sm flex items-center justify-center gap-3 transition-all cursor-pointer group whitespace-nowrap"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <PenTool className="w-4 h-4 group-hover:scale-110 transition-transform shrink-0" />
            </div>
            <span className="text-sm tracking-tight whitespace-nowrap font-black">Enter Manually</span>
          </button>
        </div>

        {/* SECONDARY BUTTONS: [ Upload Receipt ] & [ View Expenses ] */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={onTriggerUpload}
            className="bg-neutral-900 hover:bg-neutral-800/90 active:scale-[0.98] border border-neutral-800 text-neutral-200 hover:text-white font-semibold py-3 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer whitespace-nowrap min-w-0"
          >
            <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap truncate">Upload Receipt</span>
          </button>

          <button
            onClick={onNavigateToExpenses}
            className="bg-neutral-900 hover:bg-neutral-800/90 active:scale-[0.98] border border-neutral-800 text-neutral-200 hover:text-white font-semibold py-3 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer whitespace-nowrap min-w-0"
          >
            <Receipt className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="whitespace-nowrap truncate">View Expenses</span>
          </button>
        </div>

        {/* SMART TAX SUITE (Mileage, Bank Recon, Invoicing, Tax Calendar) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-bold uppercase tracking-wide">
            <span>Smart Tax Suite</span>
            <span className="text-[10px] text-emerald-400 font-normal">All Tools</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {onOpenMileage && (
              <button
                type="button"
                onClick={onOpenMileage}
                className="bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-amber-500/50 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Car className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white group-hover:text-amber-300">Mileage Log</span>
                <span className="text-[10px] text-neutral-400">Logbook rate</span>
              </button>
            )}

            {onOpenBankReconciliation && (
              <button
                type="button"
                onClick={onOpenBankReconciliation}
                className="bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-500/50 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white group-hover:text-cyan-300">Bank Recon</span>
                <span className="text-[10px] text-neutral-400">Match CSV</span>
              </button>
            )}

            {onOpenInvoiceGenerator && (
              <button
                type="button"
                onClick={onOpenInvoiceGenerator}
                className="bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-indigo-500/50 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white group-hover:text-indigo-300">Invoicing</span>
                <span className="text-[10px] text-neutral-400">Client billing</span>
              </button>
            )}

            {onOpenTaxCalendar && (
              <button
                type="button"
                onClick={onOpenTaxCalendar}
                className="bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-teal-500/50 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white group-hover:text-teal-300">Tax Calendar</span>
                <span className="text-[10px] text-neutral-400">Deadlines</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Recent Expenses Section (Filters with selected period) */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-wide uppercase text-neutral-400">
            Recent Expenses ({periodBadgeLabel})
          </h2>
          <button
            onClick={onNavigateToExpenses}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>See All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="p-8 text-center bg-neutral-900/50 border border-neutral-800/80 rounded-2xl">
            <Receipt className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-300">No expenses in {periodBadgeLabel}</p>
            <p className="text-xs text-neutral-500 mt-1">Pick another period, or scan a receipt to add your first expense.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentExpenses.map((exp) => {
              const catInfo = CATEGORY_MAP[exp.category] || CATEGORY_MAP['Other'];
              return (
                <div
                  key={exp.id}
                  onClick={() => onSelectExpense(exp)}
                  className="bg-neutral-900/80 hover:bg-neutral-800/80 border border-neutral-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] group shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-neutral-800 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                      {catInfo.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
                        {exp.merchant}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                        <span className="whitespace-nowrap">{formatShortDate(exp.date)}</span>
                        <span>·</span>
                        <span className="truncate">{exp.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-white font-mono">
                      {fmt(exp.amount)}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      {/* Business / Personal badge */}
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                          exp.expenseType === 'Business'
                            ? 'bg-blue-950/80 text-blue-300 border border-blue-800/50'
                            : exp.expenseType === 'Mixed'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                            : 'bg-purple-950/80 text-purple-300 border border-purple-800/50'
                        }`}
                      >
                        {exp.expenseType === 'Mixed' ? `${exp.businessPercentage}% Biz` : exp.expenseType}
                      </span>

                      {/* Tax indicator */}
                      {(exp.cgst > 0 || exp.igst > 0 || (exp.taxAmount && exp.taxAmount > 0) || (exp.gstAmount && exp.gstAmount > 0) || exp.vendorGSTIN || exp.vendorTaxId) && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
                          {exp.taxType || (profile.country === 'US' ? 'TAX' : 'GST')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
