import React, { useState, useEffect } from 'react';
import {
  Building2,
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Search,
} from 'lucide-react';
import { BankTransaction, ExpenseRecord, UserProfile, ExpenseCategory } from '../../types';
import { formatCurrency, TAX_CONFIGS } from '../../services/taxRules';
import { storageService } from '../../services/storageService';
import { supabaseService } from '../../services/supabaseService';

interface BankReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  expenses: ExpenseRecord[];
  onAddExpenseFromBank: (expense: ExpenseRecord) => void;
}

export const BankReconciliationModal: React.FC<BankReconciliationModalProps> = ({
  isOpen,
  onClose,
  profile,
  expenses,
  onAddExpenseFromBank,
}) => {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'unmatched' | 'matched'>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  const taxConfig = TAX_CONFIGS[profile.country] || TAX_CONFIGS['NZ'];
  const currencySymbol = profile.currencySymbol || taxConfig.currencySymbol;

  useEffect(() => {
    if (isOpen) {
      const stored = storageService.getBankTransactions();
      runReconciliation(stored, expenses);

      supabaseService.fetchBankTransactions(profile.id).then(({ transactions: remote }) => {
        if (remote && remote.length > 0) {
          const map = new Map<string, BankTransaction>();
          remote.forEach((t) => map.set(t.id, t));
          stored.forEach((t) => {
            if (!map.has(t.id)) map.set(t.id, t);
          });
          const merged = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          runReconciliation(merged, expenses);
        }
      }).catch(() => {});
    }
  }, [isOpen, expenses, profile.id]);

  if (!isOpen) return null;

  // Reconciliation algorithm: compare bank transactions with expenses
  const runReconciliation = (txs: BankTransaction[], currentExpenses: ExpenseRecord[]) => {
    const reconciled = txs.map((tx) => {
      // Find matching expense: exact amount and date within 4 days
      const match = currentExpenses.find((exp) => {
        const amountMatches = Math.abs(exp.amount - tx.amount) < 0.05;
        if (!amountMatches) return false;

        const txDate = new Date(tx.date).getTime();
        const expDate = new Date(exp.date).getTime();
        const diffDays = Math.abs(txDate - expDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 4;
      });

      return {
        ...tx,
        matchStatus: (match ? 'matched' : 'unmatched') as 'matched' | 'unmatched',
        matchedExpenseId: match ? match.id : undefined,
      };
    });

    setTransactions(reconciled);
    storageService.saveBankTransactions(reconciled);
    if (reconciled.length > 0) {
      supabaseService.upsertBankTransactions(reconciled, profile.id).catch(() => {});
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      const newTxs: BankTransaction[] = [];

      // Parse lines (assumes basic CSV: Date, Description, Amount)
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.replace(/['"]+/g, '').trim());
        if (parts.length >= 3) {
          const date = parts[0];
          const description = parts[1];
          const amount = Math.abs(parseFloat(parts[2]));
          if (!isNaN(amount) && amount > 0) {
            newTxs.push({
              id: `bank-csv-${Date.now()}-${i}`,
              date,
              description,
              amount,
              type: 'debit',
              matchStatus: 'unmatched',
              categoryGuess: 'Office & Admin',
            });
          }
        }
      }

      if (newTxs.length > 0) {
        runReconciliation(newTxs, expenses);
        setFeedback(`Imported ${newTxs.length} bank transactions!`);
        setTimeout(() => setFeedback(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleConvertBankToExpense = (tx: BankTransaction) => {
    const category: ExpenseCategory = tx.categoryGuess || 'Other Business';
    const newExpense: ExpenseRecord = {
      id: `exp-from-bank-${tx.id}`,
      merchant: tx.description,
      date: tx.date,
      amount: tx.amount,
      subtotal: tx.amount,
      taxableAmount: tx.amount,
      discount: 0,
      taxAmount: Math.round(tx.amount * (taxConfig.standardGSTRate || 0.15) * 100) / 100,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
      roundOff: 0,
      category,
      expenseType: 'Business',
      businessPercentage: 100,
      claimableBusinessAmount: tx.amount,
      paymentMethod: 'Bank Transfer',
      items: [
        {
          name: tx.description,
          quantity: 1,
          unitPrice: tx.amount,
          total: tx.amount,
        },
      ],
      userNotes: 'Created automatically via Bank Statement Reconciliation.',
      gstTreatment: 'Needs review',
      caReviewStatus: 'Needs CA Review',
      caNotes: 'Imported from bank feed. Awaiting photo receipt attachment.',
      confidenceScores: { merchant: 95, date: 100, total: 100, category: 85 },
      syncStatus: 'synced',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddExpenseFromBank(newExpense);

    // Update transaction to matched
    const updated = transactions.map((t) =>
      t.id === tx.id ? { ...t, matchStatus: 'matched' as const, matchedExpenseId: newExpense.id } : t
    );
    setTransactions(updated);
    storageService.saveBankTransactions(updated);

    setFeedback(`Converted "${tx.description}" into an active expense!`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const matchedCount = transactions.filter((t) => t.matchStatus === 'matched').length;
  const unmatchedCount = transactions.filter((t) => t.matchStatus === 'unmatched').length;
  const reconciliationRate =
    transactions.length > 0 ? Math.round((matchedCount / transactions.length) * 100) : 0;

  const filteredTransactions = transactions.filter((t) => {
    if (filterMode === 'matched') return t.matchStatus === 'matched';
    if (filterMode === 'unmatched') return t.matchStatus === 'unmatched';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 modal-backdrop-animation">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col text-neutral-100 shadow-2xl relative modal-enter-animation">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Bank Reconciliation</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold">
                  Statement Matcher
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Match bank account statements against your scanned receipts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-xl hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Feedback Toast */}
        {feedback && (
          <div className="m-3 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Health Score & Summary */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800/80 grid grid-cols-3 gap-2 text-center">
          <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Reconciliation Rate</div>
            <div className="text-base font-extrabold text-cyan-400 font-mono mt-0.5">
              {reconciliationRate}%
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Matched (Receipts Found)</div>
            <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
              {matchedCount} <span className="text-xs font-normal text-neutral-400">lines</span>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Unmatched (No Receipt)</div>
            <div className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
              {unmatchedCount} <span className="text-xs font-normal text-neutral-400">lines</span>
            </div>
          </div>
        </div>

        {/* Toolbar: Import CSV & Filter buttons (Responsive for mobile portrait) */}
        <div className="p-3 border-b border-neutral-800 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs shrink-0">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                filterMode === 'all' ? 'bg-neutral-800 text-white shadow-xs font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setFilterMode('unmatched')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                filterMode === 'unmatched' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="whitespace-nowrap">Unmatched ({unmatchedCount})</span>
            </button>
            <button
              onClick={() => setFilterMode('matched')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                filterMode === 'matched' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="whitespace-nowrap">Matched ({matchedCount})</span>
            </button>
          </div>

          {/* Import CSV trigger */}
          <label className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <Upload className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="whitespace-nowrap">Upload CSV</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center bg-neutral-950 rounded-2xl border border-neutral-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-300">No transactions in this filter</p>
              <p className="text-xs text-neutral-500 mt-1">All bank entries are either reconciled or none loaded.</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white truncate max-w-[220px]">
                      {tx.description}
                    </span>
                    {tx.matchStatus === 'matched' ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Matched</span>
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>Missing Receipt</span>
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-2">
                    <span>{tx.date}</span>
                    <span>·</span>
                    <span className="text-neutral-300">{tx.categoryGuess || 'Business Expense'}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold text-sm text-white font-mono">
                    {formatCurrency(tx.amount, profile.country)}
                  </div>

                  {tx.matchStatus === 'unmatched' && (
                    <button
                      onClick={() => handleConvertBankToExpense(tx)}
                      className="mt-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                      title="Convert this bank transaction into a recorded tax deduction"
                    >
                      <Plus className="w-3 h-3 text-amber-400" />
                      <span>Convert to Expense</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-[10px] text-neutral-400 flex items-center justify-between">
          <span>Automatic audit reconciliation: matches date ±4 days and exact amount</span>
          <button
            onClick={() => {
              const fresh = storageService.getBankTransactions();
              runReconciliation(fresh, expenses);
              setFeedback('Re-ran reconciliation matching!');
              setTimeout(() => setFeedback(null), 2500);
            }}
            className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Re-match</span>
          </button>
        </div>
      </div>
    </div>
  );
};
