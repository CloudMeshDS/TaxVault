import React, { useState } from 'react';
import { Sparkles, Check, X, Zap, Lock, CheckCircle2, ArrowRight, Copy, ShieldCheck } from 'lucide-react';
import { CountryTaxConfig, SubscriptionTier, UserProfile } from '../../types';
import { SUBSCRIPTION_PLANS, SubscriptionService } from '../../services/subscriptionService';
import { PAID_TIERS, PaidTier, formatINR, planPriceINR } from '../../constants/plans';
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
  onUpdateSubscription,
  initialReason,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [isProcessing, setIsProcessing] = useState(false);

  const [isRazorpayCheckoutOpen, setIsRazorpayCheckoutOpen] = useState(false);
  const [selectedTierForPayment, setSelectedTierForPayment] = useState<PaidTier>('pro');
  const [isCopied, setIsCopied] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [razorpaySuccessData, setRazorpaySuccessData] = useState<{
    response: RazorpaySuccessResponse;
    tier: PaidTier;
    amount: number;
    billingCycle: 'monthly' | 'annual';
    date: string;
  } | null>(null);

  if (!isOpen) return null;

  const currentTier = profile.subscription.tier;
  const usage = SubscriptionService.getScanUsage(profile);
  const percentUsed = Math.min(100, Math.round((usage.used / Math.max(1, usage.limit)) * 100));
  const freePlan = SUBSCRIPTION_PLANS.free;
  const cycleSuffix = billingCycle === 'annual' ? '/ yr' : '/ mo';

  const handleOpenRazorpay = (tier: PaidTier) => {
    setSelectedTierForPayment(tier);
    setIsRazorpayCheckoutOpen(true);
  };

  const handleRazorpaySuccess = async (res: RazorpaySuccessResponse) => {
    const tier = selectedTierForPayment;
    const amount = planPriceINR(tier, billingCycle);
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
      description: `Purchased ${SUBSCRIPTION_PLANS[tier].name} (${billingCycle}) - ${formatINR(amount)}`,
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

    onUpdateSubscription(tier, billingCycle);

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
      description: `Downgraded to the free plan`,
      status: 'success',
      changes: { previousTier: currentTier, newTier: 'free' },
    });

    setIsProcessing(false);
    onUpdateSubscription('free', billingCycle);
    onClose();
  };

  const successPlan = razorpaySuccessData ? SUBSCRIPTION_PLANS[razorpaySuccessData.tier] : null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] modal-backdrop-animation">
        <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col text-slate-900 shadow-2xl relative modal-enter-animation">
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {razorpaySuccessData && successPlan ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-700">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-700 text-xs font-bold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  <span>Payment verified</span>
                </div>
                <h3 className="text-xl font-black text-slate-900">{successPlan.name} is active</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You now have {successPlan.dailyScans} AI receipt scans a day, CA audit packs and cloud backup.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Payment ID</span>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold font-mono min-w-0">
                    <span className="truncate">{razorpaySuccessData.response.razorpay_payment_id}</span>
                    <button
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(razorpaySuccessData.response.razorpay_payment_id);
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        }
                      }}
                      className="text-slate-500 hover:text-slate-900 p-0.5 rounded cursor-pointer shrink-0"
                      aria-label="Copy payment ID"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Amount paid</span>
                  <span className="text-slate-900 font-bold text-sm">{formatINR(razorpaySuccessData.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Billing</span>
                  <span className="text-slate-800 capitalize">{razorpaySuccessData.billingCycle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="text-slate-800">{razorpaySuccessData.date}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setRazorpaySuccessData(null);
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-brand hover:bg-brand-strong active:scale-98 text-white font-bold text-sm cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <span>Start scanning receipts</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-slate-200 text-center bg-emerald-50">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 text-emerald-700">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900">Choose your TaxVault plan</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Paid plans include daily AI receipt scans, CA audit packs and cloud backup.
                </p>

                {initialReason && (
                  <div className="mt-3 py-1.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-medium inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>{initialReason}</span>
                  </div>
                )}

                {paymentError && (
                  <div role="alert" className="mt-3 py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-medium">
                    {paymentError}
                  </div>
                )}

                {usage.period === 'month' && (
                  <div className="mt-3.5 p-2.5 bg-white border border-slate-200 rounded-xl text-left max-w-sm mx-auto">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">Free scans this month</span>
                      <span className="text-emerald-700 font-bold">
                        {usage.used} / {usage.limit} used
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percentUsed}%` }}
                        className={`h-full rounded-full transition-all ${percentUsed >= 90 ? 'bg-amber-500' : 'bg-brand'}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 pt-4 flex items-center justify-center">
                <div className="flex items-center p-1 bg-slate-50 border border-slate-200 rounded-xl text-xs" role="group" aria-label="Billing period">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    aria-pressed={billingCycle === 'monthly'}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    aria-pressed={billingCycle === 'annual'}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      billingCycle === 'annual' ? 'bg-brand text-white shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
                    }`}
                  >
                    <span>Annual</span>
                    <span className={`text-[11px] px-1.5 rounded font-bold ${billingCycle === 'annual' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                      2 months free
                    </span>
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {PAID_TIERS.map((tier) => {
                  const plan = SUBSCRIPTION_PLANS[tier];
                  const price = planPriceINR(tier, billingCycle);
                  const isCurrent = currentTier === tier;
                  const highlighted = Boolean(plan.badge);
                  return (
                    <div
                      key={tier}
                      className={`p-4 rounded-2xl border relative transition-all ${
                        isCurrent
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                          : highlighted
                            ? 'bg-white border-emerald-500/50 shadow-md'
                            : 'bg-white border-slate-200'
                      }`}
                    >
                      {plan.badge && !isCurrent && (
                        <div className="absolute -top-2.5 right-4 bg-brand text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                          {plan.badge}
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900">{plan.name}</span>
                            {isCurrent && (
                              <span className="text-[11px] bg-emerald-500/20 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Current plan</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{plan.tagline}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xl font-black text-emerald-700">{formatINR(price)}</span>
                          <span className="text-xs text-slate-500"> {cycleSuffix}</span>
                          {billingCycle === 'annual' && (
                            <div className="text-[11px] text-slate-500">{formatINR(Math.round(price / 12))} / mo</div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 bg-slate-100 rounded-lg px-2 py-1">
                        <Zap className="w-3.5 h-3.5 text-amber-600 fill-current" />
                        <span>{plan.dailyScans} AI scans per day</span>
                      </div>

                      <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                        {plan.features.slice(1).map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {isCurrent ? (
                        <div className="mt-3 py-2 px-3 text-center text-xs text-emerald-700 font-semibold bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Your current plan</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenRazorpay(tier)}
                          disabled={isProcessing}
                          className={`mt-3 w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-60 ${
                            highlighted ? 'bg-brand hover:bg-brand-strong text-white' : 'bg-white border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          <span>Choose this plan · {formatINR(price)}</span>
                        </button>
                      )}
                    </div>
                  );
                })}

                <div className={`p-4 rounded-2xl border ${currentTier === 'free' ? 'bg-slate-50 border-slate-300' : 'bg-slate-50/60 border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{freePlan.name}</span>
                        {currentTier === 'free' && (
                          <span className="text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">Current plan</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{freePlan.features.join(' · ')}</p>
                    </div>
                    <span className="text-lg font-extrabold text-slate-900 shrink-0">Free</span>
                  </div>

                  {currentTier !== 'free' && (
                    <button
                      onClick={handleDowngradeToFree}
                      disabled={isProcessing}
                      className="mt-3 w-full py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer transition-colors"
                    >
                      {isProcessing ? 'Updating…' : 'Switch to the free plan'}
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 text-center">
                  Paid securely with Razorpay: UPI, cards and netbanking.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <RazorpayCheckoutModal
        isOpen={isRazorpayCheckoutOpen}
        onClose={() => setIsRazorpayCheckoutOpen(false)}
        profile={profile}
        planName={SUBSCRIPTION_PLANS[selectedTierForPayment].name}
        planTier={selectedTierForPayment}
        billingCycle={billingCycle}
        amountINR={planPriceINR(selectedTierForPayment, billingCycle)}
        onPaymentSuccess={handleRazorpaySuccess}
      />
    </>
  );
};
