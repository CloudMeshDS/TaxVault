import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  Receipt,
  Percent,
  Layers,
  ChevronDown,
  Info,
  ShieldAlert,
  Edit2,
  Plus,
  Trash2,
  Eye,
  Sliders,
  Check,
  AlertCircle,
  PenTool,
  Search,
} from 'lucide-react';
import {
  ExpenseCategory,
  ExpenseRecord,
  ExpenseType,
  GSTTreatment,
  PaymentMethod,
  ReceiptItem,
  UserProfile,
} from '../../types';
import {
  ExtractedReceiptData,
  getGeminiApiKey,
  callGeminiVision,
} from '../../services/receiptOcr';
import { GeminiApiKeyModal } from '../common/GeminiApiKeyModal';
import {
  ALL_CATEGORIES,
  CATEGORY_MAP,
  formatINR,
  formatCurrency,
  validateCalculation,
} from '../../services/taxRules';
import { pressable } from '../../utils/a11y';

interface ReceiptReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedData: ExtractedReceiptData | null;
  profile: UserProfile;
  onSaveExpense: (expense: ExpenseRecord) => void;
  onTriggerDuplicateCheck: (candidate: {
    merchant: string;
    date: string;
    amount: number;
    invoiceNumber?: string;
  }) => { isDuplicate: boolean; matchedExpense?: ExpenseRecord; reason?: string };
}

