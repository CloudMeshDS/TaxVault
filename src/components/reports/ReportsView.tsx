import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  PieChart,
  BarChart3,
  Users,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight,
  Clock,
  ShieldCheck,
  Filter,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ExpenseRecord, TaxCalculationResult, UserProfile } from '../../types';
import {
  ALL_CATEGORIES,
  CATEGORY_MAP,
  formatCurrency,
  formatINR,
  TAX_CONFIGS,
  FiscalQuarter,
  getQuarterBounds,
  getAllQuartersForFY,
  calculateQuarterlyBreakdown,
  calculateTaxPosition,
} from '../../services/taxRules';
import { ExportClient } from '../../services/exportClient';
import {
  PeriodFilterState,
  createDefaultPeriodFilterState,
  filterExpensesByPeriod,
  getPeriodFilterBadgeLabel,
} from '../../services/periodFilterService';
import { PeriodFilterControls } from '../common/PeriodFilterControls';

interface ReportsViewProps {
  profile: UserProfile;
  expenses: ExpenseRecord[];
  taxResult: TaxCalculationResult;
  onOpenSubscription?: (reason?: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  profile,
  expenses,
  taxResult,
  onOpenSubscription,
}) => {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterState>(() =>
    createDefaultPeriodFilterState(profile.country, profile.financialYear)
  );
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [activeReportTab, setActiveReportTab] = useState<
    'summary' | 'quarterly' | 'category' | 'biz_personal' | 'gst' | 'vendor' | 'detailed'
  >('summary');

  const config = TAX_CONFIGS[profile.country] || TAX_CONFIGS['NZ'];
  const currCode = profile.defaultCurrency || config.currencyCode;
  const currSymbol = profile.currencySymbol || config.currencySymbol;
  const fmt = (val: number, showDecimals: boolean = false) => formatCurrency(val, currCode, currSymbol, showDecimals);

  const taxTabLabel =
    profile.country === 'NZ'
      ? 'IRD GST Return'
      : profile.country === 'AU'
      ? 'ATO BAS Summary'
      : profile.country === 'CA'
      ? 'CRA GST/HST & PST'
      : profile.country === 'US'
      ? 'IRS Schedule C & Tax'
      : 'GST Summary';

  const selectedFY =
    periodFilter.mode === 'fy'
      ? periodFilter.selectedFY
      : periodFilter.mode === 'quarter'
      ? periodFilter.selectedQuarterFY
      : profile.financialYear || 'FY 2026-27';

  const quarterInfos = useMemo(() => {
    return getAllQuartersForFY(selectedFY, profile.country);
  }, [selectedFY, profile.country]);

  const quarterlyBreakdown = useMemo(() => {
    return calculateQuarterlyBreakdown(expenses, selectedFY, profile.country);
  }, [expenses, selectedFY, profile.country]);

  // Filter expenses by selected period (All Time | Month | Quarter | FY | CY | Date Range)
  const filteredExpenses = useMemo(() => {
    return filterExpensesByPeriod(expenses, periodFilter, profile.country);
  }, [expenses, periodFilter, profile.country]);

  // Dynamic tax position recalculation for the filtered period
  const currentPeriodTaxResult = useMemo(() => {
    return calculateTaxPosition(filteredExpenses, profile.country);
  }, [filteredExpenses, profile.country]);

  // Recalculate metrics for filtered subset
  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredExpenses]);

  // Quarter-Wise Category distribution matrix
  const quarterlyCategoryMatrix = useMemo(() => {
    const qData = quarterlyBreakdown.quarters;
    const catMap = new Map<string, { total: number; q1: number; q2: number; q3: number; q4: number }>();

    for (const q of qData) {
      for (const exp of q.expenses) {
        const cat = exp.category || 'Other';
        const curr = catMap.get(cat) || { total: 0, q1: 0, q2: 0, q3: 0, q4: 0 };
        curr.total += exp.amount;
        if (q.quarter === 'Q1') curr.q1 += exp.amount;
        if (q.quarter === 'Q2') curr.q2 += exp.amount;
        if (q.quarter === 'Q3') curr.q3 += exp.amount;
        if (q.quarter === 'Q4') curr.q4 += exp.amount;
        catMap.set(cat, curr);
      }
    }

    return Array.from(catMap.entries())
      .map(([category, amounts]) => ({ category, ...amounts }))
      .sort((a, b) => b.total - a.total);
  }, [quarterlyBreakdown]);

  // Statutory quarterly compliance schedule by country
  const quarterlyComplianceSchedule = useMemo(() => {
    if (profile.country === 'AU') {
      return [
        { quarter: 'Q1', period: 'Jul – Sep', deadline: '28 October', form: 'Quarter 1 BAS', note: 'GST, PAYG withholding & installments' },
        { quarter: 'Q2', period: 'Oct – Dec', deadline: '28 February', form: 'Quarter 2 BAS', note: 'Standard Christmas extension' },
        { quarter: 'Q3', period: 'Jan – Mar', deadline: '28 April', form: 'Quarter 3 BAS', note: 'Quarterly business activity statement' },
        { quarter: 'Q4', period: 'Apr – Jun', deadline: '28 July', form: 'Quarter 4 BAS', note: 'Final quarter & annual reconciliations' },
      ];
    }
    if (profile.country === 'NZ') {
      return [
        { quarter: 'Q1', period: 'Apr – Jun', deadline: '28 July / 28 Aug', form: 'GST101 & Prov Tax 1', note: 'Two-monthly/six-monthly GST & 1st Provisional' },
        { quarter: 'Q2', period: 'Jul – Sep', deadline: '28 October', form: 'GST101 Return', note: 'Quarterly GST reconciliation' },
        { quarter: 'Q3', period: 'Oct – Dec', deadline: '15 January', form: 'GST101 & Prov Tax 2', note: 'Holiday concession filing & 2nd Provisional' },
        { quarter: 'Q4', period: 'Jan – Mar', deadline: '7 May', form: 'GST101 & Prov Tax 3', note: 'Final quarter return & IR3 reconciliation' },
      ];
    }
    if (profile.country === 'US') {
      return [
        { quarter: 'Q1', period: 'Jan – Mar', deadline: '15 April', form: 'Form 1040-ES (Q1)', note: 'Estimated tax payment for Q1 income' },
        { quarter: 'Q2', period: 'Apr – Jun', deadline: '15 June', form: 'Form 1040-ES (Q2)', note: 'Estimated federal tax installment 2' },
        { quarter: 'Q3', period: 'Jul – Sep', deadline: '15 September', form: 'Form 1040-ES (Q3)', note: 'Estimated federal tax installment 3' },
        { quarter: 'Q4', period: 'Oct – Dec', deadline: '15 January', form: 'Form 1040-ES (Q4)', note: 'Final estimated tax payment for tax year' },
      ];
    }
    if (profile.country === 'CA') {
      return [
        { quarter: 'Q1', period: 'Jan – Mar', deadline: '30 April', form: 'GST34 Return (Q1)', note: 'GST/HST quarterly remittal & ITC claims' },
        { quarter: 'Q2', period: 'Apr – Jun', deadline: '31 July', form: 'GST34 Return (Q2)', note: 'Second quarter sales tax declaration' },
        { quarter: 'Q3', period: 'Jul – Sep', deadline: '31 October', form: 'GST34 Return (Q3)', note: 'Third quarter sales tax remittal' },
        { quarter: 'Q4', period: 'Oct – Dec', deadline: '31 January', form: 'GST34 Return (Q4)', note: 'Fourth quarter return and T2/T2125 prep' },
      ];
    }
    // Default India (IN)
    return [
      { quarter: 'Q1', period: 'Apr – Jun', deadline: '15 Jun / 18-20 Jul', form: 'Adv Tax 15% · GSTR-1/3B · CMP-08', note: '1st Advance Tax (15%) + QRMP / monthly filings' },
      { quarter: 'Q2', period: 'Jul – Sep', deadline: '15 Sep / 18-20 Oct', form: 'Adv Tax 45% · GSTR-1/3B · CMP-08', note: '2nd Advance Tax (cumulative 45%)' },
      { quarter: 'Q3', period: 'Oct – Dec', deadline: '15 Dec / 18-20 Jan', form: 'Adv Tax 75% · GSTR-1/3B · CMP-08', note: '3rd Advance Tax (cumulative 75%)' },
      { quarter: 'Q4', period: 'Jan – Mar', deadline: '15 Mar / 18-20 Apr', form: 'Adv Tax 100% · GSTR-1/3B · CMP-08', note: 'Final Advance Tax installment & year-end closing' },
    ];
  }, [profile.country]);

  // Category breakdown
  const categorySummary = useMemo(() => {
    const map = new Map<string, { total: number; count: number; claimable: number }>();
    for (const exp of filteredExpenses) {
      const existing = map.get(exp.category) || { total: 0, count: 0, claimable: 0 };
      existing.total += exp.amount;
      existing.count += 1;
      existing.claimable += exp.claimableBusinessAmount;
      map.set(exp.category, existing);
    }
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  // Vendor summary
  const vendorSummary = useMemo(() => {
    const map = new Map<string, { total: number; count: number; gstin: string }>();
    for (const exp of filteredExpenses) {
      const existing = map.get(exp.merchant) || { total: 0, count: 0, gstin: exp.vendorTaxId || exp.vendorGSTIN || '' };
      existing.total += exp.amount;
      existing.count += 1;
      map.set(exp.merchant, existing);
    }
    return Array.from(map.entries())
      .map(([merchant, data]) => ({ merchant, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  const periodBadgeLabel = useMemo(() => {
    return getPeriodFilterBadgeLabel(periodFilter, profile.country);
  }, [periodFilter, profile.country]);

  // Download PDF
  const handleDownloadPDF = async () => {
    try {
      setIsDownloadingPDF(true);
      const safeLabel = periodBadgeLabel.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filename = `TaxVault_Report_${safeLabel}.pdf`;
      const result = await ExportClient.downloadProExport('pdf', {
        profile,
        expenses: filteredExpenses,
        taxResult: currentPeriodTaxResult,
        fileName: filename,
        options: { dateRangeLabel: periodBadgeLabel },
      });
      if (!result.ok) {
        if (result.reason === 'pro_required') onOpenSubscription?.(result.message);
        throw new Error(result.message);
      }
      setDownloadNotice({ type: 'success', message: `Audit Report "${filename}" downloaded successfully!` });
      setTimeout(() => setDownloadNotice(null), 4500);
    } catch (err: any) {
      console.error('Download PDF error:', err);
      setDownloadNotice({ type: 'error', message: err?.message || 'Failed to generate PDF. Please try again.' });
      setTimeout(() => setDownloadNotice(null), 4500);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Download Excel
  const handleDownloadExcel = async () => {
    try {
      setIsDownloadingExcel(true);
      const safeLabel = periodBadgeLabel.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filename = `TaxVault_Register_${safeLabel}.xlsx`;
      const result = await ExportClient.downloadProExport('xlsx', {
        profile,
        expenses: filteredExpenses,
        taxResult: currentPeriodTaxResult,
        fileName: filename,
      });
      if (!result.ok) {
        if (result.reason === 'pro_required') onOpenSubscription?.(result.message);
        throw new Error(result.message);
      }
      setDownloadNotice({ type: 'success', message: `Excel Register "${filename}" downloaded successfully!` });
      setTimeout(() => setDownloadNotice(null), 4500);
    } catch (err: any) {
      console.error('Download Excel error:', err);
      setDownloadNotice({ type: 'error', message: err?.message || 'Failed to generate Excel. Please try again.' });
      setTimeout(() => setDownloadNotice(null), 4500);
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  return (
    <div className="px-4 pt-4 space-y-4 pb-28 max-w-xl mx-auto select-none">
      {/* Title & Export Actions Bar */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports</h1>
          <p className="text-sm text-slate-500 truncate">
            {config.taxAuthority}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloadingPDF}
            className="h-11 px-4 rounded-full bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
            title="Download PDF Audit Report"
          >
            {isDownloadingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-rose-700" />
            ) : (
              <FileText className="w-4 h-4 shrink-0 text-rose-700" />
            )}
            <span className="whitespace-nowrap">PDF</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={isDownloadingExcel}
            className="h-11 px-4 rounded-full bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
            title="Download Excel Workbook"
          >
            {isDownloadingExcel ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-emerald-700" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-700" />
            )}
            <span className="whitespace-nowrap">Excel</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {downloadNotice && (
        <div
          className={`p-3 rounded-2xl flex items-center gap-2 text-xs animate-in fade-in duration-200 ${
            downloadNotice.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-200'
              : 'bg-rose-50 border border-rose-200 text-rose-200'
          }`}
        >
          {downloadNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
          )}
          <span className="font-medium">{downloadNotice.message}</span>
        </div>
      )}

      {/* Date Filter Card (Same as HomeScreen) */}
      <PeriodFilterControls
        filter={periodFilter}
        onChange={setPeriodFilter}
        country={profile.country}
        title="Report period"
        recordCount={filteredExpenses.length}
        showBadge={true}
      />

      {/* 7 Report Selector Tabs */}
      <div
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs -mx-1 px-1"
      >
        {[
          { id: 'summary' as const, label: 'Summary' },
          { id: 'quarterly' as const, label: 'Quarterly' },
          { id: 'category' as const, label: 'Categories' },
          { id: 'biz_personal' as const, label: 'Business vs personal' },
          { id: 'gst' as const, label: taxTabLabel },
          { id: 'vendor' as const, label: 'Vendors' },
          { id: 'detailed' as const, label: 'All records' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id)}
            className={`h-9 px-3.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeReportTab === tab.id
                ? 'bg-slate-900 text-slate-50'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* REPORT 1: Expense Summary */}
      {activeReportTab === 'summary' && (
        <div className="space-y-3">
          <div className="bg-white shadow-xs border border-slate-200 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Overall Expense Position</span>
              <span>{filteredExpenses.length} Records</span>
            </div>

            <div className="text-3xl font-black text-white font-mono">
              {fmt(filteredTotal)}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Total Business Claimable:</span>
                <div className="text-base font-bold text-emerald-700 font-mono mt-0.5">
                  {fmt(currentPeriodTaxResult.claimableBusinessTotal)}
                </div>
              </div>

              <div>
                <span className="text-slate-500">Total {profile.country === 'US' ? 'Sales Tax' : 'GST/HST'}:</span>
                <div className="text-base font-bold text-teal-700 font-mono mt-0.5">
                  {fmt(currentPeriodTaxResult.totalGstIdentified)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: Quarterly Breakdown (Comparative Analysis) */}
      {activeReportTab === 'quarterly' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Executive FY Annual Overview Strip */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-700">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-black text-white uppercase tracking-wide">
                    Quarter-Wise Performance ({selectedFY})
                  </h2>
                  <p className="text-xs text-slate-500">4 Fiscal Quarters · {profile.country} Rules</p>
                </div>
              </div>

              <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {quarterlyBreakdown.annualCount} Annual Receipts
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
              <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Total Spend</span>
                <span className="text-sm font-black font-mono text-white mt-0.5 block">
                  {fmt(quarterlyBreakdown.annualTotal)}
                </span>
              </div>
              <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Claimable Business</span>
                <span className="text-sm font-black font-mono text-emerald-700 mt-0.5 block">
                  {fmt(quarterlyBreakdown.annualClaimable)}
                </span>
              </div>
              <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">{profile.country === 'US' ? 'Sales Tax' : 'Eligible ITC'}</span>
                <span className="text-sm font-black font-mono text-teal-700 mt-0.5 block">
                  {fmt(quarterlyBreakdown.annualTax)}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Quarter Detailed Comparative Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quarterlyBreakdown.quarters.map((q) => {
              const isFiltered = periodFilter.mode === 'quarter' && periodFilter.selectedQuarter === q.quarter;
              const maxQAmount = Math.max(...quarterlyBreakdown.quarters.map((item) => item.totalExpenses), 1);
              const relativePercent = Math.round((q.totalExpenses / maxQAmount) * 100);

              return (
                <div
                  key={q.quarter}
                  className={`bg-white shadow-xs border rounded-2xl p-3.5 space-y-3 transition-all ${
                    isFiltered
                      ? 'border-emerald-500/80 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg font-mono">
                          {q.quarter}
                        </span>
                        <span className="text-xs font-bold text-white">{q.info.monthsLabel}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {q.info.start} → {q.info.end}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPeriodFilter(
                          isFiltered
                            ? { ...periodFilter, mode: 'all', isExpanded: false }
                            : { ...periodFilter, mode: 'quarter', selectedQuarter: q.quarter, isExpanded: true }
                        )
                      }
                      className={`text-xs font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                        isFiltered
                          ? 'bg-brand text-slate-900 font-black'
                          : 'bg-slate-50 text-slate-500 hover:text-white border border-slate-200'
                      }`}
                    >
                      {isFiltered ? 'Active Filter ✓' : 'Filter View'}
                    </button>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Quarterly Spend</div>
                    <div className="text-xl font-black font-mono text-white mt-0.5">
                      {fmt(q.totalExpenses)}
                    </div>
                  </div>

                  {/* Relative Spend Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-brand h-full rounded-full transition-all"
                        style={{ width: `${Math.max(5, relativePercent)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{q.expenseCount} receipts</span>
                      <span>{q.percentageOfAnnual.toFixed(1)}% of FY</span>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-xs text-slate-500">Claimable:</span>
                      <div className="text-xs font-bold text-emerald-700 font-mono">
                        {fmt(q.claimableBusinessTotal)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">{profile.country === 'US' ? 'Sales Tax:' : 'ITC Credit:'}</span>
                      <div className="text-xs font-bold text-teal-700 font-mono">
                        {fmt(q.eligibleGstItc > 0 ? q.eligibleGstItc : q.totalTaxIdentified)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Bar Chart: Q1 vs Q2 vs Q3 vs Q4 */}
          <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wide">
                  Quarterly Spend & Deductions Comparison
                </h3>
                <p className="text-xs text-slate-500">Visual comparison across all 4 quarters</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Total Spend</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand" />
                  <span>Claimable</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 pt-3 pb-1 items-end h-32 border-b border-slate-200">
              {(() => {
                const maxVal = Math.max(
                  ...quarterlyBreakdown.quarters.map((item) => Math.max(item.totalExpenses, item.claimableBusinessTotal)),
                  100
                );
                return quarterlyBreakdown.quarters.map((q) => {
                  const spendHeight = Math.max(8, Math.round((q.totalExpenses / maxVal) * 100));
                  const claimHeight = Math.max(6, Math.round((q.claimableBusinessTotal / maxVal) * 100));
                  return (
                    <div key={q.quarter} className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full flex items-end justify-center gap-1 h-24">
                        <div
                          style={{ height: `${spendHeight}%` }}
                          className="w-3.5 bg-blue-500/80 rounded-t-sm hover:bg-blue-400 transition-all cursor-pointer"
                          title={`Total: ${fmt(q.totalExpenses)}`}
                        />
                        <div
                          style={{ height: `${claimHeight}%` }}
                          className="w-3.5 bg-emerald-500/90 rounded-t-sm hover:bg-brand-strong transition-all cursor-pointer"
                          title={`Claimable: ${fmt(q.claimableBusinessTotal)}`}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 font-mono">{q.quarter}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Quarter-Wise Category Distribution Matrix */}
          <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">
              Category Spend by Quarter ({quarterlyCategoryMatrix.length} Categories)
            </h3>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                    <th className="pb-2">Category</th>
                    <th className="pb-2 text-right">Q1</th>
                    <th className="pb-2 text-right">Q2</th>
                    <th className="pb-2 text-right">Q3</th>
                    <th className="pb-2 text-right">Q4</th>
                    <th className="pb-2 text-right text-emerald-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-xs">
                  {quarterlyCategoryMatrix.slice(0, 8).map((cat) => {
                    const catInfo = (CATEGORY_MAP as Record<string, any>)[cat.category] || CATEGORY_MAP['Other'];
                    return (
                      <tr key={cat.category} className="hover:bg-slate-100/40 transition-colors">
                        <td className="py-2 text-white font-sans font-medium flex items-center gap-1.5">
                          <span>{catInfo.icon}</span>
                          <span className="truncate max-w-[100px]">{cat.category}</span>
                        </td>
                        <td className="py-2 text-right text-slate-500">{cat.q1 > 0 ? fmt(cat.q1) : '—'}</td>
                        <td className="py-2 text-right text-slate-500">{cat.q2 > 0 ? fmt(cat.q2) : '—'}</td>
                        <td className="py-2 text-right text-slate-500">{cat.q3 > 0 ? fmt(cat.q3) : '—'}</td>
                        <td className="py-2 text-right text-slate-500">{cat.q4 > 0 ? fmt(cat.q4) : '—'}</td>
                        <td className="py-2 text-right text-emerald-700 font-bold">{fmt(cat.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statutory Quarterly Compliance & Filing Due Dates */}
          <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wide">
                  Quarterly Tax Deadlines & Compliance
                </h3>
                <p className="text-xs text-slate-500">Statutory calendar for {config.taxAuthority}</p>
              </div>
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                {profile.country}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {quarterlyComplianceSchedule.map((item) => (
                <div
                  key={item.quarter}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{item.quarter} ({item.period})</span>
                    </span>
                    <span className="text-xs font-mono text-amber-700 font-bold">{item.deadline}</span>
                  </div>
                  <div className="text-xs text-slate-700 font-medium">{item.form}</div>
                  <div className="text-xs text-slate-500">{item.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REPORT 3: Category Summary */}
      {activeReportTab === 'category' && (
        <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Category Breakdown ({categorySummary.length} categories)
          </h2>

          <div className="space-y-2.5">
            {categorySummary.map((c) => {
              const catInfo = (CATEGORY_MAP as Record<string, any>)[c.category] || CATEGORY_MAP['Other'];
              const pct = filteredTotal > 0 ? (c.total / filteredTotal) * 100 : 0;
              return (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-bold flex items-center gap-1.5">
                      <span>{catInfo.icon}</span>
                      <span>{c.category}</span>
                    </span>
                    <span className="text-white font-mono font-bold">{fmt(c.total)}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{c.count} invoices · {pct.toFixed(1)}% of total</span>
                    <span>Claimable: {fmt(c.claimable)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* REPORT 4: Business vs Personal */}
      {activeReportTab === 'biz_personal' && (
        <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Business vs Personal Classification
          </h2>

          <div className="space-y-3">
            {/* 100% Business */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>100% Business Expenses</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Fully tax deductible</div>
              </div>
              <div className="text-right font-mono font-bold text-sm text-white">
                {fmt(currentPeriodTaxResult.businessExpenses)}
              </div>
            </div>

            {/* Mixed Apportioned */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Mixed Usage Expenses</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Apportioned by usage ratio</div>
              </div>
              <div className="text-right font-mono font-bold text-sm text-white">
                {fmt(currentPeriodTaxResult.mixedExpenses)}
              </div>
            </div>

            {/* Pure Personal */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>Personal Expenses</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Non-deductible personal draw</div>
              </div>
              <div className="text-right font-mono font-bold text-sm text-white">
                {fmt(currentPeriodTaxResult.personalExpenses)}
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Total Business Tax Allowable:</span>
            <span className="text-base font-extrabold text-emerald-700 font-mono">
              {fmt(currentPeriodTaxResult.claimableBusinessTotal)}
            </span>
          </div>
        </div>
      )}

      {/* REPORT 5: Tax / GST Summary */}
      {activeReportTab === 'gst' && (
        <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {profile.country === 'US' ? 'Sales Tax & Deduction Summary' : 'Goods & Services Tax (GST) Summary'}
              </h2>
              <p className="text-xs text-slate-500">{config.taxAuthority}</p>
            </div>
            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-mono">
              {profile.country === 'NZ' ? `IRD: ${profile.taxId || 'Unregistered'}` :
               profile.country === 'AU' ? `ABN: ${profile.taxId || 'Unregistered'}` :
               profile.country === 'CA' ? `BN: ${profile.taxId || 'Unregistered'}` :
               profile.country === 'US' ? `EIN: ${profile.taxId || 'Unregistered'}` :
               `GSTIN: ${profile.gstin || profile.taxId || 'Unregistered'}`}
            </span>
          </div>

          <div className="divide-y divide-slate-200 text-xs">
            {profile.country === 'IN' ? (
              <>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Central GST (CGST)</span>
                  <span className="font-mono font-semibold text-white">{fmt(currentPeriodTaxResult.cgstTotal)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>State GST (SGST)</span>
                  <span className="font-mono font-semibold text-white">{fmt(currentPeriodTaxResult.sgstTotal)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Integrated GST (IGST)</span>
                  <span className="font-mono font-semibold text-white">{fmt(currentPeriodTaxResult.igstTotal)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Compensation Cess</span>
                  <span className="font-mono font-semibold text-white">{fmt(currentPeriodTaxResult.cessTotal)}</span>
                </div>
              </>
            ) : profile.country === 'NZ' ? (
              <>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Standard 15% GST on Expenses (Box 11)</span>
                  <span className="font-mono font-semibold text-white">{fmt(currentPeriodTaxResult.totalGstIdentified)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Gross Claimable Purchases</span>
                  <span className="font-mono font-semibold text-white">{fmt(currentPeriodTaxResult.claimableBusinessTotal)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>IRD Mileage Deduction Rate</span>
                  <span className="font-mono font-semibold text-emerald-700">NZ$0.95 / km</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Entertainment Limitation</span>
                  <span className="font-mono font-semibold text-amber-700">50% deductible</span>
                </div>
              </>
            ) : profile.country === 'AU' ? (
              <>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Standard 10% GST on Purchases (1B)</span>
                  <span className="font-mono font-semibold text-white">{fmt(currentPeriodTaxResult.totalGstIdentified)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Gross Non-Capital Purchases (G11)</span>
                  <span className="font-mono font-semibold text-white">{fmt(currentPeriodTaxResult.claimableBusinessTotal)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>ATO Cents-per-km Car Rate</span>
                  <span className="font-mono font-semibold text-emerald-700">AU$0.88 / km</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Instant Asset Write-Off Limit</span>
                  <span className="font-mono font-semibold text-blue-700">AU$20,000</span>
                </div>
              </>
            ) : profile.country === 'CA' ? (
              <>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Federal GST (5%) & Provincial (HST/PST)</span>
                  <span className="font-mono font-semibold text-white">{fmt(currentPeriodTaxResult.totalGstIdentified)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>CRA Input Tax Credits (ITC) Claimable (Line 106)</span>
                  <span className="font-mono font-semibold text-emerald-700">{fmt(currentPeriodTaxResult.eligibleGstItc)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>CRA Automobile Allowance Limit</span>
                  <span className="font-mono font-semibold text-white">CA$0.70 / km</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Meals & Entertainment (ITA 67.1)</span>
                  <span className="font-mono font-semibold text-amber-700">50% deductible</span>
                </div>
              </>
            ) : (
              <>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Sales Tax Paid on Expenses</span>
                  <span className="font-mono font-semibold text-white">{fmt(currentPeriodTaxResult.totalGstIdentified)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Schedule C Allowable Business Deductions</span>
                  <span className="font-mono font-semibold text-emerald-700">{fmt(currentPeriodTaxResult.claimableBusinessTotal)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>IRS Standard Mileage Rate</span>
                  <span className="font-mono font-semibold text-white">$0.67 / mile</span>
                </div>
                <div className="py-2 flex justify-between text-slate-700">
                  <span>Business Meals Deduction</span>
                  <span className="font-mono font-semibold text-amber-700">50% deductible</span>
                </div>
              </>
            )}

            <div className="py-2.5 flex justify-between font-bold text-white text-sm">
              <span>{profile.country === 'US' ? 'Total Tax Incurred' : 'Total GST/HST Incurred'}</span>
              <span className="font-mono text-emerald-700">{fmt(currentPeriodTaxResult.totalGstIdentified)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500">
                {profile.country === 'US' ? 'Eligible Deduction Total:' : 'Eligible Input Tax Credit:'}
              </span>
              <div className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                {fmt(currentPeriodTaxResult.eligibleGstItc)}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500">
                {profile.country === 'US' ? 'Requires Schedule C Audit:' : 'ITC Under Review:'}
              </span>
              <div className="text-sm font-bold text-amber-700 font-mono mt-0.5">
                {fmt(currentPeriodTaxResult.needsReviewGst)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 6: Vendor Summary */}
      {activeReportTab === 'vendor' && (
        <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Top Vendors by Spend ({vendorSummary.length} vendors)
          </h2>

          <div className="space-y-2">
            {vendorSummary.map((v) => (
              <div
                key={v.merchant}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">{v.merchant}</div>
                  <div className="text-xs text-slate-500">
                    {v.count} bills {v.gstin ? `· ${profile.country === 'US' ? 'EIN' : profile.country === 'IN' ? 'GSTIN' : 'Tax ID'}: ${v.gstin}` : ''}
                  </div>
                </div>

                <div className="font-mono font-bold text-sm text-white">
                  {fmt(v.total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPORT 7: Detailed Expense Report */}
      {activeReportTab === 'detailed' && (
        <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-4 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Itemized Audit Ledger ({filteredExpenses.length} Records)
          </h2>

          <div className="divide-y divide-slate-200 text-xs">
            {filteredExpenses.map((exp) => (
              <div key={exp.id} className="py-2.5 flex justify-between items-start gap-2">
                <div>
                  <div className="font-bold text-white">{exp.merchant}</div>
                  <div className="text-xs text-slate-500">
                    {exp.date} · {exp.category} · {exp.invoiceNumber || 'No Inv #'}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-white">{fmt(exp.amount)}</div>
                  <div className="text-xs text-emerald-700 font-mono">
                    Claim: {fmt(exp.claimableBusinessAmount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
