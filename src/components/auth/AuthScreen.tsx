import React, { useState, useEffect } from 'react';
import {
  Shield,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  User,
  Globe,
  Sparkles,
  Lock,
  ShieldCheck,
  Send,
  SlidersHorizontal,
  RefreshCw,
  ExternalLink,
  Scale,
} from 'lucide-react';
import { SupportedCountry, UserProfile } from '../../types';
import { TAX_CONFIGS } from '../../services/taxRules';
import { supabaseService } from '../../services/supabaseService';
import { emailJsService } from '../../services/emailJsService';
import { DEFAULT_PROFILES, DEFAULT_INDIAN_PROFILE, createCleanUserProfile, savePendingSignupProfile, takePendingSignupProfile } from '../../services/storageService';
import { CountryTermsModal } from '../legal/CountryTermsModal';
import { termsService } from '../../services/termsService';
import { apiUrl } from '../../services/apiBase';

interface AuthScreenProps {
  onAuthenticated: (profile?: Partial<UserProfile>) => void;
  currentProfile?: UserProfile;
}

const COUNTRY_OPTIONS: { code: SupportedCountry; name: string; flag: string; authority: string }[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', authority: 'GSTN (18% GST)' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', authority: 'IRD (15% GST)' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', authority: 'ATO (10% GST)' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', authority: 'CRA (GST/HST)' },
  { code: 'US', name: 'United States', flag: '🇺🇸', authority: 'IRS (Sales Tax)' },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, currentProfile }) => {
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot' | 'email-sent' | 'reset-password'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const href = window.location.href || '';
      if (
        hash.includes('type=recovery') ||
        hash.includes('access_token=') ||
        search.includes('type=recovery') ||
        search.includes('recovery') ||
        href.includes('type=recovery') ||
        href.includes('recovery')
      ) {
        return 'reset-password';
      }
    }
    return 'login';
  });

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Forgot Password & EmailJS Portal State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [showEmailJsConfig, setShowEmailJsConfig] = useState(false);
  const [emailJsConfig, setEmailJsConfig] = useState(emailJsService.getConfig());
  const [configSaved, setConfigSaved] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // Reset Password (Recovery) Form State
  const [resetEmail, setResetEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = sessionStorage.getItem('taxvault_emailjs_challenge');
        if (item) {
          const c = JSON.parse(item);
          if (c?.email) return c.email;
        }
        const lastAuth = localStorage.getItem('taxvault_last_auth_email');
        if (lastAuth) return lastAuth;
        const params = new URLSearchParams(window.location.search);
        if (params.get('email')) return params.get('email')!;
      } catch {}
    }
    return '';
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Signup Form State
  const [signupFullName, setSignupFullName] = useState('');
  const [signupBusinessName, setSignupBusinessName] = useState('');
  const [signupCountry, setSignupCountry] = useState<SupportedCountry>('IN');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Feedback State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeRecoveryLink, setActiveRecoveryLink] = useState<string | null>(null);
  const [emailDeliveryNotice, setEmailDeliveryNotice] = useState<string | null>(null);

  // Recovery link detector
  useEffect(() => {
    const checkRecovery = () => {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const href = window.location.href || '';
        if (
          hash.includes('type=recovery') ||
          hash.includes('access_token=') ||
          search.includes('type=recovery') ||
          search.includes('recovery') ||
          href.includes('type=recovery') ||
          href.includes('recovery')
        ) {
          setTab('reset-password');
        }
        const params = new URLSearchParams(window.location.search);
        let emailFromUrl = params.get('email');
        if (!emailFromUrl && hash) {
          const cleanHash = hash.replace(/^#+/, '');
          const hashParams = new URLSearchParams(cleanHash.includes('?') ? cleanHash.split('?')[1] : cleanHash);
          emailFromUrl = hashParams.get('email');
        }
        if (emailFromUrl) {
          setResetEmail(emailFromUrl);
          setForgotEmail(emailFromUrl);
        }
      }
    };

    checkRecovery();
    window.addEventListener('hashchange', checkRecovery);

    const client = supabaseService.getClient();
    if (client) {
      const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
        const currentHref = typeof window !== 'undefined' ? window.location.href : '';
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && currentHref.includes('recovery'))) {
          setTab('reset-password');
          if (session?.user?.email) {
            setResetEmail(session.user.email);
            setForgotEmail(session.user.email);
          }
        }
      });
      return () => {
        window.removeEventListener('hashchange', checkRecovery);
        authListener?.subscription.unsubscribe();
      };
    }
    return () => {
      window.removeEventListener('hashchange', checkRecovery);
    };
  }, []);

  // Sync resetEmail whenever entering reset-password tab
  useEffect(() => {
    if (tab === 'reset-password' && !resetEmail) {
      const challenge = emailJsService.getActiveChallenge();
      if (challenge?.email) {
        setResetEmail(challenge.email);
      } else if (forgotEmail) {
        setResetEmail(forgotEmail);
      } else if (loginEmail) {
        setResetEmail(loginEmail);
      } else if (typeof window !== 'undefined') {
        const last = localStorage.getItem('taxvault_last_auth_email');
        if (last) setResetEmail(last);
      }
    }
  }, [tab, forgotEmail, loginEmail, resetEmail]);

  // Handle Login Submission
  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const cleanEmail = loginEmail.trim().toLowerCase();

      // 1. Try Supabase Auth
      const res = await supabaseService.signInWithEmail(cleanEmail, loginPassword);

      if (res.error) {
        // Disallow login on incorrect credentials or authentication failure
        if (res.error.toLowerCase().includes('invalid login credentials')) {
          setErrorMessage('Invalid email or password. Please verify your credentials and try again.');
        } else if (res.error.toLowerCase().includes('email not confirmed')) {
          setErrorMessage('Your email has not been confirmed yet. Please check your inbox for the confirmation link.');
        } else {
          setErrorMessage(res.error);
        }
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Signed in successfully! Loading your dashboard...');

      // 2. Fetch or construct user profile strictly matching authenticated user
      const userRes = await supabaseService.getCurrentUser();
      const authenticatedEmail = (userRes?.email || cleanEmail).toLowerCase();
      const authenticatedUserId = userRes?.id;

      const profileRes = await supabaseService.fetchProfile(authenticatedUserId, authenticatedEmail);
      let userProfile = profileRes.profile;

      // Ensure profile strictly matches the logged in email; never use another account's profile
      if (userProfile && userProfile.email && userProfile.email.toLowerCase() !== authenticatedEmail) {
        userProfile = null;
      }

      if (!userProfile) {
        // First sign-in after confirming the email: use the details entered at sign-up
        userProfile = takePendingSignupProfile(authenticatedEmail, authenticatedUserId) || createCleanUserProfile(
          authenticatedEmail,
          undefined,
          'IN',
          authenticatedUserId
        );
        await supabaseService.upsertProfile(userProfile).catch(() => {});
      }

      setTimeout(() => {
        onAuthenticated(userProfile || undefined);
      }, 600);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err?.message || 'Login failed. Please check your credentials and internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up Submission
  const handleSignupSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!signupEmail.trim() || !signupPassword.trim() || !signupConfirmPassword.trim()) {
      setErrorMessage('Please fill in all required fields including password confirmation.');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both passwords match.');
      return;
    }
    if (!hasAgreedTerms) {
      const countryConfig = TAX_CONFIGS[signupCountry] || TAX_CONFIGS['IN'];
      setErrorMessage(`Please tick the checkbox to agree to the Terms & Conditions and Privacy Policy for ${countryConfig.countryName} before registering.`);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const cleanEmail = signupEmail.trim().toLowerCase();

      // 1. Try Supabase signup
      const res = await supabaseService.signUpWithEmail(cleanEmail, signupPassword);
      if (res.error) {
        if (res.error.toLowerCase().includes('already registered')) {
          setErrorMessage('This email is already registered. Please sign in or use password reset.');
          setIsLoading(false);
          return;
        } else if (!res.error.toLowerCase().includes('confirmation') && !res.error.toLowerCase().includes('confirm')) {
          setErrorMessage(res.error);
          setIsLoading(false);
          return;
        }
      }

      const countryConfig = TAX_CONFIGS[signupCountry] || TAX_CONFIGS['IN'];
      const defaultForCountry = DEFAULT_PROFILES[signupCountry] || DEFAULT_INDIAN_PROFILE;

      const newProfile: UserProfile = {
        ...defaultForCountry,
        id: res.user?.id || `usr_${signupCountry.toLowerCase()}_${Date.now().toString(36)}`,
        fullName: signupFullName.trim() || cleanEmail.split('@')[0],
        businessName: signupBusinessName.trim() || `${signupFullName.trim() || 'My'} Business`,
        country: signupCountry,
        email: cleanEmail,
        taxId: '',
        secondaryTaxId: '',
        pan: '',
        gstin: '',
        gstRegistered: false,
        gstNumber: '',
        taxNumber: '',
        accountantName: undefined,
        accountantEmail: undefined,
        accountantPhone: undefined,
        defaultCurrency: countryConfig.currencyCode,
        currencySymbol: countryConfig.currencySymbol,
        taxAuthority: countryConfig.taxAuthority,
        authProvider: 'email',
        subscription: {
          tier: 'free',
          billingCycle: 'monthly',
          status: 'active',
          receiptsScannedThisMonth: 0,
          monthlyReceiptLimit: 10,
        },
        termsAccepted: true,
        termsAcceptedDate: new Date().toISOString(),
        termsAcceptedCountry: signupCountry,
      };

      // Save customer statutory agreement into database (POST /api/agreements + Supabase activity ledger)
      try {
        const agreementRes = await termsService.recordCustomerAgreement({
          userId: newProfile.id,
          userEmail: cleanEmail,
          userName: signupFullName.trim() || undefined,
          country: signupCountry,
          taxAuthority: countryConfig.taxAuthority,
          termsVersion: '2026.1',
          metadata: {
            businessName: signupBusinessName.trim() || undefined,
            registeredAt: new Date().toISOString(),
          },
        });
        if (agreementRes?.agreement?.agreedAt) {
          newProfile.termsAcceptedDate = agreementRes.agreement.agreedAt;
        }
      } catch (agrErr) {
        console.warn('Customer agreement database save notice:', agrErr);
      }

      // Without a session yet (email confirmation pending) RLS rejects this; keep the details
      // on the device and save them on the first sign-in instead.
      const savedProfile = await supabaseService.upsertProfile(newProfile).catch(() => ({ success: false }));
      if (!savedProfile.success) savePendingSignupProfile(newProfile);

      // No session means the email still has to be confirmed; the account can't use the server until then
      if (!res.session) {
        setLoginEmail(cleanEmail);
        setLoginPassword('');
        setTab('login');
        setSuccessMessage(`Almost done. We sent a confirmation link to ${cleanEmail}. Open it, then sign in here.`);
        return;
      }

      setSuccessMessage('Account created successfully! Welcome to TaxVault.');

      setTimeout(() => {
        onAuthenticated(newProfile);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password Submission (Send recovery link & show Email Sent confirmation screen)
  const handleForgotPasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = forgotEmail.trim() || resetEmail.trim() || loginEmail.trim();
    if (!targetEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setResetEmail(targetEmail);
    if (typeof window !== 'undefined') {
      localStorage.setItem('taxvault_last_auth_email', targetEmail);
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSimulatedCode(null);

    try {
      // 1. Dispatch via server endpoint (handles direct SMTP + Supabase admin link generation)
      let sentDirectly = false;
      try {
        const resp = await fetch(apiUrl('/api/auth/send-reset-link'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail }),
        });
        const data = await resp.json();
        if (data?.recoveryLink) {
          setActiveRecoveryLink(data.recoveryLink);
        }
        if (data?.sentDirectly) {
          sentDirectly = true;
          setEmailDeliveryNotice(null);
        }
      } catch (apiErr) {
        console.warn('Backend send-reset-link notice:', apiErr);
      }

      // 2. Only a Supabase-issued recovery link can authorise a password change, so no
      //    client-generated codes are emailed. Supabase's own mailer is the fallback below.
      setEmailDeliveryNotice(sentDirectly ? null : 'Check your inbox and spam folder for the reset link.');

      // 3. Also trigger Supabase client reset password directly for link redundancy
      try {
        await supabaseService.resetPasswordForEmail(targetEmail);
      } catch (e) {
        // Suppress non-critical warning
      }

      setForgotSent(true);
      setTab('email-sent');
      setSuccessMessage(`Recovery request dispatched for ${targetEmail}!`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send recovery email. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Saving EmailJS Configuration
  const handleSaveEmailJsConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    emailJsService.setConfig(emailJsConfig);
    setConfigSaved(true);
    setSuccessMessage('EmailJS portal configuration saved successfully!');
    setTimeout(() => {
      setConfigSaved(false);
      setShowEmailJsConfig(false);
    }, 1200);
  };

  // Handle Setting New Password (Recovery Session)
  const handleResetPasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const challenge = emailJsService.getActiveChallenge();
    const targetEmail = (
      resetEmail.trim() ||
      forgotEmail.trim() ||
      challenge?.email ||
      loginEmail.trim() ||
      (typeof window !== 'undefined' ? localStorage.getItem('taxvault_last_auth_email') || '' : '')
    ).toLowerCase().trim();

    if (!targetEmail) {
      setErrorMessage('Please enter your registered account email address to update your password.');
      return;
    }
    if (!newPassword.trim()) {
      setErrorMessage('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await supabaseService.updatePassword(newPassword, targetEmail);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update password in authentication system.');
        return;
      }

      emailJsService.clearChallenge();
      if (typeof window !== 'undefined') {
        localStorage.setItem('taxvault_last_auth_email', targetEmail);
      }

      setSuccessMessage('Password saved successfully! Logging you in automatically...');
      
      // Clean up URL parameters (remove recovery tokens from address bar)
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }

      // Fetch existing profile or create a clean one for immediate dashboard launch
      const userRes = await supabaseService.getCurrentUser().catch(() => null);
      const uid = userRes?.id;
      const profileRes = await supabaseService.fetchProfile(uid, targetEmail).catch(() => ({ profile: null }));
      
      let authenticatedProfile = profileRes.profile;
      if (!authenticatedProfile) {
        authenticatedProfile = takePendingSignupProfile(targetEmail, uid) || createCleanUserProfile(targetEmail, targetEmail.split('@')[0], currentProfile?.country || 'IN', uid);
        await supabaseService.upsertProfile(authenticatedProfile).catch(() => {});
      }

      // Instant seamless auto-login straight into TaxVault dashboard
      setTimeout(() => {
        onAuthenticated(authenticatedProfile);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Access Handler
  const handleQuickDemoLogin = (country: SupportedCountry) => {
    setIsLoading(true);
    setErrorMessage(null);
    const demoProfile = DEFAULT_PROFILES[country] || DEFAULT_INDIAN_PROFILE;
    setSuccessMessage(`Signing in as ${demoProfile.fullName} (${demoProfile.country})...`);

    setTimeout(() => {
      onAuthenticated(demoProfile);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--color-canvas)] text-slate-900 flex flex-col justify-center items-center px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] select-none font-sans">
      <div className="relative w-full max-w-sm z-10 space-y-7">
        {/* Brand Header */}
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center mx-auto text-white shadow-sm">
            <Shield className="w-7 h-7" strokeWidth={2.25} />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">
              TaxVault
            </h1>
            <p className="text-sm text-slate-500">
              Receipts, expenses and tax, in one place.
            </p>
          </div>
        </div>

        {/* Auth Mode Toggle: Sign In / Create Account / Recovery */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          {tab === 'forgot' || tab === 'email-sent' || tab === 'reset-password' ? (
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors cursor-pointer py-1"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span>Back to Sign In</span>
              </button>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {tab === 'forgot' ? 'Account Recovery' : tab === 'email-sent' ? 'Email Sent' : 'Reset Password'}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-sm">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  tab === 'login'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  tab === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <span>Create Account</span>
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* --- TAB 1: SIGN IN FORM --- */}
          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-sm font-medium text-slate-700 block">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 font-medium focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setForgotEmail(loginEmail);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-700 hover:underline cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 pr-10 text-base text-slate-900 placeholder:text-slate-500 font-mono focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 p-2.5 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand hover:bg-brand-strong active:scale-[0.99] disabled:opacity-50 text-white font-semibold h-12 px-4 rounded-xl text-base transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                  </>
                )}
              </button>

              {/* Quick Demo Access Section (developer builds only: these are fictional on-device profiles) */}
              {import.meta.env.DEV && (
              <div className="pt-3.5 border-t border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Instant Demo Accounts</span>
                  </span>
                  <span className="text-xs text-slate-500 font-medium">1-click login</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('IN')}
                    disabled={isLoading}
                    className="w-full p-3 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-xl text-left flex items-center justify-between text-xs transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">🇮🇳</span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                          Rajesh Sharma · Sharma Tech
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate">
                          rajesh@sharmatech.in · 18% GSTN
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                      Sign In
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('NZ')}
                    disabled={isLoading}
                    className="w-full p-3 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-xl text-left flex items-center justify-between text-xs transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">🇳🇿</span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                          Liam McKenzie · McKenzie Digital
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate">
                          liam@mckenziedigital.co.nz · 15% IRD
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                      Sign In
                    </span>
                  </button>
                </div>
              </div>
              )}
            </form>
          )}

          {/* --- TAB 2: CREATE ACCOUNT FORM --- */}
          {tab === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 font-medium focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Business Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={signupBusinessName}
                    onChange={(e) => setSignupBusinessName(e.target.value)}
                    placeholder="e.g. Sharma Tech"
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 font-medium focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Tax Jurisdiction & Country Select - HIGH CONTRAST DARK FONT */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tax Jurisdiction & Country</span>
                </label>
                <div className="relative">
                  <select
                    id="signup-country-select"
                    value={signupCountry}
                    onChange={(e) => setSignupCountry(e.target.value as SupportedCountry)}
                    className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none transition-all cursor-pointer shadow-2xs"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option
                        key={c.code}
                        value={c.code}
                        className="bg-white text-slate-900 font-semibold py-1.5"
                      >
                        {c.flag} {c.name} — {c.authority}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 font-medium focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Password (min. 6 chars)</span>
                </label>
                <div className="relative">
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a secure password"
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 pr-10 text-base text-slate-900 placeholder:text-slate-500 font-mono focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Confirm Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showSignupConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className={`w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border rounded-xl px-3.5 py-2 pr-10 text-xs text-slate-900 placeholder:text-slate-500 font-mono focus:outline-none transition-all ${
                      signupConfirmPassword && signupPassword !== signupConfirmPassword
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : signupConfirmPassword && signupPassword === signupConfirmPassword
                        ? 'border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                        : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showSignupConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {signupConfirmPassword && signupPassword !== signupConfirmPassword && (
                  <p className="text-xs text-rose-700 font-semibold flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                    <span>Passwords do not match</span>
                  </p>
                )}
                {signupConfirmPassword && signupPassword === signupConfirmPassword && (
                  <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Passwords match</span>
                  </p>
                )}
              </div>

              {/* Mandatory Countrywise Terms & Conditions Agreement Checkbox */}
              <div className="pt-2 pb-1 space-y-1.5">
                <div
                  className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all ${
                    !hasAgreedTerms && errorMessage && errorMessage.includes('Terms & Conditions')
                      ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20'
                      : hasAgreedTerms
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-slate-50/80 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <input
                    id="signup-terms-checkbox"
                    type="checkbox"
                    required
                    checked={hasAgreedTerms}
                    onChange={(e) => {
                      setHasAgreedTerms(e.target.checked);
                      if (e.target.checked && errorMessage?.includes('Terms & Conditions')) {
                        setErrorMessage(null);
                      }
                    }}
                    className="mt-0.5 w-4 h-4 text-emerald-700 bg-white border-slate-300 rounded focus:ring-2 focus:ring-emerald-500/30 cursor-pointer accent-emerald-600 shrink-0"
                  />
                  <label htmlFor="signup-terms-checkbox" className="text-xs text-slate-700 leading-snug cursor-pointer select-none">
                    <span>I agree to the </span>
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      <Scale className="w-3 h-3 text-emerald-700 shrink-0" />
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
                    <span> for {TAX_CONFIGS[signupCountry]?.countryName || 'your country'} ({COUNTRY_OPTIONS.find((c) => c.code === signupCountry)?.flag || '🌐'} {signupCountry}).</span>
                  </label>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span className="flex items-center gap-1">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span>Includes {TAX_CONFIGS[signupCountry]?.taxAuthority || 'Tax Authority'} record keeping &amp; disclaimer</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Read Terms →
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand hover:bg-brand-strong active:scale-[0.99] disabled:opacity-50 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 mt-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create Free Account</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* --- TAB 3: FORGOT PASSWORD FORM (EMAILJS PORTAL RECOVERY) --- */}
          {tab === 'forgot' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1 pb-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 border border-emerald-200 shadow-xs">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900">Forgot Your Password?</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                    emailJsService.isConfigured()
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${emailJsService.isConfigured() ? 'bg-brand' : 'bg-amber-500 animate-pulse'}`} />
                    <span>EmailJS Portal</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  {forgotSent
                    ? 'Enter the 6-digit verification code sent to your registered email address via the EmailJS portal.'
                    : 'Enter your registered email ID. An official, secure recovery code will be dispatched via the EmailJS portal.'}
                </p>

                {/* EmailJS Configuration Toggle */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowEmailJsConfig(!showEmailJsConfig)}
                    className="text-xs font-bold text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer underline decoration-dotted"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>{showEmailJsConfig ? 'Hide EmailJS Keys' : 'EmailJS Portal Settings'}</span>
                  </button>
                </div>
              </div>

              {/* EmailJS Credentials Drawer */}
              {showEmailJsConfig && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                      <span>EmailJS Portal Credentials</span>
                    </span>
                    <a
                      href="https://dashboard.emailjs.com/admin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-700 underline"
                    >
                      emailjs.com/admin
                    </a>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-0.5">Service ID</label>
                      <input
                        type="text"
                        value={emailJsConfig.serviceId}
                        onChange={(e) => setEmailJsConfig({ ...emailJsConfig, serviceId: e.target.value })}
                        placeholder="e.g. service_xxxxxxx"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-0.5">Template ID</label>
                      <input
                        type="text"
                        value={emailJsConfig.templateId}
                        onChange={(e) => setEmailJsConfig({ ...emailJsConfig, templateId: e.target.value })}
                        placeholder="e.g. template_xxxxxxx"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-0.5">Public Key (User ID)</label>
                      <input
                        type="text"
                        value={emailJsConfig.publicKey}
                        onChange={(e) => setEmailJsConfig({ ...emailJsConfig, publicKey: e.target.value })}
                        placeholder="e.g. xxxxxxx"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-normal">
                    Supported template variables in your EmailJS template: <code className="bg-slate-200 px-1 rounded text-slate-800">{'{{to_email}}'}</code>, <code className="bg-slate-200 px-1 rounded text-slate-800">{'{{passcode}}'}</code>, <code className="bg-slate-200 px-1 rounded text-slate-800">{'{{reset_link}}'}</code>.
                  </p>

                  <button
                    type="button"
                    onClick={handleSaveEmailJsConfig}
                    className="w-full py-2 bg-brand hover:bg-brand-strong text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    {configSaved ? 'Saved to Local Storage!' : 'Save EmailJS Portal Keys'}
                  </button>
                </div>
              )}

              {/* Simulated Code Developer Helper Banner */}
              {simulatedCode && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-emerald-800 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                      <span>EmailJS Test Mode Code</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setResetCode(simulatedCode)}
                      className="text-xs bg-brand text-white px-2 py-0.5 rounded font-extrabold hover:bg-brand-strong cursor-pointer"
                    >
                      Auto-Fill Code
                    </button>
                  </div>
                  <div className="font-mono text-base font-black text-emerald-950 tracking-wider">
                    {simulatedCode}
                  </div>
                  <div className="text-xs text-emerald-700">
                    Keys not yet configured in EmailJS settings. Code generated and ready to test!
                  </div>
                </div>
              )}

              {/* DIRECT RESET LINK FORM (NO OTP STEP) */}
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Registered Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 font-medium focus:outline-none transition-all"
                  />
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    A secure password reset link will be sent to your email. You must open that link to verify your identity and set a new password.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-brand hover:bg-brand-strong active:scale-[0.99] disabled:opacity-50 text-white font-semibold h-12 px-4 rounded-xl text-base transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Sending Reset Link...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Reset Link</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  Remembered your password? <span className="text-emerald-700 font-extrabold">Sign in</span>
                </button>
              </div>
            </div>
          )}

          {/* --- TAB: EMAIL SENT CONFIRMATION SCREEN --- */}
          {tab === 'email-sent' && (
            <div className="space-y-5 text-center animate-in fade-in zoom-in-95 duration-200 py-2">
              <div className="relative inline-block">
                <div className="w-16 h-16 rounded-2xl bg-brand text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/25">
                  <Mail className="w-8 h-8 animate-bounce" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Check Your Email</h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  We've sent a password reset link to:
                </p>
                <div className="inline-block bg-slate-100/90 border border-slate-200 rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold text-slate-800 break-all max-w-full">
                  {forgotEmail || resetEmail}
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-left space-y-2">
                <div className="flex items-start gap-2.5 text-xs text-emerald-950 font-medium">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                  <span>Open your email inbox and click the password reset link inside.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-emerald-950 font-medium">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                  <span><strong>Important:</strong> Check your <strong>Spam / Junk folder</strong> if the email is not in your Inbox.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-emerald-950 font-medium">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                  <span>The link will verify your identity with Supabase and open the new password screen.</span>
                </div>
              </div>

              {/* Email delivery diagnostic notice (shows if EmailJS has Gmail scope issue) */}
              {emailDeliveryNotice && (
                <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-left space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Email Delivery Alert</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {emailDeliveryNotice}
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Supabase's backup mailer dispatched the reset email. Please look in your <strong>Spam / Junk folder</strong>.
                  </p>
                </div>
              )}

              {/* Developer Test Link for Immediate Local Verification */}
              {activeRecoveryLink && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Direct Recovery Link</span>
                    </span>
                    <span className="text-xs font-mono text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                      Supabase Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    If email delivery is delayed, click the verified Supabase recovery link below to test:
                  </p>
                  <a
                    href={activeRecoveryLink}
                    className="block p-2 text-center bg-brand hover:bg-brand-strong text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                  >
                    Open Supabase Recovery Link →
                  </a>
                </div>
              )}

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-center gap-4 text-xs font-bold pt-1">
                  <button
                    type="button"
                    onClick={handleForgotPasswordSubmit}
                    disabled={isLoading}
                    className="text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Resend Link</span>
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 4: SET NEW PASSWORD FORM (PASSWORD RECOVERY SESSION) --- */}
          {tab === 'reset-password' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1 pb-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 border border-emerald-200 shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-base font-extrabold text-slate-900">Create New Password</h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Your recovery token has been validated. Enter your new password below.
                </p>
              </div>

              {/* Registered Account Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Registered Account Email</span>
                  </span>
                  {resetEmail && (
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Target Account
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter registered email (e.g. user@example.com)"
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 font-medium focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                  <span>New Password (min 6 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 pr-10 text-base text-slate-900 placeholder:text-slate-500 font-mono focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand hover:bg-brand-strong active:scale-[0.99] disabled:opacity-50 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 mt-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving & Logging In...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Password & Launch App</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Supported countries & legal */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <span>Available in</span>
            <span className="flex items-center gap-1.5 text-base leading-none" aria-label="New Zealand, Australia, Canada, United States and India">
              <span aria-hidden="true">🇳🇿</span>
              <span aria-hidden="true">🇦🇺</span>
              <span aria-hidden="true">🇨🇦</span>
              <span aria-hidden="true">🇺🇸</span>
              <span aria-hidden="true">🇮🇳</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="text-xs text-slate-500 hover:text-emerald-700 underline underline-offset-2 decoration-slate-300 transition-colors cursor-pointer py-1"
          >
            Terms of Service &amp; Privacy
          </button>
        </div>
      </div>

      {/* Countrywise Terms & Conditions Modal */}
      <CountryTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        initialCountry={signupCountry}
        isRegistration={true}
        onAgree={(country) => {
          setSignupCountry(country);
          setHasAgreedTerms(true);
          if (errorMessage?.includes('Terms & Conditions')) {
            setErrorMessage(null);
          }
        }}
      />
    </div>
  );
};
