/**
 * Monthly auto-debit (Razorpay Subscriptions) and payment reminders (Firebase push + email).
 *
 * Flow
 *  1. POST /api/razorpay/create-subscription  -> Razorpay subscription for the user's monthly price
 *  2. Razorpay Checkout: the user approves a card mandate (USD) and pays the first month
 *  3. POST /api/razorpay/verify-subscription  -> signature + subscription checked, plan activated
 *  4. POST /api/razorpay/webhook              -> each later monthly charge extends the plan;
 *                                                 cancelled / halted mandates stop renewal
 *  5. POST /api/cron/payment-reminders        -> daily job: push + email 7 days before a charge
 *
 * Server environment
 *  RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET   already used for one-time payments
 *  RAZORPAY_WEBHOOK_SECRET                 the secret entered with the webhook in the Razorpay dashboard
 *  CRON_SECRET                             shared with the daily scheduler (x-cron-secret header)
 *  FCM_SERVICE_ACCOUNT                     Firebase service-account JSON (raw or base64) for push
 *  SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS   reminder emails
 */
import crypto from 'crypto';
import type express from 'express';
import nodemailer from 'nodemailer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PLANS, PaidTier, PlanPrice, formatPlanPrice, isPaidTier, planPrice, planPriceInCurrency, toMinorUnits } from '../src/constants/plans';
import { CouponError, expectedMinorFromNotes, type CouponQuote, type createCouponService } from './coupons';

type ActivatePlan = (
  userId: string,
  tier: 'free' | PaidTier,
  billingCycle: 'monthly' | 'annual',
  payment: {
    gateway: string;
    amount: number;
    currency?: string;
    orderId?: string;
    paymentId?: string;
    signature?: string;
    periodEnd?: string;
    metadata?: Record<string, unknown>;
  },
) => Promise<unknown>;

export interface BillingDeps {
  admin: SupabaseClient;
  requireUser: express.RequestHandler;
  activatePlan: ActivatePlan;
  /** Current plan, already shaped for the app's profile */
  profileSubscription: (userId: string) => Promise<unknown>;
  razorpayApiBase: string;
  coupons: ReturnType<typeof createCouponService>;
}

/** A plan stays active for this long after the charge date, so a slightly late webhook never locks a payer out. */
const RENEWAL_GRACE_MS = 24 * 60 * 60 * 1000;
const REMINDER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const unixToIso = (seconds: unknown) => (Number(seconds) > 0 ? new Date(Number(seconds) * 1000).toISOString() : null);

export function hmacHex(secret: string, payload: string | Buffer) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function safeEqual(a: string, b: string) {
  return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Days from `now` until `when`, rounded up (a charge 6.2 days away is "in 7 days"). */
export function daysUntil(when: string, now = Date.now()) {
  return Math.ceil((new Date(when).getTime() - now) / DAY_MS);
}

/** True when a reminder is due: the charge is at most 7 days away and none was sent for it yet. */
export function reminderDue(nextChargeAt: string | null | undefined, reminderSentFor: unknown, now = Date.now()) {
  if (!nextChargeAt) return false;
  const days = daysUntil(nextChargeAt, now);
  return days >= 1 && days <= REMINDER_DAYS && reminderSentFor !== nextChargeAt;
}

// ---- Firebase Cloud Messaging (HTTP v1) ------------------------------------------------------
let fcmToken: { value: string; expiresAt: number } | null = null;

function fcmServiceAccount(): { client_email: string; private_key: string; project_id: string } | null {
  const raw = (process.env.FCM_SERVICE_ACCOUNT || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    console.warn('FCM_SERVICE_ACCOUNT is not valid JSON');
    return null;
  }
}

async function fcmAccessToken(sa: { client_email: string; private_key: string }) {
  if (fcmToken && fcmToken.expiresAt > Date.now() + 60_000) return fcmToken.value;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  const data: any = await res.json();
  if (!res.ok || !data.access_token) throw new Error(data?.error_description || 'Could not get a Firebase access token');
  fcmToken = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return fcmToken.value;
}

/** Sends a notification to each device token. Returns the tokens Firebase says are no longer valid. */
async function sendPush(tokens: string[], title: string, body: string, data: Record<string, string>) {
  const sa = fcmServiceAccount();
  if (!sa || tokens.length === 0) return { sent: 0, invalid: [] as string[] };
  const access = await fcmAccessToken(sa);
  let sent = 0;
  const invalid: string[] = [];
  for (const token of tokens) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: { token, notification: { title, body }, data, android: { priority: 'HIGH', notification: { channel_id: 'billing' } } },
      }),
    });
    if (res.ok) sent++;
    else if (res.status === 404 || res.status === 400) invalid.push(token);
  }
  return { sent, invalid };
}

