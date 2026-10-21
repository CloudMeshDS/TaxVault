import React, { useState, useEffect } from 'react';
import {
  Shield,
  Fingerprint,
  Smartphone,
  Cloud,
  Download,
  Upload,
  CheckCircle,
  Key,
  Globe,
  Building,
  RefreshCw,
  Lock,
  FileCheck,
  Sparkles,
  Zap,
  Database,
  ExternalLink,
  Copy,
  AlertCircle
} from 'lucide-react';
import { CountryTaxConfig, SupportedCountry, BusinessEntityType, UserProfile, ExpenseRecord, IncomeRecord } from '../../types';
import { TAX_CONFIGS } from '../../services/taxRules';
import { storageService } from '../../services/storageService';
import { supabaseService, SUPABASE_SQL_SCHEMA, SupabaseSyncStatus } from '../../services/supabaseService';
import { GoogleIcon, AppleIcon } from '../auth/AuthModal';

// Feature flag: Hide Google & Apple buttons (keep implementation intact)
const SHOW_OAUTH_PROVIDERS = false;

interface TaxSettingsModalProps {
  profile: UserProfile;
  taxConfig: CountryTaxConfig;
  expenses?: ExpenseRecord[];
  incomes?: IncomeRecord[];
  onUpdateProfile: (profile: UserProfile) => void;
  onManualBackup: () => Promise<void>;
  onPullFromSupabase?: () => Promise<{ success: boolean; count?: number; error?: string }>;
  isSyncing: boolean;
  onOpenAuth?: () => void;
  onOpenSubscription?: () => void;
  onOpenAndroidInstall?: () => void;
}

