import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { authedFetch } from './apiBase';
import { supabaseService } from './supabaseService';

/**
 * Registers this phone for payment reminders (Firebase Cloud Messaging) and sends its token to
 * the server. Only runs in the Android/iOS app, for signed-in users, and only in builds made
 * with VITE_PUSH_ENABLED=true: on Android, registering without google-services.json crashes the app.
 */
let registered = false;
/** This install's Firebase token, kept so sign-out can tell the server to forget it. */
let currentToken: string | null = null;

// Android only for now: on iPhone this plugin returns an APNs token, but the server sends through
// Firebase and needs an FCM token. iOS needs a Firebase Messaging plugin and an APNs key first.
export const pushEnabled = () =>
  Capacitor.getPlatform() === 'android' && import.meta.env.VITE_PUSH_ENABLED === 'true';

export async function registerForPushNotifications(): Promise<void> {
  if (registered || !pushEnabled()) return;
  try {
    if (!(await supabaseService.hasSession())) return;
    registered = true;

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') return;

    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: 'billing',
        name: 'Payments',
        description: 'Reminders before your plan is auto-debited',
        importance: 4,
      }).catch(() => {});
    }

    await PushNotifications.removeAllListeners();
    await PushNotifications.addListener('registration', ({ value }) => {
      currentToken = value;
      authedFetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: value, platform: Capacitor.getPlatform() }),
      }).catch(() => {});
    });
    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('Push registration failed:', err?.error);
    });
    await PushNotifications.register();
  } catch (err) {
    registered = false;
    console.warn('Push notifications unavailable:', err);
  }
}

/**
 * Call on sign-out, BEFORE the session is cleared: the server removes this phone's token from the
 * account, and the phone drops its Firebase token so nothing more arrives until the next sign-in.
 */
export async function unregisterPushNotifications(): Promise<void> {
  if (!pushEnabled()) return;
  const token = currentToken;
  currentToken = null;
  registered = false;
  try {
    if (token) {
      await authedFetch('/api/push/unregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    }
    await PushNotifications.removeAllListeners();
    await PushNotifications.unregister();
  } catch (err) {
    console.warn('Push sign-out cleanup failed:', err);
  }
}
