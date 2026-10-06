import React from 'react';
import { ShieldCheck, Wifi, WifiOff, RefreshCw, Smartphone } from 'lucide-react';
import { CountryTaxConfig, UserProfile } from '../../types';
import { NavigationTab } from './BottomNav';

interface HeaderProps {
  profile: UserProfile;
  taxConfig: CountryTaxConfig;
  isOnline: boolean;
  onToggleOnline: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenBackup: () => void;
  onOpenSubscription: () => void;
  onOpenAndroidInstall?: () => void;
  isSyncing: boolean;
  activeTab?: NavigationTab;
  onSelectTab?: (tab: NavigationTab) => void;
  pendingCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  taxConfig,
  isOnline,
  onToggleOnline,
  onOpenSettings,
  onOpenAuth,
  onOpenBackup,
  onOpenSubscription,
  onOpenAndroidInstall,
  isSyncing,
  activeTab,
  onSelectTab,
  pendingCount,
}) => {
  const isPro = profile.subscription?.tier === 'pro' || profile.subscription?.tier === 'enterprise';

  return (
    <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 text-white">
      <div className="w-full max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand & Country Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-sm">
            TV
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold text-sm tracking-tight text-neutral-100">TaxVault</span>
              <button
                onClick={onOpenSettings}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                title="Change Country or Tax Jurisdiction"
              >
                <span>{taxConfig.flag}</span>
                <span>{taxConfig.countryCode}</span>
              </button>
            </div>
            <div className="text-[10px] text-neutral-400 font-medium flex items-center gap-1 mt-0.5">
              <span>{taxConfig.taxAuthority.split('(')[0].trim()}</span>
              <span>·</span>
              <span>{taxConfig.currencyCode}</span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs (Hidden on mobile) */}
        {onSelectTab && (
          <nav className="hidden md:flex items-center gap-1 bg-neutral-950/80 border border-neutral-800/80 p-1 rounded-xl">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-neutral-800 text-emerald-400 font-semibold shadow-xs border border-neutral-700/60'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onSelectTab('expenses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'expenses'
                  ? 'bg-neutral-800 text-emerald-400 font-semibold shadow-xs border border-neutral-700/60'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>Receipts</span>
              {pendingCount && pendingCount > 0 ? (
                <span className="bg-amber-500 text-neutral-950 font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                  {pendingCount}
                </span>
              ) : null}
            </button>
            <button
              onClick={() => onSelectTab('accountant')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'accountant'
                  ? 'bg-neutral-800 text-emerald-400 font-semibold shadow-xs border border-neutral-700/60'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              CA Filing
            </button>
            <button
              onClick={() => onSelectTab('currency')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'currency'
                  ? 'bg-neutral-800 text-emerald-400 font-semibold shadow-xs border border-neutral-700/60'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              FX Rates
            </button>
            <button
              onClick={() => onSelectTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-neutral-800 text-emerald-400 font-semibold shadow-xs border border-neutral-700/60'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Settings & Supabase
            </button>
          </nav>
        )}

        {/* Connectivity, Subscription & Security Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Install Android APK Button */}
          {onOpenAndroidInstall && (
            <button
              onClick={onOpenAndroidInstall}
              className="text-neutral-300 hover:text-emerald-400 px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              title="Download or Install TaxVault Android APK"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-medium hidden sm:inline">Download APK</span>
            </button>
          )}

          {/* Subscription Plan Badge */}
          <button
            onClick={onOpenSubscription}
            className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              isPro
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
            }`}
            title={isPro ? 'Pro Subscription Active' : 'Starter Free Tier (10 receipts/mo limit). Tap to upgrade.'}
          >
            <span>{isPro ? 'PRO' : 'FREE'}</span>
            {!isPro && <span className="text-[9px] underline">UPGRADE</span>}
          </button>

          {/* Offline / Online Accessibility Toggle */}
          <button
            onClick={onToggleOnline}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors ${
              isOnline
                ? 'text-emerald-400 hover:bg-neutral-800'
                : 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
            }`}
            title={isOnline ? 'Online - Cloud Sync Active' : 'Offline Mode - Stored Locally'}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
            <span className="font-mono text-[10px] hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </button>

          {/* Cloud Backup Status */}
          <button
            onClick={onOpenBackup}
            className="text-neutral-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Cloud Backup & Security Status"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* Profile / Account / Supabase Auth */}
          <button
            onClick={onOpenAuth}
            className="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
            title={`Signed in as ${profile.fullName || profile.email || 'User'}. Tap to switch account.`}
          >
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover border border-neutral-700" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 hover:border-emerald-500 flex items-center justify-center text-xs font-semibold text-neutral-200">
                {(profile.fullName || profile.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            {profile.authProvider && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-neutral-900" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
