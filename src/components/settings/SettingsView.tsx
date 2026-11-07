import React, { useState } from 'react';
import {
  Shield,
  Building2,
  User,
  CreditCard,
  Lock,
  Download,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Globe,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Camera,
  Activity,
  Cpu,
  Zap,
  LogOut,
  Scale,
} from 'lucide-react';
import { BusinessEntityType, SupportedCountry, UserProfile } from '../../types';
import { storageService } from '../../services/storageService';
import { apiClient } from '../../services/apiClient';
import { SUBSCRIPTION_PLANS, SubscriptionService } from '../../services/subscriptionService';
import { fiscalYearBounds, fiscalYearOptions, fiscalYearRangeLabel, normalizeFiscalYear } from '../../services/fiscalYear';
import { GoogleIcon, AppleIcon } from '../auth/AuthModal';
import { getGeminiApiKey } from '../../services/receiptOcr';
import { GeminiApiKeyModal } from '../common/GeminiApiKeyModal';
import { CountryTermsModal } from '../legal/CountryTermsModal';
import { pressable } from '../../utils/a11y';
import { saveFile } from '../../utils/saveFile';
import { toUserMessage } from '../../services/userMessages';
import { RazorpayService } from '../../services/razorpayService';

// Feature flag: Hide Google & Apple buttons (keep implementation intact)
const SHOW_OAUTH_PROVIDERS = false;

export type SettingSectionId =
  | 'profile'
  | 'subscription'
  | 'jurisdiction'
  | 'security'
  | 'data';

interface CountryConfig {
  code: SupportedCountry;
  name: string;
  flag: string;
  currency: string;
  symbol: string;
  authority: string;
  taxIdLabel: string;
  taxIdPlaceholder: string;
  secondaryTaxIdLabel: string;
  secondaryTaxIdPlaceholder: string;
  entityTypes: BusinessEntityType[];
  fiscalYears: string[];
}

const COUNTRY_CONFIGS: Record<SupportedCountry, CountryConfig> = {
  NZ: {
    code: 'NZ',
    name: 'New Zealand',
    flag: '🇳🇿',
    currency: 'NZD',
    symbol: '$',
    authority: 'Inland Revenue Department (IRD 15% GST)',
    taxIdLabel: 'IRD Number',
    taxIdPlaceholder: '123-456-789',
    secondaryTaxIdLabel: 'GST Number',
    secondaryTaxIdPlaceholder: '123-456-789',
    entityTypes: ['Sole Trader', 'Company / Pty Ltd', 'Partnership', 'Trust', 'Individual'],
    fiscalYears: fiscalYearOptions('NZ', 3),
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    currency: 'AUD',
    symbol: '$',
    authority: 'Australian Taxation Office (ATO 10% GST)',
    taxIdLabel: 'ABN (Australian Business No.)',
    taxIdPlaceholder: '26 008 672 179',
    secondaryTaxIdLabel: 'TFN (Tax File Number)',
    secondaryTaxIdPlaceholder: '123 456 789',
    entityTypes: ['Sole Trader', 'Company / Pty Ltd', 'Partnership', 'Trust', 'Individual'],
    fiscalYears: fiscalYearOptions('AU', 3),
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    currency: 'CAD',
    symbol: '$',
    authority: 'Canada Revenue Agency (CRA GST/HST)',
    taxIdLabel: 'CRA Business Number (BN)',
    taxIdPlaceholder: '123456789 RT0001',
    secondaryTaxIdLabel: 'Provincial Tax ID / SIN',
    secondaryTaxIdPlaceholder: '123 456 789',
    entityTypes: ['Sole Trader', 'Corporation', 'Partnership', 'Contractor / Freelancer'],
    fiscalYears: fiscalYearOptions('CA', 3),
  },
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    symbol: '$',
    authority: 'Internal Revenue Service (IRS & Sales Tax)',
    taxIdLabel: 'EIN / Federal Tax ID',
    taxIdPlaceholder: '12-3456789',
    secondaryTaxIdLabel: 'State Tax ID / SSN',
    secondaryTaxIdPlaceholder: '987-65-4321',
    entityTypes: ['LLC', 'Sole Trader', 'Corporation', 'Partnership', 'Contractor / Freelancer'],
    fiscalYears: fiscalYearOptions('US', 3),
  },
  IN: {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currency: 'INR',
    symbol: '₹',
    authority: 'Goods & Services Tax Network (GSTN)',
    taxIdLabel: 'PAN Number',
    taxIdPlaceholder: 'ABCDE1234F',
    secondaryTaxIdLabel: 'GSTIN (GST Number)',
    secondaryTaxIdPlaceholder: '27AABCU9603R1ZM',
    entityTypes: ['Proprietorship', 'Private Limited', 'LLP', 'Partnership', 'Freelancer / Individual'],
    fiscalYears: fiscalYearOptions('IN', 3),
  },
};

