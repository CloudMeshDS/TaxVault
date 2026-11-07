# TaxVault store release checklist

Status as of 7 Nov 2026. `[x]` done, `[ ]` pending. **Blocker** = a store will reject or refuse the app without it.

## 0. Decisions needed first

- [ ] **Blocker: in-app payment rules.** Both stores require their own billing for digital subscriptions sold inside an app:
  - **Apple App Store:** selling Pro/Business/CA Firm through Razorpay inside the iOS app is rejected (App Review Guideline 3.1.1). Options: (a) add Apple In-App Purchase for iOS, or (b) the iOS app shows no prices or buy buttons at all, and users subscribe on a website.
  - **Google Play:** digital subscriptions must use Google Play Billing. In India and some other countries, Google offers a "user choice billing" programme where Razorpay can be offered *next to* Play Billing (enrolment and a reduced Google fee apply). Check the current Play Payments policy for your countries before submitting.
  - Until this is decided, the safest first release is free-plan-only on both stores, with paid plans sold on the web.
- [ ] **App ID is permanent.** Both stores lock `nz.taxvault.mobile` forever after the first upload. Change it now if "nz" is wrong for an India-based business (`capacitor.config.ts`, `android/app/build.gradle`, Xcode bundle ID, Firebase app).
- [x] **Legal entity and support email** filled in: Cloudmesh Digital Solutions, Sohna (Gurugram), cloudmeshdigitalsolutions@gmail.com
- [ ] Have the privacy policy reviewed; it is a draft written from what the app actually does

## 1. Server and backend

- [x] API live on Supabase Edge Functions (health 200)
- [x] Database migrations applied (plans, auto-pay, reminders, USD prices, coupons)
- [x] Secrets set: Razorpay webhook, cron, Firebase service account
- [x] Daily payment-reminder job (09:00 IST)
- [x] Razorpay live mode: webhook saved (4 subscription events), Subscriptions on, international cards on
- [x] Account deletion cancels Razorpay auto-pay first (deployed 7 Nov 2026)
- [ ] Test one real payment (monthly and annual) and one renewal webhook
- [ ] Rotate the EmailJS private key
- [ ] Delete the unused Firebase key `37511120b4` in Google Cloud, and remove both `tax-vault-e6765-firebase-adminsdk-*.json` files from the project folder

## 2. App code (both platforms)

- [x] Real Razorpay Checkout only: removed the look-alike card/UPI form, the pre-filled card number, the fake "LIVE CHECKOUT" banner and the "Instant Test Payment" button
- [x] Clear subscription terms before payment (price, renews monthly, cancel any time, reminder 7 days before)
- [x] In-app account deletion (Settings → Delete Account) removing all data, push tokens and coupon records
- [x] Cancel auto-pay in Settings
- [x] Push notification permission asked only after sign-in
- [x] App icon and splash screen (TaxVault receipt icon replaces the Capacitor default)
- [x] On-device "demo" sign-ins appear only in developer builds, not in store builds
- [ ] Reviewer test account: create a normal account with sample receipts, and give its email and password to both stores in the review notes

## 3. Google Play (Android)

Build: `npm run android:bundle` → `TaxVault-release.aab` (signed, versionCode 1, versionName 1.0.0)

- [x] targetSdk 36, minSdk 24
- [x] Upload key created: `android/app/taxvault-upload.jks` + `android/keystore.properties` (both git-ignored)
- [ ] **Back up both files now** (password manager or encrypted drive). Losing them means asking Google to reset the upload key.
- [x] Release signing and AAB build script
- [x] Firebase `google-services.json` in `android/app/` (git-ignored)
- [x] Cloud backup turned off for app data (sessions and financial data stay off Google Drive backups)
- [x] Permissions: camera, photos (Android 13+), notifications; no location or contacts
- [x] Privacy policy page written (`docs/privacy.html`)
- [x] Account deletion page written (`docs/delete-account.html`)
- [ ] Publish those pages: GitHub repo → Settings → Pages → Branch `main`, folder `/docs`. URLs will be `https://cloudmeshds.github.io/TaxVault/privacy.html` and `.../delete-account.html`
- [ ] Play Console developer account (one-time US$25; identity verification)
- [ ] Create the app; enrol in Play App Signing (default); upload `TaxVault-release.aab` to **Internal testing**
- [ ] New personal developer accounts must run a **closed test with at least 12 testers for 14 days** before production access
- [ ] Store listing: name, short and full description (drafts below), app icon `store-assets/play-icon-512.png`
- [ ] Feature graphic 1024×500 (not made yet)
- [ ] Phone screenshots: at least 2, ideally 4–8 (not made yet)
- [ ] Category: Finance. Contact email. Privacy policy URL.
- [ ] Content rating questionnaire (no violence or user chat: expect "Everyone"/3+)
- [ ] Target audience: 18+
- [ ] Data safety form (answers below)
- [ ] Financial features declaration: personal finance / bookkeeping, no loans, no trading
- [ ] Account deletion URL field
- [ ] App access: reviewer login
- [ ] Ads: "No ads"

