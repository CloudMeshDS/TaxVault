import React from 'react';
import { Sparkles, User } from 'lucide-react';
import { UserProfile } from '../../types';
import { TAX_CONFIGS } from '../../services/taxRules';
import { NavigationTab } from './BottomNav';

interface HeaderProps {
  profile: UserProfile;
  activeTab?: NavigationTab;
  onSelectTab?: (tab: NavigationTab) => void;
  reviewCount?: number;
  onOpenSubscription?: () => void;
  onOpenAuth?: () => void;
  isOnline?: boolean;
  isSyncing?: boolean;
  isMobileFrame?: boolean;
  onToggleMobileFrame?: () => void;
  onOpenScanner?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  onOpenSubscription,
  onOpenAuth,
}) => {
  const taxConfig = TAX_CONFIGS[profile.country] || TAX_CONFIGS['NZ'];
  const flag = taxConfig.flag;
  const currencyCode = profile.defaultCurrency || taxConfig.currencyCode;
  const currencySymbol = profile.currencySymbol || taxConfig.currencySymbol;
  const initials =
    (profile.fullName || profile.email || '?')
      .split(/[\s@._]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const isFreePlan = !profile.subscription?.tier || profile.subscription.tier === 'free';
  const displayName = profile.businessName || profile.fullName || 'Personal & Business';

  return (
    <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md text-slate-900 select-none pt-[env(safe-area-inset-top)]">
      <div className="w-full max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onOpenAuth ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-11 h-11 rounded-full bg-emerald-700 text-slate-50 flex items-center justify-center font-semibold text-sm shrink-0 cursor-pointer hover:bg-emerald-800 transition-colors"
              title={profile.email ? `Signed in as ${profile.email}` : 'Sign in'}
              aria-label={profile.email ? `Account: ${profile.email}` : 'Sign in'}
            >
              {profile.email ? initials : <User className="w-5 h-5" />}
            </button>
          ) : (
            <div className="w-11 h-11 rounded-full bg-emerald-700 text-slate-50 flex items-center justify-center font-semibold text-sm shrink-0" aria-hidden="true">
              {currencySymbol}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[0.9375rem] font-semibold leading-tight truncate">{displayName}</div>
            <div className="text-xs text-slate-500 truncate">
              <span aria-hidden="true">{flag}</span> {currencyCode} · {profile.financialYear || 'FY 2026-27'}
            </div>
          </div>
        </div>

        {onOpenSubscription && (
          <button
            type="button"
            onClick={onOpenSubscription}
            className={`h-11 px-4 rounded-full text-sm font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
              isFreePlan
                ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Subscription & Upgrade Options"
          >
            {isFreePlan && <Sparkles className="w-4 h-4" />}
            <span>
              {profile.subscription?.tier === 'pro'
                ? 'Pro'
                : profile.subscription?.tier === 'enterprise'
                ? 'Enterprise'
                : 'Upgrade'}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
