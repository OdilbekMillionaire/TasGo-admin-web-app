# TasGo — Production Deployment Guide

This guide covers every step needed to take TasGo from this codebase to live production.
Steps marked **[YOU]** require manual human action. Steps marked **[CODE]** run from your terminal.

---

## Part 1 — Prerequisites

### Accounts to create (if you don't have them)

**[YOU]** Create these accounts before starting:

| Service | URL | Purpose |
|---------|-----|---------|
| Supabase | https://supabase.com | Database, Auth, Storage, Edge Functions |
| Vercel | https://vercel.com | Admin web dashboard hosting |
| Expo | https://expo.dev | Mobile app build service (EAS) |
| Eskiz.uz | https://eskiz.uz | SMS OTP delivery |
| Octo (Octobank) | https://octo.uz | Uzbek card payment processing |
| Yandex Cloud | https://console.cloud.yandex.com | Maps API |
| Google Cloud | https://console.cloud.google.com | Translation API |
| Apple Developer | https://developer.apple.com | iOS App Store ($99/year — client pays) |
| Google Play Console | https://play.google.com/console | Android Play Store ($25 one-time — client pays) |

### Tools to install locally

**[CODE]**
```bash
# Node.js 20+
node --version   # must be 20+

# pnpm 9+
npm install -g pnpm@9
pnpm --version

# Supabase CLI
npm install -g supabase
supabase --version

# EAS CLI (Expo Application Services)
npm install -g eas-cli
eas --version
```

---

## Part 2 — Supabase Project Setup

### 2.1 Create a new Supabase project

**[YOU]**
1. Go to https://supabase.com → New Project
2. Project name: `tasgo-production`
3. Database password: create a strong password and save it securely
4. Region: `ap-southeast-1` (Singapore — closest to Tashkent)
5. Click **Create new project** and wait ~2 minutes

### 2.2 Get your Supabase credentials

**[YOU]**
1. In Supabase dashboard → **Settings** → **API**
2. Copy and save:
   - **Project URL** → this is `SUPABASE_URL`
   - **anon public** key → this is `SUPABASE_ANON_KEY`
   - **service_role** key → this is `SUPABASE_SERVICE_ROLE_KEY` (keep this secret, never expose to clients)

### 2.3 Link Supabase CLI to your project

**[CODE]**
```bash
# From the root of the project
supabase login
supabase link --project-ref YOUR_PROJECT_REF
# Project ref is the string in your Supabase URL: https://YOUR_PROJECT_REF.supabase.co
```

### 2.4 Run database migrations

**[CODE]**
```bash
supabase db push
# This applies all migrations in supabase/migrations/ in order:
# 001_initial_schema.sql → all tables
# 002_triggers.sql → stock triggers, search vectors
# 003_rls.sql → Row Level Security policies
```

### 2.5 Seed development data

**[CODE]**
```bash
supabase db seed
# Seeds: 5 categories, 20 products, 2 banners, 1 promo code
```

### 2.6 Create Supabase Storage buckets

**[YOU]**
1. Supabase dashboard → **Storage** → **New bucket**
2. Create bucket: `product-images`
   - Public: **Yes**
   - File size limit: 5 MB
   - Allowed MIME types: `image/jpeg, image/png, image/webp`
3. Create bucket: `category-images`
   - Public: **Yes**
   - Same limits
4. Create bucket: `banners`
   - Public: **Yes**
   - Same limits

**[YOU]** Add Storage RLS policy for product-images:
1. Storage → product-images → Policies → New Policy
2. Allow SELECT for everyone (public read)
3. Allow INSERT/UPDATE/DELETE for admin role only

---

## Part 3 — Third-Party Service Setup

### 3.1 Eskiz.uz SMS (for phone OTP)

**[YOU]**
1. Go to https://eskiz.uz → Register
2. After registration, get your **email** and **password** (used as API credentials)
3. In the Eskiz dashboard, request activation of **Sender ID: 4546** (or use the default "Eskiz" sender)
4. Test by sending a test SMS from their dashboard
5. Save: `ESKIZ_EMAIL` and `ESKIZ_PASSWORD`

