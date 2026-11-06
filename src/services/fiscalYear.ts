import { SupportedCountry } from '../types';

/**
 * Financial / tax year rules per country, derived from today's date (never a fixed year).
 *
 *   India, New Zealand:  1 April – 31 March   → "FY 2026-27"
 *   Australia:           1 July  – 30 June    → "FY 2026-27"
 *   Canada, USA:         1 Jan   – 31 Dec     → "Tax Year 2026"
 *
 * Labels are stored without a description suffix; use fiscalYearRangeLabel() for display.
 */

/** Month (1–12) on which the financial year starts. */
export function fiscalYearStartMonth(country: SupportedCountry | string = 'NZ'): number {
  if (country === 'AU') return 7;
  if (country === 'CA' || country === 'US') return 1;
  return 4; // IN, NZ (and UK-style April years)
}

export function usesCalendarTaxYear(country: SupportedCountry | string = 'NZ'): boolean {
  return fiscalYearStartMonth(country) === 1;
}

/** Calendar year in which the financial year containing `date` started. */
export function fiscalYearStartYear(country: SupportedCountry | string = 'NZ', date: Date = new Date()): number {
  const startMonth = fiscalYearStartMonth(country);
  const month = date.getMonth() + 1;
  return month >= startMonth ? date.getFullYear() : date.getFullYear() - 1;
}

/** "FY 2026-27" or "Tax Year 2026" for the financial year starting in `startYear`. */
export function formatFiscalYear(startYear: number, country: SupportedCountry | string = 'NZ'): string {
  if (usesCalendarTaxYear(country)) return `Tax Year ${startYear}`;
  return `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/** The financial year that `date` (default: today) falls in. */
export function currentFiscalYear(country: SupportedCountry | string = 'NZ', date: Date = new Date()): string {
  return formatFiscalYear(fiscalYearStartYear(country, date), country);
}

/** Current financial year first, then the previous ones. */
export function fiscalYearOptions(
  country: SupportedCountry | string = 'NZ',
  count = 4,
  date: Date = new Date()
): string[] {
  const start = fiscalYearStartYear(country, date);
  return Array.from({ length: count }, (_, i) => formatFiscalYear(start - i, country));
}

/** "1 Apr – 31 Mar", "1 Jul – 30 Jun" or "1 Jan – 31 Dec". */
export function fiscalYearRangeLabel(country: SupportedCountry | string = 'NZ'): string {
  const start = fiscalYearStartMonth(country);
  if (start === 7) return '1 Jul – 30 Jun';
  if (start === 1) return '1 Jan – 31 Dec';
  return '1 Apr – 31 Mar';
}

/**
 * Start year written in a label such as "FY 2026-27", "Tax Year 2026" or an older stored value
 * like "FY 2026-27 (1 Apr - 31 Mar)". Falls back to the current financial year.
 */
export function parseFiscalYearStart(
  label: string | number | undefined | null,
  country: SupportedCountry | string = 'NZ',
  date: Date = new Date()
): number {
  if (typeof label === 'number' && Number.isFinite(label)) return label;
  const match = String(label || '').match(/(19|20)\d{2}/);
  return match ? parseInt(match[0], 10) : fiscalYearStartYear(country, date);
}

/** Clean label for storage and display ("FY 2026-27 (1 Apr - 31 Mar)" → "FY 2026-27"). */
export function normalizeFiscalYear(
  label: string | undefined | null,
  country: SupportedCountry | string = 'NZ',
  date: Date = new Date()
): string {
  return formatFiscalYear(parseFiscalYearStart(label, country, date), country);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** First and last day (YYYY-MM-DD) of the financial year named by `label`. */
export function fiscalYearBounds(
  label: string | number | undefined | null,
  country: SupportedCountry | string = 'NZ'
): { start: string; end: string } {
  const startYear = parseFiscalYearStart(label, country);
  const startMonth = fiscalYearStartMonth(country);
  if (startMonth === 1) return { start: iso(startYear, 1, 1), end: iso(startYear, 12, 31) };
  const endMonth = startMonth - 1;
  return {
    start: iso(startYear, startMonth, 1),
    end: iso(startYear + 1, endMonth, lastDayOfMonth(startYear + 1, endMonth)),
  };
}

/** Last day (YYYY-MM-DD) of the financial year that `date` falls in. */
export function currentFiscalYearEnding(country: SupportedCountry | string = 'NZ', date: Date = new Date()): string {
  return fiscalYearBounds(fiscalYearStartYear(country, date), country).end;
}

/** Calendar years for year pickers: next year, this year and the years before it. */
export function recentYears(count = 6, date: Date = new Date()): number[] {
  const next = date.getFullYear() + 1;
  return Array.from({ length: count }, (_, i) => next - i);
}
