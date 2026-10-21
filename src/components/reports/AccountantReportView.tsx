import React, { useState } from 'react';
import {
  FileText,
  Download,
  Share2,
  CheckCircle2,
  Lock,
  Mail,
  Copy,
  ExternalLink,
  ShieldCheck,
  Building,
  UserCheck,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { CountryTaxConfig, ExpenseRecord, IncomeRecord, TaxCalculationResult, UserProfile, AccountantShareToken } from '../../types';
import { ExportService } from '../../services/exportService';
import { SubscriptionService } from '../../services/subscriptionService';

interface AccountantReportViewProps {
  profile: UserProfile;
  taxConfig: CountryTaxConfig;
  expenses: ExpenseRecord[];
  incomes: IncomeRecord[];
  taxResult: TaxCalculationResult;
  onUpdateProfile: (p: UserProfile) => void;
  onOpenSubscription: (reason?: string) => void;
}

export const AccountantReportView: React.FC<AccountantReportViewProps> = ({
  profile,
  taxConfig,
  expenses,
  incomes,
  taxResult,
  onUpdateProfile,
  onOpenSubscription,
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeToken, setActiveToken] = useState<AccountantShareToken | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [accountantEmail, setAccountantEmail] = useState(profile.accountantEmail || '');
  const [accountantName, setAccountantName] = useState(profile.accountantName || '');

  const isPro = profile.subscription?.tier !== 'free';

  const handleGenerateShareToken = () => {
    if (!isPro) {
      onOpenSubscription('Direct Chartered Accountant Reviewer Token & Link sharing is a Pro feature.');
      return;
    }
    const token = ExportService.createAccountantShareToken();
    setActiveToken(token);
    setShowShareModal(true);
  };

  const handleDownloadPDF = () => {
    if (!isPro) {
      onOpenSubscription('Official Chartered Accountant Audit PDF with statutory IRD sign-off requires Tax Compliance Pro.');
      return;
    }
    ExportService.generateAccountantTaxPDF(profile, expenses, incomes, taxResult);
  };

  const handleDownloadExcel = () => {
    if (!isPro) {
      onOpenSubscription('Multi-Sheet Excel Tax Audit Pack (.xlsx) requires Tax Compliance Pro.');
      return;
    }
    ExportService.generateAccountantExcel(profile, expenses, incomes, taxResult);
  };

  const handleDownloadCSV = () => {
    ExportService.generateCSV(expenses);
  };

  const handleCopyShareLink = () => {
    if (activeToken) {
      const shareUrl = `${window.location.origin}?reviewerToken=${activeToken.token}&pin=${activeToken.pin}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSendToAccountant = () => {
    if (accountantEmail) {
      onUpdateProfile({
        ...profile,
        accountantEmail,
        accountantName,
      });
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Chartered Accountant Tax Pack</h2>
          <p className="text-xs text-neutral-400">
            End-of-year audit schedule & compliance documentation
          </p>
        </div>

        <button
          onClick={handleGenerateShareToken}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share with CA</span>
        </button>
      </div>

      {/* Statutory Authority Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-lg">
            {taxConfig.flag}
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-100">{taxConfig.taxAuthority}</div>
            <div className="text-[11px] text-neutral-400">
              Tax ID: <span className="font-mono text-neutral-200">{profile.taxNumber || '128-449-012'}</span> · FY End: {profile.financialYearEnding}
            </div>
          </div>
        </div>
        <span className="text-[10px] text-emerald-400 font-medium">IRD Compliant</span>
      </div>

      {/* Export Options Grid (Adaptive for portrait and landscape) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          onClick={handleDownloadPDF}
          className="p-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl flex sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-2.5 sm:gap-1.5 transition-colors cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-2 right-2 text-[8px] font-bold font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            PRO
          </div>
          <FileText className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform shrink-0" />
          <div>
            <span className="text-xs font-semibold text-neutral-200 block">Audit PDF</span>
            <span className="text-[10px] text-neutral-500 block">Official CA Signoff</span>
          </div>
        </button>

        <button
          onClick={handleDownloadExcel}
          className="p-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl flex sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-2.5 sm:gap-1.5 transition-colors cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-2 right-2 text-[8px] font-bold font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            PRO
          </div>
          <FileSpreadsheet className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
          <div>
            <span className="text-xs font-semibold text-neutral-200 block">Excel (.xlsx)</span>
            <span className="text-[10px] text-neutral-500 block">Full Multi-Sheet</span>
          </div>
        </button>

        <button
          onClick={handleDownloadCSV}
          className="p-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl flex sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-2.5 sm:gap-1.5 transition-colors cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-2 right-2 text-[8px] font-bold font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            FREE
          </div>
          <Download className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
          <div>
            <span className="text-xs font-semibold text-neutral-200 block">CSV Export</span>
            <span className="text-[10px] text-neutral-500 block">Xero / MYOB Sync</span>
          </div>
        </button>
      </div>

      {/* Statutory Reconciliation Schedule */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <span className="text-xs font-bold text-neutral-200">Financial Year Tax Reconciliation</span>
          <span className="text-[10px] text-neutral-400 font-mono">Currency: {taxConfig.currencyCode}</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1">
            <span className="text-neutral-400">Gross Operating Revenue (excl. GST)</span>
            <span className="font-mono text-neutral-100 font-medium">
              {taxConfig.currencySymbol}
              {taxResult.totalGrossIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-neutral-400">Total Deductible Operating Expenses</span>
            <span className="font-mono text-emerald-400 font-medium">
              ({taxConfig.currencySymbol}
              {taxResult.totalDeductibleExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-neutral-800/80 font-semibold">
            <span className="text-neutral-200">Net Taxable Profit / Income</span>
            <span className="font-mono text-white">
              {taxConfig.currencySymbol}
              {taxResult.netTaxableIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-neutral-400">
              Estimated Income Tax (Effective {(taxResult.effectiveTaxRate * 100).toFixed(1)}%)
            </span>
            <span className="font-mono text-amber-400 font-medium">
              {taxConfig.currencySymbol}
              {taxResult.estimatedIncomeTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-neutral-800/80 pt-2">
            <span className="text-neutral-400">Total GST Paid on Business Purchases</span>
            <span className="font-mono text-neutral-300">
              {taxConfig.currencySymbol}
              {taxResult.totalGstPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-neutral-400">Total GST Collected on Client Billings</span>
            <span className="font-mono text-neutral-300">
              {taxConfig.currencySymbol}
              {taxResult.totalGstCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 bg-neutral-950/60 p-2 rounded-lg font-semibold">
            <span className="text-neutral-300">
              {taxResult.netGstPayableOrRefund <= 0 ? 'Net GST Refund Due from IRD' : 'Net GST Payable to IRD'}
            </span>
            <span
              className={`font-mono ${
                taxResult.netGstPayableOrRefund <= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {taxConfig.currencySymbol}
              {Math.abs(taxResult.netGstPayableOrRefund).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Statutory Forms for Selected Country */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="text-xs font-bold text-neutral-200">
          {taxConfig.countryName} Statutory Returns
        </div>

        <div className="space-y-2">
          {taxConfig.complianceForms.map(form => (
            <div
              key={form.code}
              className="p-2.5 bg-neutral-950 border border-neutral-800/80 rounded-lg flex items-start gap-2.5"
            >
              <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                {form.code}
              </div>
              <div className="text-xs">
                <div className="font-medium text-neutral-200">{form.name}</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">{form.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share with CA Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 modal-backdrop-animation">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-5 space-y-4 text-neutral-100 shadow-2xl modal-enter-animation">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Chartered Accountant Secure Access</h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Generate a secure 30-day read-only token for your Chartered Accountant to inspect receipts, GST audit schedules, and verify deductions.
            </p>

            {activeToken && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Reviewer Access PIN:</span>
                  <span className="font-mono text-base font-bold text-emerald-400 tracking-widest">
                    {activeToken.pin}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Token ID:</span>
                  <span className="font-mono text-[11px] text-neutral-300">
                    {activeToken.token}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Expires:</span>
                  <span className="text-[11px] text-neutral-300">{activeToken.expiryDate}</span>
                </div>

                <button
                  onClick={handleCopyShareLink}
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-emerald-400 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Secure Link Copied to Clipboard!' : 'Copy Direct Reviewer Link'}</span>
                </button>
              </div>
            )}

            {/* Direct Email Dispatch */}
            <div className="space-y-2 text-xs">
              <label className="text-neutral-300 font-medium block">
                Send Direct Invite to Chartered Accountant
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="CA Advisor Name (e.g. Sarah Mitchell, CA)"
                  value={accountantName}
                  onChange={e => setAccountantName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="email"
                  placeholder="Accountant Email (e.g. sarah@ca-firm.co.nz)"
                  value={accountantEmail}
                  onChange={e => setAccountantEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={handleSendToAccountant}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Mail className="w-4 h-4" />
                <span>{emailSent ? 'Invitation Dispatched Successfully!' : 'Dispatch Reviewer Invite Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
