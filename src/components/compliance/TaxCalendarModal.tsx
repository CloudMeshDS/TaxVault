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

interface TaxCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

const COUNTRY_DEADLINES: Record<SupportedCountry, StatutoryTaxDeadline[]> = {
  NZ: [
    {
      id: 'nz-gst-oct',
      country: 'NZ',
      title: 'GST Return & Payment (Two-Monthly)',
      authority: 'Inland Revenue Department (IRD)',
      dueDate: '2026-10-28',
      formCode: 'GST101',
      category: 'GST/VAT',
      description: 'File GST on sales and claim back GST on business expenses incurred in the prior period.',
      status: 'urgent',
    },
    {
      id: 'nz-prov-jan',
      country: 'NZ',
      title: 'Provisional Tax Instalment 2',
      authority: 'Inland Revenue Department (IRD)',
      dueDate: '2027-01-15',
      formCode: 'IR3-PROV',
      category: 'Provisional / BAS',
      description: 'Second instalment of provisional tax for individuals and companies with residual income tax > $5,000.',
      status: 'upcoming',
    },
    {
      id: 'nz-ir3-jul',
      country: 'NZ',
      title: 'Annual Income Tax Return (IR3)',
      authority: 'Inland Revenue Department (IRD)',
      dueDate: '2027-03-31',
      formCode: 'IR3',
      category: 'Annual Filing',
      description: 'Final filing date if registered with a Chartered Accountant or Tax Agent (otherwise 7 July).',
      status: 'upcoming',
    },
  ],
  AU: [
    {
      id: 'au-bas-q1',
      country: 'AU',
      title: 'Quarter 1 Business Activity Statement (BAS)',
      authority: 'Australian Taxation Office (ATO)',
      dueDate: '2026-10-28',
      formCode: 'BAS-Q1',
      category: 'Provisional / BAS',
      description: 'Report GST collected, Input Tax Credits claimed, and PAYG withholding for July to September.',
      status: 'urgent',
    },
    {
      id: 'au-itr-oct',
      country: 'AU',
      title: 'Individual & Sole Trader Tax Return',
      authority: 'Australian Taxation Office (ATO)',
      dueDate: '2026-10-31',
      formCode: 'ITR-2026',
      category: 'Annual Filing',
      description: 'Lodgement deadline for individuals and sole traders lodging their own tax return without a registered agent.',
      status: 'urgent',
    },
    {
      id: 'au-bas-q2',
      country: 'AU',
      title: 'Quarter 2 Business Activity Statement (BAS)',
      authority: 'Australian Taxation Office (ATO)',
      dueDate: '2027-02-28',
      formCode: 'BAS-Q2',
      category: 'Provisional / BAS',
      description: 'Lodgement and payment for October to December quarter (standard Christmas period concession).',
      status: 'upcoming',
    },
  ],
  CA: [
    {
      id: 'ca-t1-jun',
      country: 'CA',
      title: 'Self-Employed Tax Return (Form T2125)',
      authority: 'Canada Revenue Agency (CRA)',
      dueDate: '2027-06-15',
      formCode: 'T1-T2125',
      category: 'Annual Filing',
      description: 'Filing deadline for self-employed individuals and unincorporated businesses (any tax owing due 30 April).',
      status: 'upcoming',
    },
    {
      id: 'ca-gst-q3',
      country: 'CA',
      title: 'GST/HST Quarterly Return',
      authority: 'Canada Revenue Agency (CRA)',
      dueDate: '2026-10-31',
      formCode: 'GST34',
      category: 'GST/VAT',
      description: 'File net GST/HST and Input Tax Credits (ITCs) for the quarter ending 30 September.',
      status: 'urgent',
    },
  ],
  US: [
    {
      id: 'us-es-q4',
      country: 'US',
      title: 'Q4 Estimated Tax Payment (Form 1040-ES)',
      authority: 'Internal Revenue Service (IRS)',
      dueDate: '2027-01-15',
      formCode: '1040-ES',
      category: 'Provisional / BAS',
      description: 'Quarterly estimated federal tax for self-employed, freelancers, and small business LLCs.',
      status: 'upcoming',
    },
    {
      id: 'us-1040-apr',
      country: 'US',
      title: 'Tax Day 2027: Form 1040 & Schedule C',
      authority: 'Internal Revenue Service (IRS)',
      dueDate: '2027-04-15',
      formCode: '1040-SCH-C',
      category: 'Annual Filing',
      description: 'Annual profit and loss reporting from sole proprietorship business and statutory deductions.',
      status: 'upcoming',
    },
  ],
  IN: [
    {
      id: 'in-gstr3b-oct',
      country: 'IN',
      title: 'Monthly GSTR-3B Summary Return',
      authority: 'Goods & Services Tax Network (GSTN)',
      dueDate: '2026-10-20',
      formCode: 'GSTR-3B',
      category: 'GST/VAT',
      description: 'Self-declared summary of outward supplies, input tax credit (ITC) claimed, and net GST liability.',
      status: 'urgent',
    },
    {
      id: 'in-adv-tax-q3',
      country: 'IN',
      title: 'Advance Tax Instalment 3 (75%)',
      authority: 'Income Tax Department (CBDT)',
      dueDate: '2026-12-15',
      formCode: 'IT-CHAL-280',
      category: 'Provisional / BAS',
      description: 'Cumulative 75% advance tax payment for taxpayers with estimated tax liability > ₹10,000.',
      status: 'upcoming',
    },
    {
      id: 'in-itr-jul',
      country: 'IN',
      title: 'Income Tax Return (ITR-3 / ITR-4)',
      authority: 'Income Tax Department (CBDT)',
      dueDate: '2027-07-31',
      formCode: 'ITR-3/4',
      category: 'Annual Filing',
      description: 'Annual tax filing for proprietors, professionals, and presumptive taxation assesses under Section 44ADA.',
      status: 'upcoming',
    },
  ],
};

function calculateDaysLeft(dueDateStr: string): number {
  const now = new Date();
  const due = new Date(dueDateStr);
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export const TaxCalendarModal: React.FC<TaxCalendarModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  if (!isOpen) return null;

  const taxConfig = TAX_CONFIGS[profile.country] || TAX_CONFIGS['NZ'];
  const deadlines = COUNTRY_DEADLINES[profile.country] || COUNTRY_DEADLINES['NZ'];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs backdrop-blur-md flex items-center justify-center p-3 modal-backdrop-animation">
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
            {profile.financialYear || taxConfig.taxYearLabel}
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
                      Due: <strong className="text-white font-mono">{item.dueDate}</strong> · {item.authority}
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
                      <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Past deadline'}</span>
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
