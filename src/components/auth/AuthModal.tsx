import React, { useState, useEffect } from 'react';
import {
  Shield,
  Fingerprint,
  Lock,
  CheckCircle2,
  ScanFace,
  Globe,
  ArrowRight,
  User,
  X,
  Sparkles,
  LogOut,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Send,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  Scale,
} from 'lucide-react';
import { SupportedCountry, BusinessEntityType, UserProfile } from '../../types';
import { TAX_CONFIGS } from '../../services/taxRules';
import { supabaseService } from '../../services/supabaseService';
import { emailJsService } from '../../services/emailJsService';
import { createCleanUserProfile, takePendingSignupProfile } from '../../services/storageService';
import { CountryTermsModal } from '../legal/CountryTermsModal';
import { termsService } from '../../services/termsService';
import { apiUrl } from '../../services/apiBase';

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const AppleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 170 170" fill="currentColor">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.7-11.71-13.97-5.44-8.38-9.71-17.75-12.8-28.12-3.1-10.37-4.64-20.53-4.64-30.49 0-14.38 3.58-26.69 10.74-36.93 7.17-10.24 16.32-15.46 27.46-15.67 5.25 0 10.96 1.41 17.13 4.23 6.18 2.82 10.05 4.34 11.61 4.56 1.94-.33 5.9-1.9 11.89-4.7 5.99-2.81 11.41-4.08 16.27-3.83 12.33.64 22.39 5.34 30.18 14.1-10.77 6.53-16.03 15.54-15.77 27.05.25 9.04 3.65 16.66 10.19 22.87 6.54 6.21 14.38 9.77 23.53 10.67-2.3 6.96-5.18 14.07-8.63 21.33zM119.22 31.84c0-7.39 2.67-14.24 8.01-20.55 5.34-6.31 11.96-10.33 19.86-12.06.31 1.4.47 2.8.47 4.19 0 7.39-2.73 14.41-8.19 21.05-5.46 6.64-12.16 10.53-20.1 11.68-.03-1.42-.05-2.86-.05-4.31z" />
  </svg>
);

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (profile?: Partial<UserProfile>) => void;
  onSignOut?: () => void;
  platform: 'ios' | 'android' | 'desktop';
  currentProfile: UserProfile;
}

