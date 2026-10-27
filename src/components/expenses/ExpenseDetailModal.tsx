import React, { useState } from 'react';
import {
  X,
  Trash2,
  Edit2,
  Download,
  CheckCircle2,
  Share2,
  FileText,
  Calendar,
  Building2,
  Receipt,
  UserCheck,
  ChevronDown,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { CAReviewStatus, ExpenseCategory, ExpenseRecord, UserProfile } from '../../types';
import { ALL_CATEGORIES, CATEGORY_MAP, formatCurrency, formatINR } from '../../services/taxRules';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseRecord | null;
  profile?: UserProfile;
  onUpdateExpense: (updated: ExpenseRecord) => void;
  onDeleteExpense: (id: string) => void;
  onRestoreExpense?: (id: string) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  profile,
  onUpdateExpense,
  onDeleteExpense,
  onRestoreExpense,
}) => {
  if (!isOpen || !expense) return null;

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [caNotes, setCaNotes] = useState(expense.caNotes || '');
  const [caStatus, setCaStatus] = useState<CAReviewStatus>(expense.caReviewStatus || 'Not Reviewed');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [showImageFull, setShowImageFull] = useState(false);

  const catInfo = CATEGORY_MAP[expense.category] || CATEGORY_MAP['Other'];
  const isDeleted = expense.status === 'deleted' || Boolean(expense.isDeleted);

  const currCode = expense.currency || profile?.defaultCurrency || (profile?.country === 'IN' ? 'INR' : 'NZD');
  const currSymbol = expense.currencySymbol || profile?.currencySymbol || (profile?.country === 'IN' ? '₹' : '$');
  const fmt = (val: number, showDecimals: boolean = true) => formatCurrency(val, currCode, currSymbol, showDecimals);

  const country = expense.country || profile?.country || 'NZ';
  const taxIdVal = expense.vendorTaxId || expense.vendorGSTIN;
  const taxIdLabel =
    country === 'NZ'
      ? 'Vendor IRD / GST No:'
      : country === 'AU'
      ? 'Vendor ABN / GST:'
      : country === 'CA'
      ? 'Vendor CRA BN / GST:'
      : country === 'US'
      ? 'Vendor EIN / Tax ID:'
      : 'Vendor GSTIN:';

  const hasIndianGst = Boolean(
    (expense.cgst && expense.cgst > 0) ||
      (expense.sgst && expense.sgst > 0) ||
      (expense.igst && expense.igst > 0) ||
      (expense.cess && expense.cess > 0)
  );

  const handleStatusChange = (newStatus: CAReviewStatus) => {
    setCaStatus(newStatus);
    const updated = { ...expense, caReviewStatus: newStatus };
    onUpdateExpense(updated);
  };

  const handleSaveNotes = () => {
    setIsEditingNotes(false);
    const updated = { ...expense, caNotes };
    onUpdateExpense(updated);
  };

  const handleCategoryChange = (newCat: ExpenseCategory) => {
    setShowCategoryPicker(false);
    const updated = { ...expense, category: newCat };
    onUpdateExpense(updated);
  };

  const handleDownloadReceipt = () => {
    if (!expense.receiptUrl) return;
    const a = document.createElement('a');
    a.href = expense.receiptUrl;
    a.download = expense.receiptFileName || `${expense.merchant.replace(/\s+/g, '_')}_receipt.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs backdrop-blur-md flex flex-col justify-between overflow-y-auto select-none modal-backdrop-animation">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-slate-50/95 border-b border-slate-200 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-emerald-700" />
          <h2 className="text-base font-extrabold tracking-tight">Expense Voucher Detail</h2>
          {isDeleted && (
            <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              Deleted
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {expense.receiptUrl && (
            <button
              aria-label="Download Receipt"
              onClick={handleDownloadReceipt}
              className="p-1.5 rounded-xl bg-white shadow-xs hover:bg-slate-100 text-slate-500 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Download Receipt"
            >
              <Download className="w-4 h-4 shrink-0" />
            </button>
          )}

          {isDeleted ? (
            onRestoreExpense && (
              <button
                onClick={() => {
                  if (window.confirm(`Restore expense for ${expense.merchant} back to active?`)) {
                    onRestoreExpense(expense.id);
                    onClose();
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="Restore Expense"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Restore</span>
              </button>
            )
          ) : (
            <button
              aria-label="Delete Expense"
              onClick={() => {
                if (window.confirm(`Delete expense for ${expense.merchant}? (The record will be kept in your history with 'Deleted' status)`)) {
                  onDeleteExpense(expense.id);
                  onClose();
                }
              }}
              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer shrink-0"
              title="Delete Expense"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
            </button>
          )}

          <button
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white shadow-xs hover:bg-slate-100 text-slate-500 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5 shrink-0" />
          </button>
        </div>
      </div>

      {/* Main Detail Body */}
      <div className="flex-1 max-w-xl mx-auto w-full p-4 space-y-4 pb-28 modal-enter-animation">
        {/* Soft-Delete Warning Banner */}
        {isDeleted && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-rose-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0" />
              <div className="min-w-0">
                <div className="font-extrabold text-xs text-rose-200">Status: Deleted / Void Voucher</div>
                <div className="text-xs text-rose-700/80 truncate">
                  {expense.deletedAt ? `Deleted on ${new Date(expense.deletedAt).toLocaleDateString()}` : 'Marked as deleted'} · Excluded from active tax totals
                </div>
              </div>
            </div>
            {onRestoreExpense && (
              <button
                onClick={() => {
                  onRestoreExpense(expense.id);
                  onClose();
                }}
                className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs border border-rose-700/60 cursor-pointer shrink-0 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Restore
              </button>
            )}
          </div>
        )}
        {/* Receipt Image Preview Hero */}
        {expense.receiptUrl && (
          <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center relative overflow-hidden group">
            <img
              src={expense.receiptUrl}
              alt={expense.merchant}
              className="max-h-56 w-auto object-contain rounded-xl cursor-pointer hover:scale-102 transition-transform"
              onClick={() => setShowImageFull(true)}
            />
            <div className="mt-2 flex items-center justify-between w-full text-xs text-slate-500 px-1">
              <span>{expense.receiptFileName || 'Original digital voucher'}</span>
              <button
                onClick={() => setShowImageFull(true)}
                className="text-emerald-700 hover:text-emerald-700 font-semibold cursor-pointer"
              >
                Tap to Zoom
              </button>
            </div>
          </div>
        )}

        {/* Merchant & Amount Hero */}
        <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-black text-white">{expense.merchant}</h1>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>{expense.date}</span>
                {expense.time && <span>· {expense.time}</span>}
                {expense.invoiceNumber && <span>· Inv: {expense.invoiceNumber}</span>}
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-white font-mono">
                {fmt(expense.amount)}
              </div>
              <div className="text-xs text-emerald-700 font-semibold uppercase">
                {expense.paymentMethod}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            {/* Category with Change button */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{catInfo.icon}</span>
              <span className="text-xs font-bold text-white">{expense.category}</span>
              <button
                onClick={() => setShowCategoryPicker(true)}
                className="text-xs text-emerald-700 hover:underline cursor-pointer"
              >
                (Change)
              </button>
            </div>

            {/* Business / Personal badge */}
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                  expense.expenseType === 'Business'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : expense.expenseType === 'Mixed'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                }`}
              >
                {expense.expenseType === 'Mixed'
                  ? `Mixed (${expense.businessPercentage}%)`
                  : expense.expenseType}
              </span>

              {expense.expenseType === 'Mixed' && (
                <span className="text-xs text-slate-700 font-mono">
                  Claimable: {fmt(expense.claimableBusinessAmount)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        {expense.items && expense.items.length > 0 && (
          <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-4 space-y-2">
            <span className="text-xs uppercase font-bold text-slate-500">
              Purchased Line Items
            </span>

            <div className="divide-y divide-slate-200 text-xs">
              {expense.items.map((it, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-slate-800">
                  <div>
                    <div className="font-semibold">{it.name}</div>
                    {it.quantity > 1 && (
                      <div className="text-xs text-slate-500">
                        {it.quantity} units @ {fmt(it.unitPrice)}
                      </div>
                    )}
                  </div>
                  <div className="font-mono font-bold text-white">{fmt(it.total)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tax & Financial Breakdown Card */}
        <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-4 space-y-2.5">
          <span className="text-xs uppercase font-bold text-slate-500">
            {country === 'US' ? 'Sales Tax & Financial Breakdown' : 'Tax & Financial Breakdown'}
          </span>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-700">
              <span>Subtotal (Taxable Value)</span>
              <span className="font-mono">{fmt(expense.subtotal || expense.taxableAmount)}</span>
            </div>

            {hasIndianGst ? (
              <>
                {expense.cgst > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Central GST (CGST)</span>
                    <span className="font-mono text-emerald-700">{fmt(expense.cgst)}</span>
                  </div>
                )}
                {expense.sgst > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>State GST (SGST)</span>
                    <span className="font-mono text-emerald-700">{fmt(expense.sgst)}</span>
                  </div>
                )}
                {expense.igst > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Integrated GST (IGST)</span>
                    <span className="font-mono text-emerald-700">{fmt(expense.igst)}</span>
                  </div>
                )}
                {expense.cess > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Compensation Cess</span>
                    <span className="font-mono text-emerald-700">{fmt(expense.cess)}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {expense.gstAmount && expense.gstAmount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>GST ({expense.taxRate || (country === 'AU' ? 10 : 15)}%)</span>
                    <span className="font-mono text-emerald-700">{fmt(expense.gstAmount)}</span>
                  </div>
                )}
                {expense.hstAmount && expense.hstAmount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>HST ({expense.taxRate || 13}%)</span>
                    <span className="font-mono text-emerald-700">{fmt(expense.hstAmount)}</span>
                  </div>
                )}
                {expense.pstAmount && expense.pstAmount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>PST / QST</span>
                    <span className="font-mono text-emerald-700">{fmt(expense.pstAmount)}</span>
                  </div>
                )}
                {expense.salesTaxAmount && expense.salesTaxAmount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Sales Tax</span>
                    <span className="font-mono text-emerald-700">{fmt(expense.salesTaxAmount)}</span>
                  </div>
                )}
                {expense.taxAmount && expense.taxAmount > 0 && !expense.gstAmount && !expense.hstAmount && !expense.salesTaxAmount && (
                  <div className="flex justify-between text-slate-500">
                    <span>{expense.taxType || 'Tax'} ({expense.taxRate || 0}%)</span>
                    <span className="font-mono text-emerald-700">{fmt(expense.taxAmount)}</span>
                  </div>
                )}
              </>
            )}

            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-white">
              <span>Total Amount</span>
              <span className="font-mono text-sm">{fmt(expense.amount)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">{taxIdLabel}</span>
            <span className="font-mono font-bold text-white">{taxIdVal || 'Not Available'}</span>
          </div>
        </div>

        {/* CA Review Status & Notes Card */}
        <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-500">
              Chartered Accountant Status
            </span>
            <span className="text-xs font-bold text-amber-700">{caStatus}</span>
          </div>

          {/* Status selector buttons (horizontal scrollable single-line pills) */}
          <div
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs"
          >
            {(
              [
                'Not Reviewed',
                'Reviewed',
                'Needs CA Review',
                'Needs Clarification',
                'Not Claimable',
              ] as CAReviewStatus[]
            ).map((st) => (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                className={`py-1.5 px-2.5 rounded-xl font-medium transition-colors cursor-pointer text-center whitespace-nowrap shrink-0 ${
                  caStatus === st
                    ? 'bg-brand text-slate-900 font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-500 hover:text-white border border-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* CA Notes input */}
          <div className="pt-2 border-t border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Notes / Clarifications for CA</span>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-emerald-700 font-semibold cursor-pointer"
                >
                  Edit Note
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={caNotes}
                  onChange={(e) => setCaNotes(e.target.value)}
                  placeholder="e.g. 50% personal use, hotel invoice pending..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleSaveNotes}
                  className="bg-brand text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-700 italic bg-slate-50/60 p-2 rounded-lg border border-slate-200">
                {expense.caNotes || 'No notes added for CA yet.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category Picker Submodal */}
      {/* Category Picker Submodal */}
      {showCategoryPicker && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between text-white">
              <h3 className="font-extrabold text-sm">Change Category</h3>
              <button
                aria-label="Close"
                onClick={() => {
                  setShowCategoryPicker(false);
                  setCategorySearchQuery('');
                }}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Search Box on top */}
            <div className="p-3 border-b border-slate-200 bg-slate-50/70">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  placeholder="Search categories (e.g. Fuel, Office, Food, Rent)..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-inner"
                  autoFocus
                />
                {categorySearchQuery && (
                  <button
                    aria-label="Clear search"
                    type="button"
                    onClick={() => setCategorySearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 overflow-y-auto space-y-1.5 flex-1">
              {ALL_CATEGORIES.filter((c) => {
                if (!categorySearchQuery.trim()) return true;
                const q = categorySearchQuery.toLowerCase().trim();
                return (
                  c.category.toLowerCase().includes(q) ||
                  c.description.toLowerCase().includes(q) ||
                  c.defaultType.toLowerCase().includes(q)
                );
              }).length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                  <p className="font-bold text-slate-700">No categories matching "{categorySearchQuery}"</p>
                  <button
                    type="button"
                    onClick={() => setCategorySearchQuery('')}
                    className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    Clear search
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
                }).map((c) => (
                  <button
                    key={c.category}
                    onClick={() => {
                      handleCategoryChange(c.category);
                      setCategorySearchQuery('');
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs cursor-pointer text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg p-1 bg-white shadow-xs rounded-lg shrink-0 border border-slate-200">{c.icon}</span>
                      <div className="min-w-0">
                        <div className="font-bold truncate">{c.category}</div>
                        <div className="text-xs text-slate-500 truncate">{c.description}</div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0 bg-white shadow-xs px-1.5 py-0.5 rounded border border-slate-200">
                      {c.defaultType}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Image Zoom */}
      {showImageFull && expense.receiptUrl && (
        <div className="fixed inset-0 z-70 bg-black/50 backdrop-blur-xs flex flex-col justify-between p-4">
          <div className="flex items-center justify-between text-white">
            <span className="font-bold text-sm">Receipt Image</span>
            <button
              aria-label="Close"
              onClick={() => setShowImageFull(false)}
              className="p-1.5 rounded-xl bg-slate-100 text-slate-700 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
            <img
              src={expense.receiptUrl}
              alt={expense.merchant}
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
          </div>

          <button
            onClick={() => setShowImageFull(false)}
            className="w-full max-w-sm mx-auto bg-slate-100 text-white font-bold py-3 rounded-xl text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};
