import { SupportedCountry, CustomerAgreement } from '../types';
import { COUNTRY_TERMS, CountryTermsData } from '../constants/countryTerms';
import { supabaseService } from './supabaseService';
import { authedFetch } from './apiBase';

const CACHE_PREFIX = 'taxvault_terms_cache_v1_';
const AGREEMENTS_KEY = 'taxvault_customer_agreements_v1';

class TermsService {
  private inMemoryTerms: Partial<Record<SupportedCountry, CountryTermsData>> = {};

  /**
   * Fetches country terms directly from the database (/api/terms/:country or Supabase).
   * Falls back gracefully to cached database terms or local statutory defaults.
   */
  public async getCountryTerms(
    country: SupportedCountry,
    forceRefresh: boolean = false
  ): Promise<CountryTermsData & { isFromDatabase?: boolean; dbFetchedAt?: string }> {
    // 1. Check in-memory cache if not forcing refresh
    if (!forceRefresh && this.inMemoryTerms[country]) {
      return this.inMemoryTerms[country]!;
    }

    // 2. Try fetching from the database API (/api/terms/:country)
    try {
      const res = await authedFetch(`/api/terms/${encodeURIComponent(country)}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.success && json?.data) {
          const termsFromDb: CountryTermsData = json.data;
          this.inMemoryTerms[country] = {
            ...termsFromDb,
            isFromDatabase: true,
            dbFetchedAt: new Date().toISOString(),
          } as any;

          // Cache in localStorage
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(`${CACHE_PREFIX}${country}`, JSON.stringify(this.inMemoryTerms[country]));
            }
          } catch {}

          return this.inMemoryTerms[country]!;
        }
      }
    } catch {
      // Network or API not ready yet, continue to Supabase / Cache fallback
    }

    // 3. Try fetching from Supabase table directly
    try {
      const supaData = await supabaseService.fetchCountryTermsFromSupabase(country);
      if (supaData && supaData.sections) {
        const termsFromSupa: CountryTermsData = {
          countryCode: country,
          countryName: supaData.country_name || COUNTRY_TERMS[country].countryName,
          flag: COUNTRY_TERMS[country].flag,
          currency: COUNTRY_TERMS[country].currency,
          taxAuthority: supaData.tax_authority || COUNTRY_TERMS[country].taxAuthority,
          taxAuthorityPortal: COUNTRY_TERMS[country].taxAuthorityPortal,
          governingLaw: supaData.governing_law || COUNTRY_TERMS[country].governingLaw,
          retentionRequirement: COUNTRY_TERMS[country].retentionRequirement,
          lastUpdated: supaData.last_updated || COUNTRY_TERMS[country].lastUpdated,
          shortNotice: COUNTRY_TERMS[country].shortNotice,
          sections: Array.isArray(supaData.sections) ? supaData.sections : COUNTRY_TERMS[country].sections,
        };

        this.inMemoryTerms[country] = {
          ...termsFromSupa,
          isFromDatabase: true,
          dbFetchedAt: new Date().toISOString(),
        } as any;

        return this.inMemoryTerms[country]!;
      }
    } catch {
      // Continue to local cache
    }

    // 4. Try localStorage cache
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(`${CACHE_PREFIX}${country}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.countryCode === country && Array.isArray(parsed?.sections)) {
            this.inMemoryTerms[country] = parsed;
            return parsed;
          }
        }
      }
    } catch {}

    // 5. Default statutory knowledge base
    const defaultTerms = COUNTRY_TERMS[country] || COUNTRY_TERMS.NZ;
    this.inMemoryTerms[country] = {
      ...defaultTerms,
      isFromDatabase: false,
    } as any;

    return this.inMemoryTerms[country]!;
  }

  /**
   * Fetches all country terms from database
   */
  public async getAllCountryTerms(): Promise<Record<SupportedCountry, CountryTermsData>> {
    try {
      const res = await authedFetch('/api/terms', { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json?.data) {
          return json.data;
        }
      }
    } catch {}

    return COUNTRY_TERMS;
  }

  /**
   * Saves a customer agreement in the database:
   * 1. Posts to Backend API Database (/api/agreements)
   * 2. Saves to Supabase Cloud Database (activity_logs + customer_agreements)
   * 3. Stores in local browser storage for offline access
   */
  public async recordCustomerAgreement(params: {
    userId?: string;
    userEmail: string;
    userName?: string;
    country: SupportedCountry;
    taxAuthority: string;
    termsVersion?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; agreement: CustomerAgreement; error?: string }> {
    const agreementId = `agr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const agreedAt = new Date().toISOString();

    const devicePlatform =
      typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
        ? 'android'
        : typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
        ? 'ios'
        : 'web';

    const agreement: CustomerAgreement = {
      id: agreementId,
      userId: params.userId,
      userEmail: params.userEmail.trim().toLowerCase(),
      userName: params.userName?.trim(),
      country: params.country,
      taxAuthority: params.taxAuthority,
      termsVersion: params.termsVersion || '2026.1',
      agreedAt,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      devicePlatform,
      metadata: {
        ...(params.metadata || {}),
        timestamp: Date.now(),
        clientLanguage: typeof navigator !== 'undefined' ? navigator.language : undefined,
      },
      createdAt: agreedAt,
    };

    // 1. Save to Backend Database API (/api/agreements)
    try {
      await authedFetch('/api/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agreement),
      });
    } catch (apiErr) {
      console.warn('Backend agreements database POST notice:', apiErr);
    }

    // 2. Save to Supabase Cloud Database (activity_logs & customer_agreements)
    try {
      await supabaseService.recordCustomerAgreementInSupabase(agreement);
    } catch (supaErr) {
      console.warn('Supabase consent audit notice:', supaErr);
    }

    // 3. Save locally in localStorage for fast retrieval & offline resilience
    try {
      if (typeof localStorage !== 'undefined') {
        const existing = this.getLocalAgreements();
        const updated = [agreement, ...existing.filter((a) => a.id !== agreement.id)];
        localStorage.setItem(AGREEMENTS_KEY, JSON.stringify(updated));
        localStorage.setItem(`taxvault_user_agreement_${agreement.userEmail}`, JSON.stringify(agreement));
      }
    } catch {}

    return { success: true, agreement };
  }

  /**
   * Fetches recorded agreements from database / cache for a user
   */
  public async getCustomerAgreements(emailOrUserId?: string): Promise<CustomerAgreement[]> {
    const clean = emailOrUserId?.trim().toLowerCase();

    // 1. Try backend database endpoint
    try {
      const url = clean ? `/api/agreements?query=${encodeURIComponent(clean)}` : '/api/agreements';
      const res = await authedFetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json?.data)) {
          return json.data;
        }
      }
    } catch {}

    // 2. Fallback to localStorage
    const local = this.getLocalAgreements();
    if (!clean) return local;

    return local.filter(
      (a) => a.userEmail.toLowerCase() === clean || (a.userId && a.userId === clean)
    );
  }

  private getLocalAgreements(): CustomerAgreement[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(AGREEMENTS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {}
    return [];
  }
}

export const termsService = new TermsService();
