import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Receipt,
  Download,
  Calendar,
  Sparkles,
  X,
  SlidersHorizontal,
  ChevronDown,
  Building2,
  CheckCircle2,
  ArrowUpDown,
  PenTool,
} from 'lucide-react';
import { ExpenseCategory, ExpenseRecord, ExpenseType, UserProfile } from '../../types';
import { ALL_CATEGORIES, CATEGORY_MAP, formatCurrency, formatINR, getQuarterBounds, FiscalQuarter } from '../../services/taxRules';
import {
  PeriodFilterState,
  createDefaultPeriodFilterState,
  getPeriodFilterBadgeLabel,
  parseDateToISO,
  getMonthBounds,
  getFYBounds,
  getCYBounds,
} from '../../services/periodFilterService';
import { PeriodFilterControls } from '../common/PeriodFilterControls';
import { ReportDownloadModal } from './ReportDownloadModal';
import { pressable } from '../../utils/a11y';
import { formatDisplayDate } from '../../utils/format';

interface ExpenseListProps {
  expenses: ExpenseRecord[];
  profile?: UserProfile;
  onOpenScanner: () => void;
  onOpenManualEntry?: () => void;
  onSelectExpense: (expense: ExpenseRecord) => void;
  onExportExcel?: () => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  profile,
  onOpenScanner,
  onOpenManualEntry,
  onSelectExpense,
  onExportExcel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'All' | ExpenseType | 'Deleted'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyGst, setOnlyGst] = useState<boolean>(false);
  const [amountRange, setAmountRange] = useState<'all' | 'under2k' | '2kto10k' | 'above10k'>('all');
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);

  // Date Filter & Report Download State
  const [isReportDownloadOpen, setIsReportDownloadOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterState>(() =>
    createDefaultPeriodFilterState(profile?.country, profile?.financialYear)
  );
  const [showDateFilter, setShowDateFilter] = useState(false);

  const deletedCount = useMemo(() => {
    return expenses.filter((e) => e.status === 'deleted' || e.isDeleted).length;
  }, [expenses]);

  const currCode = profile?.defaultCurrency || expenses[0]?.currency || (profile?.country === 'IN' ? 'INR' : 'NZD');
  const currSymbol = profile?.currencySymbol || expenses[0]?.currencySymbol || (profile?.country === 'IN' ? '₹' : '$');
  const fmt = (val: number) => formatCurrency(val, currCode, currSymbol, false);

  // Natural Language Search quick query suggestions
  const sampleSearchQueries = [
    'Fuel expenses',
    'Software subscriptions',
    `Expenses above ${currSymbol}500`,
    'Business expenses',
    profile?.country === 'US' ? 'Sales tax' : 'GST expenses',
  ];

  // Natural Language Query Engine
  const parsedFilters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return null;

    const result: {
      category?: ExpenseCategory;
      merchant?: string;
      minAmount?: number;
      maxAmount?: number;
      type?: ExpenseType;
      hasGst?: boolean;
    } = {};

    // Category detection
    if (q.includes('fuel') || q.includes('petrol') || q.includes('diesel')) result.category = 'Fuel';
    else if (q.includes('travel') || q.includes('flight')) result.category = 'Travel';
    else if (q.includes('food') || q.includes('lunch') || q.includes('meal')) result.category = 'Food & Meals';
    else if (q.includes('software') || q.includes('subscription')) result.category = 'Software & Subscriptions';
    else if (q.includes('internet') || q.includes('broadband')) result.category = 'Internet & Mobile';
    else if (q.includes('office')) result.category = 'Office Expenses';

    // Merchant detection
    if (q.includes('amazon')) result.merchant = 'amazon';
    if (q.includes('swiggy')) result.merchant = 'swiggy';
    if (q.includes('indigo')) result.merchant = 'indigo';
    if (q.includes('adobe')) result.merchant = 'adobe';
    if (q.includes('airtel')) result.merchant = 'airtel';
    if (q.includes('croma')) result.merchant = 'croma';

    // Amount thresholds (e.g., "above 5000", "> 5000", "over 10000")
    const aboveMatch = q.match(/(?:above|greater than|>|more than|over)\s*(?:₹|rs\.?)?\s*(\d+[\d,]*)/i);
    if (aboveMatch) {
      result.minAmount = parseFloat(aboveMatch[1].replace(/,/g, ''));
    }

    const underMatch = q.match(/(?:below|under|<|less than)\s*(?:₹|rs\.?)?\s*(\d+[\d,]*)/i);
    if (underMatch) {
      result.maxAmount = parseFloat(underMatch[1].replace(/,/g, ''));
    }

    if (q.includes('business')) result.type = 'Business';
    if (q.includes('personal')) result.type = 'Personal';
    if (q.includes('mixed')) result.type = 'Mixed';
    if (q.includes('gst')) result.hasGst = true;

    return Object.keys(result).length > 0 ? result : null;
  }, [searchQuery]);

  // Filtering Logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // 0. Date Period Filter (Matches HomeScreen & Report Download)
      if (periodFilter.mode !== 'all') {
        if (!exp.date) return false;
        const expIso = parseDateToISO(exp.date);
        if (!expIso) return false;

        if (periodFilter.mode === 'month') {
          const bounds = getMonthBounds(periodFilter.selectedYear, periodFilter.selectedMonth);
          if (expIso < bounds.start || expIso > bounds.end) return false;
        } else if (periodFilter.mode === 'quarter') {
          const bounds = getQuarterBounds(periodFilter.selectedQuarter, periodFilter.selectedQuarterFY, profile?.country || 'NZ');
          if (expIso < bounds.start || expIso > bounds.end) return false;
        } else if (periodFilter.mode === 'fy') {
          const bounds = getFYBounds(periodFilter.selectedFY, profile?.country || 'NZ');
          if (expIso < bounds.start || expIso > bounds.end) return false;
        } else if (periodFilter.mode === 'cy') {
          const bounds = getCYBounds(periodFilter.selectedCY);
          if (expIso < bounds.start || expIso > bounds.end) return false;
        } else if (periodFilter.mode === 'range') {
          if (periodFilter.customStartDate && expIso < periodFilter.customStartDate) return false;
          if (periodFilter.customEndDate && expIso > periodFilter.customEndDate) return false;
        }
      }

      // 1. Text & Natural language search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();

        if (parsedFilters) {
          // Check parsed natural language conditions
          if (parsedFilters.category && exp.category !== parsedFilters.category) return false;
          if (parsedFilters.merchant && !exp.merchant.toLowerCase().includes(parsedFilters.merchant)) return false;
          if (parsedFilters.minAmount !== undefined && exp.amount < parsedFilters.minAmount) return false;
          if (parsedFilters.maxAmount !== undefined && exp.amount > parsedFilters.maxAmount) return false;
          if (parsedFilters.type && exp.expenseType !== parsedFilters.type) return false;
          if (parsedFilters.hasGst && !(exp.cgst > 0 || exp.igst > 0 || exp.vendorGSTIN)) return false;
        } else {
          // Fallback direct text match
          const matchesText =
            exp.merchant.toLowerCase().includes(query) ||
            exp.category.toLowerCase().includes(query) ||
            (exp.invoiceNumber && exp.invoiceNumber.toLowerCase().includes(query)) ||
            (exp.vendorGSTIN && exp.vendorGSTIN.toLowerCase().includes(query));
          if (!matchesText) return false;
        }
      }

      // 2. Type filter
      if (selectedType === 'Deleted') {
        if (exp.status !== 'deleted' && !exp.isDeleted) return false;
      } else if (selectedType !== 'All') {
        if (exp.status === 'deleted' || exp.isDeleted) return false;
        if (exp.expenseType !== selectedType) return false;
      }

      // 3. Category filter
      if (selectedCategory !== 'All' && exp.category !== selectedCategory) return false;

      // 4. GST filter
      if (onlyGst && !(exp.cgst > 0 || exp.igst > 0 || exp.vendorGSTIN)) return false;

      // 5. Amount range filter
      if (amountRange === 'under2k' && exp.amount >= 2000) return false;
      if (amountRange === '2kto10k' && (exp.amount < 2000 || exp.amount > 10000)) return false;
      if (amountRange === 'above10k' && exp.amount <= 10000) return false;

      return true;
    });
  }, [expenses, searchQuery, parsedFilters, selectedType, selectedCategory, onlyGst, amountRange, periodFilter, profile?.country]);

  // Total filtered amount (excludes soft-deleted from total unless viewing Deleted tab)
  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses
      .filter((item) => selectedType === 'Deleted' ? true : (item.status !== 'deleted' && !item.isDeleted))
      .reduce((sum, item) => sum + item.amount, 0);
  }, [filteredExpenses, selectedType]);

  return (
    <div className="px-4 pt-4 space-y-4 pb-28 max-w-xl mx-auto select-none">
      {/* Header & Record Count */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expenses</h1>
          <p className="text-sm text-slate-500 truncate">
            {filteredExpenses.length} {filteredExpenses.length === 1 ? 'receipt' : 'receipts'}
            {deletedCount > 0 && selectedType !== 'Deleted' && ` (${deletedCount} deleted)`}
            {' · '}
            <span className="font-semibold text-slate-900 font-mono">{fmt(totalFilteredAmount)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            aria-label="Download report (Excel / PDF / CSV)"
            onClick={() => setIsReportDownloadOpen(true)}
            className="w-11 h-11 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
            title="Download report"
          >
            <Download className="w-5 h-5" />
          </button>

          {onOpenManualEntry && (
            <button
              aria-label="Add expense manually"
              onClick={onOpenManualEntry}
              className="w-11 h-11 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
              title="Add expense manually"
            >
              <PenTool className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onOpenScanner}
            className="h-11 pl-3.5 pr-4 rounded-full bg-brand hover:bg-brand-strong text-on-fill font-semibold text-sm flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>Scan</span>
          </button>
        </div>
      </div>

      {/* Natural Language Search Input */}
      <div className="space-y-1.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expenses"
            className="w-full bg-white border border-slate-200 rounded-full pl-10 pr-10 h-11 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              aria-label="Clear search"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Natural Language Filter Feedback Tag */}
        {parsedFilters && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>
              AI Filter applied: {parsedFilters.category ? `Category: ${parsedFilters.category} ` : ''}
              {parsedFilters.merchant ? `Vendor: ${parsedFilters.merchant} ` : ''}
              {parsedFilters.minAmount ? `Above ₹${parsedFilters.minAmount} ` : ''}
              {parsedFilters.type ? `Type: ${parsedFilters.type}` : ''}
            </span>
          </div>
        )}

        {/* Quick Sample Search Suggestions */}
        {!searchQuery && (
          <div
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 text-xs"
          >
            
            {sampleSearchQueries.map((s) => (
              <button
                key={s}
                onClick={() => setSearchQuery(s)}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 h-8 px-3 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Tabs: All, Business, Personal, Mixed + Pinned Date & Filters for Portrait & Landscape */}
      <div className="flex items-center justify-between gap-1.5">
        {/* Scrollable type pills */}
        <div
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs flex-1 min-w-0 pr-1"
        >
          {([
            'All',
            'Business',
            'Personal',
            'Mixed',
            ...(deletedCount > 0 ? ['Deleted'] : []),
          ] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t as any)}
              className={`h-9 px-3.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedType === t
                  ? t === 'Deleted'
                    ? 'bg-rose-600 text-on-fill'
                    : 'bg-slate-900 text-slate-50'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {t} {t === 'Deleted' && `(${deletedCount})`}
            </button>
          ))}
        </div>

        {/* Pinned Action Controls: Always visible without sideways scrolling */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`flex items-center gap-1.5 text-sm h-9 px-3 rounded-full border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              periodFilter.mode !== 'all' || showDateFilter
                ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-semibold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Filter by Date (Same as Home Screen)"
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">
              {periodFilter.mode !== 'all' ? getPeriodFilterBadgeLabel(periodFilter, profile?.country) : 'Date'}
            </span>
          </button>

          <button
            onClick={() => setShowFiltersModal(true)}
            className={`flex items-center gap-1.5 text-sm h-9 px-3 rounded-full border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              onlyGst || selectedCategory !== 'All' || amountRange !== 'all'
                ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-semibold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Filters</span>
          </button>
        </div>
      </div>

      {/* Date Filter Card (Same as HomeScreen) */}
      {showDateFilter && (
        <div className="animate-in fade-in duration-200">
          <PeriodFilterControls
            filter={periodFilter}
            onChange={setPeriodFilter}
            country={profile?.country || 'NZ'}
            title="Date"
            recordCount={filteredExpenses.length}
            showBadge={true}
          />
        </div>
      )}

      {/* Expense List Records */}
      {filteredExpenses.length === 0 ? (
        <div className="px-6 py-10 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-slate-800">No matching expenses</p>
            <p className="text-sm text-slate-500 mt-1">Try a different search or clear your filters.</p>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedType('All');
              setSelectedCategory('All');
              setOnlyGst(false);
              setAmountRange('all');
            }}
            className="text-sm font-semibold text-emerald-700 hover:underline cursor-pointer py-1"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
          {filteredExpenses.map((exp) => {
            const catInfo = CATEGORY_MAP[exp.category] || CATEGORY_MAP['Other'];
            const isDeleted = exp.status === 'deleted' || Boolean(exp.isDeleted);
            const hasTax = exp.cgst > 0 || exp.igst > 0 || (exp.taxAmount && exp.taxAmount > 0) || (exp.gstAmount && exp.gstAmount > 0) || exp.vendorGSTIN || exp.vendorTaxId;
            const needsReview = exp.caReviewStatus === 'Needs CA Review';
            return (
              <li
                key={exp.id}
                {...pressable(() => onSelectExpense(exp))}
                className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-slate-50 active:bg-slate-100 ${isDeleted ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg shrink-0" aria-hidden="true">
                    {catInfo.icon}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-semibold text-sm truncate ${isDeleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {exp.merchant}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {formatDisplayDate(exp.date, profile?.country)} · {exp.category}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`font-semibold text-sm font-mono ${isDeleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {formatCurrency(exp.amount, exp.currency || currCode, exp.currencySymbol || currSymbol, false)}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
                    {isDeleted ? (
                      <span className="text-rose-700 font-medium">Deleted</span>
                    ) : (
                      <>
                        <span>{exp.expenseType === 'Mixed' ? `${exp.businessPercentage}% business` : exp.expenseType}</span>
                        {hasTax && <span>· {exp.taxType || (profile?.country === 'US' ? 'Tax' : 'GST')}</span>}
                        {needsReview && (
                          <span className="ml-0.5 w-2 h-2 rounded-full bg-amber-500" title="Needs accountant review" aria-label="Needs accountant review" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Advanced Filter Modal */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 modal-backdrop-animation">
          <div className="bg-white shadow-xs border border-slate-200 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto modal-enter-animation pb-8 sm:pb-6">
            <div className="flex items-center justify-between text-white border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-base whitespace-nowrap">Filter Expenses</h3>
              <button
                aria-label="Close"
                onClick={() => setShowFiltersModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-white shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4 shrink-0" />
              </button>
            </div>

            {/* Category Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="All">All 20 Categories</option>
                {ALL_CATEGORIES.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.icon} {c.category}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Range Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Amount Range</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setAmountRange('all')}
                  className={`py-2 px-3 rounded-xl border text-center whitespace-nowrap truncate ${
                    amountRange === 'all'
                      ? 'bg-emerald-50 border-emerald-500 text-white font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  Any Amount
                </button>
                <button
                  onClick={() => setAmountRange('under2k')}
                  className={`py-2 px-3 rounded-xl border text-center whitespace-nowrap truncate ${
                    amountRange === 'under2k'
                      ? 'bg-emerald-50 border-emerald-500 text-white font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  {currSymbol}0 – {currSymbol}2,000
                </button>
                <button
                  onClick={() => setAmountRange('2kto10k')}
                  className={`py-2 px-3 rounded-xl border text-center whitespace-nowrap truncate ${
                    amountRange === '2kto10k'
                      ? 'bg-emerald-50 border-emerald-500 text-white font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  {currSymbol}2,000 – {currSymbol}10,000
                </button>
                <button
                  onClick={() => setAmountRange('above10k')}
                  className={`py-2 px-3 rounded-xl border text-center whitespace-nowrap truncate ${
                    amountRange === 'above10k'
                      ? 'bg-emerald-50 border-emerald-500 text-white font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  Above {currSymbol}10,000
                </button>
              </div>
            </div>

            {/* GST Filter Checkbox */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white whitespace-nowrap">Tax Invoices Only</div>
                <div className="text-xs text-slate-500">Show only expenses with identified tax number & tax</div>
              </div>
              <input
                type="checkbox"
                checked={onlyGst}
                onChange={(e) => setOnlyGst(e.target.checked)}
                className="w-5 h-5 accent-emerald-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 flex gap-2">
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setAmountRange('all');
                  setOnlyGst(false);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs whitespace-nowrap cursor-pointer transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="flex-1 bg-brand hover:bg-brand-strong text-white font-black py-2.5 rounded-xl text-xs whitespace-nowrap cursor-pointer transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Report Download Modal with Same Date Filters as Home Screen */}
      <ReportDownloadModal
        isOpen={isReportDownloadOpen}
        onClose={() => setIsReportDownloadOpen(false)}
        expenses={expenses}
        profile={profile}
        initialFilter={periodFilter}
      />
    </div>
  );
};
