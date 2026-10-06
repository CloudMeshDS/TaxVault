import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  Shield,
  Zap,
  Lock,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Receipt,
  FileSpreadsheet,
  Globe,
  Building
} from 'lucide-react';
import { CountryTaxConfig, SubscriptionTier, UserProfile } from '../../types';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../../services/subscriptionService';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  taxConfig: CountryTaxConfig;
  onUpdateSubscription: (tier: SubscriptionTier, billingCycle: 'monthly' | 'annual') => void;
  initialReason?: string; // e.g. "To export Chartered Accountant Audit PDF, upgrade to Tax Compliance Pro"
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  profile,
  taxConfig,
  onUpdateSubscription,
  initialReason,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [upgradedSuccessTier, setUpgradedSuccessTier] = useState<SubscriptionTier | null>(null);

  if (!isOpen) return null;

  const currentTier = profile.subscription.tier;
  const scansUsed = profile.subscription.receiptsScannedThisMonth || 0;
  const scansLimit = profile.subscription.monthlyReceiptLimit || 10;
  const scansRemaining = Math.max(0, scansLimit - scansUsed);
  const percentUsed = Math.min(100, Math.round((scansUsed / scansLimit) * 100));

  const handleUpgrade = (tier: SubscriptionTier) => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onUpdateSubscription(tier, billingCycle);
      setUpgradedSuccessTier(tier);
      setTimeout(() => {
        setUpgradedSuccessTier(null);
        onClose();
      }, 1200);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col text-neutral-100 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="p-5 border-b border-neutral-800 text-center relative overflow-hidden bg-gradient-to-b from-emerald-950/30 to-transparent">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-white">Upgrade Your TaxVault Plan</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            Unlock unlimited receipt scanning, official Chartered Accountant audit packs, and multi-currency tools.
          </p>

          {/* Trigger reason if user tapped a gated feature */}
          {initialReason && (
            <div className="mt-3 py-1.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>{initialReason}</span>
            </div>
          )}

          {/* Free Tier Usage Meter */}
          {currentTier === 'free' && (
            <div className="mt-3.5 p-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-left max-w-sm mx-auto">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-neutral-400">Free Tier Monthly Scans</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {scansUsed} / {scansLimit} used ({scansRemaining} left)
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${percentUsed}%` }}
                  className={`h-full rounded-full transition-all ${
                    percentUsed >= 90 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Billing Toggle (Monthly / Annual) */}
        <div className="px-5 pt-4 flex items-center justify-center">
          <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-xl text-xs">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-400/40 px-1.5 py-0.2 rounded font-bold">
                SAVE 17%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="p-5 space-y-3.5">
          {/* Plan 1: Starter (Free) */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              currentTier === 'free'
                ? 'bg-neutral-950 border-neutral-700 ring-1 ring-neutral-700'
                : 'bg-neutral-950/50 border-neutral-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">Starter Free</span>
                  {currentTier === 'free' && (
                    <span className="text-[9px] font-mono bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">
                      CURRENT PLAN
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Basic personal tracking (limited to 10 receipts/month)
                </p>
              </div>

              <div className="text-right">
                <span className="text-lg font-extrabold font-mono text-white">$0</span>
                <span className="text-xs text-neutral-500"> / forever</span>
              </div>
            </div>

            <ul className="mt-3 space-y-1.5 text-xs text-neutral-400 border-t border-neutral-800/80 pt-2.5">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Up to 10 receipt scans per month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Standard CSV expense export</span>
              </li>
              <li className="flex items-center gap-2 text-neutral-500">
                <X className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span>No CA Audit PDF with official sign-off</span>
              </li>
              <li className="flex items-center gap-2 text-neutral-500">
                <X className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span>No Multi-sheet Excel (.xlsx) pack</span>
              </li>
              <li className="flex items-center gap-2 text-neutral-500">
                <X className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span>No CA Reviewer link & PIN sharing</span>
              </li>
            </ul>

            {currentTier !== 'free' && (
              <button
                onClick={() => handleUpgrade('free')}
                className="mt-3 w-full py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium cursor-pointer transition-colors"
              >
                Downgrade to Free
              </button>
            )}
          </div>

          {/* Plan 2: Tax Compliance Pro (Highlighted) */}
          <div
            className={`p-4 rounded-2xl border relative transition-all ${
              currentTier === 'pro'
                ? 'bg-emerald-950/20 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg'
                : 'bg-neutral-950 border-emerald-500/40 hover:border-emerald-500 shadow-md'
            }`}
          >
            <div className="absolute -top-2.5 right-4 bg-emerald-500 text-neutral-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full tracking-wider uppercase">
              RECOMMENDED FOR TAX SEASON
            </div>

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">Tax Compliance Pro</span>
                  {currentTier === 'pro' && (
                    <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                      CURRENT PLAN
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-300 mt-0.5">
                  End-of-year tax filing with Chartered Accountant reports
                </p>
              </div>

              <div className="text-right">
                <span className="text-xl font-extrabold font-mono text-emerald-400">
                  ${billingCycle === 'annual' ? '149' : '14.99'}
                </span>
                <span className="text-xs text-neutral-400">
                  {billingCycle === 'annual' ? ' / yr' : ' / mo'}
                </span>
              </div>
            </div>

            <ul className="mt-3 space-y-1.5 text-xs text-neutral-200 border-t border-neutral-800/80 pt-2.5">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-medium text-white">Unlimited receipt scans & OCR</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-medium text-white">Official Chartered Accountant Audit PDF</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-medium text-white">Multi-Sheet Excel (.xlsx) tax audit pack</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Direct CA Reviewer Token & Link sharing</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Live multi-currency spot rate conversions</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>AES-256 encrypted cloud backup vault</span>
              </li>
            </ul>

            {currentTier !== 'pro' ? (
              <button
                onClick={() => handleUpgrade('pro')}
                disabled={isProcessing}
                className="mt-3.5 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-98"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Activating Pro Plan...' : 'Upgrade to Compliance Pro'}</span>
              </button>
            ) : (
              <div className="mt-3 py-1.5 text-center text-xs text-emerald-400 font-semibold bg-emerald-500/10 rounded-lg">
                Active Pro Subscription
              </div>
            )}
          </div>

          {/* Plan 3: Enterprise / Firm */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              currentTier === 'enterprise'
                ? 'bg-neutral-950 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-neutral-950/60 border-neutral-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">Firm & Multi-Entity</span>
                  {currentTier === 'enterprise' && (
                    <span className="text-[9px] font-mono bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">
                      CURRENT PLAN
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  For accounting practices, multiple entities & teams
                </p>
              </div>

              <div className="text-right">
                <span className="text-xl font-extrabold font-mono text-white">
                  ${billingCycle === 'annual' ? '399' : '39.99'}
                </span>
                <span className="text-xs text-neutral-500">
                  {billingCycle === 'annual' ? ' / yr' : ' / mo'}
                </span>
              </div>
            </div>

            <ul className="mt-3 space-y-1.5 text-xs text-neutral-300 border-t border-neutral-800/80 pt-2.5">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Everything in Pro</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Multiple trading entities & IRD numbers</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Direct Xero / MYOB API sync</span>
              </li>
            </ul>

            {currentTier !== 'enterprise' && (
              <button
                onClick={() => handleUpgrade('enterprise')}
                disabled={isProcessing}
                className="mt-3 w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Building className="w-3.5 h-3.5 text-blue-400" />
                <span>Upgrade to Firm Tier</span>
              </button>
            )}
          </div>
        </div>

        {/* Security / Guarantee Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 text-center text-[11px] text-neutral-400 flex items-center justify-center gap-2">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>30-Day Money-Back Guarantee · Cancel Anytime in 1 Tap</span>
        </div>
      </div>
    </div>
  );
};
