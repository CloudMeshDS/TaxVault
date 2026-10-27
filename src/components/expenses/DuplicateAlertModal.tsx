import React from 'react';
import { AlertTriangle, CheckCircle2, X, Receipt, Calendar, Store } from 'lucide-react';
import { ExpenseRecord } from '../../types';
import { formatCurrency, formatINR } from '../../services/taxRules';

interface DuplicateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingExpense: ExpenseRecord | null;
  newExpenseCandidate: Partial<ExpenseRecord> | null;
  onSaveAnyway: () => void;
}

export const DuplicateAlertModal: React.FC<DuplicateAlertModalProps> = ({
  isOpen,
  onClose,
  existingExpense,
  newExpenseCandidate,
  onSaveAnyway,
}) => {
  if (!isOpen || !existingExpense || !newExpenseCandidate) return null;

  return (
    <div className="fixed inset-0 z-70 bg-slate-900/50 backdrop-blur-xs backdrop-blur-md flex items-center justify-center p-4 select-none modal-backdrop-animation">
      <div className="bg-white border-2 border-amber-500/50 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-white modal-enter-animation">
        {/* Warning Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-700 mx-auto shadow-lg">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-extrabold text-amber-700 tracking-tight">
            Possible duplicate found.
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed">
            An expense with matching details already exists in your records.
          </p>
        </div>

        {/* Existing Expense Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
          <div className="text-xs uppercase font-bold text-slate-500 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-slate-500" />
            <span>Existing Stored Expense:</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="font-extrabold text-sm text-white truncate">
              {existingExpense.merchant}
            </div>
            <div className="font-mono font-bold text-sm text-emerald-600">
              {formatCurrency(existingExpense.amount, existingExpense.currency || 'NZD', existingExpense.currencySymbol || '$', true)}
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
            <span>Date: {existingExpense.date}</span>
            <span>Inv: {existingExpense.invoiceNumber || 'N/A'}</span>
          </div>
        </div>

        {/* Action Buttons: [ Save Anyway ] & [ Cancel ] */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onSaveAnyway}
            className="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-900 font-black py-3 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20"
          >
            Save Anyway
          </button>

          <button
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 hover:text-white font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
