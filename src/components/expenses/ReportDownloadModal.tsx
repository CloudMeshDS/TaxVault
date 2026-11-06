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
import { createCleanUserProfile } from '../../services/storageService';
import { toUserMessage } from '../../services/userMessages';

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
  const [includeReceiptImages, setIncludeReceiptImages] = useState(false);
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
  const receiptsWithImages = filteredList.filter((e) => typeof e.receiptUrl === 'string' && e.receiptUrl).length;

  if (!isOpen) return null;

  const handleDownload = async (format: 'excel' | 'pdf' | 'csv') => {
    setDownloadingFormat(format);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const safeBadge = badgeLabel.replace(/[^a-zA-Z0-9_\-]/g, '_');
      // Reports carry only the user's own details. Blank fields stay blank rather than being
      // filled from the sample profile (which would put a stranger's tax ID or accountant on them).
      const baseProfile = profile || createCleanUserProfile('', undefined, country);
      const userProfile: UserProfile = {
        ...baseProfile,
        country,
        defaultCurrency: currCode,
        currencySymbol: currSymbol,
        financialYear: baseProfile.financialYear || createCleanUserProfile('', undefined, country).financialYear,
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
          options: { dateRangeLabel: badgeLabel, includeReceiptImages },
        });
        if (!result.ok) throw new Error(result.message);
        setSuccessMessage(
          `PDF Audit Report "${fileName}" downloaded${includeReceiptImages ? ' with receipt images' : ''}!`
        );
      } else if (format === 'csv') {
        const fileName = `TaxVault_Expenses_${safeBadge}.csv`;
        await ExportClient.downloadCSV(filteredList, fileName);
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] select-none modal-backdrop-animation">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-4 space-y-3 shadow-2xl overflow-hidden max-h-full flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Download Report</h2>
              <p className="text-xs text-slate-500">Choose a period, then a format</p>
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

        {/* Fits one phone screen; scrolls only as a fallback on very short screens */}
        <div className="space-y-2.5 overflow-y-auto flex-1 min-h-0">
          {/* Notifications */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              <span className="font-medium">{toUserMessage(errorMessage)}</span>
            </div>
          )}

          {/* 1. Period */}
          <PeriodFilterControls
            filter={filter}
            onChange={setFilter}
            country={country}
            title="1. Period"
            recordCount={filteredList.length}
            showBadge={true}
          />

          {/* Summary for the selected period */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              <strong className="text-white">{filteredList.length}</strong> {filteredList.length === 1 ? 'receipt' : 'receipts'}
            </span>
            <span className="text-slate-600">
              Claimable <strong className="text-emerald-700 font-mono">{fmt(taxResult.claimableBusinessTotal)}</strong>
            </span>
          </div>

          {/* 2. Format */}
          <div className="space-y-1.5">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">2. Download as</div>
            <label className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeReceiptImages}
                onChange={(e) => setIncludeReceiptImages(e.target.checked)}
                disabled={downloadingFormat !== null}
                className="w-4 h-4 accent-emerald-600 shrink-0"
              />
              <span className="flex-1">
                Add receipt images to the PDF
                <span className="text-slate-500">
                  {' '}
                  ({receiptsWithImages} of {filteredList.length} have a photo)
                </span>
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    format: 'excel', label: 'Excel', ext: '.XLSX', hint: 'Audit workbook', Icon: FileSpreadsheet,
                    card: 'hover:border-emerald-500/40 hover:bg-emerald-50',
                    icon: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700',
                  },
                  {
                    format: 'pdf', label: 'PDF', ext: '.PDF', hint: 'Tax report', Icon: FileText,
                    card: 'hover:border-rose-500/40 hover:bg-rose-50',
                    icon: 'bg-rose-500/10 border-rose-500/30 text-rose-700',
                  },
                  {
                    format: 'csv', label: 'CSV', ext: '.CSV', hint: 'Raw data', Icon: FileCode,
                    card: 'hover:border-amber-500/40 hover:bg-amber-50',
                    icon: 'bg-amber-500/10 border-amber-500/30 text-amber-700',
                  },
                ] as const
              ).map(({ format, label, ext, hint, Icon, card, icon }) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => handleDownload(format)}
                  disabled={downloadingFormat !== null}
                  aria-label={`Download ${label} (${ext})`}
                  className={`p-2.5 rounded-xl bg-white border border-slate-200 ${card} text-center transition-all cursor-pointer flex flex-col items-center gap-1 shadow-xs disabled:opacity-50`}
                >
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${icon}`}>
                    {downloadingFormat === format ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="text-xs font-bold text-white leading-tight">{label}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">{hint}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
