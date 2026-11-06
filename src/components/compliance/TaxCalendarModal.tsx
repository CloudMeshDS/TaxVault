import React, { useState } from 'react';
import {
  Calendar,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { StatutoryTaxDeadline, SupportedCountry, UserProfile } from '../../types';
import { TAX_CONFIGS } from '../../services/taxRules';
import { currentFiscalYear, normalizeFiscalYear } from '../../services/fiscalYear';

interface TaxCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

/**
 * Recurring statutory deadlines. Each rule lists the month/day it falls on (or a day of every
 * month), and the calendar shows the next occurrence from today, so it never goes out of date.
 */
type DeadlineRule = Omit<StatutoryTaxDeadline, 'dueDate' | 'status' | 'title' | 'formCode'> & {
  /** Month (1–12) and day; omit month for a monthly deadline on `day`. */
  dates: { month?: number; day: number }[];
  title: string | ((due: Date) => string);
  formCode: string | ((due: Date) => string);
};

const COUNTRY_DEADLINE_RULES: Record<SupportedCountry, DeadlineRule[]> = {
  NZ: [
    {
      id: 'nz-gst',
      country: 'NZ',
      title: 'GST Return & Payment (Two-Monthly)',
      authority: 'Inland Revenue Department (IRD)',
      // Two-monthly periods ending in odd months: due the 28th of the next month, except 15 Jan and 7 May
      dates: [
        { month: 1, day: 15 },
        { month: 2, day: 28 },
        { month: 5, day: 7 },
        { month: 6, day: 28 },
        { month: 8, day: 28 },
        { month: 10, day: 28 },
      ],
      formCode: 'GST101',
      category: 'GST/VAT',
      description: 'File GST on sales and claim back GST on business expenses incurred in the prior period.',
    },
    {
      id: 'nz-prov',
      country: 'NZ',
      title: (due) => `Provisional Tax Instalment ${({ 8: 1, 1: 2, 5: 3 } as Record<number, number>)[due.getMonth() + 1]}`,
      authority: 'Inland Revenue Department (IRD)',
      dates: [
        { month: 8, day: 28 },
        { month: 1, day: 15 },
        { month: 5, day: 7 },
      ],
      formCode: 'IR3-PROV',
      category: 'Provisional / BAS',
      description: 'Provisional tax instalment for individuals and companies with residual income tax > $5,000.',
    },
    {
      id: 'nz-ir3',
      country: 'NZ',
      title: 'Annual Income Tax Return (IR3)',
      authority: 'Inland Revenue Department (IRD)',
      dates: [{ month: 3, day: 31 }],
      formCode: 'IR3',
      category: 'Annual Filing',
      description: 'Final filing date if registered with a Chartered Accountant or Tax Agent (otherwise 7 July).',
    },
  ],
  AU: [
    {
      id: 'au-bas',
      country: 'AU',
      title: (due) =>
        `Quarter ${({ 10: 1, 2: 2, 4: 3, 7: 4 } as Record<number, number>)[due.getMonth() + 1]} Business Activity Statement (BAS)`,
      authority: 'Australian Taxation Office (ATO)',
      dates: [
        { month: 10, day: 28 },
        { month: 2, day: 28 },
        { month: 4, day: 28 },
        { month: 7, day: 28 },
      ],
      formCode: (due) => `BAS-Q${({ 10: 1, 2: 2, 4: 3, 7: 4 } as Record<number, number>)[due.getMonth() + 1]}`,
      category: 'Provisional / BAS',
      description: 'Report GST collected, Input Tax Credits claimed, and PAYG withholding for the quarter.',
    },
    {
      id: 'au-itr',
      country: 'AU',
      title: 'Individual & Sole Trader Tax Return',
      authority: 'Australian Taxation Office (ATO)',
      dates: [{ month: 10, day: 31 }],
      formCode: (due) => `ITR-${due.getFullYear()}`,
      category: 'Annual Filing',
      description: 'Lodgement deadline for individuals and sole traders lodging their own tax return without a registered agent.',
    },
  ],
  CA: [
    {
      id: 'ca-t1',
      country: 'CA',
      title: 'Self-Employed Tax Return (Form T2125)',
      authority: 'Canada Revenue Agency (CRA)',
      dates: [{ month: 6, day: 15 }],
      formCode: 'T1-T2125',
      category: 'Annual Filing',
      description: 'Filing deadline for self-employed individuals and unincorporated businesses (any tax owing due 30 April).',
    },
    {
      id: 'ca-gst',
      country: 'CA',
      title: 'GST/HST Quarterly Return',
      authority: 'Canada Revenue Agency (CRA)',
      dates: [
        { month: 1, day: 31 },
        { month: 4, day: 30 },
        { month: 7, day: 31 },
        { month: 10, day: 31 },
      ],
      formCode: 'GST34',
      category: 'GST/VAT',
      description: 'File net GST/HST and Input Tax Credits (ITCs) for the quarter just ended.',
    },
  ],
  US: [
    {
      id: 'us-es',
      country: 'US',
      title: 'Estimated Tax Payment (Form 1040-ES)',
      authority: 'Internal Revenue Service (IRS)',
      dates: [
        { month: 4, day: 15 },
        { month: 6, day: 15 },
        { month: 9, day: 15 },
        { month: 1, day: 15 },
      ],
      formCode: '1040-ES',
      category: 'Provisional / BAS',
      description: 'Quarterly estimated federal tax for self-employed, freelancers, and small business LLCs.',
    },
    {
      id: 'us-1040',
      country: 'US',
      title: (due) => `Tax Day ${due.getFullYear()}: Form 1040 & Schedule C`,
      authority: 'Internal Revenue Service (IRS)',
      dates: [{ month: 4, day: 15 }],
      formCode: '1040-SCH-C',
      category: 'Annual Filing',
      description: 'Annual profit and loss reporting from sole proprietorship business and statutory deductions.',
    },
  ],
  IN: [
    {
      id: 'in-gstr3b',
      country: 'IN',
      title: 'Monthly GSTR-3B Summary Return',
      authority: 'Goods & Services Tax Network (GSTN)',
      dates: [{ day: 20 }],
      formCode: 'GSTR-3B',
      category: 'GST/VAT',
      description: 'Self-declared summary of outward supplies, input tax credit (ITC) claimed, and net GST liability.',
    },
    {
      id: 'in-adv-tax',
      country: 'IN',
      title: (due) => {
        const m = due.getMonth() + 1;
        const [n, pct] = m === 6 ? [1, 15] : m === 9 ? [2, 45] : m === 12 ? [3, 75] : [4, 100];
        return `Advance Tax Instalment ${n} (${pct}%)`;
      },
      authority: 'Income Tax Department (CBDT)',
      dates: [
        { month: 6, day: 15 },
        { month: 9, day: 15 },
        { month: 12, day: 15 },
        { month: 3, day: 15 },
      ],
      formCode: 'IT-CHAL-280',
      category: 'Provisional / BAS',
      description: 'Advance tax instalment for taxpayers with estimated tax liability > ₹10,000.',
    },
    {
      id: 'in-itr',
      country: 'IN',
      title: 'Income Tax Return (ITR-3 / ITR-4)',
      authority: 'Income Tax Department (CBDT)',
      dates: [{ month: 7, day: 31 }],
      formCode: 'ITR-3/4',
      category: 'Annual Filing',
      description: 'Annual tax filing for proprietors, professionals, and presumptive taxation assesses under Section 44ADA.',
    },
  ],
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Next date on or after `today` that matches any of the rule's dates. */
function nextOccurrence(dates: DeadlineRule['dates'], today: Date): Date {
  const candidates: Date[] = [];
  for (const { month, day } of dates) {
    if (month) {
      for (const year of [today.getFullYear(), today.getFullYear() + 1]) candidates.push(new Date(year, month - 1, day));
    } else {
      for (let i = 0; i <= 12; i++) candidates.push(new Date(today.getFullYear(), today.getMonth() + i, day));
    }
  }
  return candidates.filter((d) => d >= today).sort((a, b) => a.getTime() - b.getTime())[0];
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The country's upcoming deadlines, soonest first. */
export function getUpcomingDeadlines(country: SupportedCountry, now: Date = new Date()): StatutoryTaxDeadline[] {
  const today = startOfDay(now);
  const rules = COUNTRY_DEADLINE_RULES[country] || COUNTRY_DEADLINE_RULES.NZ;
  return rules
    .map((rule) => {
      const due = nextOccurrence(rule.dates, today);
      const daysLeft = Math.round((due.getTime() - today.getTime()) / 86400000);
      const { dates: _dates, ...rest } = rule;
      return {
        ...rest,
        title: typeof rule.title === 'function' ? rule.title(due) : rule.title,
        formCode: typeof rule.formCode === 'function' ? rule.formCode(due) : rule.formCode,
        dueDate: toIsoDate(due),
        status: daysLeft <= 30 ? 'urgent' : 'upcoming',
      } as StatutoryTaxDeadline;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function calculateDaysLeft(dueDateStr: string): number {
  const [y, m, d] = dueDateStr.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - startOfDay(new Date()).getTime()) / 86400000);
}

function formatDueDate(dueDateStr: string): string {
  const [y, m, d] = dueDateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const TaxCalendarModal: React.FC<TaxCalendarModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  if (!isOpen) return null;

  const taxConfig = TAX_CONFIGS[profile.country] || TAX_CONFIGS['NZ'];
  const deadlines = getUpcomingDeadlines(profile.country);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs backdrop-blur-md flex items-center justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] modal-backdrop-animation">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col text-slate-900 shadow-2xl relative modal-enter-animation">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Tax Compliance Calendar</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-300 border border-teal-200 font-semibold">
                  {taxConfig.flag} {profile.country} Rules
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Official filing deadlines and statutory return schedules
              </p>
            </div>
          </div>

          <button
            aria-label="Close"
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Authority Overview Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div>
            <div className="text-xs text-slate-500">Governing Tax Authority</div>
            <div className="font-bold text-white mt-0.5">{taxConfig.taxAuthority}</div>
          </div>

          <span className="font-mono text-xs text-emerald-700 font-bold bg-white shadow-xs px-2 py-1 rounded-lg border border-slate-200">
            {profile.financialYear ? normalizeFiscalYear(profile.financialYear, profile.country) : currentFiscalYear(profile.country)}
          </span>
        </div>

        {/* Deadlines List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {deadlines.map((item) => {
            const daysLeft = calculateDaysLeft(item.dueDate);
            const isUrgent = daysLeft >= 0 && daysLeft <= 30;

            return (
              <div
                key={item.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 hover:border-slate-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-white">{item.title}</span>
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-white shadow-xs text-teal-300 border border-slate-200">
                        {item.formCode}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      Due: <strong className="text-white font-mono">{formatDueDate(item.dueDate)}</strong> · {item.authority}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full border inline-flex items-center gap-1 ${
                        isUrgent
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-teal-50 text-teal-300 border-teal-200'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{daysLeft === 0 ? 'Due today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}</span>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-white shadow-xs p-2.5 rounded-xl border border-slate-200">
                  {item.description}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Category: {item.category}</span>
                  <span className="text-teal-700 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Compliance Tracked</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Official statutory dates based on current legislative calendar</span>
          <span className="text-slate-500">{taxConfig.countryName}</span>
        </div>
      </div>
    </div>
  );
};
