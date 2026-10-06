import { SubscriptionTier, UserProfile } from '../types';

export interface PlanFeature {
  name: string;
  includedInFree: boolean;
  includedInPro: boolean;
  includedInEnterprise: boolean;
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  monthlyReceiptLimit: number;
  badge?: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Starter',
    tagline: 'Basic personal receipt tracking for individuals',
    priceMonthly: 0,
    priceAnnual: 0,
    monthlyReceiptLimit: 10,
    features: [
      'Up to 10 receipts/month',
      'Basic OCR categorization',
      'Standard CSV export',
      'Single base currency tracking',
      'Local on-device storage',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Tax Compliance Pro',
    tagline: 'Full tax season automation for contractors & small business',
    priceMonthly: 14.99,
    priceAnnual: 149.00, // ~17% off
    monthlyReceiptLimit: Infinity,
    badge: 'MOST POPULAR',
    features: [
      'Unlimited receipts & neural OCR',
      'Official Chartered Accountant Audit PDF',
      'Multi-sheet Excel (.xlsx) tax audit pack',
      'Real-time multi-currency conversion',
      'Direct CA Reviewer Link & 6-digit PIN sharing',
      'AES-256 encrypted cloud backup vault',
      'New Zealand IRD & Global compliance rules',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'CA Firm & Multi-Entity',
    tagline: 'For accountants, advisors & multiple businesses',
    priceMonthly: 39.99,
    priceAnnual: 399.00,
    monthlyReceiptLimit: Infinity,
    badge: 'FOR FIRMS',
    features: [
      'Everything in Pro',
      'Multiple business entities & IRD numbers',
      'Direct Xero & MYOB API synchronization',
      'Dedicated Chartered Accountant reviewer channel',
      'Priority OCR queue & audit log export',
    ],
  },
};

export const COMPARISON_FEATURES: PlanFeature[] = [
  { name: 'Monthly Receipt Scans', includedInFree: false, includedInPro: true, includedInEnterprise: true }, // Free limited to 10
  { name: 'Official CA Audit PDF with Sign-Off', includedInFree: false, includedInPro: true, includedInEnterprise: true },
  { name: 'Multi-Sheet Excel (.xlsx) Tax Pack', includedInFree: false, includedInPro: true, includedInEnterprise: true },
  { name: 'Direct CA Reviewer Token & Link Share', includedInFree: false, includedInPro: true, includedInEnterprise: true },
  { name: 'Live Multi-Currency Conversion Engine', includedInFree: false, includedInPro: true, includedInEnterprise: true },
  { name: 'AES-256 Cloud Backup Vault', includedInFree: false, includedInPro: true, includedInEnterprise: true },
  { name: 'Direct Xero / MYOB API Sync', includedInFree: false, includedInPro: false, includedInEnterprise: true },
];

export class SubscriptionService {
  public static canScanReceipt(profile: UserProfile): { allowed: boolean; remaining: number; limit: number } {
    const sub = profile.subscription;
    if (sub.tier === 'pro' || sub.tier === 'enterprise') {
      return { allowed: true, remaining: Infinity, limit: Infinity };
    }
    const limit = sub.monthlyReceiptLimit || 10;
    const used = sub.receiptsScannedThisMonth || 0;
    const remaining = Math.max(0, limit - used);
    return {
      allowed: remaining > 0,
      remaining,
      limit,
    };
  }

  public static canExportAccountantPDF(profile: UserProfile): boolean {
    return profile.subscription.tier !== 'free';
  }

  public static canExportAccountantExcel(profile: UserProfile): boolean {
    return profile.subscription.tier !== 'free';
  }

  public static canShareWithAccountant(profile: UserProfile): boolean {
    return profile.subscription.tier !== 'free';
  }

  public static canUseCurrencyConverter(profile: UserProfile): boolean {
    return profile.subscription.tier !== 'free';
  }
}