export const ReceiptReviewModal: React.FC<ReceiptReviewModalProps> = ({
  isOpen,
  onClose,
  extractedData,
  profile,
  onSaveExpense,
  onTriggerDuplicateCheck,
}) => {
  if (!isOpen || !extractedData) return null;

  const country = extractedData.country || profile.country || 'NZ';
  const fmt = (val: number) => formatCurrency(val, country);
  const isPdfDoc = Boolean(
    extractedData.originalImage?.startsWith('data:application/pdf') ||
    extractedData.originalImage?.startsWith('JVBERi') ||
    extractedData.receiptFileName?.toLowerCase().endsWith('.pdf')
  );

  // Editable Form State
  const [merchant, setMerchant] = useState(extractedData.merchant);
  const [invoiceNumber, setInvoiceNumber] = useState(extractedData.invoiceNumber);
  const [date, setDate] = useState(extractedData.date);
  const [time, setTime] = useState(extractedData.time || '12:00');
  const [vendorGSTIN, setVendorGSTIN] = useState(extractedData.vendorTaxId || extractedData.vendorGSTIN || '');
  const [customerGSTIN, setCustomerGSTIN] = useState(extractedData.customerTaxId || extractedData.customerGSTIN || profile.taxId || profile.gstin || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(extractedData.paymentMethod || 'Credit Card');
  const [state, setState] = useState(extractedData.state || 'Auckland');

  // Financial Values
  const [subtotal, setSubtotal] = useState<number>(extractedData.subtotal);
  const [discount, setDiscount] = useState<number>(extractedData.discount || 0);
  const [cgst, setCgst] = useState<number>(extractedData.cgst || 0);
  const [sgst, setSgst] = useState<number>(extractedData.sgst || 0);
  const [igst, setIgst] = useState<number>(extractedData.igst || 0);
  const [cess, setCess] = useState<number>(extractedData.cess || 0);
  const [roundOff, setRoundOff] = useState<number>(extractedData.roundOff || 0);
  const [taxAmount, setTaxAmount] = useState<number>(extractedData.taxAmount || extractedData.gstAmount || extractedData.hstAmount || extractedData.salesTaxAmount || (extractedData.cgst + extractedData.sgst + extractedData.igst) || 0);
  const [totalAmount, setTotalAmount] = useState<number>(extractedData.totalAmount);

  // Categorization & Business Usage
  const [category, setCategory] = useState<ExpenseCategory>(extractedData.category);
  const [expenseType, setExpenseType] = useState<ExpenseType>(extractedData.expenseType);
  const [businessPercentage, setBusinessPercentage] = useState<number>(extractedData.businessPercentage);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Line items
  const [items, setItems] = useState<ReceiptItem[]>(extractedData.items || []);

  // UI States
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [showReceiptImage, setShowReceiptImage] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [caReviewStatus, setCaReviewStatus] = useState<'Not Reviewed' | 'Reviewed' | 'Needs CA Review'>('Not Reviewed');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [touchedSubmit, setTouchedSubmit] = useState<boolean>(false);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [aiScanStatus, setAiScanStatus] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(Boolean(getGeminiApiKey()));

  const handleRunAiScan = async (keyOverride?: string) => {
    if (!extractedData.originalImage) return;
    const apiKey = keyOverride || getGeminiApiKey();
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setIsAiScanning(true);
    setAiScanStatus('Reading document with Gemini Vision AI...');
    try {
      const result = await callGeminiVision(
        extractedData.originalImage,
        country,
        customerGSTIN,
        apiKey
      );
      if (result && (result.merchant || result.totalAmount > 0 || (result.items && result.items.length > 0))) {
        setMerchant(result.merchant || 'Store / Merchant');
        setInvoiceNumber(result.invoiceNumber || '');
        setDate(result.date || new Date().toISOString().split('T')[0]);
        setTime(result.time || '12:00');
        setVendorGSTIN(result.vendorTaxId || result.vendorGSTIN || '');
        setSubtotal(result.subtotal || 0);
        setDiscount(result.discount || 0);
        setTaxAmount(result.taxAmount || result.gstAmount || result.salesTaxAmount || 0);
        setCgst(result.cgst || 0);
        setSgst(result.sgst || 0);
        setIgst(result.igst || 0);
        setTotalAmount(result.totalAmount || 0);
        setCategory(result.category);
        setExpenseType(result.expenseType);
        setBusinessPercentage(result.businessPercentage);
        if (result.items && result.items.length > 0) setItems(result.items);
        setAiScanStatus('Receipt successfully extracted!');
        setTimeout(() => setAiScanStatus(null), 3000);
      } else {
        setAiScanStatus('Could not read receipt text. Please enter details manually.');
        setTimeout(() => setAiScanStatus(null), 4000);
      }
    } catch {
      setAiScanStatus('AI scan failed. Please check network connection.');
      setTimeout(() => setAiScanStatus(null), 4000);
    } finally {
      setIsAiScanning(false);
    }
  };

  // Sync state if initial extractedData changes
  useEffect(() => {
    if (extractedData) {
      setValidationError(null);
      setTouchedSubmit(false);
      setMerchant(extractedData.merchant);
      setInvoiceNumber(extractedData.invoiceNumber);
      setDate(extractedData.date);
      setTime(extractedData.time || '12:00');
      setVendorGSTIN(extractedData.vendorTaxId || extractedData.vendorGSTIN || '');
      setCustomerGSTIN(extractedData.customerTaxId || extractedData.customerGSTIN || profile.taxId || profile.gstin || '');
      setPaymentMethod(extractedData.paymentMethod || 'Credit Card');
      setState(extractedData.state || 'Auckland');
      setSubtotal(extractedData.subtotal);
      setDiscount(extractedData.discount || 0);
      setCgst(extractedData.cgst || 0);
      setSgst(extractedData.sgst || 0);
      setIgst(extractedData.igst || 0);
      setCess(extractedData.cess || 0);
      setRoundOff(extractedData.roundOff || 0);
      setTaxAmount(extractedData.taxAmount || extractedData.gstAmount || extractedData.hstAmount || extractedData.salesTaxAmount || (extractedData.cgst + extractedData.sgst + extractedData.igst) || 0);
      setTotalAmount(extractedData.totalAmount);
      setCategory(extractedData.category);
      setExpenseType(extractedData.expenseType);
      setBusinessPercentage(extractedData.businessPercentage);
      setItems(extractedData.items || []);
    }
  }, [extractedData, profile.gstin, profile.taxId]);

  // Derived Claimable Business Amount
  const claimableAmount =
    expenseType === 'Business'
      ? totalAmount
      : expenseType === 'Personal'
      ? 0
      : Math.round(totalAmount * (businessPercentage / 100) * 100) / 100;

  // Calculation Validation Rule
  const validationResult = validateCalculation({
    subtotal,
    discount,
    cgst,
    sgst,
    igst,
    cess,
    roundOff,
    amount: totalAmount,
  });

  // Total tax calculation
  const totalTaxAmount = country === 'IN'
    ? (cgst + sgst + igst + cess)
    : (taxAmount || Math.max(0, Math.round((totalAmount - subtotal) * 100) / 100));

  // Determine GST treatment based on vendor tax ID and category
  const catInfo = CATEGORY_MAP[category] || CATEGORY_MAP['Office Expenses'];
  const gstTreatment: GSTTreatment = vendorGSTIN
    ? (catInfo.gstEligibilityHint)
    : 'Not identified';

  // Confidence scores
  const confidence = extractedData.confidenceScores || {
    merchant: 96,
    date: 98,
    total: 99,
  };

  const handleSave = () => {
    setTouchedSubmit(true);

    const cleanMerchant = merchant?.trim();
    let finalTotal = typeof totalAmount === 'number' ? totalAmount : parseFloat(String(totalAmount));
    const finalSubtotal = typeof subtotal === 'number' ? subtotal : parseFloat(String(subtotal));

    // If total is 0 but subtotal > 0, calculate total
    if ((isNaN(finalTotal) || finalTotal <= 0) && !isNaN(finalSubtotal) && finalSubtotal > 0) {
      finalTotal = Math.round((finalSubtotal + totalTaxAmount) * 100) / 100;
      setTotalAmount(finalTotal);
    }

    if (!cleanMerchant) {
      setValidationError('Please enter a merchant or vendor name.');
      return;
    }

    if (isNaN(finalTotal) || finalTotal <= 0) {
      setValidationError('Please enter an expense amount greater than 0.00.');
      return;
    }

    const cleanDate = date?.trim();
    if (!cleanDate) {
      setValidationError('Please select a valid date for this expense.');
      return;
    }

    setValidationError(null);

    // Check duplicate
    onTriggerDuplicateCheck({
      merchant: cleanMerchant,
      date: cleanDate,
      amount: finalTotal,
      invoiceNumber,
    });

    const newExpense: ExpenseRecord = {
      id: 'exp-' + Date.now().toString(36),
      merchant: cleanMerchant,
      invoiceNumber,
      receiptNumber: extractedData.receiptNumber || `REC-${Date.now().toString().slice(-5)}`,
      date: cleanDate,
      time,
      vendorAddress: extractedData.vendorAddress,
      vendorPhone: extractedData.vendorPhone,
      country,
      currency: profile.defaultCurrency || (country === 'IN' ? 'INR' : country === 'AU' ? 'AUD' : country === 'CA' ? 'CAD' : country === 'US' ? 'USD' : 'NZD'),
      currencySymbol: profile.currencySymbol || (country === 'IN' ? '₹' : '$'),
      vendorTaxId: vendorGSTIN,
      customerTaxId: customerGSTIN,
      vendorGSTIN,
      customerGSTIN,
      state,
      paymentMethod,
      subtotal: finalSubtotal || finalTotal,
      discount,
      taxableAmount: (finalSubtotal || finalTotal) - discount,
      taxType: extractedData.taxType || (country === 'CA' ? 'HST' : country === 'US' ? 'Sales Tax' : 'GST'),
      taxRate: extractedData.taxRate || (country === 'NZ' ? 15 : country === 'AU' ? 10 : country === 'CA' ? 13 : country === 'IN' ? 18 : 8.5),
      taxAmount: totalTaxAmount,
      gstAmount: country === 'NZ' || country === 'AU' || country === 'CA' ? totalTaxAmount : undefined,
      salesTaxAmount: country === 'US' ? totalTaxAmount : undefined,
      cgst,
      sgst,
      igst,
      cess,
      roundOff,
      amount: finalTotal,
      category,
      expenseType,
      businessPercentage,
      claimableBusinessAmount: claimableAmount,
      items,
      receiptUrl: extractedData.originalImage,
      receiptFileName: extractedData.receiptFileName || `${cleanMerchant.toLowerCase().replace(/\s+/g, '_')}_receipt.jpg`,
      gstTreatment,
      caReviewStatus,
      caNotes: !validationResult.isValid ? 'Flagged: calculation mismatch observed upon OCR' : undefined,
      userNotes,
      confidenceScores: confidence,
      calculationMismatch: !validationResult.isValid,
      mismatchReason: validationResult.message,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveExpense(newExpense);
    onClose();
  };

  // Shared form styling (manual entry and post-scan review use the same screen)
  const isManual = Boolean(extractedData.isManualEntry);
  const labelCls = 'block text-sm font-bold text-slate-700 mb-1.5';
  const inputCls =
    'w-full min-w-0 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none transition-all';
  const inputErrCls =
    'w-full min-w-0 bg-rose-50/20 border border-rose-400 ring-2 ring-rose-100 rounded-xl px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none transition-all';
  const merchantMissing = touchedSubmit && !merchant.trim();
  const dateMissing = touchedSubmit && !date.trim();
  const totalMissing = touchedSubmit && (!totalAmount || totalAmount <= 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex flex-col h-full overflow-hidden select-none modal-backdrop-animation">
      {/* Top Header */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] flex items-center justify-between gap-3 text-slate-900 z-20 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            {isManual ? <PenTool className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight truncate">
              {isManual ? 'Add Expense Manually' : 'Check & Verify Receipt'}
            </h2>
            <p className="text-xs text-slate-500 font-medium truncate">
              {isManual
                ? 'Enter expense details below to save into your tax vault'
                : 'Review scanned details. Tap any field to edit.'}
            </p>
          </div>
        </div>

        <button
          aria-label="Close"
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full bg-slate-50">
        <div className="max-w-xl mx-auto w-full p-4 sm:p-5 pb-12 sm:pb-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5 modal-enter-animation">
            {/* Receipt Photo / PDF Document & AI Re-scan (scanned documents only) */}
            {extractedData.originalImage && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-3">
                  {isPdfDoc ? (
                    <div
                      {...pressable(() => setShowReceiptImage(true))}
                      className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center text-emerald-700 cursor-pointer shrink-0 shadow-xs hover:bg-emerald-100 transition-colors"
                    >
                      <FileText className="w-6 h-6 text-emerald-700 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-tight mt-0.5 whitespace-nowrap">PDF</span>
                    </div>
                  ) : (
                    <img
                      src={extractedData.originalImage}
                      alt="Receipt Thumbnail"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 cursor-pointer shrink-0"
                      onClick={() => setShowReceiptImage(true)}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="truncate">{isPdfDoc ? 'PDF Document Uploaded' : 'Receipt Photo Captured'}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {merchant ? 'Check the details below' : 'Run AI scan to auto-fill'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReceiptImage(true)}
                    className="text-sm font-semibold px-3 py-2 rounded-lg bg-white border border-slate-200 text-emerald-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
                  >
                    <Eye className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">View</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isAiScanning}
                    onClick={() => handleRunAiScan()}
                    className="flex-1 text-xs sm:text-sm font-bold px-3 py-2.5 rounded-xl bg-brand hover:bg-brand-strong active:scale-[0.98] text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 whitespace-nowrap shrink-0 min-w-0"
                  >
                    {isAiScanning ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        <span className="whitespace-nowrap">Reading...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">{merchant ? 'Re-scan AI' : 'Scan with AI'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsApiKeyModalOpen(true)}
                    className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                  >
                    {hasApiKey ? 'AI Key Active' : 'Set AI Key'}
                  </button>
                </div>

                {aiScanStatus && (
                  <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{aiScanStatus}</span>
                  </div>
                )}
              </div>
            )}

            {/* Validation Error Banner */}
            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Why the receipt was not read automatically (sign-in needed, scan limit, unreadable) */}
            {extractedData.extractionNotice && (
              <div role="status" className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">{extractedData.extractionNotice}</p>
              </div>
            )}

            {/* Calculation Mismatch Warning (scanned receipts only) */}
            {!isManual && !validationResult.isValid && totalAmount > 0 && subtotal > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Please check the amount</div>
                  <p className="text-xs mt-0.5 leading-relaxed">
                    Subtotal ({fmt(subtotal)}) + Tax ({fmt(totalTaxAmount)}) = {fmt(validationResult.expectedTotal)}, but Total shows {fmt(totalAmount)}.
                  </p>
                </div>
              </div>
            )}

            {/* 1. Vendor & Transaction Basics */}
            <div className="space-y-4">
              <div>
                <label className={`${labelCls} flex items-center justify-between gap-2`}>
                  <span>
                    Merchant / Vendor Name <span className="text-rose-500">*</span>
                  </span>
                  {!isManual && confidence.merchant < 80 && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Please verify
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => {
                    setMerchant(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  className={`${merchantMissing ? inputErrCls : inputCls} font-bold`}
                  placeholder={
                    country === 'NZ' ? 'e.g. Bunnings, BP Connect, Countdown' :
                    country === 'AU' ? 'e.g. Woolworths, Bunnings, Coles' :
                    country === 'CA' ? 'e.g. Canadian Tire, Tim Hortons, Metro' :
                    country === 'US' ? 'e.g. Home Depot, Target, Shell' :
                    country === 'IN' ? 'e.g. Amazon India, Reliance, Swiggy' :
                    'e.g. Vendor / Merchant Name'
                  }
                />
                {merchantMissing && (
                  <p className="text-xs text-rose-500 font-semibold mt-1">Merchant / Vendor name is required</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className={`${dateMissing ? inputErrCls : inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Invoice / Receipt #</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-1234 (optional)"
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>
            </div>

            {/* 2. Amount & Tax Section */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div>
                <label className={labelCls}>
                  Total Amount ({profile.defaultCurrency || 'NZD'}) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-extrabold text-lg">
                    {profile.currencySymbol || '$'}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={totalAmount === 0 ? '' : totalAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setTotalAmount(val);
                      if (validationError) setValidationError(null);
                      if (subtotal === 0 || subtotal === totalAmount) {
                        const rate = country === 'NZ' ? 0.15 : country === 'AU' ? 0.10 : 0.18;
                        const autoSub = Math.round((val / (1 + rate)) * 100) / 100;
                        setSubtotal(autoSub);
                        setTaxAmount(Math.round((val - autoSub) * 100) / 100);
                      }
                    }}
                    placeholder="0.00"
                    className={`${totalMissing ? inputErrCls : inputCls} pl-10 py-3.5 text-xl font-black font-mono placeholder:text-slate-300`}
                  />
                </div>
                {totalMissing && (
                  <p className="text-xs text-rose-500 font-semibold mt-1">Total amount must be greater than 0.00</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Subtotal</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={subtotal === 0 ? '' : subtotal}
                    onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    {country === 'US' ? 'Sales Tax' : 'GST / HST'}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={totalTaxAmount === 0 ? '' : totalTaxAmount}
                    onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>

              {country === 'IN' && (
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['CGST', cgst, setCgst],
                    ['SGST', sgst, setSgst],
                    ['IGST', igst, setIgst],
                  ] as const).map(([label, val, setter]) => (
                    <div key={label}>
                      <label className={labelCls}>{label}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={val === 0 ? '' : val}
                        onChange={(e) => setter(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className={`${inputCls} px-3 font-mono`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Extracted line items (scanned receipts only) */}
              {items.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <span className="text-xs uppercase font-bold text-slate-500">Extracted Items</span>
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-sm text-slate-700">
                      <span className="truncate">{it.quantity > 1 ? `${it.quantity}x ` : ''}{it.name}</span>
                      <span className="font-mono font-semibold text-slate-900 shrink-0">{fmt(it.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Category & Usage Classification */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div>
                <label className={labelCls}>Expense Category</label>
                <button
                  type="button"
                  onClick={() => setIsCategoryPickerOpen(true)}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl p-1 bg-white rounded-lg border border-slate-200/80 shadow-xs shrink-0">
                      {catInfo.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-base font-bold text-slate-900 truncate">{category}</div>
                      <div className="text-xs text-slate-500 truncate">{catInfo.description}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-700 flex items-center gap-1 shrink-0">
                    <span>Change</span>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
              </div>

              <div>
                <label className={labelCls}>Tax Deductibility</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Business', 'Personal', 'Mixed'] as ExpenseType[]).map((type) => {
                    const isSelected = expenseType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setExpenseType(type);
                          if (type === 'Business') setBusinessPercentage(100);
                          else if (type === 'Personal') setBusinessPercentage(0);
                          else if (businessPercentage === 100 || businessPercentage === 0) setBusinessPercentage(60);
                        }}
                        className={`py-3 px-2 rounded-xl text-sm font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                          isSelected
                            ? type === 'Business'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : type === 'Personal'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>

                {expenseType === 'Mixed' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 font-semibold">Business Portion:</span>
                      <span className="font-extrabold text-amber-700 font-mono">{businessPercentage}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="95"
                      step="5"
                      value={businessPercentage}
                      onChange={(e) => setBusinessPercentage(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                      <span>Claimable business amount:</span>
                      <span className="font-bold text-emerald-700 font-mono text-sm">{fmt(claimableAmount)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Payment & Tax Compliance Details */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className={`${inputCls} font-medium`}
                  >
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer / Net Banking</option>
                    <option value="UPI">UPI</option>
                    <option value="Direct Debit">Direct Debit</option>
                    <option value="Cash">Cash</option>
                    <option value="EFTPOS">EFTPOS</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>
                    {country === 'NZ' ? 'Vendor IRD / GST #' : country === 'AU' ? 'Vendor ABN' : country === 'CA' ? 'Vendor BN' : country === 'US' ? 'Vendor EIN' : 'Vendor GSTIN'}
                  </label>
                  <input
                    type="text"
                    value={vendorGSTIN}
                    onChange={(e) => setVendorGSTIN(e.target.value.toUpperCase())}
                    placeholder="Optional"
                    className={`${inputCls} font-mono uppercase`}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Notes / Description (Optional)</label>
                <input
                  type="text"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Client name, project, or purpose..."
                  className={inputCls}
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-sm font-semibold text-slate-700">Flag for Accountant / CA Review?</span>
                <button
                  type="button"
                  onClick={() => setCaReviewStatus(caReviewStatus === 'Needs CA Review' ? 'Not Reviewed' : 'Needs CA Review')}
                  className={`text-sm px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer border shrink-0 whitespace-nowrap ${
                    caReviewStatus === 'Needs CA Review'
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {caReviewStatus === 'Needs CA Review' ? '✓ Flagged' : 'Normal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Bottom Footer */}
      <div className="shrink-0 bg-white border-t border-slate-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-20 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-2xl text-sm transition-all cursor-pointer text-center whitespace-nowrap"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-[2] bg-brand hover:bg-brand-strong active:scale-[0.98] text-white font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer text-base whitespace-nowrap"
          >
            <CheckCircle2 className="w-5 h-5 text-white stroke-[2.5] shrink-0" />
            <span className="whitespace-nowrap">Save Expense</span>
          </button>
        </div>
      </div>

      {/* Category Picker Submodal */}
      {isCategoryPickerOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 modal-backdrop-animation">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl modal-enter-animation">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between text-slate-900">
              <div>
                <h3 className="font-extrabold text-base">Select Expense Category</h3>
                <p className="text-xs text-slate-500">Choose from expense classifications</p>
              </div>
              <button
                aria-label="Close"
                onClick={() => {
                  setIsCategoryPickerOpen(false);
                  setCategorySearchQuery('');
                }}
                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Search Box on top */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/80">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  placeholder="Search categories (e.g. Fuel, Office, Food, Rent, Software)..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
                  autoFocus
                />
                {categorySearchQuery && (
                  <button
                    aria-label="Clear search"
                    type="button"
                    onClick={() => setCategorySearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 overflow-y-auto space-y-1.5 flex-1 bg-white">
              {ALL_CATEGORIES.filter((c) => {
                if (!categorySearchQuery.trim()) return true;
                const q = categorySearchQuery.toLowerCase().trim();
                return (
                  c.category.toLowerCase().includes(q) ||
                  c.description.toLowerCase().includes(q) ||
                  c.defaultType.toLowerCase().includes(q)
                );
              }).length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                  <p className="font-bold text-slate-700">No categories matching "{categorySearchQuery}"</p>
                  <p className="text-slate-500">Try searching for terms like office, travel, fuel, meals, or subscriptions.</p>
                  <button
                    type="button"
                    onClick={() => setCategorySearchQuery('')}
                    className="mt-1 text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Clear search query
                  </button>
                </div>
              ) : (
                ALL_CATEGORIES.filter((c) => {
                  if (!categorySearchQuery.trim()) return true;
                  const q = categorySearchQuery.toLowerCase().trim();
                  return (
                    c.category.toLowerCase().includes(q) ||
                    c.description.toLowerCase().includes(q) ||
                    c.defaultType.toLowerCase().includes(q)
                  );
                }).map((c) => {
                  const isSelected = category === c.category;
                  return (
                    <button
                      key={c.category}
                      onClick={() => {
                        setCategory(c.category);
                        setExpenseType(c.defaultType);
                        setIsCategoryPickerOpen(false);
                        setCategorySearchQuery('');
                      }}
                      className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border border-emerald-300 text-slate-900'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl p-1 bg-white rounded-lg shrink-0 border border-slate-200/60 shadow-xs">{c.icon}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate text-slate-900">{c.category}</div>
                          <div className="text-xs text-slate-500 truncate">{c.description}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                          {c.defaultType}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-700" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Receipt Image Preview Submodal */}
      {showReceiptImage && extractedData.originalImage && (
        <div className="fixed inset-0 z-70 bg-black/50 backdrop-blur-xs flex flex-col justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between text-white">
            <span className="font-bold text-sm">Original Receipt Image</span>
            <button
              aria-label="Close"
              onClick={() => setShowReceiptImage(false)}
              className="p-1.5 rounded-xl bg-slate-100 text-slate-700 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 overflow-hidden w-full max-w-3xl mx-auto">
            {extractedData.originalImage.startsWith('data:application/pdf') ||
            extractedData.originalImage.startsWith('JVBERi') ||
            extractedData.receiptFileName?.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={extractedData.originalImage}
                title="Document PDF Preview"
                className="w-full h-[75vh] rounded-xl border border-slate-300 bg-white"
              />
            ) : (
              <img
                src={extractedData.originalImage}
                alt="Full Receipt"
                className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            )}
          </div>

          <button
            onClick={() => setShowReceiptImage(false)}
            className="w-full max-w-sm mx-auto bg-slate-100 hover:bg-slate-200 text-white font-bold py-3 rounded-xl text-sm cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      )}

      {/* Gemini AI API Key Setup Modal */}
      <GeminiApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={(newKey) => {
          setHasApiKey(Boolean(newKey));
          if (newKey && extractedData.originalImage) {
            handleRunAiScan(newKey);
          }
        }}
      />
    </div>
  );
};
