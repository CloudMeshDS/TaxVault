/**
 * Turns raw error text into something safe to show users.
 *
 * Errors from the sync layer, the backend or Supabase itself can mention internals
 * ("Supabase not initialized", "Database error saving new user", "PGRST205", "violates
 * row-level security policy"...). Users should never see those terms, so any message that
 * looks technical is replaced with a plain-language fallback. Ordinary messages such as
 * "Invalid login credentials" or "Password must be at least 6 characters" pass through.
 */
const TECHNICAL_WORDING =
  /supabase|data\s*base|\bdb\b|postgre|\bsql\b|pgrst|schema|relation\s+"|row[- ]level|\brls\b|\bjwt\b|service[_ ]role|anon[_ ]key|edge function|violates|constraint|column|\bnull value\b|duplicate key|syntax error|stack|undefined|exception|econn|fetch failed|failed to fetch|networkerror/i;

export const GENERIC_ERROR = 'Something went wrong on our side. Please try again in a moment.';

export function toUserMessage(raw: unknown, fallback: string = GENERIC_ERROR): string {
  const text = typeof raw === 'string' ? raw : (raw as any)?.message ? String((raw as any).message) : '';
  if (!text.trim()) return fallback;
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(text)) {
    return 'No internet connection. Check your connection and try again.';
  }
  return TECHNICAL_WORDING.test(text) ? fallback : text;
}
