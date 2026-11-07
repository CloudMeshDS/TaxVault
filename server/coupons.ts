/**
 * Coupon codes (table public.coupons, uses in public.coupon_redemptions).
 *
 * The server alone decides what a code is worth: the app sends only the code, the server prices
 * the Razorpay order or subscription with it and writes the discounted amount into the order's
 * notes, which only the server can set. Verification then checks the payment against that amount.
 */
import type express from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PaidTier, isPaidTier, planPrice, toMinorUnits } from '../src/constants/plans';

/** Razorpay will not take a tiny charge, and a card mandate needs a real first payment. */
export const MIN_CHARGE_USD = 1;

export interface CouponRow {
  code: string;
  description?: string | null;
  percent_off?: number | string | null;
  amount_off_usd?: number | string | null;
  tiers?: string[] | null;
  billing_cycles?: string[] | null;
  starts_at?: string | null;
  expires_at?: string | null;
  max_redemptions?: number | null;
  per_user_limit?: number | null;
  active?: boolean | null;
}

export interface CouponQuote {
  code: string;
  description: string;
  /** Plan price before the coupon, in US dollars */
  originalAmount: number;
  /** What the buyer pays per charge, in US dollars */
  finalAmount: number;
  discount: number;
  currency: 'USD';
}

export function normalizeCouponCode(raw: unknown) {
  const code = String(raw ?? '').trim().toUpperCase();
  return /^[A-Z0-9_-]{3,32}$/.test(code) ? code : null;
}

/** Price after the coupon, in cents, never below the minimum charge. */
export function discountedMinor(baseUsd: number, coupon: Pick<CouponRow, 'percent_off' | 'amount_off_usd'>) {
  const base = toMinorUnits(baseUsd);
  let off = 0;
  if (Number(coupon.percent_off) > 0) off = Math.round((base * Number(coupon.percent_off)) / 100);
  else if (Number(coupon.amount_off_usd) > 0) off = toMinorUnits(Number(coupon.amount_off_usd));
  return Math.max(toMinorUnits(MIN_CHARGE_USD), Math.min(base, base - off));
}

/** Why a coupon cannot be used for this plan and period, or null when it can (usage limits aside). */
export function couponRuleError(coupon: CouponRow, tier: PaidTier, billingCycle: 'monthly' | 'annual', now = Date.now()) {
  if (!coupon.active) return 'This coupon is no longer active.';
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) return 'This coupon is not active yet.';
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() <= now) return 'This coupon has expired.';
  if (coupon.tiers?.length && !coupon.tiers.includes(tier)) return 'This coupon does not apply to this plan.';
  if (coupon.billing_cycles?.length && !coupon.billing_cycles.includes(billingCycle)) {
    return `This coupon is for ${coupon.billing_cycles.includes('annual') ? 'annual' : 'monthly'} billing only.`;
  }
  return null;
}

function describe(coupon: CouponRow) {
  if (coupon.description) return coupon.description;
  if (Number(coupon.percent_off) > 0) return `${Number(coupon.percent_off)}% off`;
  return `US$${Number(coupon.amount_off_usd).toFixed(2)} off`;
}

export class CouponError extends Error {}

export function createCouponService(admin: SupabaseClient) {
  /** Checks a code for this user, plan and period and prices it. Throws CouponError with a message for the user. */
  const quote = async (rawCode: unknown, userId: string, tier: PaidTier, billingCycle: 'monthly' | 'annual'): Promise<CouponQuote> => {
    const code = normalizeCouponCode(rawCode);
    if (!code) throw new CouponError('Enter a valid coupon code.');
    const { data: coupon, error } = await admin.from('coupons').select('*').eq('code', code).maybeSingle();
    if (error) throw new Error(error.message);
    if (!coupon) throw new CouponError('This coupon code is not valid.');
    const ruleError = couponRuleError(coupon as CouponRow, tier, billingCycle);
    if (ruleError) throw new CouponError(ruleError);

    if (coupon.max_redemptions) {
      const { count } = await admin.from('coupon_redemptions').select('id', { count: 'exact', head: true }).eq('code', code);
      if ((count ?? 0) >= coupon.max_redemptions) throw new CouponError('This coupon has been fully used.');
    }
    const { count: mine } = await admin.from('coupon_redemptions').select('id', { count: 'exact', head: true })
      .eq('code', code).eq('user_id', userId);
    if ((mine ?? 0) >= (coupon.per_user_limit || 1)) throw new CouponError('You have already used this coupon.');

    const original = planPrice(tier)[billingCycle];
    const finalMinor = discountedMinor(original, coupon as CouponRow);
    if (finalMinor >= toMinorUnits(original)) throw new CouponError('This coupon gives no discount on this plan.');
    return {
      code,
      description: describe(coupon as CouponRow),
      originalAmount: original,
      finalAmount: finalMinor / 100,
      discount: (toMinorUnits(original) - finalMinor) / 100,
      currency: 'USD',
    };
  };

  /** Records a use once the payment is verified. A payment id is only ever counted once. */
  const redeem = async (q: { code: string; userId: string; tier: PaidTier; billingCycle: 'monthly' | 'annual'; discountUsd: number; paymentId: string }) => {
    const { error } = await admin.from('coupon_redemptions').upsert({
      code: q.code,
      user_id: q.userId,
      tier: q.tier,
      billing_cycle: q.billingCycle,
      discount_usd: q.discountUsd,
      payment_id: q.paymentId,
    }, { onConflict: 'payment_id', ignoreDuplicates: true });
    if (error) console.warn('Coupon redemption not recorded:', error.message);
  };

  return { quote, redeem };
}

/** Amount (cents) a Razorpay order or subscription was priced at, from the notes the server set. */
export function expectedMinorFromNotes(notes: any, fullPriceUsd: number) {
  const full = toMinorUnits(fullPriceUsd);
  if (!notes?.coupon_code) return full;
  const n = Number(notes.amount_minor);
  // Never accept less than the minimum charge, whatever the notes say
  return Number.isFinite(n) && n >= toMinorUnits(MIN_CHARGE_USD) && n <= full ? n : full;
}

export function registerCouponRoutes(
  app: express.Express,
  deps: { requireUser: express.RequestHandler; rateLimit: express.RequestHandler; coupons: ReturnType<typeof createCouponService> },
) {
  // Preview a coupon on the plan screen. The price shown here is the one the order will be created at.
  // Rate limited so codes cannot be guessed by trying many in a row.
  app.post('/api/coupons/validate', deps.rateLimit, deps.requireUser, async (req, res) => {
    const tier: PaidTier = isPaidTier(req.body?.tier) ? req.body.tier : 'pro';
    const billingCycle = req.body?.billingCycle === 'annual' ? 'annual' : 'monthly';
    try {
      const quote = await deps.coupons.quote(req.body?.code, req.user!.id, tier, billingCycle);
      return res.json({ valid: true, ...quote });
    } catch (err: any) {
      if (err instanceof CouponError) return res.status(400).json({ valid: false, error: err.message });
      return res.status(500).json({ valid: false, error: 'Could not check this coupon. Please try again.' });
    }
  });
}