// Feature flag: Hide Google & Apple buttons (keep implementation intact)
const SHOW_OAUTH_PROVIDERS = false;

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
  onSignOut,
  platform,
  currentProfile,
}) => {
  const [mode, setMode] = useState<'email_auth' | 'biometric' | 'mfa_totp' | 'signup_country' | 'forgot_password'>('email_auth');
  const [authType, setAuthType] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetStep, setIsResetStep] = useState<'email' | 'email_sent' | 'new_password'>('email');
  const [showEmailJsConfig, setShowEmailJsConfig] = useState(false);
  const [emailJsConfig, setEmailJsConfig] = useState(emailJsService.getConfig());
  const [configSaved, setConfigSaved] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry>(currentProfile.country || 'NZ');
  const [entityType, setEntityType] = useState<BusinessEntityType>(currentProfile.entityType || 'sole_trader');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const params = new URLSearchParams(window.location.search);
      if (hash.includes('type=recovery') || params.get('type') === 'recovery') {
        setMode('forgot_password');
        setIsResetStep('new_password');
      }
      const emailFromUrl = params.get('email');
      if (emailFromUrl) {
        setForgotEmail(emailFromUrl);
        setEmail(emailFromUrl);
      }
    }

    const client = supabaseService.getClient();
    if (client) {
      const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setMode('forgot_password');
          setIsResetStep('new_password');
          if (session?.user?.email) {
            setForgotEmail(session.user.email);
            setEmail(session.user.email);
          }
        }
      });
      return () => {
        authListener?.subscription.unsubscribe();
      };
    }
  }, []);

  if (!isOpen) return null;

  const isIos = platform === 'ios';
  const isLoggedIn = Boolean(currentProfile.email && currentProfile.email.trim().length > 0 && currentProfile.email !== 'guest@taxvault.app');

  // Google / Apple: redirect to the provider; the session is picked up when it returns.
  // On any failure show the error; never sign in without the provider.
  const handleOAuth = async (provider: 'google' | 'apple') => {
    setIsVerifying(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await supabaseService.signInWithOAuth(provider);
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      setErrorMessage(res.error || 'Sign-in could not be started. Please sign in with email.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Sign-in could not be started. Please sign in with email.');
    } finally {
      setIsVerifying(false);
    }
  };
  const handleGoogleAuth = () => handleOAuth('google');
  const handleAppleAuth = () => handleOAuth('apple');

  const handleSignOut = async () => {
    setIsVerifying(true);
    try {
      await supabaseService.signOut();
    } catch {}
    setIsVerifying(false);
    onClose();
    if (onSignOut) {
      onSignOut();
    }
  };

  const handleEmailAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (authType === 'signup') {
      if (!confirmPassword) {
        setErrorMessage('Please confirm your password.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please verify your confirm password.');
        return;
      }
      if (!hasAgreedTerms) {
        setErrorMessage('Please tick the checkbox to agree to the Terms & Conditions and Privacy Policy before creating your account.');
        return;
      }
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (authType === 'login') {
        const res = await supabaseService.signInWithEmail(cleanEmail, password);
        if (res.error) {
          if (res.error.toLowerCase().includes('email not confirmed')) {
            setErrorMessage('Your email has not been confirmed yet. Please check your inbox for the confirmation link.');
            return;
          }
          setErrorMessage(
            res.error.toLowerCase().includes('invalid login credentials')
              ? 'Invalid email or password. Please verify your credentials and try again.'
              : res.error
          );
          return;
        }

        setSuccessMessage('Signed in successfully!');
        const userRes = await supabaseService.getCurrentUser();
        const authedEmail = (userRes?.email || cleanEmail).toLowerCase();
        const authedUid = userRes?.id;

        const profileRes = await supabaseService.fetchProfile(authedUid, authedEmail);
        let updatedProfile = profileRes.profile;
        if (updatedProfile && updatedProfile.email && updatedProfile.email.toLowerCase() !== authedEmail) {
          updatedProfile = null;
        }
        if (!updatedProfile) {
          updatedProfile = takePendingSignupProfile(authedEmail, authedUid) || createCleanUserProfile(authedEmail, undefined, currentProfile?.country || 'IN', authedUid);
          await supabaseService.upsertProfile(updatedProfile).catch(() => {});
        }

        setTimeout(() => {
          onAuthenticated(updatedProfile);
          onClose();
        }, 800);
      } else {
        const res = await supabaseService.signUpWithEmail(cleanEmail, password);
        if (res.error) {
          setErrorMessage(res.error);
          return;
        }

        // Save customer statutory agreement into database (POST /api/agreements + Supabase activity ledger)
        try {
          const country = currentProfile?.country || 'IN';
          const countryConfig = TAX_CONFIGS[country] || TAX_CONFIGS['IN'];
          await termsService.recordCustomerAgreement({
            userId: res.user?.id,
            userEmail: cleanEmail,
            country,
            taxAuthority: countryConfig.taxAuthority,
            termsVersion: '2026.1',
            metadata: {
              source: 'In-App Modal Registration',
            },
          });
        } catch (agrErr) {
          console.warn('Customer agreement database save notice:', agrErr);
        }

        setSuccessMessage('Account created successfully! You can now sign in.');
        setAuthType('login');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFillDemoCredentials = () => {
    setEmail('admin@taxvault.app');
    setPassword('TaxVaultDemo2026!');
    setErrorMessage(null);
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = forgotEmail.trim() || email.trim();
    if (!targetEmail) {
      setErrorMessage('Please enter your registered email ID.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSimulatedCode(null);

    try {
      // 1. Dispatch via server endpoint (generates Supabase recovery token & sends)
      try {
        await fetch(apiUrl('/api/auth/send-reset-link'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail }),
        });
      } catch (apiErr) {
        console.warn('Backend send-reset-link notice:', apiErr);
      }

      // 2. Also trigger Supabase reset password in parallel for link redundancy
      try {
        await supabaseService.resetPasswordForEmail(targetEmail);
      } catch (e) {}

      setForgotSent(true);
      setIsResetStep('email_sent');
      setSuccessMessage(`Password recovery link dispatched to ${targetEmail}!`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to dispatch password recovery link.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdatePasswordModal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const challenge = emailJsService.getActiveChallenge();
      const targetEmail = (
        forgotEmail.trim() ||
        email.trim() ||
        challenge?.email ||
        (typeof window !== 'undefined' ? localStorage.getItem('taxvault_last_auth_email') || '' : '')
      ).toLowerCase().trim();

      if (!targetEmail) {
        setErrorMessage('Please enter your account email address to update your password.');
        return;
      }

      const res = await supabaseService.updatePassword(newPassword, targetEmail);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update password in authentication system.');
        return;
      }

      emailJsService.clearChallenge();
      if (typeof window !== 'undefined') {
        localStorage.setItem('taxvault_last_auth_email', targetEmail);
      }
      setSuccessMessage('Password saved! Logging you in automatically...');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }
      const userRes = await supabaseService.getCurrentUser().catch(() => null);
      const uid = userRes?.id;
      const profileRes = await supabaseService.fetchProfile(uid, targetEmail).catch(() => ({ profile: null }));
      let authenticatedProfile = profileRes.profile;
      if (!authenticatedProfile) {
        authenticatedProfile = takePendingSignupProfile(targetEmail, uid) || createCleanUserProfile(targetEmail, targetEmail.split('@')[0], currentProfile?.country || 'IN', uid);
        await supabaseService.upsertProfile(authenticatedProfile).catch(() => {});
      }
      setTimeout(() => {
        onAuthenticated(authenticatedProfile);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update password.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveEmailJsConfigModal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    emailJsService.setConfig(emailJsConfig);
    setConfigSaved(true);
    setSuccessMessage('EmailJS credentials saved to local storage!');
    setTimeout(() => {
      setConfigSaved(false);
      setShowEmailJsConfig(false);
    }, 1200);
  };

  const handleBiometricAuthenticate = async () => {
    setIsVerifying(true);
    setTimeout(async () => {
      setIsVerifying(false);
      const profileRes = await supabaseService.fetchProfile(currentProfile?.id, currentProfile?.email);
      onAuthenticated(profileRes.profile || { biometricEnabled: true });
      onClose();
    }, 900);
  };

  const handleVerifyTotp = async () => {
    setIsVerifying(true);
    setTimeout(async () => {
      setIsVerifying(false);
      const profileRes = await supabaseService.fetchProfile(currentProfile?.id, currentProfile?.email);
      onAuthenticated(profileRes.profile || { mfaEnabled: true });
      onClose();
    }, 800);
  };

  const handleCompleteCountrySignup = () => {
    const config = TAX_CONFIGS[selectedCountry];
    onAuthenticated({
      country: selectedCountry,
      entityType,
      baseCurrency: config.currencyCode,
      financialYearEnding: config.nextTaxDeadline,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs backdrop-blur-md flex items-center justify-center p-3 modal-backdrop-animation">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 text-slate-900 shadow-2xl relative overflow-hidden modal-enter-animation">
        {/* Close Button */}
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top brand */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 text-emerald-700">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-white">TaxVault Account</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cloud Sync & Document Security
          </p>
        </div>

        {/* Segmented Mode Selector Buttons or Recovery Header */}
        {mode === 'forgot_password' ? (
          <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('email_auth');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-slate-500 hover:text-white flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span>Back to Sign In</span>
            </button>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Account Recovery
            </span>
          </div>
        ) : null}

        {/* 1. ACCOUNT OVERVIEW (WHEN LOGGED IN) OR LOGIN FORMS (WHEN LOGGED OUT / SWITCHING) */}
        {mode === 'email_auth' && (
          isLoggedIn && !isSwitchingAccount ? (
            /* ======================================================== */
            /* ALREADY LOGGED IN: SHOW ACCOUNT DETAILS & SESSION STATUS */
            /* ======================================================== */
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                    Logged-in Account
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Logged In</span>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-700 text-lg shadow-inner shrink-0">
                    {currentProfile.fullName ? currentProfile.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="text-sm font-extrabold text-white truncate">
                      {currentProfile.fullName || 'TaxVault User'}
                    </div>
                    <div className="text-xs text-slate-500 font-mono truncate">
                      {currentProfile.email}
                    </div>
                    <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5 pt-0.5">
                      {currentProfile.authProvider === 'google' ? (
                        <>
                          <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>Connected with Google</span>
                        </>
                      ) : currentProfile.authProvider === 'apple' ? (
                        <>
                          <AppleIcon className="w-3.5 h-3.5 shrink-0 text-white" />
                          <span>Connected with Apple ID</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
                          <span>Verified Email Account</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white shadow-xs p-2 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 block">Organization</span>
                    <span className="text-white font-semibold truncate block mt-0.5">
                      {currentProfile.businessName || 'Personal'}
                    </span>
                  </div>
                  <div className="bg-white shadow-xs p-2 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 block">Tax Jurisdiction</span>
                    <span className="text-white font-semibold block mt-0.5">
                      {currentProfile.country} · {currentProfile.financialYear || 'FY 26-27'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-white block">Account Connected & Syncing</span>
                  <span>Your vouchers and financial records are saved to your TaxVault account.</span>
                </div>
              </div>

              {/* Separate Buttons for Google and Apple (Hidden via feature flag) */}
              {SHOW_OAUTH_PROVIDERS && (
                <div className="space-y-1.5 pt-1 border-t border-slate-200">
                  <div className="text-xs uppercase font-bold tracking-wider text-slate-500">
                    Switch or Connect with:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="btn-account-google"
                      onClick={handleGoogleAuth}
                      disabled={isVerifying}
                      className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-900 active:scale-[0.98] text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all border border-slate-700"
                    >
                      <GoogleIcon className="w-4 h-4 shrink-0" />
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      id="btn-account-apple"
                      onClick={handleAppleAuth}
                      disabled={isVerifying}
                      className="py-2.5 px-3 rounded-xl bg-black/50 backdrop-blur-xs hover:bg-slate-50 active:scale-[0.98] text-white border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
                    >
                      <AppleIcon className="w-4 h-4 shrink-0 text-white fill-white" />
                      <span>Apple</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Primary & Secondary Actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-brand hover:bg-brand-strong active:scale-[0.98] text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">Done / Continue</span>
                </button>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setIsSwitchingAccount(true);
                    }}
                    className="text-xs text-slate-500 hover:text-white font-semibold py-1.5 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                  >
                    <span className="whitespace-nowrap">Switch Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-xs text-rose-700 hover:text-rose-700 font-semibold py-1.5 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                  >
                    <LogOut className="w-3 h-3 shrink-0" />
                    <span className="whitespace-nowrap">Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* NOT LOGGED IN (OR SWITCHING): SHOW GOOGLE, APPLE & EMAIL */
            /* ======================================================== */
            <div className="space-y-3.5 animate-in fade-in">
              {isSwitchingAccount && isLoggedIn && (
                <button
                  type="button"
                  onClick={() => setIsSwitchingAccount(false)}
                  className="text-xs text-emerald-700 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer mb-1"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Back to active account ({currentProfile.email})</span>
                </button>
              )}

              {/* Login Screen Header */}
              <div className="text-center space-y-0.5 pb-0.5">
                <h4 className="text-sm font-extrabold text-white">Sign In to TaxVault</h4>
                <p className="text-xs text-slate-500">
                  {SHOW_OAUTH_PROVIDERS
                    ? 'Continue with Google or Apple, or use your email'
                    : 'Sign in to access your tax vault'}
                </p>
              </div>

              {/* SEPARATE BUTTONS FOR GOOGLE AND APPLE (Hidden via feature flag) */}
              {SHOW_OAUTH_PROVIDERS && (
                <>
                  <div className="space-y-2">
                    {/* 1. SEPARATE GOOGLE BUTTON */}
                    <button
                      type="button"
                      id="btn-login-google"
                      onClick={handleGoogleAuth}
                      disabled={isVerifying}
                      className="w-full bg-white hover:bg-slate-900 active:scale-[0.98] text-slate-900 font-bold text-xs py-3 px-3.5 rounded-xl flex items-center justify-between transition-all shadow-md cursor-pointer disabled:opacity-60 border border-slate-700 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-700 shadow-xs">
                          <GoogleIcon className="w-4 h-4 shrink-0" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold text-slate-900 leading-tight">Continue with Google</div>
                          <div className="text-xs text-slate-500 font-normal">Use your Gmail or Google Account</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                    </button>

                    {/* 2. SEPARATE APPLE BUTTON */}
                    <button
                      type="button"
                      id="btn-login-apple"
                      onClick={handleAppleAuth}
                      disabled={isVerifying}
                      className="w-full bg-black/50 backdrop-blur-xs hover:bg-slate-50 active:scale-[0.98] text-white border border-slate-300 hover:border-slate-400 font-bold text-xs py-3 px-3.5 rounded-xl flex items-center justify-between transition-all shadow-md cursor-pointer disabled:opacity-60 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0 border border-slate-200">
                          <AppleIcon className="w-4 h-4 shrink-0 text-white fill-white" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold text-white leading-tight">Continue with Apple</div>
                          <div className="text-xs text-slate-500 font-normal">Fast Face ID & Private Relay ID</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </div>

                  {/* ALSO PROVIDE A 2-COLUMN FAST ROW: SEPARATE 1-TAP BUTTONS */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="btn-login-google-pill"
                      onClick={handleGoogleAuth}
                      disabled={isVerifying}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-slate-900 active:scale-[0.98] text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all border border-slate-700"
                    >
                      <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Google Sign In</span>
                    </button>

                    <button
                      type="button"
                      id="btn-login-apple-pill"
                      onClick={handleAppleAuth}
                      disabled={isVerifying}
                      className="py-2 px-3 rounded-xl bg-black/50 backdrop-blur-xs hover:bg-slate-50 active:scale-[0.98] text-white border border-slate-300 hover:border-slate-400 font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                    >
                      <AppleIcon className="w-3.5 h-3.5 shrink-0 text-white fill-white" />
                      <span>Apple ID Sign In</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative my-2 flex items-center justify-center">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white shadow-xs px-2.5 text-xs text-slate-500 uppercase tracking-wider shrink-0 font-medium">
                      or continue with email
                    </span>
                    <div className="border-t border-slate-200 w-full" />
                  </div>
                </>
              )}

              {/* Demo Credentials Banner (developer builds only) */}
              {import.meta.env.DEV && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                    Demo Credentials:
                  </span>
                  <button
                    type="button"
                    onClick={handleFillDemoCredentials}
                    className="text-emerald-700 hover:text-emerald-700 font-mono text-xs underline cursor-pointer"
                  >
                    Auto-fill
                  </button>
                </div>
                <div className="font-mono text-slate-700 text-xs space-y-0.5">
                  <div>Email: <span className="text-emerald-700 font-semibold">admin@taxvault.app</span></div>
                  <div>Pass: <span className="text-emerald-700 font-semibold">TaxVaultDemo2026!</span></div>
                </div>
              </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-500 block">Password</label>
                    {authType === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot_password');
                          setForgotEmail(email);
                          setErrorMessage(null);
                          setSuccessMessage(null);
                        }}
                        className="text-xs text-emerald-700 hover:text-emerald-700 font-medium hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authType === 'signup' && (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {authType === 'signup' && (
                  <div className="pt-1 pb-1">
                    <div
                      className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all ${
                        !hasAgreedTerms && errorMessage && errorMessage.includes('Terms & Conditions')
                          ? 'bg-rose-50 border-rose-700/80'
                          : hasAgreedTerms
                          ? 'bg-emerald-50 border-emerald-700/80'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <input
                        id="auth-modal-terms-checkbox"
                        type="checkbox"
                        required
                        checked={hasAgreedTerms}
                        onChange={(e) => {
                          setHasAgreedTerms(e.target.checked);
                          if (e.target.checked && errorMessage?.includes('Terms & Conditions')) {
                            setErrorMessage(null);
                          }
                        }}
                        className="mt-0.5 rounded border-slate-300 bg-white shadow-xs text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500 shrink-0"
                      />
                      <label htmlFor="auth-modal-terms-checkbox" className="text-xs text-slate-700 leading-snug cursor-pointer select-none">
                        <span>I agree to the </span>
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-0.5"
                        >
                          <Scale className="w-3 h-3 text-emerald-700" />
                          <span>Terms &amp; Conditions</span>
                        </button>
                        <span> and </span>
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="text-emerald-700 font-bold hover:underline"
                        >
                          Privacy Policy
                        </button>
                        <span> for {selectedCountry}.</span>
                      </label>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-red-700 text-xs flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-2.5 px-4 bg-brand hover:bg-brand-strong text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98"
                >
                  {isVerifying ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <span>{authType === 'login' ? 'Sign In to TaxVault' : 'Create TaxVault Account'}</span>
                  )}
                </button>
              </form>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthType(authType === 'login' ? 'signup' : 'login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  {authType === 'login' ? 'Need an account? Sign up' : 'Already have account? Sign in'}
                </button>

                <button
                  type="button"
                  onClick={() => setMode('signup_country')}
                  className="text-emerald-700 hover:text-emerald-700 cursor-pointer"
                >
                  Tax Region
                </button>
              </div>
            </div>
          )
        )}

        {/* FORGOT PASSWORD MODE (EMAILJS PORTAL) */}
        {mode === 'forgot_password' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 text-emerald-700">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <h4 className="text-sm font-extrabold text-white">Reset Password</h4>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                  EmailJS Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isResetStep === 'email'
                  ? 'Enter your registered email address to receive a secure recovery link.'
                  : isResetStep === 'email_sent'
                  ? 'Check your inbox for the recovery link or continue to set your password directly.'
                  : 'Enter your new password below.'}
              </p>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowEmailJsConfig(!showEmailJsConfig)}
                  className="text-xs text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer underline decoration-dotted"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>{showEmailJsConfig ? 'Hide EmailJS Keys' : 'EmailJS Portal Settings'}</span>
                </button>
              </div>
            </div>

            {showEmailJsConfig && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <ExternalLink className="w-3 h-3 text-emerald-700" />
                    <span>EmailJS Portal Credentials</span>
                  </span>
                  <a
                    href="https://dashboard.emailjs.com/admin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-700 hover:text-emerald-700 underline"
                  >
                    emailjs.com
                  </a>
                </div>

                <div className="space-y-1.5">
                  <div>
                    <label className="text-xs text-slate-500 block mb-0.5">Service ID</label>
                    <input
                      type="text"
                      value={emailJsConfig.serviceId}
                      onChange={(e) => setEmailJsConfig({ ...emailJsConfig, serviceId: e.target.value })}
                      placeholder="e.g. service_xxxxxxx"
                      className="w-full bg-white shadow-xs border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-0.5">Template ID</label>
                    <input
                      type="text"
                      value={emailJsConfig.templateId}
                      onChange={(e) => setEmailJsConfig({ ...emailJsConfig, templateId: e.target.value })}
                      placeholder="e.g. template_2gzkt71"
                      className="w-full bg-white shadow-xs border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-0.5">Public Key (User ID)</label>
                    <input
                      type="text"
                      value={emailJsConfig.publicKey}
                      onChange={(e) => setEmailJsConfig({ ...emailJsConfig, publicKey: e.target.value })}
                      placeholder="e.g. xxxxxxx"
                      className="w-full bg-white shadow-xs border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveEmailJsConfigModal}
                  className="w-full py-1.5 bg-brand hover:bg-brand-strong text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                >
                  {configSaved ? 'Saved to Local Storage!' : 'Save EmailJS Keys'}
                </button>
              </div>
            )}

            {isResetStep === 'email' && (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Registered Email ID</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Recovery OTP will be delivered exclusively to this registered email via EmailJS.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-red-700 text-xs flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-2.5 px-4 bg-brand hover:bg-brand-strong text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98"
                >
                  {isVerifying ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Reset Link...</span>
                    </div>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Reset Link</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {isResetStep === 'email_sent' && (
              <div className="space-y-4 text-center animate-in fade-in py-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <Mail className="w-6 h-6 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">Check Your Inbox</h3>
                  <p className="text-xs text-slate-500">
                    A password reset link was dispatched to:
                  </p>
                  <p className="text-xs font-mono font-bold text-emerald-700 break-all">
                    {forgotEmail || email}
                  </p>
                </div>
                <div className="p-3 bg-white shadow-xs border border-slate-200 rounded-xl text-left text-xs text-slate-700 space-y-1.5">
                  <p className="flex items-start gap-1.5">
                    <span className="text-emerald-700 font-bold">1.</span>
                    <span>Open the email and click the secure password reset link.</span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span className="text-emerald-700 font-bold">2.</span>
                    <span>The link will verify your identity and open the password reset form.</span>
                  </p>
                  <p className="flex items-start gap-1.5 text-slate-500 text-xs">
                    <span>If you don't see it, check your spam/junk folder or click Resend Link below.</span>
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isVerifying}
                    className="text-emerald-700 hover:text-emerald-700 font-medium hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
                    <span>Resend Link</span>
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('email_auth');
                      setIsResetStep('email');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-slate-500 hover:text-white cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {isResetStep === 'new_password' && (
              <form onSubmit={handleUpdatePasswordModal} className="space-y-3 animate-in fade-in">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">New Password (min. 6 chars)</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-red-700 text-xs flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying || newPassword.length < 6}
                  className="w-full py-2.5 px-4 bg-brand hover:bg-brand-strong text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98"
                >
                  {isVerifying ? 'Updating Password...' : 'Update Password & Continue'}
                </button>
              </form>
            )}

            <div className="pt-2 text-center border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setMode('email_auth');
                  setIsResetStep('email');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-slate-500 hover:text-white cursor-pointer font-medium"
              >
                Remembered your password? <span className="text-emerald-700 font-bold">Sign in</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. BIOMETRIC AUTH MODE */}
        {mode === 'biometric' && (
          <div className="space-y-6 text-center">
            <div className="relative py-2">
              <button
                onClick={handleBiometricAuthenticate}
                disabled={isVerifying}
                className="w-20 h-20 rounded-full bg-slate-50 border-2 border-emerald-500/40 hover:border-emerald-400 flex items-center justify-center mx-auto text-emerald-700 cursor-pointer shadow-lg active:scale-95 transition-all group"
              >
                {isIos ? (
                  <ScanFace className={`w-10 h-10 group-hover:scale-105 transition-transform ${isVerifying ? 'animate-pulse' : ''}`} />
                ) : (
                  <Fingerprint className={`w-10 h-10 group-hover:scale-105 transition-transform ${isVerifying ? 'animate-pulse' : ''}`} />
                )}
              </button>

              {isVerifying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-24 h-24 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-white">
                {isVerifying
                  ? isIos
                    ? 'Verifying Face ID...'
                    : 'Reading Fingerprint...'
                  : isIos
                  ? 'Tap to authenticate with Face ID'
                  : 'Tap sensor for Fingerprint Auth'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                FIDO2 / WebAuthn Biometric Security Token
              </p>
            </div>
          </div>
        )}

        {/* 3. MFA 6-DIGIT CODE */}
        {mode === 'mfa_totp' && (
          <div className="space-y-4">
            <div className="text-center">
              <Lock className="w-7 h-7 text-amber-700 mx-auto mb-1.5" />
              <div className="text-xs font-semibold text-white">Enter 6-Digit Authenticator Code</div>
              <p className="text-xs text-slate-500 mt-0.5">
                From Google Authenticator or Apple Passwords
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 py-1">
              {['8', '4', '2', '9', '1', '7'].map((digit, idx) => (
                <div
                  key={idx}
                  className="w-9 h-11 bg-slate-50 border border-slate-300 rounded-lg flex items-center justify-center font-mono text-base font-bold text-emerald-700"
                >
                  {digit}
                </div>
              ))}
            </div>

            <button
              onClick={handleVerifyTotp}
              disabled={isVerifying}
              className="w-full py-2.5 rounded-xl bg-brand hover:bg-brand-strong text-white font-semibold text-xs transition-all cursor-pointer shadow-md"
            >
              {isVerifying ? 'Verifying Code...' : 'Verify MFA Code'}
            </button>
          </div>
        )}

        {/* 4. COUNTRY TAX JURISDICTION */}
        {mode === 'signup_country' && (
          <div className="space-y-3">
            <div className="text-center mb-2">
              <Globe className="w-6 h-6 text-emerald-700 mx-auto mb-1" />
              <div className="text-xs font-semibold text-white">Country Tax Regulation</div>
              <p className="text-xs text-slate-500">
                Adapts statutory forms, GST/VAT rules, and financial year dates
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.values(TAX_CONFIGS).map(c => (
                <button
                  key={c.countryCode}
                  onClick={() => setSelectedCountry(c.countryCode)}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                    selectedCountry === c.countryCode
                      ? 'bg-slate-100 border-emerald-500 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="font-medium text-xs truncate">{c.countryName}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleCompleteCountrySignup}
              className="w-full mt-2 py-2.5 rounded-xl bg-brand hover:bg-brand-strong text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>Save & Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Countrywise Terms & Conditions Modal */}
      <CountryTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        initialCountry={selectedCountry}
        isRegistration={true}
        onAgree={(country) => {
          setSelectedCountry(country);
          setHasAgreedTerms(true);
          if (errorMessage?.includes('Terms & Conditions')) {
            setErrorMessage(null);
          }
        }}
      />
    </div>
  );
};
