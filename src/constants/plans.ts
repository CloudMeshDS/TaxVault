import type { SubscriptionTier } from '../types';

/**
 * The single list of TaxVault plans, prices and scan limits. The server charges and enforces
 * from this file and the app displays it, so the two cannot drift apart.
 * Every plan is priced and charged in US dollars, whatever the user's country.
 * Annual = 10x monthly (two months free).
 */
export type PaidTier = Exclude<SubscriptionTier, 'free'>;

export type PlanCurrency = 'USD';
export const PLAN_CURRENCY: PlanCurrency = 'USD';

export interface PlanPrice {
  currency: PlanCurrency;
  monthly: number;
  annual: number;
}

export interface PlanInfo {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  /** AI receipt scans allowed in any rolling 24 hours (paid plans). */
  dailyScans: number | null;
  /** AI receipt scans allowed per calendar month (free plan). */
  monthlyScans: number | null;
  priceUSD: { monthly: number; annual: number };
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
    priceUSD: { monthly: 0, annual: 0 },
    features: [`${FREE_MONTHLY_SCANS} AI receipt scans per month`, 'Unlimited manual entries', 'CSV export'],
  },
  pro: {
    id: 'pro',
    name: 'Tax Compliance Pro',
    tagline: 'For freelancers and sole traders',
    dailyScans: 10,
    monthlyScans: null,
    priceUSD: { monthly: 5.99, annual: 59.9 },
    badge: 'Most popular',
    features: ['10 AI receipt scans per day', ...PAID_FEATURES],
  },
  business: {
    id: 'business',
    name: 'Business',
    tagline: 'For busy small businesses',
    dailyScans: 20,
    monthlyScans: null,
    priceUSD: { monthly: 8.99, annual: 89.9 },
    features: ['20 AI receipt scans per day', ...PAID_FEATURES],
  },
  enterprise: {
    id: 'enterprise',
    name: 'CA Firm & Multi-Entity',
    tagline: 'For accountants and high-volume teams',
    dailyScans: 100,
    monthlyScans: null,
    priceUSD: { monthly: 19.99, annual: 199.9 },
    features: ['100 AI receipt scans per day', ...PAID_FEATURES],
  },
};

export const PAID_TIERS: PaidTier[] = ['pro', 'business', 'enterprise'];

export function isPaidTier(tier: unknown): tier is PaidTier {
  return PAID_TIERS.includes(tier as PaidTier);
}

/** The plan's price. The same for every user: country does not change it. */
export function planPrice(tier: SubscriptionTier): PlanPrice {
  return { currency: PLAN_CURRENCY, ...(PLANS[tier]?.priceUSD ?? { monthly: 0, annual: 0 }) };
}

/** The plan's price in a given currency, or null if plans are not sold in it (only USD is). */
export function planPriceInCurrency(tier: SubscriptionTier, currency: string): PlanPrice | null {
  return currency.toUpperCase() === PLAN_CURRENCY ? planPrice(tier) : null;
}

/** Smallest currency unit for Razorpay (cents). */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/** "US$5.99": marked as US dollars so users in countries that also use "$" are not misled. */
export function formatPlanPrice(amount: number, _currency: PlanCurrency = PLAN_CURRENCY): string {
  return `US$${amount.toFixed(2)}`;
}
