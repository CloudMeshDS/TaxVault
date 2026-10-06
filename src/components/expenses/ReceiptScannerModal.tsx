import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Receipt,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Percent,
  Database,
  Eye,
  FileCheck,
  TrendingDown,
  Info,
  Lock
} from 'lucide-react';
import { CountryTaxConfig, ExpenseCategory, ExpenseRecord, UserProfile } from '../../types';
import { parseReceiptData, SAMPLE_RECEIPTS, ExtractedReceiptData } from '../../services/receiptOcr';
import { currencyService } from '../../services/currencyService';
import { SubscriptionService } from '../../services/subscriptionService';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  taxConfig: CountryTaxConfig;
  profile: UserProfile;
  onSaveExpense: (expense: ExpenseRecord) => void;
  onOpenSubscription: () => void;
  isOnline: boolean;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  taxConfig,
  profile,
  onSaveExpense,
  onOpenSubscription,
  isOnline,
}) => {
  const [step, setStep] = useState<'capture' | 'scanning' | 'review'>('capture');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [scanStatusMessage, setScanStatusMessage] = useState('Analyzing receipt with backend API...');
  const [showVoucherFull, setShowVoucherFull] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scanCheck = SubscriptionService.canScanReceipt(profile);

  // Review form editable state
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [selectedCurrency, setSelectedCurrency] = useState(taxConfig.currencyCode);
  const [gstAmount, setGstAmount] = useState<number>(0);
  const [category, setCategory] = useState<ExpenseCategory>('Office & Admin');
  const [isDeductible, setIsDeductible] = useState(true);
  const [deductiblePercentage, setDeductiblePercentage] = useState<number>(100);
  const [paymentMethod, setPaymentMethod] = useState<'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'Cash' | 'EFTPOS'>('Credit Card');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const categories: ExpenseCategory[] = [
    'Office & Admin',
    'Tools & Equipment',
    'Vehicle & Mileage',
    'Travel & Accommodation',
    'Client Entertainment',
    'Software & Tech',
    'Utilities & Phone',
    'Professional Services',
    'Cost of Goods',
    'Advertising & Marketing',
    'Other Business',
  ];

  const handleProcessReceipt = async (content: string, sampleData?: ExtractedReceiptData) => {
    setStep('scanning');
    setScanStatusMessage(isOnline ? 'Transmitting to backend OCR engine...' : 'Offline mode: Processing on-device neural parser...');

    try {
      let data: ExtractedReceiptData;
      if (sampleData) {
        // slight pause to simulate high-accuracy neural extraction
        await new Promise(r => setTimeout(r, 650));
        data = sampleData;
      } else {
        data = await parseReceiptData(content, taxConfig.countryCode);
      }

      setExtractedData(data);
      setMerchant(data.merchant);
      setDate(data.date);
      setAmount(data.totalAmount);
      setSelectedCurrency(data.currency || taxConfig.currencyCode);
      setGstAmount(data.gstAmount);
      setCategory(data.category);
      setIsDeductible(data.isDeductible);
      setDeductiblePercentage(data.deductiblePercentage);
      setPaymentMethod(data.paymentMethod);
      setReceiptNumber(data.receiptNumber || `INV-${Date.now().toString().slice(-6)}`);
      setNotes(data.regulatoryNote || '');

      setStep('review');
    } catch {
      setStep('review');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPreviewImage(result);
        handleProcessReceipt(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSample = (sample: (typeof SAMPLE_RECEIPTS)[0]) => {
    setPreviewImage(sample.image);
    handleProcessReceipt(sample.text, sample.parsed as any);
  };

  const handleSave = () => {
    // If entered in foreign currency, convert to base
    let baseAmount = amount;
    let originalAmount: number | undefined = undefined;
    let originalCurrency: string | undefined = undefined;
    let exchangeRate: number | undefined = undefined;

    if (selectedCurrency !== taxConfig.currencyCode) {
      originalAmount = amount;
      originalCurrency = selectedCurrency;
      exchangeRate = currencyService.getExchangeRate(selectedCurrency, taxConfig.currencyCode);
      baseAmount = currencyService.convert(amount, selectedCurrency, taxConfig.currencyCode);
    }

    const newExpense: ExpenseRecord = {
      id: 'exp_' + Date.now().toString(36),
      date: date || new Date().toISOString().split('T')[0],
      merchant: merchant || 'Unknown Merchant',
      category,
      description: `${merchant} - ${category}`,
      amount: baseAmount,
      originalAmount,
      originalCurrency,
      exchangeRate,
      gstAmount: gstAmount || 0,
      isDeductible,
      deductiblePercentage,
      receiptUrl: previewImage || undefined,
      receiptFileName: receiptNumber ? `${receiptNumber}.jpg` : `receipt_${Date.now()}.jpg`,
      receiptNumber,
      paymentMethod,
      notes,
      syncStatus: isOnline ? 'synced' : 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveExpense(newExpense);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setStep('capture');
    setPreviewImage(null);
    setExtractedData(null);
  };

  // Financial calculations for the review card
  const netBeforeGst = Math.max(0, amount - gstAmount);
  const allowableClaim = Math.round(netBeforeGst * (deductiblePercentage / 100) * 100) / 100;
  // Estimated tax saving at marginal ~33%
  const estimatedTaxSaved = Math.round(allowableClaim * 0.33 * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col text-neutral-100 shadow-2xl">
        {/* Header with Step Indicator */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              {step === 'review' ? <FileCheck className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  {step === 'review' ? 'Review & Verify Receipt Data' : 'Receipt Scanner & OCR'}
                </h3>
                {step === 'review' && (
                  <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded">
                    Pre-Save Review
                  </span>
                )}
              </div>
              <p className="text-[10px] text-neutral-400">
                {step === 'review'
                  ? 'Verify extracted fields and tax deductibility before database commit'
                  : `Automated categorization · ${taxConfig.countryName} (${taxConfig.taxAuthority.split('(')[0].trim()})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: CAPTURE */}
        {step === 'capture' && (
          <div className="p-4 space-y-4">
            {/* Free Tier Limit Reached Warning if applicable */}
            {!scanCheck.allowed ? (
              <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Monthly Free Scan Limit Reached</h4>
                  <p className="text-xs text-neutral-300 mt-1 max-w-xs mx-auto">
                    You have used all <span className="font-bold text-amber-400">{scanCheck.limit} free receipt scans</span> for this month on the Starter Plan.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenSubscription();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Upgrade to Compliance Pro for Unlimited Scans</span>
                </button>
              </div>
            ) : (
              <>
                {/* Free Tier Remaining Indicator */}
                {profile.subscription.tier === 'free' && (
                  <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Starter Free Scans:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {scanCheck.remaining} of {scanCheck.limit} remaining this month
                    </span>
                  </div>
                )}

                {/* Viewfinder simulator */}
                <div className="border-2 border-dashed border-neutral-700 hover:border-emerald-500/50 rounded-2xl p-6 text-center bg-neutral-950/60 relative overflow-hidden group transition-all">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 text-emerald-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h4 className="font-semibold text-sm text-neutral-200">Snap or Upload Receipt</h4>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                    Automatic detection of merchant, GST/VAT, total, and IRD deductible status.
                  </p>

                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Photo / PDF</span>
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </>
            )}

            {/* Quick Test Demo Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-semibold text-neutral-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Instant Test Receipts (1-Click Scan & Review)</span>
                </span>
                <span className="text-[10px] text-neutral-500">NZ & Global Vendors</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {SAMPLE_RECEIPTS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSample(sample)}
                    className="p-2.5 bg-neutral-950/80 hover:bg-neutral-800/80 border border-neutral-800 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
                        <img src={sample.image} alt={sample.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-neutral-200 group-hover:text-emerald-400 transition-colors">
                          {sample.name}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {sample.parsed.category} · {taxConfig.currencySymbol}{sample.parsed.totalAmount} · {sample.parsed.deductiblePercentage}% Claim
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SCANNING IN PROGRESS */}
        {step === 'scanning' && (
          <div className="p-8 text-center space-y-4 flex flex-col items-center justify-center my-auto">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                <Receipt className="w-10 h-10 text-emerald-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>

            <div>
              <h4 className="font-bold text-base text-white">Scanning Tax Receipt</h4>
              <p className="text-xs text-neutral-400 mt-1 font-mono">{scanStatusMessage}</p>
            </div>

            <div className="w-full max-w-xs bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-2/3 animate-pulse" />
            </div>
          </div>
        )}

        {/* STEP 3: DATA REVIEW BEFORE SAVING */}
        {step === 'review' && (
          <div className="p-4 space-y-4">
            {/* Visual Banner: Pre-Save Review Status */}
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-emerald-300">
                    Data Extracted · Ready for Review
                  </div>
                  <div className="text-[11px] text-neutral-300 mt-0.5">
                    Review and modify any fields below before committing to the financial ledger and database.
                  </div>
                </div>
              </div>

              {previewImage && (
                <button
                  onClick={() => setShowVoucherFull(!showVoucherFull)}
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-medium flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Eye className="w-3 h-3 text-emerald-400" />
                  <span>{showVoucherFull ? 'Hide Receipt' : 'View Voucher'}</span>
                </button>
              )}
            </div>

            {/* Optional Voucher Image Expansion */}
            {previewImage && showVoucherFull && (
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-black/60 p-2 max-h-52 flex items-center justify-center">
                <img src={previewImage} alt="Voucher" className="max-h-48 object-contain rounded-lg" />
              </div>
            )}

            {/* Statutory Tax Impact Summary Card */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-semibold text-neutral-400 flex items-center justify-between border-b border-neutral-800/80 pb-1.5">
                <span>Calculated Tax Impact ({taxConfig.currencyCode})</span>
                <span className="font-mono text-emerald-400">
                  {taxConfig.countryCode} {taxConfig.taxAuthority.split('(')[0].trim()} Rule
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center pt-1">
                <div className="bg-neutral-900/60 p-2 rounded-lg">
                  <div className="text-[10px] text-neutral-400">Gross Paid</div>
                  <div className="font-mono font-bold text-xs text-white mt-0.5">
                    {taxConfig.currencySymbol}{amount.toFixed(2)}
                  </div>
                </div>

                <div className="bg-neutral-900/60 p-2 rounded-lg">
                  <div className="text-[10px] text-neutral-400">
                    {taxConfig.countryCode === 'NZ' ? 'GST (15%)' : 'Tax Included'}
                  </div>
                  <div className="font-mono font-bold text-xs text-neutral-300 mt-0.5">
                    {taxConfig.currencySymbol}{gstAmount.toFixed(2)}
                  </div>
                </div>

                <div className="bg-neutral-900/60 p-2 rounded-lg">
                  <div className="text-[10px] text-neutral-400">Deductible Claim</div>
                  <div className="font-mono font-bold text-xs text-emerald-400 mt-0.5">
                    {taxConfig.currencySymbol}{allowableClaim.toFixed(2)}
                  </div>
                </div>

                <div className="bg-neutral-900/60 p-2 rounded-lg">
                  <div className="text-[10px] text-neutral-400">Est. Tax Saved</div>
                  <div className="font-mono font-bold text-xs text-amber-400 mt-0.5">
                    ~{taxConfig.currencySymbol}{estimatedTaxSaved.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Field Review Form */}
            <div className="space-y-3 text-xs">
              <div className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>Verify Extracted Database Fields</span>
              </div>

              {/* Merchant & Date */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1 text-[11px]">Merchant / Payee</label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={e => setMerchant(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-100 font-medium focus:outline-none focus:border-emerald-500"
                    placeholder="Merchant name"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1 text-[11px]">Transaction Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Amount, Currency & GST */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-neutral-400 block mb-1 text-[11px]">Total Paid</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setAmount(val);
                      setGstAmount(Math.round(val * (taxConfig.standardGSTRate / (1 + taxConfig.standardGSTRate)) * 100) / 100);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1 text-[11px]">Currency</label>
                  <select
                    value={selectedCurrency}
                    onChange={e => setSelectedCurrency(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="NZD">NZD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1 text-[11px]">
                    {taxConfig.countryCode === 'NZ' ? 'GST Included (15%)' : 'Tax Included'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={gstAmount}
                    onChange={e => setGstAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Category & Deductibility % */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1 text-[11px]">Assigned Tax Category</label>
                  <select
                    value={category}
                    onChange={e => {
                      const newCat = e.target.value as ExpenseCategory;
                      setCategory(newCat);
                      if (newCat === 'Client Entertainment') {
                        setDeductiblePercentage(50); // NZ 50% rule
                      } else if (newCat === 'Vehicle & Mileage') {
                        setDeductiblePercentage(80);
                      } else {
                        setDeductiblePercentage(100);
                      }
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1 text-[11px] flex items-center justify-between">
                    <span>Tax Deductible Ratio</span>
                    <span className="font-mono text-emerald-400 font-bold">{deductiblePercentage}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={deductiblePercentage}
                    onChange={e => setDeductiblePercentage(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer mt-1"
                  />
                </div>
              </div>

              {/* Payment Method & Receipt # */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1 text-[11px]">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="EFTPOS">EFTPOS</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1 text-[11px]">Voucher / Tax Invoice #</label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={e => setReceiptNumber(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Statutory Audit Note */}
              <div className="p-2.5 bg-neutral-950 border border-neutral-800/80 rounded-lg text-[11px] text-neutral-400 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-neutral-300">Auditor Note: </span>
                  {category === 'Client Entertainment'
                    ? 'Inland Revenue 50% Rule: Business food, drinks, and client entertainment are 50% non-deductible.'
                    : category === 'Vehicle & Mileage'
                    ? 'Motor Vehicle: Claiming 80% business use logbook apportionment.'
                    : '100% allowable business operating expenditure under local tax acts.'}
                </div>
              </div>

              {/* Database Destination Indicator */}
              <div className="text-[10px] text-neutral-500 flex items-center justify-between pt-1">
                <span>Database Destination:</span>
                <span className="font-mono text-neutral-400">
                  expenses_ledger · {isOnline ? 'Direct Cloud Mirror' : 'Stored Offline (Pending Sync)'}
                </span>
              </div>
            </div>

            {/* Action Buttons: Confirm & Save vs Rescan */}
            <div className="flex items-center gap-2 pt-3 border-t border-neutral-800">
              <button
                onClick={handleReset}
                className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rescan</span>
              </button>

              <button
                onClick={handleSave}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer active:scale-95"
              >
                <Database className="w-4 h-4" />
                <span>Confirm & Save to Database</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
