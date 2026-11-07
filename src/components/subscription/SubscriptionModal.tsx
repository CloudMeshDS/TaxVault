import React, { useEffect, useState } from 'react';
import { Check, X, Zap, Lock, CheckCircle2, ArrowRight, Copy, ShieldCheck, Tag } from 'lucide-react';
import { CountryTaxConfig, SubscriptionTier, UserProfile } from '../../types';
import { SUBSCRIPTION_PLANS, SubscriptionService } from '../../services/subscriptionService';
import { PAID_TIERS, PaidTier, formatPlanPrice, planPrice, type PlanCurrency } from '../../constants/plans';
import { supabaseService } from '../../services/supabaseService';
import { activityLogService } from '../../services/activityLogService';
import { RazorpayCheckoutModal } from './RazorpayCheckoutModal';
import { CouponQuote, RazorpaySuccessResponse, RazorpayService } from '../../services/razorpayService';
import { authedFetch } from '../../services/apiBase';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  taxConfig: CountryTaxConfig;
  onUpdateSubscription: (tier: SubscriptionTier, billingCycle: 'monthly' | 'annual') => void;
  initialReason?: string; // e.g. "To export Chartered Accountant Audit PDF, upgrade to Tax Compliance Pro"
}

/** What every paid plan includes, listed once under the plan choices. */
const PLAN_FEATURES_SHORT = ['CA audit PDF with photos', 'Excel tax workbook', 'Accountant share & ZIP pack', 'Cloud backup & sync'];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateSubscription,
  initialReason,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const [isRazorpayCheckoutOpen, setIsRazorpayCheckoutOpen] = useState(false);
  const [selectedTierForPayment, setSelectedTierForPayment] = useState<PaidTier>('pro');
  const [isCopied, setIsCopied] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [razorpaySuccessData, setRazorpaySuccessData] = useState<{
    response: RazorpaySuccessResponse;
    tier: PaidTier;
    amount: number;
    currency: PlanCurrency;
    billingCycle: 'monthly' | 'annual';
    date: string;
  } | null>(null);

  // Coupon: checked by the server for the selected plan + period; re-checked when either changes
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<(CouponQuote & { tier: PaidTier; cycle: 'monthly' | 'annual' }) | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

  const checkCoupon = async (code: string, tier: PaidTier, cycle: 'monthly' | 'annual') => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setCouponOpen(true);
    setCouponChecking(true);
    setCouponError(null);
    const result = await RazorpayService.validateCoupon(trimmed, tier, cycle);
    setCouponChecking(false);
    if (result.valid) {
      setCoupon({ ...result, tier, cycle });
    } else {
      setCoupon(null);
      setCouponError(result.error);
    }
  };

  // The same code can be worth a different amount (or nothing) on another plan or period
  useEffect(() => {
    if (coupon && (coupon.tier !== selectedTierForPayment || coupon.cycle !== billingCycle)) {
      checkCoupon(coupon.code, selectedTierForPayment, billingCycle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTierForPayment, billingCycle]);

  if (!isOpen) return null;

  const activeCoupon =
    coupon && coupon.tier === selectedTierForPayment && coupon.cycle === billingCycle ? coupon : null;
  const chargeFor = (tier: PaidTier) =>
    activeCoupon && activeCoupon.tier === tier ? activeCoupon.finalAmount : planPrice(tier)[billingCycle];

  const currentTier = profile.subscription.tier;
  const usage = SubscriptionService.getScanUsage(profile);
  const freePlan = SUBSCRIPTION_PLANS.free;

  const handleOpenRazorpay = (tier: PaidTier) => {
    setSelectedTierForPayment(tier);
    setIsRazorpayCheckoutOpen(true);
  };

  const handleRazorpaySuccess = async (res: RazorpaySuccessResponse) => {
    const tier = selectedTierForPayment;
    const { currency } = planPrice(tier);
    const amount = chargeFor(tier);
    const userId = profile.id || 'usr_taxvault_admin';
    setPaymentError(null);

    // Signed-in accounts: the server verifies the payment and records the plan. Nothing is
    // granted unless it confirms. On-device demo accounts (no session) only change local state.
    if (await supabaseService.hasSession()) {
      setIsProcessing(true);
      const verification = res.razorpay_subscription_id
        ? await RazorpayService.verifySubscriptionOnServer(res)
        : await RazorpayService.verifyPaymentOnServer(res, tier, billingCycle);
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
      description: `Purchased ${SUBSCRIPTION_PLANS[tier].name} (${billingCycle}) - ${formatPlanPrice(amount, currency)}`,
      status: 'success',
      changes: {
        previousTier: currentTier,
        newTier: tier,
        billingCycle,
        amount,
        paymentGateway: 'razorpay',
        paymentId: res.razorpay_payment_id,
        ...(activeCoupon ? { couponCode: activeCoupon.code } : {}),
      },
    });

    onUpdateSubscription(tier, billingCycle);

    setIsRazorpayCheckoutOpen(false);
    setRazorpaySuccessData({
      response: res,
      tier,
      amount,
      currency,
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
                  <span className="text-slate-900 font-bold text-sm">{formatPlanPrice(razorpaySuccessData.amount, razorpaySuccessData.currency)}</span>
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
              <div className="px-5 pt-5 pb-3 pr-12">
                <h3 className="font-bold text-lg text-slate-900 leading-tight">Choose your plan</h3>
                {usage.period === 'month' && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Free plan: {usage.used} of {usage.limit} AI scans used this month
                  </p>
                )}
                {initialReason && (
                  <div className="mt-2 py-1.5 px-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-medium flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>{initialReason}</span>
                  </div>
                )}
                {paymentError && (
                  <div role="alert" className="mt-2 py-1.5 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-medium">
                    {paymentError}
                  </div>
                )}
              </div>

              <div className="px-5 space-y-3 pb-5">
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs" role="group" aria-label="Billing period">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    aria-pressed={billingCycle === 'monthly'}
                    className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                      billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 font-medium'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    aria-pressed={billingCycle === 'annual'}
                    className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                      billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 font-medium'
                    }`}
                  >
                    Annual <span className="text-emerald-700 font-bold">· 2 months free</span>
                  </button>
                </div>

                <div className="space-y-2" role="radiogroup" aria-label="Plan">
                  {PAID_TIERS.map((tier) => {
                    const plan = SUBSCRIPTION_PLANS[tier];
                    const { currency, [billingCycle]: price } = planPrice(tier);
                    const isCurrent = currentTier === tier;
                    const selected = selectedTierForPayment === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSelectedTierForPayment(tier)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border-2 flex items-center gap-3 transition-colors cursor-pointer ${
                          selected ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${selected ? 'border-emerald-600' : 'border-slate-300'}`}
                        >
                          {selected && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-slate-900">{plan.name}</span>
                            {isCurrent ? (
                              <span className="text-[10px] bg-emerald-600/15 text-emerald-700 px-1.5 rounded font-bold">Current</span>
                            ) : plan.badge ? (
                              <span className="text-[10px] bg-brand text-white px-1.5 rounded font-bold">{plan.badge}</span>
                            ) : null}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
                            <Zap className="w-3 h-3 text-amber-600 fill-current" />
                            {plan.dailyScans} AI scans a day
                          </span>
                        </span>
                        <span className="text-right shrink-0">
                          <span className="block text-base font-black text-slate-900">{formatPlanPrice(price, currency)}</span>
                          <span className="block text-[11px] text-slate-500">
                            {billingCycle === 'annual'
                              ? `${formatPlanPrice(Math.round((price / 12) * 100) / 100, currency)} / mo`
                              : 'per month'}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600" aria-label="Included in every paid plan">
                  {PLAN_FEATURES_SHORT.map((feature) => (
                    <li key={feature} className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-700 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div>
                  {activeCoupon ? (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-emerald-600/40 bg-emerald-50 text-xs">
                      <span className="flex items-center gap-1.5 flex-wrap min-w-0 text-emerald-800">
                        <Tag className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-bold font-mono">{activeCoupon.code}</span>
                        <span>
                          {activeCoupon.description} · save {formatPlanPrice(activeCoupon.discount)}
                          {billingCycle === 'monthly' ? '/mo' : ''}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCoupon(null);
                          setCouponInput('');
                          setCouponError(null);
                        }}
                        className="text-slate-500 hover:text-slate-900 underline underline-offset-2 shrink-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : couponOpen || coupon ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        checkCoupon(couponInput, selectedTierForPayment, billingCycle);
                      }}
                    >
                      <input
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCouponError(null);
                        }}
                        placeholder="Coupon code"
                        aria-label="Coupon code"
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={32}
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-mono uppercase text-slate-900 placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                      />
                      <button
                        type="submit"
                        disabled={couponChecking || !couponInput.trim()}
                        className="px-4 py-2 rounded-xl border-2 border-emerald-600 text-emerald-700 font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-default"
                      >
                        {couponChecking ? 'Checking…' : 'Apply'}
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCouponOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Have a coupon code?
                    </button>
                  )}
                  {couponError && (
                    <p role="alert" className="text-[11px] text-rose-700 mt-1">
                      {couponError}
                    </p>
                  )}
                </div>

                {(() => {
                  const { currency, [billingCycle]: fullPrice } = planPrice(selectedTierForPayment);
                  const price = chargeFor(selectedTierForPayment);
                  const isCurrent = currentTier === selectedTierForPayment;
                  return (
                    <button
                      onClick={() => handleOpenRazorpay(selectedTierForPayment)}
                      disabled={isProcessing || isCurrent}
                      className="w-full py-3 rounded-xl bg-brand hover:bg-brand-strong text-white font-bold text-sm transition-all cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-default"
                    >
                      {isCurrent
                        ? 'This is your current plan'
                        : (
                          <>
                            {billingCycle === 'monthly' ? 'Subscribe' : 'Pay'} ·{' '}
                            {price < fullPrice && (
                              <span className="line-through opacity-70 font-medium mr-1">{formatPlanPrice(fullPrice, currency)}</span>
                            )}
                            {formatPlanPrice(price, currency)} {billingCycle === 'monthly' ? '/ month' : '/ year'}
                          </>
                        )}
                    </button>
                  );
                })()}

                <p className="text-[11px] text-slate-500 text-center leading-snug">
                  {billingCycle === 'monthly'
                    ? 'Renews monthly on your card. Reminder 7 days before each payment; cancel any time.'
                    : 'One-time payment for 12 months.'}{' '}
                  Prices in US dollars, paid via Razorpay.
                </p>

                {currentTier !== 'free' ? (
                  <button
                    onClick={handleDowngradeToFree}
                    disabled={isProcessing}
                    className="w-full text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 cursor-pointer"
                  >
                    {isProcessing ? 'Updating…' : `Switch to the free plan (${freePlan.monthlyScans} scans a month)`}
                  </button>
                ) : (
                  <p className="text-[11px] text-slate-500 text-center">
                    You're on the free {freePlan.name} plan ({freePlan.monthlyScans} AI scans a month).
                  </p>
                )}
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
        amount={chargeFor(selectedTierForPayment)}
        currency={planPrice(selectedTierForPayment).currency}
        couponCode={activeCoupon?.code}
        onPaymentSuccess={handleRazorpaySuccess}
      />
    </>
  );
};
