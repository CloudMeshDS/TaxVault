import { parseDateToISO } from '../services/periodFilterService';

/** Locale used for dates and numbers in each supported country. */
export const LOCALE_BY_COUNTRY: Record<string, string> = {
  NZ: 'en-NZ',
  AU: 'en-AU',
  CA: 'en-CA',
  US: 'en-US',
  IN: 'en-IN',
};

/**
 * Short, human date in the user's country format, e.g. "5 Oct 2026" (NZ/AU/IN)
 * or "Oct 5, 2026" (US/CA). Falls back to the raw value if it can't be parsed.
 */
export function formatDisplayDate(value?: string, country?: string): string {
  const iso = parseDateToISO(value);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : null;
  if (!d || isNaN(d.getTime())) return value || '';
  return d.toLocaleDateString(LOCALE_BY_COUNTRY[country || ''] || undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
