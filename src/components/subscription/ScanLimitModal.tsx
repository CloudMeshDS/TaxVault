import React from 'react';
import {
  Sparkles,
  Lock,
  PenTool,
  ArrowRight,
  X,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile } from '../../types';

interface ScanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpgradeToPro: () => void;
  onEnterManually: () => void;
}

export const ScanLimitModal: React.FC<ScanLimitModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpgradeToPro,
  onEnterManually,
}) => {
  if (!isOpen) return null;

  const used = profile.subscription?.receiptsScannedThisMonth || 0;
  const limit = profile.subscription?.monthlyReceiptLimit || 10;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs backdrop-blur-md flex items-center justify-center p-4 select-none modal-backdrop-animation">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 text-slate-900 shadow-2xl relative space-y-5 modal-enter-animation">
        {/* Close Button */}
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="text-center pt-2">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 mx-auto shadow-lg mb-3">
            <Lock className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-700/60 text-amber-700 text-xs font-bold mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Free AI Scan Limit Consumed</span>
          </div>

          <h3 className="text-xl font-black text-white tracking-tight">
            Monthly Scan Quota Reached
          </h3>

          <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
            You have used all <strong className="text-white">{used} of {limit}</strong> free AI receipt scans this month. Image and PDF uploads are paused on the Starter plan.
          </p>
        </div>

        {/* Usage Progress Meter */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Monthly AI Vision Quota</span>
            <span className="font-mono text-amber-700 font-bold">
              {used} / {limit} Used (100%)
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
            <span>Free Tier: 10/month</span>
            <span className="text-emerald-600 font-medium">Pro Tier: Unlimited</span>
          </div>
        </div>

        {/* Action Choice: Buy Pro vs. Enter Manually */}
        <div className="space-y-2.5 pt-1">
          {/* OPTION 1: Upgrade to Pro (Recommended) */}
          <button
            onClick={() => {
              onClose();
              onUpgradeToPro();
            }}
            className="w-full group bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black p-3.5 rounded-2xl flex items-center justify-between shadow-xl shadow-emerald-500/25 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-slate-50/15 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <div className="text-sm font-black leading-tight flex items-center gap-1.5">
                  <span>Upgrade to Pro Version</span>
                  <span className="text-xs uppercase px-1.5 py-0.2 rounded bg-slate-50 text-emerald-600 font-extrabold">
                    Unlimited
                  </span>
                </div>
                <div className="text-xs font-semibold text-white/80 mt-0.5">
                  Unlimited AI scans & CA tax audit packs
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-white stroke-[2.5] group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {/* OPTION 2: Enter Expense Manually (Free & Unlimited) */}
          <button
            onClick={() => {
              onClose();
              onEnterManually();
            }}
            className="w-full group bg-slate-50 hover:bg-slate-50 active:scale-[0.98] border border-emerald-500/40 hover:border-emerald-500/80 text-white font-bold p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-sm"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shrink-0">
                <PenTool className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <span>Enter Data Manually</span>
                  <span className="text-xs px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold">
                    Free Forever
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Type vendor, date & tax amount without AI scan
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>
        </div>

        {/* Footer info note */}
        <div className="text-center pt-1">
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-white transition-colors cursor-pointer py-1"
          >
            Dismiss for now
          </button>
        </div>
      </div>
    </div>
  );
};
