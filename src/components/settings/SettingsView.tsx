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
  Database,
  Zap,
  LogOut,
  Scale,
} from 'lucide-react';
import { BusinessEntityType, SupportedCountry, UserProfile } from '../../types';
import { storageService, DEFAULT_PROFILES } from '../../services/storageService';
import { apiClient } from '../../services/apiClient';
import { SubscriptionService } from '../../services/subscriptionService';
import { GoogleIcon, AppleIcon } from '../auth/AuthModal';
import { getGeminiApiKey } from '../../services/receiptOcr';
import { GeminiApiKeyModal } from '../common/GeminiApiKeyModal';
import { CountryTermsModal } from '../legal/CountryTermsModal';
import { pressable } from '../../utils/a11y';

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
    fiscalYears: ['FY 2026-27 (1 Apr - 31 Mar)', 'FY 2025-26'],
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
    fiscalYears: ['FY 2026-27 (1 Jul - 30 Jun)', 'FY 2025-26'],
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
    fiscalYears: ['Tax Year 2026 (Jan - Dec)', 'Tax Year 2025'],
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
    fiscalYears: ['Tax Year 2026 (Jan - Dec)', 'Tax Year 2025'],
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
    fiscalYears: ['FY 2026-27 (1 Apr - 31 Mar)', 'FY 2025-26'],
  },
};

