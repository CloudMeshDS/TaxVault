import React, { useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  FileCheck,
  Calendar,
  AlertCircle,
  Camera,
  Share2,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  DollarSign
} from 'lucide-react';
import { CountryTaxConfig, ExpenseRecord, IncomeRecord, TaxCalculationResult, UserProfile } from '../../types';

interface TaxDashboardProps {
  profile: UserProfile;
  taxConfig: CountryTaxConfig;
  expenses: ExpenseRecord[];
  incomes: IncomeRecord[];
  taxResult: TaxCalculationResult;
  onOpenScanner: () => void;
  onOpenAccountantReport: () => void;
  onOpenExpenses: () => void;
  onOpenCurrency: () => void;
  onOpenSubscription: () => void;
}

export const TaxDashboard: React.FC<TaxDashboardProps> = ({
  profile,
  taxConfig,
  expenses,
  incomes,
  taxResult,
  onOpenScanner,
  onOpenAccountantReport,
  onOpenExpenses,
  onOpenCurrency,
  onOpenSubscription,
}) => {
  const isFree = profile.subscription?.tier === 'free';
  const scansUsed = profile.subscription?.receiptsScannedThisMonth || 0;
  const scansLimit = profile.subscription?.monthlyReceiptLimit || 10;
  const scansRemaining = Math.max(0, scansLimit - scansUsed);
  // Calculate days remaining to end-of-year tax deadline
  const daysToDeadline = useMemo(() => {
    const deadline = new Date(taxConfig.nextTaxDeadline).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [taxConfig.nextTaxDeadline]);

  // Group expenses by category
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; count: number; deductibleTotal: number }>();
    for (const exp of expenses) {
      const existing = map.get(exp.category) || { total: 0, count: 0, deductibleTotal: 0 };
      existing.total += exp.amount;
      existing.count += 1;
      const deductiblePortion = (exp.amount - (profile?.gstRegistered ? (exp.gstAmount || 0) : 0)) * ((exp.deductiblePercentage ?? exp.businessPercentage ?? 100) / 100);
      existing.deductibleTotal += deductiblePortion;
      map.set(exp.category, existing);
    }
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, profile.gstRegistered]);

  // Max category for bar scaling
  const maxCategoryAmount = categoryBreakdown[0]?.total || 1;

  // Monthly breakdown for visual trend
  const monthlyData = useMemo(() => {
    const months = ['Jul', 'Aug', 'Sep', 'Oct'];
    return months.map(m => {
      const expSum = expenses
        .filter(e => {
          const date = new Date(e.date);
          return date.toLocaleString('en-US', { month: 'short' }) === m;
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

      const incSum = incomes
        .filter(i => {
          const date = new Date(i.date);
          return date.toLocaleString('en-US', { month: 'short' }) === m;
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

      return { month: m, expenses: expSum, income: incSum };
    });
  }, [expenses, incomes]);

  const maxMonthValue = Math.max(...monthlyData.map(d => Math.max(d.income, d.expenses)), 1000);

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* End of Year Tax Season Countdown Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 relative overflow-hidden">
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{taxConfig.taxYearLabel}</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              End-of-Year Tax Season
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Statutory filing to <span className="text-slate-800 font-medium">{taxConfig.taxAuthority}</span>
            </p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-extrabold font-mono text-emerald-700">
              {daysToDeadline} <span className="text-xs font-normal text-slate-500">days</span>
            </div>
            <div className="text-xs text-slate-500">Until Deadline</div>
          </div>
        </div>

        {/* Quick statutory checklist */}
        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-xs">
              {profile.gstRegistered ? 'GST Registered' : 'Non-GST'} · {taxConfig.complianceForms[0]?.code} Active
            </span>
          </div>
          <button
            onClick={onOpenAccountantReport}
            className="text-xs text-emerald-700 hover:text-emerald-700 font-medium flex items-center gap-0.5 cursor-pointer"
          >
            <span>Review Pack</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Free Plan Receipt Limit Banner (if free tier) */}
      {isFree && (
        <div className="bg-white shadow-xs border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <Receipt className="w-4 h-4 text-amber-700 shrink-0" />
            <div className="min-w-0">
              <div className="text-slate-800 font-semibold truncate">
                Starter Plan: {scansUsed} / {scansLimit} Receipts Used
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {scansRemaining > 0
                  ? `${scansRemaining} free scans left this month`
                  : 'Monthly scan limit reached! Upgrade for unlimited'}
              </div>
            </div>
          </div>

          <button
            onClick={onOpenSubscription}
            className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-strong text-white font-bold text-xs shrink-0 cursor-pointer shadow-sm transition-all"
          >
            Upgrade Pro
          </button>
        </div>
      )}

      {/* Quick Action Bar */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={onOpenScanner}
          className="bg-brand hover:bg-brand-strong text-white font-semibold p-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer active:scale-95"
        >
          <Camera className="w-4 h-4" />
          <span className="text-xs">Scan New Receipt</span>
        </button>

        <button
          onClick={onOpenAccountantReport}
          className="bg-slate-100 hover:bg-slate-100 border border-slate-300 text-slate-900 font-semibold p-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
        >
          <Share2 className="w-4 h-4 text-emerald-700" />
          <span className="text-xs">Share with CA</span>
        </button>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Net Taxable Income */}
        <div className="bg-white shadow-xs border border-slate-200 rounded-xl p-3.5">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Net Taxable Profit</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="text-lg font-bold font-mono text-white mt-1">
            {taxConfig.currencySymbol}
            {taxResult.netTaxableIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Gross {taxConfig.currencySymbol}{Math.round(taxResult.totalGrossIncome).toLocaleString()}
          </div>
        </div>

        {/* Allowable Deductions */}
        <div className="bg-white shadow-xs border border-slate-200 rounded-xl p-3.5">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Deductible Expenses</span>
            <Receipt className="w-3.5 h-3.5 text-blue-700" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
            {taxConfig.currencySymbol}
            {taxResult.totalDeductibleExpenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {expenses.length} receipts tracked
          </div>
        </div>

        {/* Estimated Income Tax Liability */}
        <div className="bg-white shadow-xs border border-slate-200 rounded-xl p-3.5">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Est. Income Tax</span>
            <span className="text-xs font-mono text-slate-500">{(taxResult.effectiveTaxRate * 100).toFixed(1)}% eff</span>
          </div>
          <div className="text-lg font-bold font-mono text-amber-700 mt-1">
            {taxConfig.currencySymbol}
            {taxResult.estimatedIncomeTax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Per progressive brackets
          </div>
        </div>

        {/* GST / VAT Position */}
        <div className="bg-white shadow-xs border border-slate-200 rounded-xl p-3.5">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>{taxConfig.countryCode === 'NZ' ? 'GST Position' : 'VAT / Sales Tax'}</span>
            <span className={`text-xs font-bold ${taxResult.netGstPayableOrRefund <= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {taxResult.netGstPayableOrRefund <= 0 ? 'REFUND' : 'PAYABLE'}
            </span>
          </div>
          <div className={`text-lg font-bold font-mono mt-1 ${taxResult.netGstPayableOrRefund <= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {taxConfig.currencySymbol}
            {Math.abs(taxResult.netGstPayableOrRefund).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Paid {taxConfig.currencySymbol}{Math.round(taxResult.totalGstPaid)} · Rec {taxConfig.currencySymbol}{Math.round(taxResult.totalGstCollected)}
          </div>
        </div>
      </div>

      {/* Monthly Performance Visual Chart */}
      <div className="bg-white shadow-xs border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-800">Revenue vs Deductible Expenses</h3>
            <p className="text-xs text-slate-500">Quarterly trend for tax return reconciliation</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand inline-block" />
              <span>Revenue</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span>Expenses</span>
            </span>
          </div>
        </div>

        {/* Bar chart bars */}
        <div className="grid grid-cols-4 gap-3 pt-4 pb-2 items-end h-32 border-b border-slate-200">
          {monthlyData.map(item => {
            const incHeight = Math.max(12, Math.round((item.income / maxMonthValue) * 100));
            const expHeight = Math.max(10, Math.round((item.expenses / maxMonthValue) * 100));
            return (
              <div key={item.month} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1.5 h-24">
                  {/* Income bar */}
                  <div
                    style={{ height: `${incHeight}%` }}
                    className="w-3.5 bg-emerald-500/80 rounded-t-xs hover:bg-brand-strong transition-all"
                    title={`Income: $${item.income}`}
                  />
                  {/* Expense bar */}
                  <div
                    style={{ height: `${expHeight}%` }}
                    className="w-3.5 bg-blue-500/80 rounded-t-xs hover:bg-blue-400 transition-all"
                    title={`Expenses: $${item.expenses}`}
                  />
                </div>
                <span className="text-xs font-medium text-slate-500">{item.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Automated Expense Categorization & Tax Rules */}
      <div className="bg-white shadow-xs border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-800">Deduction Categories & IRD Rules</h3>
            <p className="text-xs text-slate-500">Automated classification compliance</p>
          </div>
          <button
            onClick={onOpenExpenses}
            className="text-xs text-emerald-700 hover:text-emerald-700 font-medium flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          {categoryBreakdown.slice(0, 5).map(cat => {
            const percentOfMax = Math.round((cat.total / maxCategoryAmount) * 100);
            const isEntertainment = cat.category === 'Client Entertainment';
            const isVehicle = cat.category === 'Vehicle & Mileage';

            return (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-800 font-medium text-xs">{cat.category}</span>
                    {isEntertainment && (
                      <span className="text-xs text-amber-700 font-mono">50% IRD rule</span>
                    )}
                    {isVehicle && (
                      <span className="text-xs text-blue-700 font-mono">80% logbook</span>
                    )}
                  </div>
                  <div className="font-mono text-slate-700 text-xs">
                    {taxConfig.currencySymbol}{cat.total.toFixed(0)}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${percentOfMax}%` }}
                    className={`h-full rounded-full ${isEntertainment ? 'bg-amber-500' : 'bg-brand'}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Zealand / Local Jurisdiction Highlights */}
      <div className="bg-white shadow-xs border border-slate-200 rounded-xl p-3.5 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-semibold mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          <span>{taxConfig.countryName} Compliance Rules</span>
        </div>
        <ul className="space-y-1 text-xs text-slate-500 list-disc list-inside">
          {(taxConfig.regulatoryNotes || []).slice(0, 3).map((note, idx) => (
            <li key={idx} className="leading-relaxed">{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
