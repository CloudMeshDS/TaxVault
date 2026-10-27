import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { ExpenseRecord, UserProfile } from '../../types';
import {
  PeriodFilterState,
  createDefaultPeriodFilterState,
  filterExpensesByPeriod,
  getPeriodFilterBadgeLabel,
} from '../../services/periodFilterService';
import { PeriodFilterControls } from '../common/PeriodFilterControls';
import { calculateTaxPosition, formatCurrency } from '../../services/taxRules';
import { ExportClient } from '../../services/exportClient';
import { DEFAULT_INDIAN_PROFILE, DEFAULT_PROFILES } from '../../services/storageService';

interface ReportDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: ExpenseRecord[];
  profile?: UserProfile;
  initialFilter?: PeriodFilterState;
}

export const ReportDownloadModal: React.FC<ReportDownloadModalProps> = ({
  isOpen,
  onClose,
  expenses,
  profile,
  initialFilter,
}) => {
  const [filter, setFilter] = useState<PeriodFilterState>(() =>
    initialFilter || createDefaultPeriodFilterState(profile?.country, profile?.financialYear)
  );
  const [downloadingFormat, setDownloadingFormat] = useState<'excel' | 'pdf' | 'csv' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const country = profile?.country || 'NZ';
  const currCode = profile?.defaultCurrency || (country === 'IN' ? 'INR' : 'NZD');
  const currSymbol = profile?.currencySymbol || (country === 'IN' ? '₹' : '$');
  const fmt = (val: number) => formatCurrency(val, currCode, currSymbol, false);

  // Filtered expenses according to the active period
  const filteredList = useMemo(() => {
    return filterExpensesByPeriod(expenses, filter, country);
  }, [expenses, filter, country]);

  // Recalculate tax position for the filtered expenses
  const taxResult = useMemo(() => {
    return calculateTaxPosition(filteredList, country);
  }, [filteredList, country]);

  const badgeLabel = getPeriodFilterBadgeLabel(filter, country);

  if (!isOpen) return null;

  const handleDownload = async (format: 'excel' | 'pdf' | 'csv') => {
    setDownloadingFormat(format);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const safeBadge = badgeLabel.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const baseProfile = DEFAULT_PROFILES[country] || DEFAULT_INDIAN_PROFILE;
      const userProfile: UserProfile = {
        ...baseProfile,
        ...(profile || {}),
        country,
        defaultCurrency: currCode,
        currencySymbol: currSymbol,
        financialYear: profile?.financialYear || baseProfile.financialYear || 'FY 2026-27',
      };

      if (format === 'excel') {
        const fileName = `TaxVault_Register_${safeBadge}.xlsx`;
        const result = await ExportClient.downloadProExport('xlsx', { profile: userProfile, expenses: filteredList, taxResult, fileName });
        if (!result.ok) throw new Error(result.message);
        setSuccessMessage(`Excel workbook "${fileName}" downloaded successfully!`);
      } else if (format === 'pdf') {
        const fileName = `TaxVault_Report_${safeBadge}.pdf`;
        const result = await ExportClient.downloadProExport('pdf', {
          profile: userProfile,
          expenses: filteredList,
          taxResult,
          fileName,
          options: { dateRangeLabel: badgeLabel },
        });
        if (!result.ok) throw new Error(result.message);
        setSuccessMessage(`PDF Audit Report "${fileName}" downloaded successfully!`);
      } else if (format === 'csv') {
        const fileName = `TaxVault_Expenses_${safeBadge}.csv`;
        ExportClient.downloadCSV(filteredList, fileName);
        setSuccessMessage(`CSV spreadsheet "${fileName}" downloaded successfully!`);
      }

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMessage(err?.message || 'Failed to generate download. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4 select-none modal-backdrop-animation">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Download Report</h2>
              <p className="text-xs text-slate-500">
                Export itemized tax audit packs & spreadsheets
              </p>
            </div>
          </div>
          <button
            aria-label="Close"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Notifications */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-200 text-xs p-3 rounded-2xl flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-200 text-xs p-3 rounded-2xl flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Date Filter Section (Exact same as HomeScreen) */}
          <PeriodFilterControls
            filter={filter}
            onChange={setFilter}
            country={country}
            title="1. Select Date Filter"
            recordCount={filteredList.length}
            showBadge={true}
          />

          {/* Summary Card for Selected Period */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                Matching Receipts
              </div>
              <div className="text-sm font-extrabold text-white mt-0.5">
                {filteredList.length} {filteredList.length === 1 ? 'record' : 'records'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                Total Claimable
              </div>
              <div className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5">
                {fmt(taxResult.claimableBusinessTotal)}
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              2. Choose Export Format
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Excel Card */}
              <button
                type="button"
                onClick={() => handleDownload('excel')}
                disabled={downloadingFormat !== null}
                className="group relative p-3.5 rounded-2xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500/40 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-700">
                    {downloadingFormat === 'excel' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    .XLSX
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-700 transition-colors">
                    Excel Workbook
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Multi-sheet CA audit schedule & tax breakdown
                  </div>
                </div>
              </button>

              {/* PDF Card */}
              <button
                type="button"
                onClick={() => handleDownload('pdf')}
                disabled={downloadingFormat !== null}
                className="group relative p-3.5 rounded-2xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-500/40 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-700">
                    {downloadingFormat === 'pdf' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-700" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                    .PDF
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-rose-700 transition-colors">
                    Audit PDF
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Formal tax report with itemized receipt table
                  </div>
                </div>
              </button>

              {/* CSV Card */}
              <button
                type="button"
                onClick={() => handleDownload('csv')}
                disabled={downloadingFormat !== null}
                className="group relative p-3.5 rounded-2xl bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-500/40 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
                    {downloadingFormat === 'csv' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                    ) : (
                      <FileCode className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    .CSV
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-700 transition-colors">
                    CSV Data
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Clean raw tabular data for accounting imports
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>CA & Tax Authority Compliant</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
