import { authedFetch } from './apiBase';
/**
 * Razorpay Payment Gateway Service for TaxVault Pro Version Purchase
 */

export interface RazorpayPaymentOptions {
  key?: string;
  amount: number; // in paise (e.g. 119900 = ₹1,199)
  currency: string; // 'INR'
  name: string;
  description: string;
  image?: string;
  order_id?: string;
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
  razorpay_signature?: string;
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
   * Calls backend /api/razorpay/create-order to generate an official Razorpay Order
   */
  public static async createOrderOnServer(
    amount: number, // in paise
    currency: string = 'INR',
    receipt?: string
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const res = await authedFetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, receipt }),
      });
      const data = await res.json();
      if (res.ok && data.order?.id) {
        return { success: true, orderId: data.order.id };
      }
      return { success: false, error: data?.error || 'Order creation failed' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error creating order' };
    }
  }

  /**
   * Verifies the HMAC-SHA256 signature via backend /api/razorpay/verify-payment
   */
  public static async verifyPaymentOnServer(
    response: RazorpaySuccessResponse
  ): Promise<{ verified: boolean; error?: string }> {
    try {
      const res = await authedFetch('/api/razorpay/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
      });
      const data = await res.json();
      return { verified: Boolean(data?.verified) };
    } catch (err: any) {
      return { verified: false, error: err?.message };
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

