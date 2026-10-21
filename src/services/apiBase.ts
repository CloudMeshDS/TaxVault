/**
 * Base URL for the TaxVault backend.
 *
 * The web app is served by the same Express server, so relative `/api/...` paths work.
 * The Capacitor Android/iOS builds have no local backend: set VITE_API_BASE_URL to the
 * hosted server (e.g. https://api.yourdomain.com) before `npm run android:apk`.
 * Secrets such as the Gemini key stay on that server and never ship inside the app.
 */
const API_BASE_URL = String((import.meta as any).env?.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
