import React, { useState } from 'react';
import {
  Users,
  Share2,
  FileText,
  FileSpreadsheet,
  Archive,
  MessageCircle,
  Mail,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Edit2,
  Phone,
} from 'lucide-react';
import { ExpenseRecord, TaxCalculationResult, UserProfile } from '../../types';
import { formatINR } from '../../services/taxRules';
import { ExportService } from '../../services/exportService';

interface CAShareViewProps {
  profile: UserProfile;
  expenses: ExpenseRecord[];
  taxResult: TaxCalculationResult;
  onUpdateProfile: (updated: UserProfile) => void;
  onSelectExpense: (expense: ExpenseRecord) => void;
}

export const CAShareView: React.FC<CAShareViewProps> = ({
  profile,
  expenses,
  taxResult,
  onUpdateProfile,
  onSelectExpense,
}) => {
  const [selectedFY, setSelectedFY] = useState(profile.financialYear || 'FY 2026-27');
  const [selectedPeriod, setSelectedPeriod] = useState<'Full Year' | 'Q1 (Apr-Jun)' | 'Q2 (Jul-Sep)' | 'Q3 (Oct-Dec)' | 'Q4 (Jan-Mar)'>('Full Year');

  // Checkboxes
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeGst, setIncludeGst] = useState(true);
  const [includeReceipts, setIncludeReceipts] = useState(true);
  const [includeVendors, setIncludeVendors] = useState(true);

  // CA Contact editing
  const [isEditingCA, setIsEditingCA] = useState(false);
  const [caName, setCaName] = useState(profile.accountantName || 'CA Amit Verma, FCA');
  const [caEmail, setCaEmail] = useState(profile.accountantEmail || 'amit.verma@caindia.org');
  const [caPhone, setCaPhone] = useState(profile.accountantPhone || '+91 98201 55442');

  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Status breakdown
  const reviewedCount = expenses.filter((e) => e.caReviewStatus === 'Reviewed').length;
  const needsReviewCount = expenses.filter((e) => e.caReviewStatus === 'Needs CA Review').length;
  const needsClarificationCount = expenses.filter((e) => e.caReviewStatus === 'Needs Clarification').length;
  const notReviewedCount = expenses.filter((e) => e.caReviewStatus === 'Not Reviewed').length;

  const handleSaveCAContact = () => {
    setIsEditingCA(false);
    onUpdateProfile({
      ...profile,
      accountantName: caName,
      accountantEmail: caEmail,
      accountantPhone: caPhone,
    });
    setFeedbackMessage('CA contact details updated!');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // 1. Download ZIP package
  const handleDownloadZip = async () => {
    setIsGeneratingZip(true);
    setFeedbackMessage('Packaging PDF, Excel and receipt files into ZIP...');
    try {
      const zipBlob = await ExportService.generateCAZipPackage(profile, expenses, taxResult, {
        includeReceiptImages: includeReceipts,
      });
      ExportService.triggerDownload(
        zipBlob,
        `TaxVault_CA_Audit_Pack_${profile.businessName.replace(/\s+/g, '_')}_${selectedFY}.zip`
      );
      setFeedbackMessage('ZIP package downloaded successfully!');
      setTimeout(() => setFeedbackMessage(null), 3500);
    } finally {
      setIsGeneratingZip(false);
    }
  };

  // 2. Share via WhatsApp
  const handleShareWhatsApp = () => {
    const url = ExportService.getWhatsAppShareUrl(profile, taxResult, caPhone);
    window.open(url, '_blank');
  };

  // 3. Share via Email
  const handleShareEmail = () => {
    const url = ExportService.getEmailShareUrl(profile, taxResult, caEmail);
    window.open(url, '_blank');
  };

  // 4. Download PDF
  const handleDownloadPDF = () => {
    const doc = ExportService.generateIndianCAPDF(profile, expenses, taxResult, {
      includeExpenses,
      includeGst,
      includeVendors,
      dateRangeLabel: `${selectedPeriod} (${selectedFY})`,
    });
    doc.save(`TaxVault_CA_Audit_Report_${selectedFY}.pdf`);
  };

  // 5. Download Excel
  const handleDownloadExcel = () => {
    const buffer = ExportService.generateIndianExcelWorkbook(profile, expenses, taxResult);
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    ExportService.triggerDownload(blob, `TaxVault_Expense_Register_${selectedFY}.xlsx`);
  };

  return (
    <div className="p-4 space-y-4 pb-24 max-w-xl mx-auto select-none">
      {/* Title */}
      <div>
        <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
          <span>Share with CA</span>
          <Users className="w-5 h-5 text-emerald-400" />
        </h1>
        <p className="text-xs text-neutral-400 font-medium">
          Generate professional reports & zip vouchers for your tax consultant
        </p>
      </div>

      {feedbackMessage && (
        <div className="bg-emerald-950/70 border border-emerald-500/60 rounded-xl p-3 text-xs text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* CA Contact Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase font-bold text-neutral-400">
            Appointed Chartered Accountant
          </span>
          <button
            onClick={() => setIsEditingCA(!isEditingCA)}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
            <span>{isEditingCA ? 'Cancel' : 'Edit CA Info'}</span>
          </button>
        </div>

        {isEditingCA ? (
          <div className="space-y-2 text-xs">
            <div>
              <label className="text-[10px] text-neutral-400">CA Name / Firm</label>
              <input
                type="text"
                value={caName}
                onChange={(e) => setCaName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400">CA Email</label>
              <input
                type="email"
                value={caEmail}
                onChange={(e) => setCaEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400">WhatsApp / Mobile Number</label>
              <input
                type="tel"
                value={caPhone}
                onChange={(e) => setCaPhone(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <button
              onClick={handleSaveCAContact}
              className="bg-emerald-500 text-neutral-950 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer mt-1"
            >
              Save CA Details
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-extrabold text-sm text-white">{profile.accountantName || 'CA Amit Verma, FCA'}</div>
              <div className="text-xs text-neutral-400 mt-0.5">
                {profile.accountantEmail || 'amit.verma@caindia.org'} · {profile.accountantPhone || '+91 98201 55442'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-emerald-400 font-bold">
              CA
            </div>
          </div>
        )}
      </div>

      {/* Select Period & Options */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <span className="text-[11px] uppercase font-bold text-neutral-400">
          Package Configuration
        </span>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[10px] text-neutral-400">Financial Year</label>
            <select
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white font-mono"
            >
              <option value="FY 2026-27">FY 2026-27</option>
              <option value="FY 2025-26">FY 2025-26</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-neutral-400">Filing Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white"
            >
              <option value="Full Year">Full Financial Year</option>
              <option value="Q1 (Apr-Jun)">Q1 (Apr-Jun)</option>
              <option value="Q2 (Jul-Sep)">Q2 (Jul-Sep)</option>
              <option value="Q3 (Oct-Dec)">Q3 (Oct-Dec)</option>
              <option value="Q4 (Jan-Mar)">Q4 (Jan-Mar)</option>
            </select>
          </div>
        </div>

        {/* 4 Checkboxes required in PRD */}
        <div className="space-y-2 pt-2 border-t border-neutral-800 text-xs">
          <label className="flex items-center gap-2.5 text-neutral-200 cursor-pointer">
            <input
              type="checkbox"
              checked={includeExpenses}
              onChange={(e) => setIncludeExpenses(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
            <span className="font-semibold">☑️ Expense Summary & Ledger</span>
          </label>

          <label className="flex items-center gap-2.5 text-neutral-200 cursor-pointer">
            <input
              type="checkbox"
              checked={includeGst}
              onChange={(e) => setIncludeGst(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
            <span className="font-semibold">☑️ GST Report (ITC Breakdown & Taxes)</span>
          </label>

          <label className="flex items-center gap-2.5 text-neutral-200 cursor-pointer">
            <input
              type="checkbox"
              checked={includeReceipts}
              onChange={(e) => setIncludeReceipts(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
            <span className="font-semibold">☑️ Original Receipts (Digitized image vouchers)</span>
          </label>

          <label className="flex items-center gap-2.5 text-neutral-200 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVendors}
              onChange={(e) => setIncludeVendors(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
            <span className="font-semibold">☑️ Vendor Details & GSTIN Register</span>
          </label>
        </div>
      </div>

      {/* Share Actions (WhatsApp, Email, ZIP) */}
      <div className="space-y-2.5 pt-1">
        {/* PRIMARY ACTION: Download ZIP (PDF + Excel + Receipts) */}
        <button
          onClick={handleDownloadZip}
          disabled={isGeneratingZip}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:scale-[0.98] text-neutral-950 font-black py-4 px-5 rounded-2xl flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 transition-all cursor-pointer text-sm whitespace-nowrap"
        >
          <Archive className="w-5 h-5 stroke-[2.5] shrink-0" />
          <span className="whitespace-nowrap">{isGeneratingZip ? 'Generating ZIP...' : 'Download CA Audit ZIP'}</span>
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Share via WhatsApp */}
          <button
            onClick={handleShareWhatsApp}
            className="bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-600/50 text-emerald-300 font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap min-w-0"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap truncate">WhatsApp Share</span>
          </button>

          {/* Share via Email */}
          <button
            onClick={handleShareEmail}
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap min-w-0"
          >
            <Mail className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="whitespace-nowrap truncate">Email Share</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleDownloadPDF}
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap min-w-0"
          >
            <FileText className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="whitespace-nowrap truncate">Download PDF</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap min-w-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap truncate">Download Excel</span>
          </button>
        </div>
      </div>

      {/* CA Review Status Tracker */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">
          CA Review Status Pipeline
        </h2>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
            <span className="text-[10px] text-neutral-400">Reviewed</span>
            <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
              {reviewedCount}
            </div>
          </div>

          <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
            <span className="text-[10px] text-neutral-400">Needs CA Review</span>
            <div className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
              {needsReviewCount}
            </div>
          </div>

          <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
            <span className="text-[10px] text-neutral-400">Not Reviewed</span>
            <div className="text-base font-extrabold text-neutral-300 font-mono mt-0.5">
              {notReviewedCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
