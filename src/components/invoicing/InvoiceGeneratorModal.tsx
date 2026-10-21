import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Download,
  Printer,
  Sparkles,
  ArrowRight,
  Send,
  Building,
  User,
  Calendar,
  FileCheck2,
} from 'lucide-react';
import { ClientInvoice, ClientInvoiceItem, IncomeRecord, UserProfile } from '../../types';
import { formatCurrency, TAX_CONFIGS } from '../../services/taxRules';
import { storageService } from '../../services/storageService';
import { supabaseService } from '../../services/supabaseService';

interface InvoiceGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onRecordIncome: (income: IncomeRecord) => void;
}

export const InvoiceGeneratorModal: React.FC<InvoiceGeneratorModalProps> = ({
  isOpen,
  onClose,
  profile,
  onRecordIncome,
}) => {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Active or New Invoice Fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [notes, setNotes] = useState('Payment due within 14 business days. Thank you for your business!');

  const taxConfig = TAX_CONFIGS[profile.country] || TAX_CONFIGS['NZ'];
  const currencySymbol = profile.currencySymbol || taxConfig.currencySymbol;
  const defaultTaxRate = (taxConfig.standardGSTRate || 0.15) * 100;

  const [items, setItems] = useState<ClientInvoiceItem[]>([
    {
      id: 'item-1',
      description: 'Professional Consulting / Engineering Services',
      quantity: 10,
      rate: 120,
      taxRate: defaultTaxRate,
      total: 1200,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      const stored = storageService.getClientInvoices(currencySymbol);
      setInvoices(stored);
      setInvoiceNumber(`INV-${new Date().getFullYear()}-${String(stored.length + 1).padStart(3, '0')}`);

      supabaseService.fetchClientInvoices(profile.id).then(({ invoices: remote }) => {
        if (remote && remote.length > 0) {
          const map = new Map<string, ClientInvoice>();
          remote.forEach((i) => map.set(i.id, i));
          stored.forEach((i) => {
            if (!map.has(i.id)) map.set(i.id, i);
          });
          const merged = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setInvoices(merged);
          storageService.saveClientInvoices(merged);
          setInvoiceNumber(`INV-${new Date().getFullYear()}-${String(merged.length + 1).padStart(3, '0')}`);
        }
      }).catch(() => {});
    }
  }, [isOpen, currencySymbol, profile.id]);

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, it) => acc + it.quantity * it.rate, 0);
  const taxAmount = items.reduce((acc, it) => acc + (it.quantity * it.rate * it.taxRate) / 100, 0);
  const totalAmount = subtotal + taxAmount;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        description: 'Client Project Deliverable',
        quantity: 1,
        rate: 250,
        taxRate: defaultTaxRate,
        total: 250,
      },
    ]);
  };

  const handleUpdateItem = (id: string, field: keyof ClientInvoiceItem, val: any) => {
    setItems(
      items.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: val };
        updated.total = updated.quantity * updated.rate;
        return updated;
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((it) => it.id !== id));
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || items.length === 0) return;

    const newInvoice: ClientInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      date,
      dueDate,
      clientName,
      clientEmail,
      clientAddress,
      items,
      subtotal,
      taxAmount,
      totalAmount,
      notes,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };

    const updated = [newInvoice, ...invoices];
    setInvoices(updated);
    storageService.saveClientInvoices(updated);
    supabaseService.upsertClientInvoice(newInvoice, profile.id).catch(() => {});
    setIsCreating(false);
    setFeedback(`Invoice ${newInvoice.invoiceNumber} created successfully!`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleRecordAsIncome = (inv: ClientInvoice) => {
    const income: IncomeRecord = {
      id: `inc-${inv.id}`,
      date: inv.date,
      client: inv.clientName,
      description: `Client Invoice ${inv.invoiceNumber}: ${inv.items[0]?.description || 'Services'}`,
      amount: inv.totalAmount,
      gstAmount: inv.taxAmount,
      currency: profile.defaultCurrency,
      invoiceNumber: inv.invoiceNumber,
      createdAt: new Date().toISOString(),
    };

    onRecordIncome(income);

    const updatedInvoice: ClientInvoice = { ...inv, status: 'paid', syncedIncomeId: income.id };
    const updated = invoices.map((i) =>
      i.id === inv.id ? updatedInvoice : i
    );
    setInvoices(updated);
    storageService.saveClientInvoices(updated);
    supabaseService.upsertClientInvoice(updatedInvoice, profile.id).catch(() => {});

    setFeedback(`Recorded ${formatCurrency(inv.totalAmount, profile.country)} as Taxable Income!`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 modal-backdrop-animation">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col text-neutral-100 shadow-2xl relative modal-enter-animation">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Client Invoice Creator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-semibold">
                  Tax Compliant
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Generate professional statutory sales invoices and record taxable revenue
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

        {/* Global Feedback */}
        {feedback && (
          <div className="m-3 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Action Header Button */}
        <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{isCreating ? 'View Invoice List' : '+ Create New Invoice'}</span>
          </button>

          <span className="text-xs text-neutral-400">
            Total Invoices: <strong className="text-white font-mono">{invoices.length}</strong>
          </span>
        </div>

        {/* Content Body: Create Form OR List View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isCreating ? (
            <form onSubmit={handleSaveInvoice} className="space-y-4 bg-neutral-950 p-4 rounded-2xl border border-neutral-800 animate-in fade-in">
              {/* Branded Header Preview */}
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-extrabold text-sm text-white">{profile.businessName || profile.fullName}</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {taxConfig.flag} {profile.taxAuthority} · Tax ID: <span className="font-mono text-neutral-300">{profile.taxId || 'Registered'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-neutral-400 uppercase font-semibold">Tax Invoice</div>
                  <div className="font-mono text-xs font-bold text-indigo-400">{invoiceNumber}</div>
                </div>
              </div>

              {/* Invoice Meta Grid (Responsive for mobile portrait) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Client Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Bill To (Client Name)</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Acme Corp Ltd"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Client Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="accounts@acme.com"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Line Items Editor */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-300">Invoice Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={item.id} className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                          placeholder="Item or service description"
                          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-neutral-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] text-neutral-400 block">Quantity / Hours</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-neutral-400 block">Rate ({currencySymbol})</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleUpdateItem(item.id, 'rate', Number(e.target.value))}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-neutral-400 block">Tax Rate ({taxConfig.standardGSTRate * 100}%)</label>
                          <input
                            type="number"
                            value={item.taxRate}
                            onChange={(e) => handleUpdateItem(item.id, 'taxRate', Number(e.target.value))}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-white">{formatCurrency(subtotal, profile.country)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Statutory Tax ({taxConfig.standardGSTRate * 100}%):</span>
                  <span className="font-mono text-emerald-400">+{formatCurrency(taxAmount, profile.country)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-white pt-1 border-t border-neutral-800">
                  <span>Total Amount Due:</span>
                  <span className="font-mono text-indigo-400">{formatCurrency(totalAmount, profile.country)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Preview</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Client Invoice</span>
                </button>
              </div>
            </form>
          ) : (
            /* Invoices List */
            <div className="space-y-3">
              {invoices.length === 0 ? (
                <div className="p-8 text-center bg-neutral-950 rounded-2xl border border-neutral-800">
                  <FileSpreadsheet className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-neutral-300">No client invoices created yet</p>
                  <p className="text-xs text-neutral-500 mt-1">Tap "+ Create New Invoice" to start billing clients.</p>
                </div>
              ) : (
                invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3 hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-indigo-400">{inv.invoiceNumber}</span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              inv.status === 'paid'
                                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                                : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                            }`}
                          >
                            {inv.status === 'paid' ? 'Paid & Logged' : 'Sent · Unpaid'}
                          </span>
                        </div>
                        <div className="font-bold text-sm text-white mt-1">{inv.clientName}</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          Issued: {inv.date} · Due: {inv.dueDate}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono text-base font-extrabold text-white">
                          {formatCurrency(inv.totalAmount, profile.country)}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          Incl. {formatCurrency(inv.taxAmount, profile.country)} tax
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-neutral-500 truncate max-w-[200px]">
                        {inv.items.length} line item(s): {inv.items[0]?.description}
                      </span>

                      <div className="flex items-center gap-2">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => handleRecordAsIncome(inv)}
                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                            title="Record this invoice total as taxable income in TaxVault"
                          >
                            <FileCheck2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="whitespace-nowrap">Mark Paid</span>
                          </button>
                        )}

                        <button
                          onClick={handlePrint}
                          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-1.5 rounded-lg cursor-pointer transition-colors"
                          title="Print / Save PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