async function sendEmail(to: string, subject: string, text: string) {
  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  if (!user || !pass || !to) return false;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (Number(process.env.SMTP_PORT) || 465) === 465,
    auth: { user, pass },
  });
  await transporter.sendMail({ from: `"TaxVault" <${user}>`, to, subject, text });
  return true;
}

// ---- Routes -----------------------------------------------------------------------------------
export function registerBillingRoutes(app: express.Express, deps: BillingDeps) {
  const { admin, requireUser, activatePlan, profileSubscription, razorpayApiBase, coupons } = deps;

  const razorpayAuth = () => {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    return keyId && keySecret ? { keyId, keySecret, header: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` } : null;
  };

  const razorpay = async (path: string, init: { method?: string; body?: unknown } = {}) => {
    const auth = razorpayAuth();
    if (!auth) throw new Error('Payments are not configured on the server.');
    const res = await fetch(`${razorpayApiBase}/v1${path}`, {
      method: init.method || 'GET',
      headers: { Authorization: auth.header, 'Content-Type': 'application/json' },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.description || `Razorpay request failed (${res.status})`);
    return data;
  };

  /** One Razorpay plan per tier + currency + amount, created the first time it is needed. */
  const razorpayPlanId = async (tier: PaidTier, price: PlanPrice) => {
    const amountMinor = toMinorUnits(price.monthly);
    const { data: cached } = await admin.from('razorpay_plans').select('razorpay_plan_id')
      .eq('tier', tier).eq('currency', price.currency).eq('amount_minor', amountMinor).maybeSingle();
    if (cached?.razorpay_plan_id) return cached.razorpay_plan_id as string;
    const plan = await razorpay('/plans', {
      method: 'POST',
      body: {
        period: 'monthly',
        interval: 1,
        item: { name: `TaxVault ${PLANS[tier].name} (monthly)`, amount: amountMinor, currency: price.currency },
        notes: { tier },
      },
    });
    await admin.from('razorpay_plans').upsert({ tier, currency: price.currency, amount_minor: amountMinor, razorpay_plan_id: plan.id });
    return plan.id as string;
  };

  /** Writes the plan from a Razorpay subscription that has just been paid for. */
  const activateFromSubscription = async (userId: string, tier: PaidTier, sub: any, payment: { id: string; amount: number; currency: string; signature?: string }) => {
    const couponCode = sub.notes?.coupon_code ? String(sub.notes.coupon_code) : null;
    const currentEnd = unixToIso(sub.current_end) || new Date(Date.now() + 30 * DAY_MS).toISOString();
    const nextChargeAt = unixToIso(sub.charge_at) || currentEnd;
    await activatePlan(userId, tier, 'monthly', {
      gateway: 'razorpay_autopay',
      amount: payment.amount,
      currency: payment.currency,
      paymentId: payment.id,
      signature: payment.signature,
      orderId: sub.id,
      periodEnd: new Date(new Date(currentEnd).getTime() + RENEWAL_GRACE_MS).toISOString(),
      metadata: {
        razorpay_subscription_id: sub.id,
        next_charge_at: nextChargeAt,
        amount: payment.amount,
        currency: payment.currency,
        ...(couponCode ? { coupon_code: couponCode } : {}),
      },
    });
  };

  const paymentAlreadyRecorded = async (paymentId: string) => {
    const { data } = await admin.from('subscription_transactions').select('id').eq('gateway_payment_id', paymentId).limit(1);
    return Boolean(data && data.length > 0);
  };

  // 1. Start a monthly auto-debit subscription for the signed-in user
  app.post('/api/razorpay/create-subscription', requireUser, async (req, res) => {
    try {
      const auth = razorpayAuth();
      if (!auth) return res.status(503).json({ success: false, error: 'Payments are not configured on the server.' });
      const userId = req.user!.id;
      const tier: PaidTier = isPaidTier(req.body?.tier) ? req.body.tier : 'pro';
      const price = planPrice(tier);
      let coupon: CouponQuote | null = null;
      if (req.body?.couponCode) {
        try {
          coupon = await coupons.quote(req.body.couponCode, userId, tier, 'monthly');
        } catch (err: any) {
          if (err instanceof CouponError) return res.status(400).json({ success: false, error: err.message });
          throw err;
        }
      }
      // A coupon gives the subscription its own lower-priced Razorpay plan, so every monthly
      // charge is discounted while this auto-pay runs
      const charged: PlanPrice = coupon ? { ...price, monthly: coupon.finalAmount } : price;
      const amountMinor = toMinorUnits(charged.monthly);
      const planId = await razorpayPlanId(tier, charged);
      const sub = await razorpay('/subscriptions', {
        method: 'POST',
        body: {
          plan_id: planId,
          total_count: 120, // up to 10 years of monthly charges; the user can cancel any time
          quantity: 1,
          customer_notify: 1,
          notes: {
            user_id: userId,
            tier,
            currency: price.currency,
            ...(coupon ? { coupon_code: coupon.code, amount_minor: String(amountMinor), discount_usd: String(coupon.discount) } : {}),
          },
        },
      });
      return res.json({ success: true, subscriptionId: sub.id, keyId: auth.keyId, amount: amountMinor, currency: price.currency });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Could not start auto-pay' });
    }
  });

  // 2. Confirm the mandate + first payment from Checkout and activate the plan
  app.post('/api/razorpay/verify-subscription', requireUser, async (req, res) => {
    const userId = req.user!.id;
    try {
      const auth = razorpayAuth();
      if (!auth) return res.status(503).json({ verified: false, error: 'Payments are not configured on the server.' });
      const paymentId = String(req.body?.razorpay_payment_id || '');
      const subscriptionId = String(req.body?.razorpay_subscription_id || '');
      const signature = String(req.body?.razorpay_signature || '');
      if (!paymentId || !subscriptionId) return res.status(400).json({ verified: false, error: 'Missing payment details.' });
      if (!safeEqual(signature, hmacHex(auth.keySecret, `${paymentId}|${subscriptionId}`))) {
        return res.status(400).json({ verified: false, error: 'Payment signature is invalid.' });
      }
      const sub = await razorpay(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
      const tier: PaidTier | null = isPaidTier(sub?.notes?.tier) ? sub.notes.tier : null;
      if (sub?.notes?.user_id !== userId || !tier) {
        return res.status(403).json({ verified: false, error: 'This payment does not belong to your account.' });
      }
      if (!['active', 'authenticated'].includes(sub.status)) {
        return res.status(402).json({ verified: false, error: 'Auto-pay has not been set up yet. Please try again.' });
      }
      const payment = await razorpay(`/payments/${encodeURIComponent(paymentId)}`);
      const currency = String(payment.currency || '').toUpperCase();
      const expected = planPriceInCurrency(tier, currency);
      if (!expected || !['captured', 'authorized'].includes(payment.status) || Number(payment.amount) < expectedMinorFromNotes(sub.notes, expected.monthly)) {
        return res.status(402).json({ verified: false, error: 'Payment has not been completed.' });
      }
      if (await paymentAlreadyRecorded(paymentId)) {
        return res.json({ verified: true, subscription: await profileSubscription(userId) });
      }
      await activateFromSubscription(userId, tier, sub, { id: paymentId, amount: Number(payment.amount) / 100, currency, signature });
      if (sub.notes?.coupon_code) {
        await coupons.redeem({
          code: String(sub.notes.coupon_code),
          userId,
          tier,
          billingCycle: 'monthly',
          discountUsd: Number(sub.notes.discount_usd) || 0,
          paymentId,
        });
      }
      return res.json({ verified: true, subscription: await profileSubscription(userId) });
    } catch (err: any) {
      return res.status(500).json({ verified: false, error: err?.message || 'Server error verifying payment' });
    }
  });

  // 3. Stop auto-debit. The plan stays active until the end of the period already paid for.
  app.post('/api/subscription/cancel-auto-renew', requireUser, async (req, res) => {
    try {
      await cancelAutoRenew(req.user!.id, true);
      return res.json({ success: true, data: await profileSubscription(req.user!.id) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Could not cancel auto-pay' });
    }
  });

  // 4. Razorpay webhook: monthly charges and mandate changes. Verified by its signature, not a session.
  app.post('/api/razorpay/webhook', async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const raw: Buffer | undefined = Buffer.isBuffer(req.body) ? req.body : undefined;
    if (!secret || !raw) return res.status(503).json({ error: 'Webhook is not configured.' });
    if (!safeEqual(String(req.headers['x-razorpay-signature'] || ''), hmacHex(secret, raw))) {
      return res.status(400).json({ error: 'Invalid signature.' });
    }
    try {
      const event = JSON.parse(raw.toString('utf8'));
      const sub = event?.payload?.subscription?.entity;
      if (!sub?.id) return res.json({ ok: true, ignored: event?.event });
      const userId = String(sub.notes?.user_id || '');
      const tier: PaidTier | null = isPaidTier(sub.notes?.tier) ? sub.notes.tier : null;

      if (event.event === 'subscription.charged' && userId && tier) {
        const payment = event?.payload?.payment?.entity;
        const currency = String(payment?.currency || '').toUpperCase();
        const expected = planPriceInCurrency(tier, currency);
        if (!payment?.id || !expected || Number(payment.amount) < expectedMinorFromNotes(sub.notes, expected.monthly)) {
          return res.json({ ok: true, ignored: 'amount' });
        }
        if (!(await paymentAlreadyRecorded(payment.id))) {
          await activateFromSubscription(userId, tier, sub, { id: payment.id, amount: Number(payment.amount) / 100, currency });
        }
      } else if (['subscription.cancelled', 'subscription.halted', 'subscription.completed'].includes(event.event)) {
        // No more charges: keep access until the paid period ends, then the plan lapses to free
        await admin.from('customer_subscriptions')
          .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
          .eq('metadata->>razorpay_subscription_id', sub.id);
      }
      return res.json({ ok: true });
    } catch (err: any) {
      console.warn('Razorpay webhook:', err?.message);
      return res.status(500).json({ error: 'Webhook processing failed.' });
    }
  });

  // 5. Save this device's Firebase token so payment reminders reach the phone
  app.post('/api/push/register', requireUser, async (req, res) => {
    const token = String(req.body?.token || '').trim();
    if (!token || token.length > 4096) return res.status(400).json({ success: false, error: 'Missing device token.' });
    const { error } = await admin.from('push_tokens').upsert({
      token,
      user_id: req.user!.id,
      platform: String(req.body?.platform || 'android').slice(0, 20),
      updated_at: new Date().toISOString(),
    });
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true });
  });

  // 5b. Forget this device on sign-out, so the next person to use the phone gets no reminders
  //     meant for this account. Only the caller's own token can be removed.
  app.post('/api/push/unregister', requireUser, async (req, res) => {
    const token = String(req.body?.token || '').trim();
    if (!token) return res.status(400).json({ success: false, error: 'Missing device token.' });
    const { error } = await admin.from('push_tokens').delete().eq('token', token).eq('user_id', req.user!.id);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true });
  });

  // 6. Daily job: remind auto-pay customers 7 days before each charge (push + email)
  app.post('/api/cron/payment-reminders', async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || !safeEqual(String(req.headers['x-cron-secret'] || ''), secret)) {
      return res.status(401).json({ error: 'Not authorised.' });
    }
    try {
      const horizon = new Date(Date.now() + (REMINDER_DAYS + 2) * DAY_MS).toISOString();
      const { data: subs, error } = await admin.from('customer_subscriptions')
        .select('id, user_id, plan_id, metadata, cancel_at_period_end, current_period_end')
        .eq('status', 'active').eq('cancel_at_period_end', false)
        .not('metadata->>razorpay_subscription_id', 'is', null)
        .lte('current_period_end', horizon);
      if (error) throw new Error(error.message);

      let reminded = 0;
      for (const sub of subs || []) {
        const nextChargeAt = sub.metadata?.next_charge_at as string | undefined;
        if (!reminderDue(nextChargeAt, sub.metadata?.reminder_sent_for)) continue;
        const tier = isPaidTier(sub.plan_id) ? sub.plan_id : 'pro';
        const amount = formatPlanPrice(Number(sub.metadata?.amount || 0));
        const date = new Date(nextChargeAt!).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        const title = 'Upcoming TaxVault payment';
        const body = `${amount} for ${PLANS[tier].name} will be auto-debited on ${date}. Cancel any time in Settings → Subscription.`;

        const [{ data: tokens }, { data: profile }] = await Promise.all([
          admin.from('push_tokens').select('token').eq('user_id', sub.user_id),
          admin.from('profiles').select('email').eq('id', sub.user_id).maybeSingle(),
        ]);
        const push = await sendPush((tokens || []).map((t: any) => t.token), title, body, { type: 'payment_reminder', charge_at: nextChargeAt! })
          .catch((e) => { console.warn('Push reminder:', e?.message); return { sent: 0, invalid: [] as string[] }; });
        if (push.invalid.length) await admin.from('push_tokens').delete().in('token', push.invalid);
        const emailed = await sendEmail(String(profile?.email || ''), title, `Hi,\n\n${body}\n\nTaxVault`)
          .catch((e) => { console.warn('Email reminder:', e?.message); return false; });

        if (push.sent > 0 || emailed) {
          await admin.from('customer_subscriptions')
            .update({ metadata: { ...sub.metadata, reminder_sent_for: nextChargeAt } })
            .eq('id', sub.id);
          reminded++;
        }
      }
      return res.json({ ok: true, checked: subs?.length || 0, reminded });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Reminder job failed' });
    }
  });

  /** Cancels the user's Razorpay auto-debit. atCycleEnd keeps the paid period; false stops it now. */
  const cancelAutoRenew = async (userId: string, atCycleEnd: boolean) => {
    const { data: sub } = await admin.from('customer_subscriptions').select('id, metadata')
      .eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    const razorpaySubId = sub?.metadata?.razorpay_subscription_id;
    if (!razorpaySubId) return;
    try {
      await razorpay(`/subscriptions/${encodeURIComponent(razorpaySubId)}/cancel`, {
        method: 'POST',
        body: { cancel_at_cycle_end: atCycleEnd ? 1 : 0 },
      });
    } catch (err: any) {
      // Already cancelled or completed at Razorpay: nothing left to stop
      if (!/cancel|complet/i.test(String(err?.message))) throw err;
    }
    await admin.from('customer_subscriptions')
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq('id', sub!.id);
  };

  return { cancelAutoRenew };
}