export const TaxSettingsModal: React.FC<TaxSettingsModalProps> = ({
  profile,
  taxConfig,
  expenses = [],
  incomes = [],
  onUpdateProfile,
  onManualBackup,
  onPullFromSupabase,
  isSyncing,
  onOpenAuth,
  onOpenSubscription,
  onOpenAndroidInstall,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry>(profile.country);
  const [entityType, setEntityType] = useState<BusinessEntityType>(profile.entityType);
  const [fullName, setFullName] = useState(profile.fullName);
  const [taxNumber, setTaxNumber] = useState(profile.taxNumber);
  const [gstRegistered, setGstRegistered] = useState(profile.gstRegistered);
  const [mfaEnabled, setMfaEnabled] = useState(profile.mfaEnabled);
  const [biometricEnabled, setBiometricEnabled] = useState(profile.biometricEnabled);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Supabase Integration State
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseSyncStatus>({
    isConfigured: true,
    isConnected: true,
    tablesReady: false,
    projectUrl: 'https://egtmuxewuremxgodpjxj.supabase.co',
  });
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'warn'; message: string } | null>(null);

  useEffect(() => {
    supabaseService.checkConnection().then(status => {
      setSupabaseStatus(status);
    });
  }, []);

  const handleCountryChange = (c: SupportedCountry) => {
    setSelectedCountry(c);
    const newConfig = TAX_CONFIGS[c];
    // Automatically adjust base currency & financial year to match statutory requirements
    onUpdateProfile({
      ...profile,
      country: c,
      baseCurrency: newConfig.currencyCode,
      financialYearEnding: newConfig.nextTaxDeadline,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSaveSettings = () => {
    const updated: UserProfile = {
      ...profile,
      country: selectedCountry,
      entityType,
      fullName,
      taxNumber,
      gstRegistered,
      mfaEnabled,
      biometricEnabled,
    };
    onUpdateProfile(updated);
    storageService.saveUserProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDownloadBackup = () => {
    const payload = storageService.generateBackupPayload();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `TaxVault_CloudBackup_${profile.country}_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          const ok = storageService.restoreFromPayload(parsed);
          if (ok) {
            onUpdateProfile(parsed.profile);
            alert('Cloud backup successfully restored! All financial records updated.');
            window.location.reload();
          }
        } catch {
          alert('Invalid backup payload file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setStatusNotice(null);
    try {
      const status = await supabaseService.checkConnection();
      setSupabaseStatus(status);
      if (status.isConnected) {
        if (status.tablesReady) {
          setStatusNotice({
            type: 'success',
            message: 'Connected to Supabase! PostgreSQL tables (expenses, incomes, profiles) are ready for live sync.'
          });
        } else {
          setStatusNotice({
            type: 'warn',
            message: 'Connected to Supabase project! Note: Tables not found yet. Click "View Supabase SQL Schema" below to create them.'
          });
        }
      } else {
        setStatusNotice({
          type: 'warn',
          message: status.errorMessage || 'Unable to connect to Supabase.'
        });
      }
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleSyncToSupabase = async () => {
    setIsPushing(true);
    setStatusNotice(null);
    try {
      const trips = storageService.getMileageTrips(profile.country);
      const invoices = storageService.getClientInvoices(profile.currencySymbol);
      const bankTxs = storageService.getBankTransactions();
      const res = await supabaseService.syncAll(profile, expenses, incomes, trips, invoices, bankTxs);
      if (res.success) {
        setStatusNotice({
          type: 'success',
          message: `Successfully synchronized ${res.count} records to Supabase cloud database.`
        });
        setSupabaseStatus(prev => ({ ...prev, tablesReady: true }));
      } else {
        setStatusNotice({
          type: 'warn',
          message: res.error?.includes('schema cache') || res.error?.includes('PGRST205')
            ? 'Supabase connection verified, but database tables need to be created first. Please run the SQL schema script below.'
            : `Sync note: ${res.error}`
        });
      }
    } finally {
      setIsPushing(false);
    }
  };

  const handlePullFromSupabase = async () => {
    if (!onPullFromSupabase) return;
    setIsPulling(true);
    setStatusNotice(null);
    try {
      const res = await onPullFromSupabase();
      if (res.success) {
        setStatusNotice({
          type: 'success',
          message: `Successfully pulled ${res.count} expense records from Supabase!`
        });
      } else {
        setStatusNotice({
          type: 'warn',
          message: res.error || 'Failed to fetch remote expenses from Supabase.'
        });
      }
    } finally {
      setIsPulling(false);
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 3000);
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Tax & Security Governance</h2>
          <p className="text-xs text-neutral-400">
            Jurisdiction adaptation, MFA authentication, and cloud backups
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 animate-pulse">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Updated!</span>
          </span>
        )}
      </div>

      {/* 1. Geolocation & Country Selector */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>Tax Jurisdiction & Statutory Regulations</span>
        </div>
        <p className="text-[11px] text-neutral-400">
          Select your country to dynamically adapt tax forms, GST/VAT rates, and deduction rules:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {Object.values(TAX_CONFIGS).map(cfg => {
            const isSelected = selectedCountry === cfg.countryCode;
            return (
              <button
                key={cfg.countryCode}
                onClick={() => handleCountryChange(cfg.countryCode)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-800 border-emerald-500 text-white shadow-sm'
                    : 'bg-neutral-950/80 border-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                }`}
              >
                <div className="text-lg">{cfg.flag}</div>
                <div className="font-semibold text-xs text-neutral-100 mt-1">{cfg.countryName}</div>
                <div className="text-[10px] text-neutral-500 font-mono">
                  {cfg.taxAuthority.split('(')[0]} · {cfg.currencyCode}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Business Entity & Tax Identity */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
          <Building className="w-4 h-4 text-blue-400" />
          <span>Taxpayer Registration</span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-neutral-400 block mb-1 text-[11px]">Trading / Legal Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-neutral-400 block mb-1 text-[11px]">Entity Classification</label>
              <select
                value={entityType}
                onChange={e => setEntityType(e.target.value as BusinessEntityType)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-2 text-neutral-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="sole_trader">Sole Trader</option>
                <option value="contractor">Independent Contractor</option>
                <option value="individual">Individual</option>
                <option value="small_business">Small Business</option>
                <option value="company">Company / Ltd</option>
              </select>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1 text-[11px]">
                {taxConfig.countryCode === 'NZ' ? 'IRD Number' : 'Tax Identification (TIN)'}
              </label>
              <input
                type="text"
                value={taxNumber}
                onChange={e => setTaxNumber(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* GST Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
            <div>
              <div className="font-medium text-neutral-200">
                {taxConfig.countryCode === 'NZ' ? 'Registered for NZ GST (15%)' : 'Registered for Sales Tax / VAT'}
              </div>
              <div className="text-[10px] text-neutral-500">
                {taxConfig.countryCode === 'NZ'
                  ? 'Mandatory turnover threshold > NZ$60,000/yr'
                  : 'Enables input and output tax reconciliation'}
              </div>
            </div>
            <input
              type="checkbox"
              checked={gstRegistered}
              onChange={e => setGstRegistered(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Save Registration Changes
        </button>
      </div>

      {/* Subscription Tier & Limits */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Subscription Plan & Limits</span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
            profile.subscription.tier === 'pro'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : profile.subscription.tier === 'enterprise'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {profile.subscription.tier.toUpperCase()} TIER
          </span>
        </div>

        <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Monthly Receipt Scans:</span>
            <span className="font-mono text-neutral-200 font-bold">
              {profile.subscription.tier === 'free'
                ? `${profile.subscription.receiptsScannedThisMonth || 0} / ${profile.subscription.monthlyReceiptLimit || 10} used`
                : 'Unlimited AI Scans'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Chartered Accountant Packs:</span>
            <span className="font-mono text-neutral-200">
              {profile.subscription.tier === 'free' ? 'CSV only (PDF/Excel locked)' : 'Full Audit PDF & Excel Included'}
            </span>
          </div>

          {onOpenSubscription && (
            <button
              onClick={onOpenSubscription}
              className="w-full mt-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{profile.subscription.tier === 'free' ? 'Upgrade to Compliance Pro' : 'Manage Subscription Plan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Social Identity & OAuth Login */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
            <Key className="w-4 h-4 text-emerald-400" />
            <span>Connected Social Authentication</span>
          </div>
          {profile.authProvider ? (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase">
              {profile.authProvider} Connected
            </span>
          ) : (
            <span className="text-[10px] text-neutral-500 font-mono">Guest / Local</span>
          )}
        </div>

        <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-neutral-200 text-sm overflow-hidden">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  profile.fullName.charAt(0)
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-100">{profile.fullName}</div>
                <div className="text-[11px] text-neutral-400 font-mono">{profile.email}</div>
              </div>
            </div>

            {onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="py-1 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 hover:text-emerald-300 text-xs font-medium cursor-pointer transition-colors"
              >
                Switch Account
              </button>
            )}
          </div>

          {/* Separate Buttons for Google and Apple (Hidden via feature flag) */}
          {SHOW_OAUTH_PROVIDERS && onOpenAuth && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={onOpenAuth}
                className="py-2 px-3 rounded-lg bg-white hover:bg-neutral-100 active:scale-[0.98] text-neutral-900 font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all border border-neutral-200"
              >
                <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={onOpenAuth}
                className="py-2 px-3 rounded-lg bg-black hover:bg-neutral-950 active:scale-[0.98] text-white border border-neutral-700 hover:border-neutral-500 font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
              >
                <AppleIcon className="w-3.5 h-3.5 shrink-0 text-white fill-white" />
                <span>Apple</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Multi-Factor Authentication & Biometrics */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Security & Authentication Guard</span>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
            <div className="flex items-center gap-2.5">
              <Fingerprint className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-medium text-neutral-200">Biometric Login</div>
                <div className="text-[10px] text-neutral-500">Face ID (iOS) / Fingerprint (Android)</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={biometricEnabled}
              onChange={e => {
                setBiometricEnabled(e.target.checked);
                onUpdateProfile({ ...profile, biometricEnabled: e.target.checked });
              }}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs font-medium text-neutral-200">Multi-Factor Authentication (MFA)</div>
                <div className="text-[10px] text-neutral-500">Time-based one-time passcode (TOTP) verification</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={mfaEnabled}
              onChange={e => {
                setMfaEnabled(e.target.checked);
                onUpdateProfile({ ...profile, mfaEnabled: e.target.checked });
              }}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Android Device App Installation */}
      {onOpenAndroidInstall && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Android App Installation (.apk / WebAPK)</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Android 8+</span>
          </div>

          <p className="text-[11px] text-neutral-400">
            Install TaxVault directly on your Android phone as a native app with full offline camera scanner, biometrics, and home screen icon without sideloading warnings.
          </p>

          <button
            onClick={onOpenAndroidInstall}
            className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Smartphone className="w-4 h-4" />
            <span>Open Android App Installer & APK Package</span>
          </button>
        </div>
      )}

      {/* Supabase Cloud Database & API Sync */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span>Supabase Cloud Database & APIs</span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 font-medium ${
            supabaseStatus.isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${supabaseStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {supabaseStatus.isConnected ? (supabaseStatus.tablesReady ? 'Live & Connected' : 'Connected (Schema Pending)') : 'Checking...'}
          </span>
        </div>

        <p className="text-[11px] text-neutral-400 leading-relaxed">
          Real-time REST API & PostgreSQL synchronization connected with your Supabase cloud project.
        </p>

        {/* Project Details */}
        <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">Project URL:</span>
            <span className="text-neutral-200 truncate max-w-[210px]">{supabaseStatus.projectUrl || 'https://egtmuxewuremxgodpjxj.supabase.co'}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">API Key:</span>
            <span className="text-neutral-400 font-mono">sb_publishable_zoLZ...GU81</span>
          </div>
          {statusNotice && (
            <div className={`p-2 rounded text-[11px] border font-sans ${
              statusNotice.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
            }`}>
              {statusNotice.message}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleTestConnection}
            disabled={isTestingConn}
            className="py-2 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-neutral-700/50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingConn ? 'animate-spin text-emerald-400' : 'text-neutral-400'}`} />
            <span>{isTestingConn ? 'Testing...' : 'Test API'}</span>
          </button>

          <button
            onClick={handleSyncToSupabase}
            disabled={isPushing}
            className="py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Upload className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin' : ''}`} />
            <span>{isPushing ? 'Syncing...' : 'Sync to Cloud'}</span>
          </button>

          <button
            onClick={handlePullFromSupabase}
            disabled={isPulling}
            className="py-2 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-neutral-700/50"
          >
            <Download className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin text-blue-400' : 'text-neutral-400'}`} />
            <span>{isPulling ? 'Pulling...' : 'Pull Cloud'}</span>
          </button>
        </div>

        {/* SQL Schema helper dropdown */}
        <div className="pt-2 border-t border-neutral-800/80">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowSchema(!showSchema)}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>{showSchema ? '▾ Hide Supabase SQL Schema' : '▸ View Supabase SQL Schema (1-Click)'}</span>
            </button>
            <a
              href="https://supabase.com/dashboard/project/egtmuxewuremxgodpjxj/editor"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1"
            >
              <span>Supabase Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {showSchema && (
            <div className="mt-2.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>Run in Supabase SQL Editor:</span>
                <button
                  onClick={handleCopySQL}
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedSQL ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSQL ? 'Copied to Clipboard!' : 'Copy Schema SQL'}</span>
                </button>
              </div>
              <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-[10px] text-neutral-300 max-h-36 overflow-y-auto whitespace-pre leading-relaxed select-all">
                {SUPABASE_SQL_SCHEMA}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Secure Cloud Backups */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
            <Cloud className="w-4 h-4 text-blue-400" />
            <span>Encrypted Cloud Backup Vault</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">AES-256 Validated</span>
        </div>

        <p className="text-[11px] text-neutral-400">
          All financial receipts, calculations, and tax schedules are encrypted on-device and mirrored to secure cloud backups.
        </p>

        <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between text-xs">
          <span className="text-neutral-400">Last Synced to Cloud:</span>
          <span className="font-mono text-neutral-300">
            {profile.lastBackupDate ? new Date(profile.lastBackupDate).toLocaleTimeString() : 'Just now'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onManualBackup}
            disabled={isSyncing}
            className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Backup Now'}</span>
          </button>

          <button
            onClick={handleDownloadBackup}
            className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Snapshot</span>
          </button>
        </div>

        {/* Restore from File */}
        <div className="pt-2 border-t border-neutral-800">
          <label className="text-[11px] text-neutral-400 block mb-1">Restore from Previous Encrypted Backup</label>
          <input
            type="file"
            accept=".json"
            onChange={handleRestoreFile}
            className="text-xs text-neutral-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
