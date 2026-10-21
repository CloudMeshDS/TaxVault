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

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900 select-none shadow-xs pt-[env(safe-area-inset-top)]">
      <div className="w-full max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Brand & Country Flag */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/40 shrink-0">
            {currencySymbol}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold text-base tracking-tight text-slate-900">TaxVault</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1 whitespace-nowrap">
                <span>{flag}</span>
                <span>{profile.financialYear || 'FY 26-27'}</span>
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 min-w-0">
              <span className="truncate">{profile.businessName || 'Personal & Business'}</span>
              <span className="shrink-0">·</span>
              <span className="text-emerald-600 font-mono font-semibold shrink-0">{currencyCode}</span>
            </div>
          </div>
        </div>

        {/* Action Controls: Subscription / Plan Badge & Account Status Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer font-bold text-xs relative"
              title={profile.email ? `Signed in as ${profile.email}` : 'Sign In'}
              aria-label={profile.email ? `Account: ${profile.email}` : 'Sign In'}
            >
              {profile.email ? (
                <>
                  <span>{initials}</span>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </>
              ) : (
                <User className="w-4 h-4 text-slate-500" />
              )}
            </button>
          )}

          {onOpenSubscription && (
            <button
              onClick={onOpenSubscription}
              className={`h-9 flex items-center gap-1.5 text-xs px-2.5 rounded-xl border transition-all cursor-pointer font-semibold ${
                profile.subscription?.tier === 'pro'
                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  : profile.subscription?.tier === 'enterprise'
                  ? 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100'
                  : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
              }`}
              title="Subscription & Upgrade Options"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-bold">
                {profile.subscription?.tier === 'pro'
                  ? 'Pro'
                  : profile.subscription?.tier === 'enterprise'
                  ? 'Enterprise'
                  : 'Upgrade'}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
