import { supabaseService } from './supabaseService';

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

/**
 * fetch() against the TaxVault backend with the signed-in user's Supabase access token.
 * The server derives the user from this token and ignores any userId/email sent by the client,
 * so every data route only ever reads or writes the caller's own rows. Without a session
 * (signed out, or the on-device demo accounts) the request goes out unauthenticated and the
 * server answers data routes with 401.
 */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = await supabaseService.getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(apiUrl(path), { ...init, headers });
}