### 3.2 Configure Supabase Auth for Phone OTP

**[YOU]**
1. Supabase dashboard → **Authentication** → **Providers** → **Phone**
2. Enable phone auth: **ON**
3. SMS Provider: select **Custom**
4. This requires the `send-otp` Edge Function to be deployed first (done in Part 4)
5. After deploying Edge Functions, come back and set:
   - **HTTP method**: POST
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-otp`
   - **Headers**: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
6. Save

**[YOU]** Set the OTP expiry:
1. Auth → **Settings** → **OTP expiry**: set to `300` seconds (5 minutes)

### 3.3 Octo Payment Gateway

**[YOU]**
1. Contact Octo (Octobank) at https://octo.uz/contact or email `business@octo.uz`
2. Request merchant account activation
3. You will receive:
   - **Shop ID** → `OCTO_SHOP_ID`
   - **Secret Key** → `OCTO_SECRET_KEY`
4. Configure webhook URL in Octo dashboard:
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/payment-webhook`
5. Test in sandbox first: https://sandbox.octo.uz (credentials provided by Octo)

### 3.4 Yandex Maps API

**[YOU]**
1. Go to https://developer.tech.yandex.ru
2. Create a new app → select **Maps JS API** + **Static API** + **Geocoder API**
3. Add your domain (admin app URL) to allowed origins
4. Copy the API key → `YANDEX_MAPS_API_KEY`

### 3.5 Google Cloud Translation API

**[YOU]**
1. Go to https://console.cloud.google.com
2. Create a new project: `tasgo-translate`
3. Enable **Cloud Translation API**
4. Create credentials → **API Key**
5. Restrict the key to Cloud Translation API only
6. Copy the key → `GOOGLE_CLOUD_TRANSLATION_API_KEY`

### 3.6 Expo Account Setup

**[YOU]**
1. Go to https://expo.dev → create account (or use existing)
2. Create a new organization: `tasgo`
3. Install EAS CLI and login:

**[CODE]**
```bash
eas login
# Enter your Expo credentials
```

---

## Part 4 — Environment Variables

### 4.1 Create environment files

**[YOU]** Copy `.env.example` to `.env` and fill in all values:

**[CODE]**
```bash
cp .env.example .env
```

**[YOU]** Edit `.env` with your real values:
```env
# Supabase
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=eyJ...YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=eyJ...YOUR_SERVICE_ROLE_KEY

# Eskiz.uz SMS
ESKIZ_EMAIL=your@email.com
ESKIZ_PASSWORD=yourEskizPassword

# Octo Payment Gateway
OCTO_SHOP_ID=12345
OCTO_SECRET_KEY=yourOctoSecretKey
OCTO_API_URL=https://secure.octo.uz

# Google Cloud Translation
GOOGLE_CLOUD_TRANSLATION_API_KEY=AIza...

# Yandex Maps
YANDEX_MAPS_API_KEY=your-yandex-key

# Expo Push
EXPO_ACCESS_TOKEN=your-expo-token

# Delivery Zone — UPDATE to actual store coordinates
DELIVERY_ZONE_CENTER_LAT=41.2995
DELIVERY_ZONE_CENTER_LNG=69.2401
DELIVERY_ZONE_RADIUS_KM=2.0

# Store Config
STORE_NAME=TasGo
STORE_OPERATING_HOURS=24/7
MIN_ORDER_FREE_DELIVERY_UZS=30000
DELIVERY_FEE_UZS=5000
```

### 4.2 Create app-specific .env files

**[YOU]** Create `apps/admin/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=eyJ...YOUR_SERVICE_ROLE_KEY
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=your-yandex-key
```

**[YOU]** Create `apps/mobile/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...YOUR_ANON_KEY
EXPO_PUBLIC_YANDEX_MAPS_API_KEY=your-yandex-key
```

**[YOU]** Create `apps/staff/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...YOUR_ANON_KEY
EXPO_PUBLIC_YANDEX_MAPS_API_KEY=your-yandex-key
```

