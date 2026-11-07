import type { PaidTier } from '../constants/plans';
import { authedFetch } from './apiBase';
/**
 * Razorpay Payment Gateway Service for TaxVault Pro Version Purchase
 */

export interface RazorpayPaymentOptions {
  key?: string;
  amount?: number; // smallest unit: paise or cents (not used with subscription_id)
  currency?: string; // always 'USD' for plans
  name: string;
  description: string;
  image?: string;
  order_id?: string;
  /** Monthly auto-debit: Razorpay subscription to authorise (UPI Autopay / card mandate) */
  subscription_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler?: (response: RazorpaySuccessResponse) => void;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature?: string;
}

/** A coupon checked by the server, priced for one plan and billing period (US dollars). */
export interface CouponQuote {
  valid: true;
  code: string;
  description: string;
  originalAmount: number;
  finalAmount: number;
  discount: number;
  currency: 'USD';
}

export interface RazorpayFailureResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata?: Record<string, any>;
  };
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export class RazorpayService {
  private static scriptLoadingPromise: Promise<boolean> | null = null;

  /**
   * Loads the official Razorpay Checkout script dynamically
   */
  public static loadScript(): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (window.Razorpay) return Promise.resolve(true);

    if (this.scriptLoadingPromise) return this.scriptLoadingPromise;

    this.scriptLoadingPromise = new Promise((resolve) => {
      // Check if already in DOM
      const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existing) {
        if (window.Razorpay) {
          resolve(true);
          return;
        }
        existing.addEventListener('load', () => resolve(true));
        existing.addEventListener('error', () => resolve(false));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });

    return this.scriptLoadingPromise;
  }

  /**
   * Check if Razorpay SDK is available
   */
  public static isAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean(window.Razorpay);
  }

  /**
   * Get default or configured Razorpay Key
   */
  public static getKeyId(): string {
    const envKey = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID;
    return envKey && envKey.trim() !== '' ? envKey : 'rzp_test_TaxVaultLiveKey';
  }

  /**
   * Initiates payment via official Razorpay Checkout popup
   */
  public static async openCheckout(
    options: RazorpayPaymentOptions
  ): Promise<{ opened: boolean; error?: string }> {
    try {
      const isLoaded = await this.loadScript();
      if (!isLoaded || !window.Razorpay) {
        return { opened: false, error: 'Razorpay SDK could not be loaded.' };
      }

      const key = options.key || this.getKeyId();

      const rzpInstance = new window.Razorpay({
        ...options,
        key,
      });

      rzpInstance.open();
      return { opened: true };
    } catch (err: any) {
      return { opened: false, error: err?.message || 'Error opening Razorpay checkout' };
    }
  }

  /**
   * Calls backend /api/razorpay/create-order to generate an official Razorpay Order.
   * The server sets the price for the plan and tags the order with the signed-in user.
   */
  public static async createOrderOnServer(
    tier: PaidTier,
    billingCycle: 'monthly' | 'annual',
    couponCode?: string
  ): Promise<{ success: boolean; orderId?: string; amount?: number; currency?: string; error?: string }> {
    try {
      const res = await authedFetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billingCycle, couponCode }),
      });
      const data = await res.json();
      if (res.ok && data.order?.id) {
        return { success: true, orderId: data.order.id, amount: data.order.amount, currency: data.order.currency };
      }
      return { success: false, error: data?.error || 'Order creation failed' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error creating order' };
    }
  }

  /**
   * Verifies the payment on the server (signature + paid order owned by this user), which then
   * activates the plan. The returned subscription is the server's record, the only one that counts.
   */
  public static async verifyPaymentOnServer(
    response: RazorpaySuccessResponse,
    tier: PaidTier,
    billingCycle: 'monthly' | 'annual'
  ): Promise<{ verified: boolean; subscription?: any; error?: string }> {
    try {
      const res = await authedFetch('/api/razorpay/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...response, tier, billingCycle }),
      });
      const data = await res.json().catch(() => ({}));
      return {
        verified: res.ok && Boolean(data?.verified),
        subscription: data?.subscription,
        error: data?.error,
      };
    } catch (err: any) {
      return { verified: false, error: err?.message };
    }
  }

  /** Starts a monthly auto-debit subscription; the server sets the price for the user's country. */
  public static async createSubscriptionOnServer(
    tier: PaidTier,
    couponCode?: string
  ): Promise<{ success: boolean; subscriptionId?: string; keyId?: string; error?: string }> {
    try {
      const res = await authedFetch('/api/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, couponCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.subscriptionId) return { success: true, subscriptionId: data.subscriptionId, keyId: data.keyId };
      return { success: false, error: data?.error || 'Could not start auto-pay' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error starting auto-pay' };
    }
  }

  /** Confirms the mandate and first payment on the server, which then activates the plan. */
  public static async verifySubscriptionOnServer(
    response: RazorpaySuccessResponse
  ): Promise<{ verified: boolean; subscription?: any; error?: string }> {
    try {
      const res = await authedFetch('/api/razorpay/verify-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
      });
      const data = await res.json().catch(() => ({}));
      return { verified: res.ok && Boolean(data?.verified), subscription: data?.subscription, error: data?.error };
    } catch (err: any) {
      return { verified: false, error: err?.message };
    }
  }

  /** Checks a coupon for a plan and period; the server returns the price it will charge. */
  public static async validateCoupon(
    code: string,
    tier: PaidTier,
    billingCycle: 'monthly' | 'annual'
  ): Promise<CouponQuote | { valid: false; error: string }> {
    try {
      const res = await authedFetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, tier, billingCycle }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.valid) return data as CouponQuote;
      if (res.status === 401) return { valid: false, error: 'Sign in to use a coupon.' };
      return { valid: false, error: data?.error || 'This coupon code is not valid.' };
    } catch {
      return { valid: false, error: 'Could not check this coupon. Please check your connection.' };
    }
  }

  /** Stops auto-debit; the plan stays active until the end of the month already paid for. */
  public static async cancelAutoRenew(): Promise<{ success: boolean; subscription?: any; error?: string }> {
    try {
      const res = await authedFetch('/api/subscription/cancel-auto-renew', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      return { success: res.ok && Boolean(data?.success), subscription: data?.data, error: data?.error };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  /**
   * Generates a simulated authentic Razorpay payment response for test/sandbox mode
   */
  public static createSimulatedPaymentResponse(plan: string): RazorpaySuccessResponse {
    const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
    return {
      razorpay_payment_id: `pay_RZP${Date.now().toString().slice(-4)}${rand}`,
      razorpay_order_id: `order_RZP${Date.now().toString().slice(-6)}${rand.slice(0, 4)}`,
      razorpay_signature: `sig_rzp_${Math.random().toString(36).substring(2, 14)}`,
    };
  }
}