interface SettingsViewProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onResetData: () => void;
  onClearData: () => void;
  onSignOut?: () => void;
  onOpenSubscription?: () => void;
  onOpenAuth?: () => void;
  onOpenPermissions?: () => void;
  activeSection?: SettingSectionId | null;
  onSelectSection?: (section: SettingSectionId | null) => void;
  onOpenActivityLogs?: (tab?: 'activity' | 'usage') => void;
  onOpenSupabaseSql?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onUpdateProfile,
  onResetData,
  onClearData,
  onSignOut,
  onOpenSubscription,
  onOpenAuth,
  onOpenPermissions,
  activeSection: propActiveSection,
  onSelectSection,
  onOpenActivityLogs,
  onOpenSupabaseSql,
}) => {
  // Navigation State: null means Stage 1 (Settings List), string means Stage 2 (Detail View)
  const [internalSection, setInternalSection] = useState<SettingSectionId | null>(null);
  const activeSection = propActiveSection !== undefined ? propActiveSection : internalSection;
  const setActiveSection = (s: SettingSectionId | null) => {
    setInternalSection(s);
    onSelectSection?.(s);
  };
  const scanUsage = SubscriptionService.getScanUsage(profile);

  // Form Fields State
  const [country, setCountry] = useState<SupportedCountry>(profile.country || 'NZ');
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone || '');
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [businessType, setBusinessType] = useState<BusinessEntityType>(profile.businessType || 'Sole Trader');
  const [taxId, setTaxId] = useState(profile.taxId || profile.pan || '');
  const [secondaryTaxId, setSecondaryTaxId] = useState(profile.secondaryTaxId || profile.gstin || '');
  const [financialYear, setFinancialYear] = useState(profile.financialYear || COUNTRY_CONFIGS[profile.country || 'NZ'].fiscalYears[0]);
  const [biometricLock, setBiometricLock] = useState(profile.biometricLock);
  const [appPin, setAppPin] = useState(profile.appPin || '1234');
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(Boolean(getGeminiApiKey()));

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSeedingCountry, setIsSeedingCountry] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleCountryChange = (c: SupportedCountry) => {
    setCountry(c);
    const cfg = COUNTRY_CONFIGS[c];
    setFinancialYear(cfg.fiscalYears[0]);
    if (!cfg.entityTypes.includes(businessType)) {
      setBusinessType(cfg.entityTypes[0]);
    }
    const defProf = DEFAULT_PROFILES[c];
    if (defProf) {
      setTaxId(defProf.taxId);
      setSecondaryTaxId(defProf.secondaryTaxId || '');
    }
  };

  const handleSeedForCountry = async (c: SupportedCountry) => {
    setIsSeedingCountry(true);
    try {
      const res = await apiClient.seedCountryData(c);
      if (res.profile) {
        onUpdateProfile(res.profile);
        setCountry(res.profile.country);
        setFullName(res.profile.fullName);
        setBusinessName(res.profile.businessName);
        setBusinessType(res.profile.businessType);
        setTaxId(res.profile.taxId);
        setSecondaryTaxId(res.profile.secondaryTaxId || '');
        setFinancialYear(res.profile.financialYear);
      }
      setFeedback(`Loaded realistic sample vouchers for ${COUNTRY_CONFIGS[c].name}!`);
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setIsSeedingCountry(false);
    }
  };

  const handleSaveProfile = (sectionName?: string) => {
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
      pan: country === 'IN' ? taxId.toUpperCase() : (profile.pan || taxId.toUpperCase()),
      gstin: country === 'IN' ? secondaryTaxId.toUpperCase() : (profile.gstin || secondaryTaxId.toUpperCase()),
      financialYear,
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TaxVault_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback('Backup file exported!');
    setTimeout(() => setFeedback(null), 3000);
  };

  // ==========================================
  // STAGE 2: SECOND STAGE / DETAIL SETTINGS VIEW
  // ==========================================
  if (activeSection !== null) {
    return (
      <div className="p-4 space-y-4 pb-28 max-w-xl mx-auto select-none animate-in fade-in slide-in-from-right-4 duration-200">
        {/* Navigation Bar: Back Button & Section Title */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-white bg-white shadow-xs hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
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
            <span className="text-xs text-slate-400">Preferences</span>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div className="bg-emerald-50 border border-emerald-500/60 rounded-xl p-3 text-xs text-emerald-600 font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

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
                      <span className="text-xs font-mono font-bold text-amber-600 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded">
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
                    <p className="text-xs text-slate-400 mt-1">
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
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
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
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-red-900/60 text-red-700 font-semibold text-xs border border-rose-200 cursor-pointer shrink-0 transition-colors flex items-center gap-1.5"
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
                    profile.subscription?.tier === 'pro'
                      ? 'bg-amber-50 border-amber-500/50 text-amber-700'
                      : profile.subscription?.tier === 'enterprise'
                      ? 'bg-purple-50 border-purple-500/50 text-purple-700'
                      : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  {profile.subscription?.tier === 'pro'
                    ? '👑 Pro Tier Active'
                    : profile.subscription?.tier === 'enterprise'
                    ? '🏢 Enterprise Tier Active'
                    : 'Starter Plan (Free)'}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Monthly Scan Quota</span>
                  <span className="text-white font-mono font-bold">
                    {profile.subscription?.tier === 'pro' || profile.subscription?.tier === 'enterprise' ? (
                      <span className="text-emerald-600">Unlimited Neural OCR Scans</span>
                    ) : (
                      <span>{scanUsage.used} / {scanUsage.limit} receipts used</span>
                    )}
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      profile.subscription?.tier === 'pro' || profile.subscription?.tier === 'enterprise'
                        ? 'w-full bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-amber-500'
                    }`}
                    style={{
                      width:
                        profile.subscription?.tier === 'pro' || profile.subscription?.tier === 'enterprise'
                          ? '100%'
                          : `${Math.min(100, (scanUsage.used / (scanUsage.limit || 1)) * 100)}%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600">✓</span>
                    <span>Official Tax Audit PDF</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600">✓</span>
                    <span>4-Sheet Excel Export</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600">✓</span>
                    <span>Multi-Currency Engine</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600">✓</span>
                    <span>Cloud Backup Vault</span>
                  </div>
                </div>
              </div>

              {/* Plan & Scan Quota Simulator (development builds only: it bypasses billing) */}
              {import.meta.env.DEV && (
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Plan & Scan Quota Status</span>
                  <span className="text-emerald-600 font-mono">
                    {profile.subscription?.tier === 'free' ? `${profile.subscription?.receiptsScannedThisMonth || 0}/10 Used` : 'Unlimited Pro'}
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
                        ? 'bg-emerald-50 border-emerald-500/80 text-emerald-600 shadow-sm'
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
                    {profile.subscription?.tier === 'pro' || profile.subscription?.tier === 'enterprise'
                      ? 'Change Plan / View Billing Options'
                      : 'Upgrade to Tax Compliance Pro (Unlock All Features)'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* --- SECTION 3: COUNTRY, TAX JURISDICTION & TAX IDS --- */}
        {activeSection === 'jurisdiction' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-slate-500 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Jurisdiction & Tax Authorities</span>
                </span>
                <span className="text-xs text-indigo-400 font-semibold px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60">
                  {COUNTRY_CONFIGS[country].flag} {COUNTRY_CONFIGS[country].code} Rules Active
                </span>
              </div>

              {/* Multi-Jurisdiction Country Picker */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-medium">Select Country & Tax Authority</label>
                <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                  {(Object.keys(COUNTRY_CONFIGS) as SupportedCountry[]).map((cCode) => {
                    const cfg = COUNTRY_CONFIGS[cCode];
                    const isSelected = country === cCode;
                    return (
                      <button
                        key={cCode}
                        type="button"
                        onClick={() => handleCountryChange(cCode)}
                        className={`p-1.5 sm:p-2 rounded-xl text-center transition-all cursor-pointer border min-w-0 ${
                          isSelected
                            ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-white hover:border-slate-200'
                        }`}
                      >
                        <div className="text-lg sm:text-xl mb-0.5">{cfg.flag}</div>
                        <div className="text-xs sm:text-xs font-black tracking-wide leading-none truncate">{cfg.code}</div>
                        <div className="text-xs sm:text-xs text-slate-500 mt-0.5 truncate">{cfg.currency}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Authority & Seed Quick Action */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                <div>
                  <div className="text-xs text-slate-500">Statutory Tax Authority</div>
                  <div className="text-xs font-bold text-white mt-0.5">{COUNTRY_CONFIGS[country].authority}</div>
                </div>
                <button
                  type="button"
                  disabled={isSeedingCountry}
                  onClick={() => handleSeedForCountry(country)}
                  className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg px-2.5 py-1 text-xs font-bold shrink-0 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>{isSeedingCountry ? 'Loading...' : `Demo Vouchers`}</span>
                </button>
              </div>

              <div className="space-y-2.5 text-xs pt-1">
                <div>
                  <label className="text-xs text-slate-500">Entity Legal Structure</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessEntityType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {COUNTRY_CONFIGS[country].entityTypes.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500">{COUNTRY_CONFIGS[country].taxIdLabel}</label>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                      placeholder={COUNTRY_CONFIGS[country].taxIdPlaceholder}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">{COUNTRY_CONFIGS[country].secondaryTaxIdLabel}</label>
                    <input
                      type="text"
                      value={secondaryTaxId}
                      onChange={(e) => setSecondaryTaxId(e.target.value.toUpperCase())}
                      placeholder={COUNTRY_CONFIGS[country].secondaryTaxIdPlaceholder}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-xs text-slate-500">Financial Period / Fiscal Year</label>
                    <select
                      value={financialYear}
                      onChange={(e) => setFinancialYear(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-white font-mono"
                    >
                      {COUNTRY_CONFIGS[country].fiscalYears.map((fy) => (
                        <option key={fy} value={fy}>
                          {fy}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Local Currency</label>
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-indigo-400 font-mono font-bold flex items-center justify-between">
                      <span>{COUNTRY_CONFIGS[country].name} ({COUNTRY_CONFIGS[country].symbol})</span>
                      <span className="text-white">{COUNTRY_CONFIGS[country].currency}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Country Legal & Statutory Terms Card */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 shrink-0">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {COUNTRY_CONFIGS[country].flag} {COUNTRY_CONFIGS[country].name} Terms &amp; Compliance
                    </span>
                    <span className="text-xs text-emerald-600 font-semibold block truncate">
                      {profile.termsAccepted ? `✓ Statutory Consent Saved in DB${profile.termsAcceptedDate ? ` (${new Date(profile.termsAcceptedDate).toLocaleDateString()})` : ''}` : 'Statutory retention & non-advisory legal disclaimers'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm"
                >
                  View Terms (Database)
                </button>
              </div>
            </div>

            {/* Stage 2 Save Button */}
            <button
              onClick={() => handleSaveProfile('Jurisdiction & Tax Settings')}
              className="w-full bg-indigo-500 hover:bg-indigo-400 active:scale-[0.98] text-white font-black py-3.5 px-4 rounded-2xl text-xs transition-all cursor-pointer shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Tax & Jurisdiction Settings</span>
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
                    <div className="font-bold text-white">Biometric / App Lock</div>
                    <div className="text-xs text-slate-500">
                      Require Face ID, Fingerprint or PIN to open TaxVault
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
                      <span className="text-xs text-slate-700 font-bold">App Security PIN</span>
                      <div className="text-xs text-slate-500">4-digit security code</div>
                    </div>
                    <input
                      type="password"
                      maxLength={4}
                      value={appPin}
                      onChange={(e) => setAppPin(e.target.value)}
                      className="w-20 bg-white shadow-xs border border-slate-300 rounded-lg text-center font-mono text-base tracking-widest text-teal-700 focus:outline-none"
                    />
                  </div>
                )}

                <div className="text-xs text-slate-400 leading-relaxed bg-slate-50/60 p-2.5 rounded-xl border border-slate-200">
                  🔒 All tax vouchers, receipts, and financial documents are encrypted securely on your device.
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
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
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
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 cursor-pointer transition-colors shrink-0"
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
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Gemini 2.5 Flash Vision</span>
                      {hasGeminiKey ? (
                        <span className="text-xs px-1.5 py-0.2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold">
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
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-50 border border-slate-200 text-emerald-600 cursor-pointer transition-colors shrink-0"
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
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Export Encrypted JSON Backup</span>
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
      </div>
    );
  }

  // ==========================================
  // STAGE 1: SETTINGS LIST VIEW (DEFAULT)
  // ==========================================
  return (
    <div className="p-4 space-y-4 pb-28 max-w-xl mx-auto select-none animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">Settings</h1>
        <p className="text-xs text-slate-500 font-medium">
          Manage your profile, jurisdiction, plan, and data
        </p>
      </div>

      {feedback && (
        <div className="bg-emerald-50 border border-emerald-500/60 rounded-xl p-3 text-xs text-emerald-600 font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

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
                  {profile.subscription?.tier === 'pro'
                    ? '👑 Compliance Pro'
                    : profile.subscription?.tier === 'enterprise'
                    ? '🏢 Enterprise Firm'
                    : 'Free Starter'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0">
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 2. Personal & Business Profile */}
        <button
          onClick={() => setActiveSection('profile')}
          className="w-full text-left p-4 hover:bg-slate-50 active:bg-slate-100/70 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
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
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                Subscription & Plan Limits
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {profile.subscription?.tier === 'pro'
                  ? 'Compliance Pro · Unlimited Scans'
                  : profile.subscription?.tier === 'enterprise'
                  ? 'CA Firm · Multi-Entity'
                  : `Starter · ${scanUsage.used}/${scanUsage.limit} used`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                profile.subscription?.tier === 'pro'
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : profile.subscription?.tier === 'enterprise'
                  ? 'bg-purple-50 border-purple-300 text-purple-800'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              {profile.subscription?.tier === 'pro' ? (
                '👑 Pro'
              ) : profile.subscription?.tier === 'enterprise' ? (
                '🏢 Firm'
              ) : (
                <>
                  <Zap className="w-3 h-3 text-amber-600 fill-current" />
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
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
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
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600 shrink-0 group-hover:scale-105 transition-transform">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                Security & App Lock
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {biometricLock ? 'Face ID / Fingerprint & PIN Enabled' : 'App Lock Disabled'}
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
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-105 transition-transform">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                Data Backup & Reset
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                Export JSON backup, load demo vouchers or clear data
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
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900">
                  Activity Audit Trail & Quotas
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  View immutable audit logs & AI token meter
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>
        )}

        {/* 8. Supabase SQL & Cloud Database (developer builds only) */}
        {import.meta.env.DEV && onOpenSupabaseSql && (
          <button
            onClick={onOpenSupabaseSql}
            className="w-full text-left p-4 hover:bg-slate-50 active:bg-slate-100/70 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900">
                  PostgreSQL Cloud Database Schema
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  Multi-country DDL, RLS policies & tables
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
            className="w-full p-4 hover:bg-rose-50/70 active:bg-rose-100/60 text-rose-600 hover:text-rose-700 flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Sign Out of Account</span>
          </button>
        )}
      </div>

      {/* App Version Info */}
      <div className="pt-2 text-center text-xs text-slate-300 space-y-0.5">
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
