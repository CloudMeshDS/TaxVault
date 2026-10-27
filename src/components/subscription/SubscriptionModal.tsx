import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  Zap,
  Lock,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Receipt,
  FileSpreadsheet,
  Globe,
  Building,
  Copy,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { CountryTaxConfig, SubscriptionTier, UserProfile } from '../../types';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../../services/subscriptionService';
import { supabaseService } from '../../services/supabaseService';
import { activityLogService } from '../../services/activityLogService';
import { RazorpayCheckoutModal } from './RazorpayCheckoutModal';
import { RazorpaySuccessResponse, RazorpayService } from '../../services/razorpayService';
import { authedFetch } from '../../services/apiBase';

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

  // Razorpay Checkout Integration States
  const [isRazorpayCheckoutOpen, setIsRazorpayCheckoutOpen] = useState(false);
  const [selectedTierForPayment, setSelectedTierForPayment] = useState<'pro' | 'enterprise'>('pro');
  const [isCopied, setIsCopied] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [razorpaySuccessData, setRazorpaySuccessData] = useState<{
    response: RazorpaySuccessResponse;
    tier: 'pro' | 'enterprise';
    amount: number;
    billingCycle: 'monthly' | 'annual';
    date: string;
  } | null>(null);

  if (!isOpen) return null;

  const currentTier = profile.subscription.tier;
  const scansUsed = profile.subscription.receiptsScannedThisMonth || 0;
  const scansLimit = profile.subscription.monthlyReceiptLimit || 10;
  const scansRemaining = Math.max(0, scansLimit - scansUsed);
  const percentUsed = Math.min(100, Math.round((scansUsed / scansLimit) * 100));

  const handleOpenRazorpay = (tier: 'pro' | 'enterprise') => {
    setSelectedTierForPayment(tier);
    setIsRazorpayCheckoutOpen(true);
  };

  const handleRazorpaySuccess = async (res: RazorpaySuccessResponse) => {
    const tier = selectedTierForPayment;
    const amount = tier === 'pro'
      ? (billingCycle === 'annual' ? 11999 : 1199)
      : (billingCycle === 'annual' ? 31999 : 3199);
    const userId = profile.id || 'usr_taxvault_admin';
    setPaymentError(null);

    // Signed-in accounts: the server verifies the payment and records the plan. Nothing is
    // granted unless it confirms. On-device demo accounts (no session) only change local state.
    if (await supabaseService.hasSession()) {
      setIsProcessing(true);
      const verification = await RazorpayService.verifyPaymentOnServer(res, tier, billingCycle);
      setIsProcessing(false);
      if (!verification.verified) {
        setIsRazorpayCheckoutOpen(false);
        setPaymentError(verification.error || 'We could not verify this payment, so your plan was not changed.');
        return;
      }
    }

    activityLogService.logActivity({
      userId,
      entityType: 'subscription',
      entityId: 'sub_' + userId,
      action: 'upgrade_plan',
      description: `Purchased ${tier.toUpperCase()} plan via Razorpay (${billingCycle}) - ₹${amount.toLocaleString('en-IN')}`,
      status: 'success',
      changes: {
        previousTier: currentTier,
        newTier: tier,
        billingCycle,
        amount,
        paymentGateway: 'razorpay',
        paymentId: res.razorpay_payment_id,
      },
    });

    // Upgrade user profile
    onUpdateSubscription(tier, billingCycle);

    // Close checkout modal & display celebratory receipt screen
    setIsRazorpayCheckoutOpen(false);
    setRazorpaySuccessData({
      response: res,
      tier,
      amount,
      billingCycle,
      date: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  };

  const handleDowngradeToFree = async () => {
    setIsProcessing(true);
    setPaymentError(null);
    const userId = profile.id || 'usr_taxvault_admin';

    if (await supabaseService.hasSession()) {
      try {
        const res = await authedFetch('/api/subscription/downgrade', { method: 'POST' });
        if (!res.ok) throw new Error('Downgrade failed');
      } catch {
        setIsProcessing(false);
        setPaymentError('Could not change your plan. Please check your connection and try again.');
        return;
      }
    }

    activityLogService.logActivity({
      userId,
      entityType: 'subscription',
      entityId: 'sub_' + userId,
      action: 'downgrade_plan',
      description: `Downgraded to FREE plan`,
      status: 'success',
      changes: { previousTier: currentTier, newTier: 'free' },
    });

    setTimeout(() => {
      setIsProcessing(false);
      onUpdateSubscription('free', billingCycle);
      setUpgradedSuccessTier('free');
      setTimeout(() => {
        setUpgradedSuccessTier(null);
        onClose();
      }, 1000);
    }, 600);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs backdrop-blur-md flex items-center justify-center p-3 modal-backdrop-animation">
        <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col text-slate-900 shadow-2xl relative modal-enter-animation">
          {/* Close Button */}
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {razorpaySuccessData ? (
            /* Celebration & Razorpay Payment Success Receipt View */
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 shadow-lg shadow-emerald-950/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-700 text-xs font-bold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  <span>Razorpay Payment Verified</span>
                </div>
                <h3 className="text-xl font-black text-white">
                  {razorpaySuccessData.tier === 'pro' ? 'Tax Compliance Pro' : 'Firm & Multi-Entity'} Activated!
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your payment has been authorized and captured. Unlimited receipt scans, CA audit packs, and automated tax filing features are now ready to use.
                </p>
              </div>

              {/* Receipt & Transaction Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Razorpay Payment ID</span>
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <span>{razorpaySuccessData.response.razorpay_payment_id}</span>
                    <button
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(razorpaySuccessData.response.razorpay_payment_id);
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        }
                      }}
                      className="text-slate-500 hover:text-white p-0.5 rounded cursor-pointer"
                      title="Copy Payment ID"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Razorpay Order ID</span>
                  <span className="text-slate-800">{razorpaySuccessData.response.razorpay_order_id || 'RZP_ORDER_DIRECT'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Amount Paid</span>
                  <span className="text-white font-bold text-sm">₹{razorpaySuccessData.amount.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Billing Cycle</span>
                  <span className="text-emerald-600 capitalize font-bold">{razorpaySuccessData.billingCycle} Plan</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Payment Date</span>
                  <span className="text-slate-700">{razorpaySuccessData.date}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Status</span>
                  <span className="text-emerald-600 font-bold">Captured & Active ✓</span>
                </div>
              </div>

              {/* Instant Features Unlocked */}
              <div className="bg-emerald-50 border border-emerald-500/30 rounded-2xl p-3.5 text-left text-xs space-y-1.5 text-emerald-200">
                <div className="font-bold text-white flex items-center gap-1.5 mb-1 text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Unlocked Pro Features</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Unlimited Receipt Scanning with Gemini Flash AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Chartered Accountant Audit Pack & Tax PDF Export</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Multi-Sheet Excel Audit Worksheets & Spot FX</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setRazorpaySuccessData(null);
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
              >
                <span>Start Scanning Receipts</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Main Subscription Plans Screen */
            <>
              {/* Top Header */}
              <div className="p-5 border-b border-slate-200 text-center relative overflow-hidden bg-gradient-to-b from-emerald-950/30 to-transparent">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 text-emerald-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-white">Upgrade Your TaxVault Plan</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Unlock unlimited receipt scanning, official Chartered Accountant audit packs, and multi-currency tools.
                </p>

                {/* Trigger reason if user tapped a gated feature */}
                {initialReason && (
                  <div className="mt-3 py-1.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-medium inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{initialReason}</span>
                  </div>
                )}

                {paymentError && (
                  <div role="alert" className="mt-3 py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-medium">
                    {paymentError}
                  </div>
                )}

                {/* Free Tier Usage Meter */}
                {currentTier === 'free' && (
                  <div className="mt-3.5 p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-left max-w-sm mx-auto">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">Free Tier Monthly Scans</span>
                      <span className="font-mono text-emerald-600 font-bold">
                        {scansUsed} / {scansLimit} used ({scansRemaining} left)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
                <div className="flex items-center p-1 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      billingCycle === 'monthly'
                        ? 'bg-slate-100 text-white shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      billingCycle === 'annual'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span className="whitespace-nowrap">Annual</span>
                    <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-400/40 px-1.5 py-0.2 rounded font-bold whitespace-nowrap shrink-0">
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
                      ? 'bg-slate-50 border-slate-300 ring-1 ring-slate-200'
                      : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">Starter Free</span>
                        {currentTier === 'free' && (
                          <span className="text-xs font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            CURRENT PLAN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Basic personal tracking (limited to 10 receipts/month)
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-extrabold font-mono text-white">$0</span>
                      <span className="text-xs text-slate-400"> / forever</span>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1.5 text-xs text-slate-500 border-t border-slate-200 pt-2.5">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Up to 10 receipt scans per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Standard CSV expense export</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span>No CA Audit PDF with official sign-off</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span>No Multi-sheet Excel (.xlsx) pack</span>
                    </li>
                  </ul>

                  {currentTier !== 'free' && (
                    <button
                      onClick={handleDowngradeToFree}
                      disabled={isProcessing}
                      className="mt-3 w-full py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition-colors"
                    >
                      {isProcessing ? 'Updating...' : 'Downgrade to Free'}
                    </button>
                  )}
                </div>

                {/* Plan 2: Tax Compliance Pro (Highlighted with Razorpay) */}
                <div
                  className={`p-4 rounded-2xl border relative transition-all ${
                    currentTier === 'pro'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg'
                      : 'bg-slate-50 border-emerald-500/40 hover:border-emerald-500 shadow-md'
                  }`}
                >
                  <div className="absolute -top-2.5 right-4 bg-emerald-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-full tracking-wider uppercase">
                    RECOMMENDED FOR TAX SEASON
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">Tax Compliance Pro</span>
                        {currentTier === 'pro' && (
                          <span className="text-xs font-mono bg-emerald-500/20 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
                            CURRENT PLAN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 mt-0.5">
                        End-of-year tax filing with Chartered Accountant reports
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-xl font-black font-mono text-emerald-600">
                          ₹{billingCycle === 'annual' ? '11,999' : '1,199'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {billingCycle === 'annual' ? ' / yr' : ' / mo'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        (${billingCycle === 'annual' ? '149' : '14.99'} USD)
                      </div>
                    </div>
                  </div>

                  {/* Razorpay Support Strip */}
                  <div className="mt-2.5 flex items-center justify-between p-2 rounded-xl bg-blue-50 border border-blue-500/30 text-xs">
                    <div className="flex items-center gap-1.5 text-blue-200">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      <span className="font-bold text-white">Razorpay</span>
                      <span className="text-blue-700 text-xs">· UPI, GPay, Cards, NetBanking</span>
                    </div>
                    <span className="text-xs bg-blue-500/20 text-blue-700 font-mono px-1.5 py-0.2 rounded border border-blue-400/30">
                      Instant Activation
                    </span>
                  </div>

                  <ul className="mt-3 space-y-1.5 text-xs text-slate-800 border-t border-slate-200 pt-2.5">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium text-white">Unlimited receipt scans & OCR</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium text-white">Official Chartered Accountant Audit PDF</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium text-white">Multi-Sheet Excel (.xlsx) tax audit pack</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Direct CA Reviewer Token & Link sharing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Live multi-currency spot rate conversions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>AES-256 encrypted cloud backup vault</span>
                    </li>
                  </ul>

                  {currentTier !== 'pro' ? (
                    <button
                      onClick={() => handleOpenRazorpay('pro')}
                      disabled={isProcessing}
                      className="mt-3.5 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-950/40 cursor-pointer active:scale-98 whitespace-nowrap"
                    >
                      <Zap className="w-3.5 h-3.5 shrink-0 fill-current text-amber-700" />
                      <span className="whitespace-nowrap">
                        Pay with Razorpay · ₹{billingCycle === 'annual' ? '11,999' : '1,199'}
                      </span>
                    </button>
                  ) : (
                    <div className="mt-3 py-2 px-3 text-center text-xs text-emerald-600 font-semibold bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Active Pro Subscription · Paid via Razorpay</span>
                    </div>
                  )}
                </div>

                {/* Plan 3: Enterprise / Firm */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    currentTier === 'enterprise'
                      ? 'bg-slate-50 border-blue-500 ring-2 ring-blue-500/20'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">Firm & Multi-Entity</span>
                        {currentTier === 'enterprise' && (
                          <span className="text-xs font-mono bg-blue-500/20 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                            CURRENT PLAN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        For accounting practices, multiple entities & teams
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-xl font-extrabold font-mono text-white">
                          ₹{billingCycle === 'annual' ? '31,999' : '3,199'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {billingCycle === 'annual' ? ' / yr' : ' / mo'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        (${billingCycle === 'annual' ? '399' : '39.99'} USD)
                      </div>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1.5 text-xs text-slate-700 border-t border-slate-200 pt-2.5">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span>Everything in Pro</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span>Multiple trading entities & IRD numbers</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span>Direct Xero / MYOB API sync</span>
                    </li>
                  </ul>

                  {currentTier !== 'enterprise' && (
                    <button
                      onClick={() => handleOpenRazorpay('enterprise')}
                      disabled={isProcessing}
                      className="mt-3 w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Building className="w-3.5 h-3.5 text-blue-700" />
                      <span>Upgrade to Firm Tier (via Razorpay)</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Razorpay Authentic Checkout Modal (UPI, Cards, NetBanking, Instant Simulation) */}
      <RazorpayCheckoutModal
        isOpen={isRazorpayCheckoutOpen}
        onClose={() => setIsRazorpayCheckoutOpen(false)}
        profile={profile}
        planName={selectedTierForPayment === 'pro' ? 'Tax Compliance Pro' : 'Firm & Multi-Entity'}
        planTier={selectedTierForPayment}
        billingCycle={billingCycle}
        amountINR={
          selectedTierForPayment === 'pro'
            ? (billingCycle === 'annual' ? 11999 : 1199)
            : (billingCycle === 'annual' ? 31999 : 3199)
        }
        onPaymentSuccess={handleRazorpaySuccess}
      />
    </>
  );
};
