import { SubscriptionTier, UserProfile } from '../types';
import { FREE_MONTHLY_SCANS, PLANS, PlanInfo, isPaidTier } from '../constants/plans';

export type SubscriptionPlan = PlanInfo;

/** Plans as shown in the app. Prices and limits live in src/constants/plans.ts (shared with the server). */
export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = PLANS;

export interface ScanUsage {
  used: number;
  limit: number;
  remaining: number;
  /** 'month' for the free plan, 'day' (rolling 24 hours) for paid plans */
  period: 'month' | 'day';
}

/** Receipt limit stored on the profile for a tier (paid plans are limited per day, not per month). */
export function monthlyReceiptLimitFor(tier: SubscriptionTier): number {
  return isPaidTier(tier) ? 999999 : FREE_MONTHLY_SCANS;
}

export class SubscriptionService {
  public static currentUsagePeriod(now: Date = new Date()): string {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Returns the profile with its scan counter rolled over to the current month.
   * Profiles saved before usagePeriod existed are treated as stale and reset.
   */
  public static withCurrentUsagePeriod(profile: UserProfile): UserProfile {
    const sub = profile?.subscription;
    if (!sub) return profile;
    const period = SubscriptionService.currentUsagePeriod();
    if (sub.usagePeriod === period) return profile;
    return {
      ...profile,
      subscription: { ...sub, receiptsScannedThisMonth: 0, usagePeriod: period },
    };
  }

  public static getScanUsage(profile: UserProfile): ScanUsage {
    const sub = profile?.subscription;
    if (sub && isPaidTier(sub.tier)) {
      const limit = sub.dailyScanLimit || PLANS[sub.tier].dailyScans || 0;
      const used = sub.scansLast24h || 0;
      return { used, limit, remaining: Math.max(0, limit - used), period: 'day' };
    }
    const limit = sub?.monthlyReceiptLimit || FREE_MONTHLY_SCANS;
    const used = sub?.usagePeriod === SubscriptionService.currentUsagePeriod() ? sub.receiptsScannedThisMonth || 0 : 0;
    return { used, limit, remaining: Math.max(0, limit - used), period: 'month' };
  }

  public static canScanReceipt(profile: UserProfile): { allowed: boolean; remaining: number; limit: number } {
    const usage = SubscriptionService.getScanUsage(profile);
    return {
      // Paid daily limits roll over continuously, so the server decides; the app's copy may be stale.
      allowed: usage.period === 'day' || usage.remaining > 0,
      remaining: usage.remaining,
      limit: usage.limit,
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