## 4. Apple App Store (iOS)

The iOS project exists (`ios/`), but it can only be built, signed and uploaded **on a Mac with Xcode**.

- [x] App icon 1024 px (no transparency) and splash
- [x] Camera and photo-library permission texts in `Info.plist`
- [x] Export compliance answered in `Info.plist` (standard HTTPS only, so no encryption paperwork)
- [ ] Apple Developer Program (US$99 a year)
- [ ] Mac: `npm run ios:sync`, open `ios/App/App.xcworkspace`, set the Team, bundle ID, version 1.0.0 (build 1)
- [ ] **Push on iOS:** add the Push Notifications capability, create an APNs key and upload it to Firebase, add `GoogleService-Info.plist`, and add a Firebase Messaging plugin. The current push plugin gives an APNs token on iPhone, but the server sends through Firebase and needs an FCM token. Until then, keep `VITE_PUSH_ENABLED` off for iOS builds.
- [ ] **Payments:** see section 0. Without Apple In-App Purchase, the iOS build must not show prices or subscribe buttons.
- [ ] App Store Connect: create the app, privacy policy URL, support URL
- [ ] App Privacy ("nutrition label") answers: same data as the Play Data safety form below
- [ ] Screenshots: 6.9" iPhone (1320×2868) and, if supporting iPad, 13" iPad
- [ ] Age rating questionnaire
- [ ] Review notes with the reviewer login
- [ ] Archive in Xcode → upload → TestFlight → submit

## Draft store listing

**Name:** TaxVault: Receipt & Tax Tracker
**Short description (80 chars):** Scan receipts with AI, track expenses and mileage, and get tax-ready reports.

**Full description:**
TaxVault turns receipts into tax-ready records. Snap a photo and AI reads the vendor, date, amount and GST/VAT for you. Keep business and personal spending apart, log mileage trips, record income, send invoices and match bank statements, all in one place.

- AI receipt scanning: photo or PDF in, clean expense record out
- Business vs personal split, with tax found on every receipt
- Mileage log, income tracking, client invoices and bank CSV matching
- Tax calendar with upcoming deadlines
- Accountant pack: audit PDF with receipt photos, Excel workbook and ZIP export
- Secure cloud backup and sync across devices
- Built for India, New Zealand, Australia, Canada, the UK and the US

Free plan: 10 AI scans a month. Paid plans add daily AI scans, CA audit packs and accountant exports.

## Draft Data safety / App Privacy answers

| Data | Collected | Purpose | Shared with third parties* |
|---|---|---|---|
| Name, email, phone | Yes | Account management | No |
| Financial info: receipts, expenses, income, invoices, bank lines | Yes | App functionality | No |
| Purchase history (plan and payments) | Yes | App functionality, account management | No |
| Photos (receipt photos the user takes or picks) | Yes | App functionality | No |
| Device ID (Firebase push token) | Yes, optional | App functionality (payment reminders) | No |
| App interactions and diagnostics | Yes | App functionality, security | No |
| Location, contacts, ad ID | No | | |

*Service providers that process data on our behalf (Supabase, Google Gemini, Razorpay, Firebase) count as "processors", not sharing, in Google's form.
- Data encrypted in transit: **Yes**
- Users can request deletion: **Yes** (in-app and on the web)
- Card details: collected by Razorpay, never by TaxVault
