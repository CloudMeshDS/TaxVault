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
    <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none modal-backdrop-animation">
      <div className="bg-neutral-900 border-2 border-amber-500/50 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-white modal-enter-animation">
        {/* Warning Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-lg">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-extrabold text-amber-300 tracking-tight">
            Possible duplicate found.
          </h3>
          <p className="text-xs text-neutral-300 leading-relaxed">
            An expense with matching details already exists in your records.
          </p>
        </div>

        {/* Existing Expense Card */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 space-y-2">
          <div className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-neutral-400" />
            <span>Existing Stored Expense:</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="font-extrabold text-sm text-white truncate">
              {existingExpense.merchant}
            </div>
            <div className="font-mono font-bold text-sm text-emerald-400">
              {formatCurrency(existingExpense.amount, existingExpense.currency || 'NZD', existingExpense.currencySymbol || '$', true)}
            </div>
          </div>

          <div className="text-xs text-neutral-400 flex items-center justify-between pt-1 border-t border-neutral-800/80">
            <span>Date: {existingExpense.date}</span>
            <span>Inv: {existingExpense.invoiceNumber || 'N/A'}</span>
          </div>
        </div>

        {/* Action Buttons: [ Save Anyway ] & [ Cancel ] */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onSaveAnyway}
            className="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 font-black py-3 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20"
          >
            Save Anyway
          </button>

          <button
            onClick={onClose}
            className="w-full bg-neutral-800 hover:bg-neutral-700 active:scale-[0.98] text-neutral-300 hover:text-white font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
