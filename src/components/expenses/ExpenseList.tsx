import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Download,
  Calendar
} from 'lucide-react';
import { CountryTaxConfig, ExpenseCategory, ExpenseRecord } from '../../types';

interface ExpenseListProps {
  expenses: ExpenseRecord[];
  taxConfig: CountryTaxConfig;
  onOpenScanner: () => void;
  onDeleteExpense: (id: string) => void;
  onExportCSV: () => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  taxConfig,
  onOpenScanner,
  onDeleteExpense,
  onExportCSV,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyDeductible, setOnlyDeductible] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<ExpenseRecord | null>(null);

  const categories = ['All', 'Tools & Equipment', 'Utilities & Phone', 'Client Entertainment', 'Vehicle & Mileage', 'Software & Tech', 'Travel & Accommodation', 'Office & Admin'];

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch =
        exp.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.receiptNumber && exp.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;
      const matchesDeductible = !onlyDeductible || (exp.isDeductible && exp.deductiblePercentage > 0);

      return matchesSearch && matchesCategory && matchesDeductible;
    });
  }, [expenses, searchTerm, selectedCategory, onlyDeductible]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredExpenses]);

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header and Summary Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Receipts & Expenses</h2>
          <p className="text-xs text-neutral-400">
            {filteredExpenses.length} records · Total {taxConfig.currencySymbol}
            {totalFilteredAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportCSV}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Download CSV for Xero/Excel"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenScanner}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Receipt</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search merchant, invoice #, or description..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Interactive Category Filter Tabs (Zero-pill compliant button controls) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === cat
                ? 'bg-neutral-800 text-emerald-400 border border-emerald-500/30'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Expense List Items */}
      <div className="space-y-2">
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center bg-neutral-900/50 border border-neutral-800/80 rounded-2xl">
            <Receipt className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-neutral-300">No expense records found</div>
            <p className="text-xs text-neutral-500 mt-1">Try clearing filters or scan a new receipt.</p>
          </div>
        ) : (
          filteredExpenses.map(exp => {
            const is50Percent = exp.deductiblePercentage === 50;

            return (
              <div
                key={exp.id}
                className="p-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl flex items-center justify-between gap-3 transition-colors group"
              >
                {/* Left: Icon & Merchant details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    onClick={() => exp.receiptUrl && setPreviewReceipt(exp)}
                    className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center shrink-0 text-neutral-400 cursor-pointer overflow-hidden group/img"
                  >
                    {exp.receiptUrl ? (
                      <img src={exp.receiptUrl} alt="receipt" className="w-full h-full object-cover group-hover/img:scale-110 transition-transform" />
                    ) : (
                      <Receipt className="w-5 h-5 text-emerald-400/80" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-neutral-100 truncate">
                        {exp.merchant}
                      </span>
                      {exp.syncStatus === 'pending' && (
                        <span className="text-[10px] text-amber-400 font-mono" title="Saved locally, pending cloud sync">
                          (Offline)
                        </span>
                      )}
                    </div>

                    {/* Unboxed metadata line with typographic bullet separators */}
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                      <span>{exp.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{exp.date}</span>
                      {exp.receiptNumber && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-neutral-500">{exp.receiptNumber}</span>
                        </>
                      )}
                    </div>

                    {/* Deductibility Note */}
                    <div className="text-[10px] text-neutral-500 mt-0.5">
                      {is50Percent ? (
                        <span className="text-amber-400/90 font-mono">IRD 50% Rule Claimed</span>
                      ) : exp.deductiblePercentage < 100 ? (
                        <span className="text-blue-400/90 font-mono">{exp.deductiblePercentage}% Logbook Claimed</span>
                      ) : (
                        <span className="text-neutral-500 font-mono">100% Tax Deductible</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amounts & Actions */}
                <div className="text-right shrink-0 flex items-center gap-3">
                  <div>
                    <div className="font-mono font-bold text-xs text-white">
                      {taxConfig.currencySymbol}
                      {exp.amount.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">
                      GST {taxConfig.currencySymbol}{exp.gstAmount.toFixed(2)}
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteExpense(exp.id)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 p-1 rounded transition-all cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Receipt Image Preview Modal */}
      {previewReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="text-xs font-semibold text-white">{previewReceipt.merchant}</div>
              <button
                onClick={() => setPreviewReceipt(null)}
                className="text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
            {previewReceipt.receiptUrl && (
              <div className="max-h-80 overflow-hidden rounded-xl border border-neutral-800">
                <img src={previewReceipt.receiptUrl} alt="receipt" className="w-full h-auto object-contain" />
              </div>
            )}
            <div className="text-[11px] text-neutral-400 space-y-1">
              <div>Voucher #{previewReceipt.receiptNumber || 'N/A'} · {previewReceipt.date}</div>
              <div>Amount: {taxConfig.currencySymbol}{previewReceipt.amount.toFixed(2)} (GST: {taxConfig.currencySymbol}{previewReceipt.gstAmount.toFixed(2)})</div>
              {previewReceipt.notes && <div className="text-neutral-300">Note: {previewReceipt.notes}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