interface SettingsViewProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onResetData: () => void;
  onClearData: () => void;
  onSignOut?: () => void;
  onDeleteAccount?: () => Promise<{ success: boolean; error?: string }>;
  onOpenSubscription?: () => void;
  onOpenAuth?: () => void;
  onOpenPermissions?: () => void;
  activeSection?: SettingSectionId | null;
  onSelectSection?: (section: SettingSectionId | null) => void;
  onOpenActivityLogs?: (tab?: 'activity' | 'usage') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onUpdateProfile,
  onResetData,
  onClearData,
  onSignOut,
  onDeleteAccount,
  onOpenSubscription,
  onOpenAuth,
  onOpenPermissions,
  activeSection: propActiveSection,
  onSelectSection,
  onOpenActivityLogs,
}) => {
  // Navigation State: null means Stage 1 (Settings List), string means Stage 2 (Detail View)
  const [internalSection, setInternalSection] = useState<SettingSectionId | null>(null);
  const activeSection = propActiveSection !== undefined ? propActiveSection : internalSection;
  const setActiveSection = (s: SettingSectionId | null) => {
    setInternalSection(s);
    onSelectSection?.(s);
  };
  const scanUsage = SubscriptionService.getScanUsage(profile);
  const currentPlan = SUBSCRIPTION_PLANS[profile.subscription?.tier || 'free'] || SUBSCRIPTION_PLANS.free;
  const isPaidPlan = currentPlan.id !== 'free';
  const [isCancellingAutoRenew, setIsCancellingAutoRenew] = useState(false);
  const [autoRenewError, setAutoRenewError] = useState<string | null>(null);
  const formatPlanDate = (value?: string) =>
    value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const handleCancelAutoRenew = async () => {
    setIsCancellingAutoRenew(true);
    setAutoRenewError(null);
    const result = await RazorpayService.cancelAutoRenew();
    setIsCancellingAutoRenew(false);
    if (!result.success) {
      setAutoRenewError(result.error ? toUserMessage(result.error) : 'Could not cancel auto-pay. Please try again.');
      return;
    }
    onUpdateProfile({ ...profile, subscription: { ...profile.subscription, ...(result.subscription || {}), autoRenew: false } });
  };
  const scanUsageLabel = scanUsage.period === 'day'
    ? `${scanUsage.limit} AI scans per day`
    : `${scanUsage.used} / ${scanUsage.limit} scans used this month`;

  // Form Fields State
  const [country, setCountry] = useState<SupportedCountry>(profile.country || 'NZ');
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone || '');
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [businessType, setBusinessType] = useState<BusinessEntityType>(profile.businessType || 'Sole Trader');
  const [taxId, setTaxId] = useState(profile.taxId || profile.pan || '');
  const [secondaryTaxId, setSecondaryTaxId] = useState(profile.secondaryTaxId || profile.gstin || '');
  // Stored without the date-range suffix older versions saved ("FY 2026-27 (1 Apr - 31 Mar)")
  const [financialYear, setFinancialYear] = useState(
    profile.financialYear
      ? normalizeFiscalYear(profile.financialYear, profile.country || 'NZ')
      : COUNTRY_CONFIGS[profile.country || 'NZ'].fiscalYears[0]
  );
  const [biometricLock, setBiometricLock] = useState(profile.biometricLock);
  // No default PIN: the user must choose one before the lock can be turned on
  // Reuse the stored PIN only while the lock is on; older profiles carry a placeholder '1234'
  // that was never chosen by the user.
  const [appPin, setAppPin] = useState(
    profile.biometricLock && /^\d{4}$/.test(profile.appPin || '') ? profile.appPin! : ''
  );
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(Boolean(getGeminiApiKey()));

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSeedingCountry, setIsSeedingCountry] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (!onDeleteAccount || deleteConfirmText !== 'DELETE') return;
    setIsDeletingAccount(true);
    setDeleteAccountError(null);
    const result = await onDeleteAccount();
    setIsDeletingAccount(false);
    if (!result.success) setDeleteAccountError(toUserMessage(result.error, 'Could not delete your account. Please try again.'));
  };

  const handleCountryChange = (c: SupportedCountry) => {
    setCountry(c);
    const cfg = COUNTRY_CONFIGS[c];
    setFinancialYear(cfg.fiscalYears[0]);
    if (!cfg.entityTypes.includes(businessType)) {
      setBusinessType(cfg.entityTypes[0]);
    }
    // Tax IDs belong to one country: restore the saved ones when switching back, otherwise
    // start blank. (Never fill in the sample profiles' placeholder numbers.)
    const isSavedCountry = c === profile.country;
    setTaxId(isSavedCountry ? profile.taxId || profile.pan || '' : '');
    setSecondaryTaxId(isSavedCountry ? profile.secondaryTaxId || profile.gstin || '' : '');
  };

  const handleSeedForCountry = async (c: SupportedCountry) => {
    setIsSeedingCountry(true);
    try {
      const res = await apiClient.seedCountryData(c);
      if (res.profile) {
        // Sample data adds example expenses only. Keep the user's own name, business, contact
        // details and tax IDs; switch just the country-specific settings.
        const cfg = COUNTRY_CONFIGS[c];
        const sameCountry = c === profile.country;
        const updated: UserProfile = {
          ...profile,
          country: c,
          defaultCurrency: cfg.currency,
          currencySymbol: cfg.symbol,
          taxAuthority: cfg.authority,
          financialYear: sameCountry ? profile.financialYear : cfg.fiscalYears[0],
          taxId: sameCountry ? profile.taxId : '',
          secondaryTaxId: sameCountry ? profile.secondaryTaxId : '',
          pan: c === 'IN' && sameCountry ? profile.pan : '',
          gstin: c === 'IN' && sameCountry ? profile.gstin : '',
        };
        onUpdateProfile(updated);
        setCountry(c);
        setTaxId(updated.taxId || '');
        setSecondaryTaxId(updated.secondaryTaxId || '');
        setFinancialYear(updated.financialYear || cfg.fiscalYears[0]);
      }
      setFeedback(`Loaded realistic sample vouchers for ${COUNTRY_CONFIGS[c].name}!`);
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setIsSeedingCountry(false);
    }
  };

  const handleSaveProfile = (sectionName?: string) => {
    if (biometricLock && !/^\d{4}$/.test(appPin)) {
      setFeedback('Choose a 4-digit PIN to turn on the app lock.');
      setTimeout(() => setFeedback(null), 3500);
      return;
    }
    const cfg = COUNTRY_CONFIGS[country];
    const updated: UserProfile = {
      ...profile,
      country,
      fullName,
      email: profile.email || email, // Registered email ID is immutable and cannot be changed
      phone,
      businessName,
      businessType,
      defaultCurrency: cfg.currency,
      currencySymbol: cfg.symbol,
      taxAuthority: cfg.authority,
      taxId: taxId.toUpperCase(),
      secondaryTaxId: secondaryTaxId.toUpperCase(),
      // PAN and GSTIN are Indian registrations only
      pan: country === 'IN' ? taxId.toUpperCase() : '',
      gstin: country === 'IN' ? secondaryTaxId.toUpperCase() : '',
      financialYear,
      financialYearEnding: fiscalYearBounds(financialYear, country).end,
      biometricLock,
      appPin,
    };
    onUpdateProfile(updated);
    storageService.saveUserProfile(updated);
    apiClient.updateProfile(updated);
    setFeedback(sectionName ? `${sectionName} saved successfully!` : 'Settings saved successfully!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleExportBackup = () => {
    const payload = storageService.generateBackupPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    saveFile(blob, `TaxVault_Backup_${new Date().toISOString().split('T')[0]}.json`).catch((err) => console.warn('Backup export failed:', err));
    setFeedback('Backup file exported!');
    setTimeout(() => setFeedback(null), 3000);
  };

  // ==========================================
  // STAGE 2: SECOND STAGE / DETAIL SETTINGS VIEW
  // ==========================================
  // Floating confirmation above the bottom navigation, so it shows wherever the page is scrolled
  // (Save buttons sit at the bottom of each section, below any in-page banner).
  const isWarning = Boolean(feedback && /^choose|could not|failed|error/i.test(feedback));
  const feedbackToast = feedback ? (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm rounded-xl px-3 py-2.5 text-xs font-bold flex items-center gap-2 shadow-lg border animate-in fade-in ${
        isWarning ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-emerald-50 border-emerald-500/60 text-emerald-800'
      }`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 6.5rem)' }}
    >
      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isWarning ? 'text-amber-600' : 'text-emerald-700'}`} />
      <span>{feedback}</span>
    </div>
  ) : null;

  if (activeSection !== null) {
    return (
      <div className="p-4 space-y-4 pb-28 max-w-xl mx-auto select-none animate-in fade-in slide-in-from-right-4 duration-200">
        {/* Navigation Bar: Back Button & Section Title */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-white bg-white shadow-xs hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-700" />
            <span>Settings</span>
          </button>

          <div className="text-right">
            <h2 className="text-sm font-bold text-white capitalize">
              {activeSection === 'profile' && 'Personal & Business Profile'}
              {activeSection === 'subscription' && 'Subscription & Plans'}
              {activeSection === 'jurisdiction' && 'Country & Tax Jurisdiction'}
              {activeSection === 'security' && 'Security & App Lock'}
              {activeSection === 'data' && 'Backup & Data Management'}
            </h2>
            <span className="text-xs text-slate-500">Preferences</span>
          </div>
        </div>

        {feedbackToast}

        {/* --- SECTION 1: PERSONAL & CONTACT PROFILE --- */}
        {activeSection === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-700" />
                <span>Personal & Business Information</span>
              </span>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-xs text-slate-500">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-slate-500 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span>Registered Email ID</span>
                      </label>
                      <span className="text-xs font-mono font-bold text-amber-700 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded">
                        LOCKED
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="email"
                        value={profile.email || 'user@taxvault.app'}
                        readOnly
                        disabled
                        tabIndex={-1}
                        className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 font-mono text-xs cursor-not-allowed select-none opacity-85"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Account email is permanent and locked for tax compliance.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-bold block mb-1">Mobile Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+64 21 555 0192"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500">Business / Firm Display Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. My Freelance Studio"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Account & Session Information */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-slate-500 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Account Information</span>
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {fullName ? `Signed in as ${fullName}` : 'Authenticated Account'}
                  </div>
                  <div className="text-xs text-slate-500 font-mono truncate">
                    {email || profile.email || 'user@taxvault.app'}
                  </div>
                </div>

                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-red-100 text-red-700 font-semibold text-xs border border-rose-200 cursor-pointer shrink-0 transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-700" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>

            {/* Stage 2 Save Button */}
            <button
              onClick={() => handleSaveProfile('Profile Information')}
              className="w-full bg-blue-500 hover:bg-blue-400 active:scale-[0.98] text-white font-black py-3.5 px-4 rounded-2xl text-xs transition-all cursor-pointer shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </button>
          </div>
        )}

        {/* --- SECTION 2: SUBSCRIPTION & PLAN LIMITS --- */}
        {activeSection === 'subscription' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-amber-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Active Plan Details</span>
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                    isPaidPlan ? 'bg-amber-50 border-amber-500/50 text-amber-700' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  {currentPlan.name}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 font-medium">AI receipt scans</span>
                  <span className="text-slate-900 font-bold">{scanUsageLabel}</span>
                </div>

                {scanUsage.period === 'month' && (
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-amber-500"
                      style={{ width: `${Math.min(100, (scanUsage.used / (scanUsage.limit || 1)) * 100)}%` }}
                    />
                  </div>
                )}

                <ul className="space-y-1.5 pt-1 text-xs text-slate-700">
                  {currentPlan.features.slice(1).map((feature) => (
                    <li key={feature} className="flex items-center gap-1.5">
                      <span className="text-emerald-700" aria-hidden="true">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {isPaidPlan && (profile.subscription?.renewsOn || profile.subscription?.nextChargeOn) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                  {profile.subscription?.autoRenew && profile.subscription?.nextChargeOn ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-medium">Next auto-payment</span>
                        <span className="text-slate-900 font-bold">{formatPlanDate(profile.subscription.nextChargeOn)}</span>
                      </div>
                      <p className="text-slate-500">You'll get a reminder 7 days before. Cancelling keeps your plan until the paid month ends.</p>
                      {autoRenewError && <p role="alert" className="text-rose-700">{autoRenewError}</p>}
                      <button
                        type="button"
                        onClick={handleCancelAutoRenew}
                        disabled={isCancellingAutoRenew}
                        className="w-full py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer disabled:opacity-60"
                      >
                        {isCancellingAutoRenew ? 'Cancelling…' : 'Cancel auto-pay'}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-medium">Plan active until</span>
                      <span className="text-slate-900 font-bold">{formatPlanDate(profile.subscription?.renewsOn)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Plan & Scan Quota Simulator (development builds only: it bypasses billing) */}
              {import.meta.env.DEV && (
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Plan & Scan Quota Status</span>
                  <span className="text-emerald-700 font-mono">
                    {scanUsageLabel}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProfile({
                        ...profile,
                        subscription: {
                          ...profile.subscription,
                          tier: 'free',
                          receiptsScannedThisMonth: 10,
                          monthlyReceiptLimit: 10,
                        },
                      });
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                      profile.subscription?.tier === 'free' && (profile.subscription?.receiptsScannedThisMonth || 0) >= 10
                        ? 'bg-rose-50 border-rose-500/80 text-rose-700 shadow-sm'
                        : 'bg-white shadow-xs border-slate-200 text-slate-500 hover:text-white'
                    }`}
                  >
                    10/10 Limit
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProfile({
                        ...profile,
                        subscription: {
                          ...profile.subscription,
                          tier: 'free',
                          receiptsScannedThisMonth: 3,
                          monthlyReceiptLimit: 10,
                        },
                      });
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                      profile.subscription?.tier === 'free' && (profile.subscription?.receiptsScannedThisMonth || 0) < 10
                        ? 'bg-emerald-50 border-emerald-500/80 text-emerald-700 shadow-sm'
                        : 'bg-white shadow-xs border-slate-200 text-slate-500 hover:text-white'
                    }`}
                  >
                    3/10 Used
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProfile({
                        ...profile,
                        subscription: {
                          ...profile.subscription,
                          tier: 'pro',
                          monthlyReceiptLimit: 999999,
                        },
                      });
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                      profile.subscription?.tier === 'pro'
                        ? 'bg-amber-50 border-amber-500/80 text-amber-700 shadow-sm'
                        : 'bg-white shadow-xs border-slate-200 text-slate-500 hover:text-white'
                    }`}
                  >
                    Pro Plan
                  </button>
                </div>
              </div>
              )}

              {onOpenSubscription && (
                <button
                  onClick={onOpenSubscription}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-slate-900 font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-all"
                >
                  <Sparkles className="w-4 h-4 fill-slate-50" />
                  <span>
                    {isPaidPlan
                      ? 'Change plan'
                      : 'See paid plans'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* --- SECTION 3: COUNTRY, TAX JURISDICTION & TAX IDS (fits one phone screen) --- */}
        {activeSection === 'jurisdiction' && (
          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3 shadow-sm text-xs">
              {/* Country picker */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">Country</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(Object.keys(COUNTRY_CONFIGS) as SupportedCountry[]).map((cCode) => {
                    const cfg = COUNTRY_CONFIGS[cCode];
                    const isSelected = country === cCode;
                    return (
                      <button
                        key={cCode}
                        type="button"
                        onClick={() => handleCountryChange(cCode)}
                        aria-pressed={isSelected}
                        aria-label={`${cfg.name} (${cfg.currency})`}
                        className={`py-1.5 rounded-xl text-center transition-all cursor-pointer border min-w-0 ${
                          isSelected
                            ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-white'
                        }`}
                      >
                        <div className="text-lg leading-none">{cfg.flag}</div>
                        <div className="text-xs font-black tracking-wide leading-none mt-1">{cfg.code}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Authority, currency and sample data */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">{COUNTRY_CONFIGS[country].authority}</div>
                  <div className="text-slate-500 truncate">
                    {COUNTRY_CONFIGS[country].name} · {COUNTRY_CONFIGS[country].currency} ({COUNTRY_CONFIGS[country].symbol})
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSeedingCountry}
                  onClick={() => handleSeedForCountry(country)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg px-2.5 py-1 text-xs font-bold shrink-0 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>{isSeedingCountry ? 'Loading...' : 'Sample data'}</span>
                </button>
              </div>

              {/* Entity type and financial year */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500">Business type</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessEntityType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {COUNTRY_CONFIGS[country].entityTypes.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 truncate block">Financial year ({fiscalYearRangeLabel(country)})</label>
                  <select
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-white font-mono"
                  >
                    {Array.from(new Set([...COUNTRY_CONFIGS[country].fiscalYears, financialYear])).map((fy) => (
                      <option key={fy} value={fy}>
                        {fy}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tax IDs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 truncate block">{COUNTRY_CONFIGS[country].taxIdLabel}</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                    placeholder={COUNTRY_CONFIGS[country].taxIdPlaceholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 truncate block">{COUNTRY_CONFIGS[country].secondaryTaxIdLabel}</label>
                  <input
                    type="text"
                    value={secondaryTaxId}
                    onChange={(e) => setSecondaryTaxId(e.target.value.toUpperCase())}
                    placeholder={COUNTRY_CONFIGS[country].secondaryTaxIdPlaceholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Country terms */}
              <div className="px-2.5 py-2 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Scale className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 block truncate">{COUNTRY_CONFIGS[country].name} terms</span>
                    <span className="text-emerald-700 block truncate">
                      {profile.termsAccepted
                        ? `✓ Accepted${profile.termsAcceptedDate ? ` on ${new Date(profile.termsAcceptedDate).toLocaleDateString()}` : ''}`
                        : 'Record keeping & legal notices'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-strong text-white text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm"
                >
                  View Terms
                </button>
              </div>
            </div>

            <button
              onClick={() => handleSaveProfile('Country & tax settings')}
              className="w-full bg-indigo-500 hover:bg-indigo-400 active:scale-[0.98] text-white font-black py-3 px-4 rounded-2xl text-xs transition-all cursor-pointer shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Country & Tax Settings</span>
            </button>
          </div>
        )}

        {/* --- SECTION 4: SECURITY & APP LOCK --- */}
        {activeSection === 'security' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-teal-700" />
                <span>Security & App Lock</span>
              </span>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">PIN Lock</div>
                    <div className="text-xs text-slate-500">
                      Require your 4-digit PIN to open TaxVault
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={biometricLock}
                    onChange={(e) => setBiometricLock(e.target.checked)}
                    className="w-5 h-5 accent-teal-500 cursor-pointer"
                  />
                </div>

                {biometricLock && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-700 font-bold">Choose your PIN</span>
                      <div className="text-xs text-slate-500">4 digits. Forgot it later? You can sign in again with your password.</div>
                    </div>
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      maxLength={4}
                      placeholder="••••"
                      aria-label="4-digit PIN"
                      value={appPin}
                      onChange={(e) => setAppPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-20 bg-white shadow-xs border border-slate-300 rounded-lg text-center font-mono text-base tracking-widest text-teal-700 focus:outline-none"
                    />
                  </div>
                )}

                <div className="text-xs text-slate-500 leading-relaxed bg-slate-50/60 p-2.5 rounded-xl border border-slate-200">
                  🔒 App Lock keeps others from opening TaxVault on this device.
                </div>
              </div>
            </div>

            {/* Device Permissions Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
              <span className="text-xs uppercase font-bold text-slate-500">
                Device Permissions
              </span>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Camera & Storage Access</div>
                    <div className="text-xs text-slate-500">Required for receipt scanner & tax file exports</div>
                  </div>
                </div>
                {onOpenPermissions && (
                  <button
                    onClick={onOpenPermissions}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 cursor-pointer transition-colors shrink-0"
                  >
                    Check / Grant
                  </button>
                )}
              </div>
            </div>

            {/* AI Receipt Scanner (Gemini 2.5 Flash Vision) Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
              <span className="text-xs uppercase font-bold text-slate-500">
                AI Vision Receipt Scanner
              </span>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-700 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Gemini 2.5 Flash Vision</span>
                      {hasGeminiKey ? (
                        <span className="text-xs px-1.5 py-0.2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 font-semibold">
                          Free Setup
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      Automated neural OCR reads vendor, date, line items & taxes
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGeminiModalOpen(true)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-50 border border-slate-200 text-emerald-700 cursor-pointer transition-colors shrink-0"
                >
                  {hasGeminiKey ? 'Manage Key' : 'Configure'}
                </button>
              </div>
            </div>

            {/* Stage 2 Save Button */}
            <button
              onClick={() => handleSaveProfile('Security Settings')}
              className="w-full bg-teal-500 hover:bg-teal-400 active:scale-[0.98] text-slate-900 font-black py-3.5 px-4 rounded-2xl text-xs transition-all cursor-pointer shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Save Security Settings</span>
            </button>
          </div>
        )}

        {/* --- SECTION 5: BACKUP & DATA MANAGEMENT --- */}
        {activeSection === 'data' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-500">
                Data Backup & Management
              </span>

              <div className="space-y-2.5 text-xs">
                <button
                  onClick={handleExportBackup}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold py-3 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>Export JSON Backup</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('Reset app data to sample vouchers?')) {
                      onResetData();
                      setFeedback('Loaded fresh sample vouchers!');
                      setTimeout(() => setFeedback(null), 3000);
                    }
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold py-3 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-teal-700" />
                  <span>Load Demo / Sample Receipts</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete all stored receipts and reset TaxVault? This action cannot be undone.')) {
                      onClearData();
                      setFeedback('All data cleared.');
                      setTimeout(() => setFeedback(null), 3000);
                    }
                  }}
                  className="w-full bg-rose-50 hover:bg-rose-50 border border-rose-200 text-rose-700 font-semibold py-3 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-rose-700" />
                  <span>Clear All Data</span>
                </button>
              </div>
            </div>

            {onDeleteAccount && (
              <div className="bg-white border border-rose-200 rounded-2xl p-4 space-y-3 shadow-sm">
                <span className="text-xs uppercase font-bold text-rose-700">
                  Delete Account
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Permanently deletes your TaxVault account, sign-in, receipts, expenses, mileage,
                  invoices and plan history. This cannot be undone. Export a backup first if you
                  need your records for your tax return.
                </p>
                <label htmlFor="delete-account-confirm" className="text-xs text-slate-700 block">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm
                </label>
                <input
                  id="delete-account-confirm"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.trim().toUpperCase())}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono"
                  placeholder="DELETE"
                />
                {deleteAccountError && (
                  <p role="alert" className="text-xs text-rose-700">{deleteAccountError}</p>
                )}
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || isDeletingAccount}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingAccount ? 'Deleting account…' : 'Permanently Delete My Account'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Gemini AI API Key Setup Modal */}
        <GeminiApiKeyModal
          isOpen={isGeminiModalOpen}
          onClose={() => setIsGeminiModalOpen(false)}
          onKeySaved={(newKey) => {
            setHasGeminiKey(Boolean(newKey));
            setFeedback(newKey ? 'Gemini AI Vision key activated!' : 'Gemini AI key cleared.');
            setTimeout(() => setFeedback(null), 3000);
          }}
        />

        {/* Countrywise Terms & Conditions Modal (opened from the jurisdiction section) */}
        <CountryTermsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          initialCountry={country}
        />
      </div>
    );
  }

  // ==========================================
  // STAGE 1: SETTINGS LIST VIEW (DEFAULT)
  // ==========================================
  return (
    <div className="px-4 pt-4 space-y-4 pb-28 max-w-xl mx-auto select-none animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500">
          Profile, country, plan and data
        </p>
      </div>

      {feedbackToast}

      {/* Single Unified Layout Settings Card */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-100">
        {/* 1. Account Profile Header Row */}
        <div
          {...pressable(() => setActiveSection('profile'))}
          className="p-4 sm:p-5 flex items-center justify-between gap-3.5 hover:bg-slate-50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center font-black text-emerald-700 text-lg shadow-xs shrink-0">
              {fullName ? fullName.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : 'U')}
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 truncate">
                <span className="truncate">{email || 'user@taxvault.app'}</span>
              </div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-600 font-medium">{businessName || fullName || 'TaxVault Business'}</span>
                <span>·</span>
                <span className="text-emerald-700 font-bold">
                  {currentPlan.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-500 group-hover:text-slate-700 transition-colors shrink-0">
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 2. Personal & Business Profile */}
        <button
          onClick={() => setActiveSection('profile')}
          className="w-full text-left p-4 hover:bg-slate-50 active:bg-slate-100/70 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700 shrink-0 group-hover:scale-105 transition-transform">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                Personal & Business Profile
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {fullName || 'Alex Morgan'} · {phone || email || '+64 21 555 0192'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
              Edit
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </button>

        {/* 3. Subscription & Plan Limits */}
        <button
          onClick={() => setActiveSection('subscription')}
          className="w-full text-left p-4 hover:bg-slate-50 active:bg-slate-100/70 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                Subscription & Plan Limits
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {currentPlan.name} · {scanUsageLabel}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                isPaidPlan ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              {isPaidPlan ? (
                'Paid'
              ) : (
                <>
                  <Zap className="w-3 h-3 text-amber-700 fill-current" />
                  <span>Upgrade</span>
                </>
              )}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </button>

        {/* 4. Country, Jurisdiction & Tax IDs */}
        <button
          onClick={() => setActiveSection('jurisdiction')}
          className="w-full text-left p-4 hover:bg-slate-50 active:bg-slate-100/70 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-700 shrink-0 group-hover:scale-105 transition-transform">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                Country, Jurisdiction & Tax IDs
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {COUNTRY_CONFIGS[country].flag} {COUNTRY_CONFIGS[country].name} · {COUNTRY_CONFIGS[country].taxIdLabel}: {taxId || 'Not set'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {COUNTRY_CONFIGS[country].currency}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </button>

        {/* 5. Security & App Lock */}
        <button
          onClick={() => setActiveSection('security')}
          className="w-full text-left p-4 hover:bg-slate-50 active:bg-slate-100/70 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-700 shrink-0 group-hover:scale-105 transition-transform">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                Security & App Lock
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {biometricLock ? 'PIN lock on' : 'App lock off'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                biometricLock
                  ? 'bg-teal-50 border-teal-200 text-teal-800'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              {biometricLock ? 'Locked 🔒' : 'Off'}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </button>

        {/* 6. Data Backup & Reset */}
        <button
          onClick={() => setActiveSection('data')}
          className="w-full text-left p-4 hover:bg-slate-50 active:bg-slate-100/70 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-700 shrink-0 group-hover:scale-105 transition-transform">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                Data Backup & Reset
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                Export a backup, clear data or delete your account
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700">
              Manage
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </button>

        {/* 7. Activity & Usage Audit Logs (developer builds only) */}
        {import.meta.env.DEV && onOpenActivityLogs && (
          <button
            onClick={() => onOpenActivityLogs('activity')}
            className="w-full text-left p-4 hover:bg-slate-50 active:bg-slate-100/70 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shrink-0 group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900">
                  Activity Audit Trail & Quotas
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  View activity log & AI usage
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>
        )}

        {/* 9. Sign Out Action Row */}
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="w-full p-4 hover:bg-rose-50/70 active:bg-rose-100/60 text-rose-700 hover:text-rose-700 flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-700" />
            <span>Sign Out of Account</span>
          </button>
        )}
      </div>

      {/* App Version Info */}
      <div className="pt-2 text-center text-xs text-slate-500 space-y-0.5">
        <div>TaxVault · Multi-Jurisdiction Engine</div>
        <div>New Zealand · Australia · Canada · United States · India</div>
      </div>

      {/* Gemini AI API Key Setup Modal */}
      <GeminiApiKeyModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        onKeySaved={(newKey) => {
          setHasGeminiKey(Boolean(newKey));
          setFeedback(newKey ? 'Gemini AI Vision key activated!' : 'Gemini AI key cleared.');
          setTimeout(() => setFeedback(null), 3000);
        }}
      />

      {/* Countrywise Terms & Conditions Modal */}
      <CountryTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        initialCountry={country}
      />
    </div>
  );
};
