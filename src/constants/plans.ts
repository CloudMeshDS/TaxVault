import type { SubscriptionTier } from '../types';

/**
 * The single list of TaxVault plans, prices and scan limits. The server charges and enforces
 * from this file and the app displays it, so the two cannot drift apart.
 * Prices are in Indian rupees (Razorpay charges INR). Annual = 10x monthly (two months free).
 */
export type PaidTier = Exclude<SubscriptionTier, 'free'>;

export interface PlanInfo {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  /** AI receipt scans allowed in any rolling 24 hours (paid plans). */
  dailyScans: number | null;
  /** AI receipt scans allowed per calendar month (free plan). */
  monthlyScans: number | null;
  priceINR: { monthly: number; annual: number };
  badge?: string;
  features: string[];
}

export const FREE_MONTHLY_SCANS = 10;

const PAID_FEATURES = [
  'CA audit PDF, with receipt photos',
  'Multi-sheet Excel tax workbook',
  'Accountant share link & audit ZIP pack',
  'Cloud backup & sync across devices',
];

export const PLANS: Record<SubscriptionTier, PlanInfo> = {
  free: {
    id: 'free',
    name: 'Starter',
    tagline: 'Try TaxVault for personal expenses',
    dailyScans: null,
    monthlyScans: FREE_MONTHLY_SCANS,
    priceINR: { monthly: 0, annual: 0 },
    features: [`${FREE_MONTHLY_SCANS} AI receipt scans per month`, 'Unlimited manual entries', 'CSV export'],
  },
  pro: {
    id: 'pro',
    name: 'Tax Compliance Pro',
    tagline: 'For freelancers and sole traders',
    dailyScans: 10,
    monthlyScans: null,
    priceINR: { monthly: 465, annual: 4650 },
    badge: 'Most popular',
    features: ['10 AI receipt scans per day', ...PAID_FEATURES],
  },
  business: {
    id: 'business',
    name: 'Business',
    tagline: 'For busy small businesses',
    dailyScans: 20,
    monthlyScans: null,
    priceINR: { monthly: 699, annual: 6990 },
    features: ['20 AI receipt scans per day', ...PAID_FEATURES],
  },
  enterprise: {
    id: 'enterprise',
    name: 'CA Firm & Multi-Entity',
    tagline: 'For accountants and high-volume teams',
    dailyScans: 100,
    monthlyScans: null,
    priceINR: { monthly: 1499, annual: 14990 },
    features: ['100 AI receipt scans per day', ...PAID_FEATURES],
  },
};

export const PAID_TIERS: PaidTier[] = ['pro', 'business', 'enterprise'];

export function isPaidTier(tier: unknown): tier is PaidTier {
  return PAID_TIERS.includes(tier as PaidTier);
}

export function planPriceINR(tier: SubscriptionTier, billingCycle: 'monthly' | 'annual'): number {
  return PLANS[tier]?.priceINR[billingCycle] ?? 0;
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
