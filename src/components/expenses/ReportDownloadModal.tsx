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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none modal-backdrop-animation">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Download Report</h2>
              <p className="text-[11px] text-neutral-400">
                Export itemized tax audit packs & spreadsheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Notifications */}
          {successMessage && (
            <div className="bg-emerald-950/70 border border-emerald-800/70 text-emerald-200 text-xs p-3 rounded-2xl flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-950/70 border border-rose-800/70 text-rose-200 text-xs p-3 rounded-2xl flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
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
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                Matching Receipts
              </div>
              <div className="text-sm font-extrabold text-white mt-0.5">
                {filteredList.length} {filteredList.length === 1 ? 'record' : 'records'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                Total Claimable
              </div>
              <div className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">
                {fmt(taxResult.claimableBusinessTotal)}
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-2">
            <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
              2. Choose Export Format
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Excel Card */}
              <button
                type="button"
                onClick={() => handleDownload('excel')}
                disabled={downloadingFormat !== null}
                className="group relative p-3.5 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 hover:to-emerald-950/20 border border-neutral-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    {downloadingFormat === 'excel' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md">
                    .XLSX
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Excel Workbook
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 leading-snug">
                    Multi-sheet CA audit schedule & tax breakdown
                  </div>
                </div>
              </button>

              {/* PDF Card */}
              <button
                type="button"
                onClick={() => handleDownload('pdf')}
                disabled={downloadingFormat !== null}
                className="group relative p-3.5 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 hover:to-rose-950/20 border border-neutral-800 hover:border-rose-500/40 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    {downloadingFormat === 'pdf' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded-md">
                    .PDF
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                    Audit PDF
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 leading-snug">
                    Formal tax report with itemized receipt table
                  </div>
                </div>
              </button>

              {/* CSV Card */}
              <button
                type="button"
                onClick={() => handleDownload('csv')}
                disabled={downloadingFormat !== null}
                className="group relative p-3.5 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 hover:to-amber-950/20 border border-neutral-800 hover:border-amber-500/40 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    {downloadingFormat === 'csv' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <FileCode className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-md">
                    .CSV
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    CSV Data
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 leading-snug">
                    Clean raw tabular data for accounting imports
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
          <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>CA & Tax Authority Compliant</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
