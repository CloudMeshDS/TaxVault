import { ExchangeRates } from '../types';

// Fallback rates relative to NZD base (1 NZD = X foreign currency)
export const DEFAULT_RATES_FROM_NZD: Record<string, number> = {
  NZD: 1.0,
  AUD: 0.925,
  USD: 0.602,
  EUR: 0.554,
  GBP: 0.472,
  CAD: 0.819,
  JPY: 93.45,
  SGD: 0.808,
  HKD: 4.71,
  CNY: 4.36,
};

// Rates relative to USD base
export const DEFAULT_RATES_FROM_USD: Record<string, number> = {
  USD: 1.0,
  NZD: 1.661,
  AUD: 1.536,
  EUR: 0.920,
  GBP: 0.784,
  CAD: 1.360,
  JPY: 155.20,
  SGD: 1.342,
};

export const SUPPORTED_CURRENCIES = [
  { code: 'NZD', name: 'New Zealand Dollar', symbol: '$', flag: '🇳🇿' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$', flag: '🇦🇺' },
  { code: 'USD', name: 'United States Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$', flag: '🇨🇦' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: '$', flag: '🇸🇬' },
];

class CurrencyService {
  private ratesCache: ExchangeRates = {
    base: 'NZD',
    date: new Date().toISOString().split('T')[0],
    rates: { ...DEFAULT_RATES_FROM_NZD },
  };

  /**
   * Convert an amount from fromCurrency to toCurrency
   */
  public convert(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency || amount === 0) return amount;

    const base = this.ratesCache.base; // NZD
    const fromRate = this.ratesCache.rates[fromCurrency] || 1;
    const toRate = this.ratesCache.rates[toCurrency] || 1;

    // Convert from fromCurrency to Base, then Base to toCurrency
    const amountInBase = fromCurrency === base ? amount : amount / fromRate;
    const finalAmount = toCurrency === base ? amountInBase : amountInBase * toRate;

    return Math.round(finalAmount * 100) / 100;
  }

  /**
   * Get direct exchange rate between two currencies (1 From = X To)
   */
  public getExchangeRate(fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return 1.0;
    const base = this.ratesCache.base;
    const fromRate = this.ratesCache.rates[fromCurrency] || 1;
    const toRate = this.ratesCache.rates[toCurrency] || 1;
    const rate = toRate / fromRate;
    return Math.round(rate * 10000) / 10000;
  }

  /**
   * Fetch current exchange rates (attempts open exchange API with graceful offline fallback)
   */
  public async fetchLiveRates(baseCurrency: string = 'NZD'): Promise<ExchangeRates> {
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3500),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.rates) {
          this.ratesCache = {
            base: baseCurrency,
            date: new Date().toISOString(),
            rates: data.rates,
          };
          return this.ratesCache;
        }
      }
    } catch {
      // Offline or network timeout - use cached or fallback rates
    }

    // Fallback: adapt fallback rates
    const baseFactor = DEFAULT_RATES_FROM_NZD[baseCurrency] || 1;
    const adaptedRates: Record<string, number> = {};
    for (const [curr, r] of Object.entries(DEFAULT_RATES_FROM_NZD)) {
      adaptedRates[curr] = Math.round((r / baseFactor) * 10000) / 10000;
    }

    this.ratesCache = {
      base: baseCurrency,
      date: new Date().toISOString(),
      rates: adaptedRates,
    };
    return this.ratesCache;
  }

  public getCachedRates(): ExchangeRates {
    return this.ratesCache;
  }

  public formatCurrency(amount: number, currencyCode: string = 'NZD'): string {
    const symbol = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode)?.symbol || '$';
    const formatted = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${amount < 0 ? '-' : ''}${symbol}${formatted}`;
  }
}

export const currencyService = new CurrencyService();