---

## Part 5 — Deploy Supabase Edge Functions

**[CODE]**
```bash
# Deploy all Edge Functions
supabase functions deploy send-otp
supabase functions deploy verify-otp
supabase functions deploy create-payment
supabase functions deploy payment-webhook
supabase functions deploy assign-order
supabase functions deploy send-push
supabase functions deploy refund-order
supabase functions deploy translate-product
```

**[YOU]** Set Edge Function secrets in Supabase dashboard:
1. Supabase → **Edge Functions** → **Secrets**
2. Add each secret:
   - `ESKIZ_EMAIL` = your Eskiz email
   - `ESKIZ_PASSWORD` = your Eskiz password
   - `OCTO_SHOP_ID` = your Octo shop ID
   - `OCTO_SECRET_KEY` = your Octo secret key
   - `OCTO_API_URL` = https://secure.octo.uz
   - `GOOGLE_CLOUD_TRANSLATION_API_KEY` = your Google key
   - `EXPO_ACCESS_TOKEN` = your Expo token

**[CODE]** (Alternative: set secrets via CLI)
```bash
supabase secrets set ESKIZ_EMAIL=your@email.com
supabase secrets set ESKIZ_PASSWORD=yourpassword
supabase secrets set OCTO_SHOP_ID=12345
supabase secrets set OCTO_SECRET_KEY=yourkey
supabase secrets set OCTO_API_URL=https://secure.octo.uz
supabase secrets set GOOGLE_CLOUD_TRANSLATION_API_KEY=AIza...
supabase secrets set EXPO_ACCESS_TOKEN=yourtoken
```

---

## Part 6 — Create Admin User

**[YOU]**
1. Supabase dashboard → **Authentication** → **Users** → **Invite user**
2. Or use the SQL editor:

**[YOU]** Open Supabase → **SQL Editor** and run:
```sql
-- First create the auth user via Supabase Auth dashboard (Authentication → Users → Add user)
-- Then update the profile role to admin:
UPDATE profiles
SET role = 'admin', full_name = 'Admin'
WHERE phone = '+998XXXXXXXXX';  -- replace with actual admin phone number
```

**[YOU]** To create staff accounts (collector, carrier, cashier):
1. Admin logs into the admin dashboard at your deployed URL
2. Go to **Users** → **Staff Management** → **Add Staff**
3. Enter name, phone number, and role
4. The staff member logs into the Staff App with that phone number

---

## Part 7 — Generate TypeScript Types

After running migrations, regenerate types to keep TypeScript in sync:

**[CODE]**
```bash
pnpm db:types
# This runs: supabase gen types typescript --local > packages/types/src/database.generated.ts
# Commit the generated file
```

---

## Part 8 — Deploy Admin Web Dashboard

### Option A: Vercel (recommended)

**[YOU]**
1. Push code to GitHub
2. Go to https://vercel.com → **New Project** → Import from GitHub
3. Select the repo → **Root Directory**: `apps/admin`
4. Framework: Next.js (auto-detected)
5. Add all environment variables from `apps/admin/.env.local`
6. Click **Deploy**
7. Note the deployment URL (e.g., `https://tasgo-admin.vercel.app`)

**[YOU]** After deploy, add the domain to Supabase allowed origins:
1. Supabase → **Authentication** → **URL Configuration**
2. Site URL: your Vercel URL
3. Redirect URLs: add `https://tasgo-admin.vercel.app/**`

### Option B: Self-hosted (VPS)

**[CODE]**
```bash
cd apps/admin
pnpm build
# Output is in .next/
# Use PM2 or similar to run: node .next/standalone/server.js
```

---

## Part 9 — Replace App Assets with Real Brand Assets

**[YOU]** The placeholder PNG files in `apps/mobile/assets/` and `apps/staff/assets/` must be replaced with real brand assets before App Store submission.

Required files:

