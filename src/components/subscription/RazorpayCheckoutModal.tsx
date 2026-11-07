import React, { useState } from 'react';
import { X, Lock, RefreshCw, Loader2 } from 'lucide-react';
import { formatPlanPrice, toMinorUnits, type PaidTier, type PlanCurrency } from '../../constants/plans';
import { SUBSCRIPTION_PLANS } from '../../services/subscriptionService';
import { RazorpaySuccessResponse, RazorpayService } from '../../services/razorpayService';
import { UserProfile } from '../../types';

interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  planName: string;
  planTier: PaidTier;
  billingCycle: 'monthly' | 'annual';
  amount: number;
  currency: PlanCurrency;
  /** Coupon already checked on the plan screen; the server applies it again when pricing the order */
  couponCode?: string;
  onPaymentSuccess: (response: RazorpaySuccessResponse) => void;
}

/**
 * Order summary before payment. Card, UPI and bank details are only ever entered in Razorpay's own
 * Checkout, which this sheet opens; TaxVault never shows a payment form of its own.
 */
export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  isOpen,
  onClose,
  profile,
  planName,
  planTier,
  billingCycle,
  amount,
  currency,
  couponCode,
  onPaymentSuccess,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const plan = SUBSCRIPTION_PLANS[planTier];
  const monthly = billingCycle === 'monthly';

  const handlePay = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      // Monthly plans are auto-debited (Razorpay subscription + card mandate); annual is a one-time order
      let paymentTarget: { key?: string; order_id?: string; subscription_id?: string; amount?: number; currency?: string };
      if (monthly) {
        const subRes = await RazorpayService.createSubscriptionOnServer(planTier, couponCode);
        if (!subRes.success || !subRes.subscriptionId) throw new Error(subRes.error || 'Could not start auto-pay.');
        paymentTarget = { key: subRes.keyId, subscription_id: subRes.subscriptionId };
      } else {
        const orderRes = await RazorpayService.createOrderOnServer(planTier, billingCycle, couponCode);
        if (!orderRes.success || !orderRes.orderId) throw new Error(orderRes.error || 'Could not start the payment.');
        paymentTarget = {
          key: orderRes.keyId,
          order_id: orderRes.orderId,
          amount: orderRes.amount ?? toMinorUnits(amount),
          currency: orderRes.currency || currency,
        };
      }

      const res = await RazorpayService.openCheckout({
        ...paymentTarget,
        name: 'TaxVault',
        description: `${planName} (${monthly ? 'monthly, renews automatically' : '12 months'})`,
        prefill: {
          name: profile.fullName || undefined,
          email: profile.email || undefined,
          contact: profile.phone || undefined,
        },
        theme: { color: '#047857' },
        // The parent verifies the payment on the server before granting the plan
        handler: (response: RazorpaySuccessResponse) => {
          setIsProcessing(false);
          onPaymentSuccess(response);
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
      });
      if (!res.opened) throw new Error('Razorpay Checkout could not be opened. Check your connection and try again.');
    } catch (err: any) {
      setIsProcessing(false);
      const message = String(err?.message || '');
      setError(/sign in|auth/i.test(message) ? 'Please sign in to subscribe.' : message || 'Payment could not be started.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] modal-backdrop-animation">
      <div className="bg-white text-slate-900 border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl relative modal-enter-animation">
        <button
          aria-label="Close"
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 space-y-4">
          <div className="pr-10">
            <h3 className="font-bold text-lg leading-tight">Confirm your plan</h3>
            <p className="text-xs text-slate-500 mt-0.5">You'll pay securely in Razorpay Checkout.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold">{planName}</div>
                <div className="text-xs text-slate-500">{plan.dailyScans} AI receipt scans a day</div>
              </div>
              <div className="text-right">
                <div className="font-black text-lg">{formatPlanPrice(amount, currency)}</div>
                <div className="text-xs text-slate-500">{monthly ? 'per month' : 'for 12 months'}</div>
              </div>
            </div>
            {couponCode && (
              <div className="text-xs text-emerald-700 font-semibold">Coupon {couponCode} applied</div>
            )}
            <div className="flex items-start gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200">
              <RefreshCw className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                {monthly
                  ? `Charged ${formatPlanPrice(amount, currency)} every month to your card until you cancel. We remind you 7 days before each payment. Cancel any time in Settings; your plan stays active until the end of the paid month.`
                  : 'One payment for 12 months. It does not renew automatically.'}
              </span>
            </div>
          </div>

          {error && (
            <div role="alert" className="py-2 px-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full py-3 rounded-xl bg-brand hover:bg-brand-strong text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-70 disabled:cursor-default"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>{isProcessing ? 'Opening Razorpay…' : `Continue to pay ${formatPlanPrice(amount, currency)}`}</span>
          </button>

          <p className="text-[11px] text-slate-500 text-center leading-snug">
            Prices in US dollars. Payments are processed by Razorpay; TaxVault never sees your card details.
          </p>
        </div>
      </div>
    </div>
  );
};