**`apps/mobile/assets/`**
| File | Size | Format |
|------|------|--------|
| `icon.png` | 1024×1024 px | PNG, no transparency |
| `adaptive-icon.png` | 1024×1024 px | PNG, for Android adaptive icon |
| `splash.png` | 1284×2778 px | PNG (iPhone 14 Pro Max resolution) |
| `favicon.png` | 48×48 px | PNG |
| `notification-icon.png` | 96×96 px | PNG, white on transparent, Android only |

**`apps/staff/assets/`** — same files, can use same assets or different branding

Design brief: TasGo green (#2E7D32) background, white "TG" or grocery basket + location pin logo mark. Match spec from CLAUDE.md §1.

---

## Part 10 — Mobile App Build (EAS)

### 10.1 Configure EAS project

**[YOU]** Update `apps/mobile/eas.json` — replace placeholder IDs:

**[CODE]**
```bash
cd apps/mobile
eas build:configure
# This creates an EAS project and sets projectId in app.json
```

**[YOU]** Update `apps/mobile/app.json`:
- `slug`: `tasgo-client`
- `ios.bundleIdentifier`: `uz.tasgo.client`
- `android.package`: `uz.tasgo.client`
- `expo.owner`: your Expo account/org name

Repeat for `apps/staff/app.json`:
- `slug`: `tasgo-staff`
- `ios.bundleIdentifier`: `uz.tasgo.staff`
- `android.package`: `uz.tasgo.staff`

### 10.2 Build for internal testing

**[CODE]**
```bash
# Client app — Android APK for internal testing
cd apps/mobile
eas build --profile preview --platform android

# Staff app — Android APK for internal testing
cd ../staff
eas build --profile preview --platform android
```

EAS will email you a download link when the build completes (~5-10 minutes).

### 10.3 Build for production

**[CODE]**
```bash
# Client app — production AAB for Play Store
cd apps/mobile
eas build --profile production --platform android

# Client app — production IPA for App Store (requires Apple Developer account)
eas build --profile production --platform ios

# Repeat for staff app
cd ../staff
eas build --profile production --platform android
eas build --profile production --platform ios
```

### 10.4 Submit to app stores

**[YOU]** Before submitting, update `eas.json` submit section:
- Replace `REPLACE_WITH_YOUR_APPLE_ID` with your Apple ID email
- Replace `REPLACE_WITH_ASC_APP_ID` with the App Store Connect app ID
- Replace `REPLACE_WITH_APPLE_TEAM_ID` with your Apple Team ID
- Replace `REPLACE_WITH_SERVICE_ACCOUNT_JSON_PATH` with path to Google Play service account JSON

**[CODE]**
```bash
# Submit to Google Play (internal track first)
cd apps/mobile
eas submit --platform android --latest

# Submit to Apple App Store
eas submit --platform ios --latest
```

---

## Part 11 — Verify OTP Flow End-to-End

**[YOU]** After everything is deployed, test the full phone OTP flow:

1. Open the client app (or use Expo Go)
2. Enter a Uzbek phone number (+998XXXXXXXXX)
3. Check that an SMS arrives within 30 seconds
4. Enter the 6-digit code
5. Confirm you reach the home screen

If no SMS arrives:
- Check Supabase → Auth → Hooks → SMS Hook is pointing to the correct Edge Function URL
- Check Edge Function logs: Supabase → Edge Functions → `send-otp` → Logs
- Verify Eskiz credentials are correct in Edge Function secrets

---

## Part 12 — Configure Octo Payment Webhook

**[YOU]**
1. Log in to Octo merchant dashboard
2. Settings → Webhook URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/payment-webhook`
3. Enable webhook events: `payment.success`, `payment.failed`, `payment.refunded`
4. Test with Octo sandbox before going live

---

## Part 13 — Set Delivery Zone Coordinates

**[YOU]** After the client confirms the store's exact delivery zone:

1. Open Yandex Maps, find the store location, right-click → copy coordinates
2. Update `DELIVERY_ZONE_CENTER_LAT` and `DELIVERY_ZONE_CENTER_LNG` in:
   - Supabase → SQL Editor:
     ```sql
     UPDATE store_config
     SET delivery_zone_lat = 41.XXXX,
         delivery_zone_lng = 69.XXXX,
         delivery_zone_radius_km = 2.0;
     ```
   - `apps/mobile/.env`: update `EXPO_PUBLIC_DELIVERY_ZONE_CENTER_LAT/LNG`
   - `apps/admin/.env.local`: update if used in admin settings
   - Rebuild mobile apps after changing these values

---

## Part 14 — Post-Deploy Checklist

Run through these after every deployment:

**Auth**
- [ ] Phone OTP SMS arrives within 30 seconds
- [ ] Admin login → lands on dashboard
- [ ] Cashier login → lands on POS
- [ ] Staff login with each role: collector, carrier, cashier
- [ ] Non-staff phone → denied with error

**Catalog**
- [ ] Admin can create a category with image
- [ ] Admin can create a product with auto-translate
- [ ] Product appears in client app home screen
- [ ] Barcode scan in admin (laptop camera) populates barcode field

**Orders**
- [ ] Client can add items to cart
- [ ] Cart persists after app restart
- [ ] Checkout shows delivery fee correctly (free ≥ 30,000 UZS, 5,000 UZS below)
- [ ] Delivery address outside zone → error shown
- [ ] "Pay" → Octo payment page opens in WebView
- [ ] Test payment in Octo sandbox → order status updates to "paid"
- [ ] Collector receives push notification
- [ ] Collector scans all items → carrier assigned push
- [ ] Carrier sees order, navigates, confirms delivery
- [ ] Client sees "delivered" status + rating prompt
- [ ] Admin sees full order timeline

**POS**
- [ ] Cashier logs in → redirected to /pos
- [ ] Barcode scan (or manual entry) finds product
- [ ] "Complete Sale" → inventory_log entry created
- [ ] Stock quantity decremented in admin catalog

**Admin Analytics**
- [ ] Dashboard KPIs load without error
- [ ] Revenue chart renders correctly
- [ ] Low stock alerts appear for products below threshold

**Push Notifications**
- [ ] Client push token registered on first launch
- [ ] Staff push token registered on login
- [ ] Test push notification from Expo dashboard reaches device

---

## Part 15 — Monitoring & Maintenance

### Supabase monitoring
- Supabase dashboard → **Reports** → check query performance
- Edge Function logs: Supabase → **Edge Functions** → each function → Logs
- Database: watch for slow queries in Reports → Query Performance

### Vercel monitoring
- Vercel dashboard → **Analytics** → enable Web Analytics
- Check deployment logs for Edge Runtime errors

### Recommended alerts to set up
- **[YOU]** Supabase → Database → **Webhooks**: create a webhook to notify you on DB errors
- **[YOU]** Set up Uptime monitoring (free: https://uptimerobot.com) on:
  - Admin dashboard URL
  - Supabase health endpoint: `https://YOUR_PROJECT_REF.supabase.co/rest/v1/`

---

## Part 16 — Updating Delivery Zone (Admin Dashboard)

After initial launch, the admin can adjust the delivery zone without a code change:

**[YOU]**
1. Log in to admin dashboard → **Settings**
2. Adjust the map circle to the desired radius
3. Click **Save** — this writes to `store_config` table
4. Changes take effect immediately for new orders (server-side validation reads from DB)
5. Mobile app still uses the hardcoded env-var for the visual circle overlay — rebuild the app after significant zone changes

---

## Quick Reference: Key URLs After Deployment

| Surface | URL |
|---------|-----|
| Admin Dashboard | https://tasgo-admin.vercel.app/dashboard |
| Cashier POS | https://tasgo-admin.vercel.app/pos |
| Admin Login | https://tasgo-admin.vercel.app/login |
| Supabase Dashboard | https://app.supabase.com/project/YOUR_PROJECT_REF |
| Edge Function Logs | https://app.supabase.com/project/YOUR_PROJECT_REF/functions |
| EAS Build Dashboard | https://expo.dev/accounts/YOUR_ORG/projects |
