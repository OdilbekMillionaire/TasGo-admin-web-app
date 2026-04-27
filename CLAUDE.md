# CLAUDE.md — TasGo Grocery Delivery Platform

## 0. What You Are Building

TasGo is a full-stack grocery delivery platform for a single physical store in Tashkent, Uzbekistan. It consists of **5 distinct surfaces** sharing one Supabase backend:

| # | Surface | Type | Users |
|---|---------|------|-------|
| 1 | **Client App** | React Native (Expo) | End customers |
| 2 | **Staff App** | React Native (Expo) | Collector + Carrier + Cashier (role-based routing) |
| 3 | **Admin Web Dashboard** | Next.js (browser) | Store admin / owner |
| 4 | **Cashier POS** | PWA (browser, tablet) | In-store cashier |
| 5 | **Backend + API** | Supabase (PostgreSQL + Edge Functions) | All surfaces |

The client is paying for the build. Oxforder LLC (ceo@oxforder.uz) is the developer. The store brand is **TasGo**. The store is physically located in a defined neighborhood in Tashkent (coordinates and delivery zone radius will be provided later — use a placeholder `DELIVERY_ZONE_CENTER_LAT`, `DELIVERY_ZONE_CENTER_LNG`, `DELIVERY_ZONE_RADIUS_KM` in all config files).

---

## 1. Visual Identity — Brand & Design

Claude Code is responsible for generating the full visual identity. Follow these directives:

- **Brand name**: TasGo
- **Tone**: Fast, local, trustworthy, fresh. Not corporate. Not generic.
- **Color palette**: Generate a palette centered on a **fresh green** primary (representing freshness and local produce) with a **warm white** background and **deep charcoal** for text. Add one accent color (orange or amber) for CTAs and urgency states. Define as CSS/JS tokens, not hardcoded hex strings.
- **Typography**: Use `Inter` (available via Google Fonts) for UI text. Use a bolder weight variant for headings.
- **Logo mark**: Generate an SVG logo — a stylized basket or grocery bag combined with a location pin or speed/arrow motif. Keep it simple enough to render at 32×32px (favicon) and 256×256px (splash screen).
- **Design quality standard**: Match KorzinkaGo's UI quality. Clean cards, clear hierarchy, large tap targets, generous white space. No generic AI UI patterns. Every screen must look like a professional Uzbek consumer app.
- **Icons**: Use `@expo/vector-icons` (Ionicons set) for all UI icons. Do not mix icon sets.
- **Splash screen & app icon**: Generate for both iOS and Android specs using Expo's asset pipeline.

---

## 2. Tech Stack — Non-Negotiable

| Layer | Technology | Reason |
|-------|-----------|--------|
| Mobile apps | React Native + Expo SDK (latest stable) | Cross-platform, Expo EAS for App Store + Play Market |
| Admin & POS | Next.js 14 (App Router) + Tailwind CSS | Web dashboard + cashier PWA |
| Backend | Supabase (PostgreSQL) | Relational schema, real-time subscriptions, RLS, pgvector for AI later |
| Auth | Supabase Auth with phone/OTP | Via Eskiz.uz SMS gateway |
| File storage | Supabase Storage | Product images, receipts |
| Maps | Yandex Maps JS API (web) + react-native-maps with Yandex provider (mobile) | Better Tashkent street data |
| Payments | Octo (octo.uz) — Octobank's payment gateway | Uzbek cards: Uzcard, Humo, Visa, Mastercard |
| SMS/OTP | Eskiz.uz API | Uzbekistan-local, cost-efficient |
| Push notifications | Expo Push Notifications | Cross-platform, free |
| Translations | Google Cloud Translation API | Auto-translate from Uzbek Latin to UZ Cyrillic, RU, EN |
| Barcode scanning | `expo-camera` + `expo-barcode-scanner` | Phone camera scanning on collector/cashier |
| Hardware scanner | Bluetooth HID barcode scanners (plug-and-play as keyboard input) | For cashier POS tablet |
| State management | Zustand | Lightweight, no boilerplate |
| Data fetching | TanStack Query (React Query) | Caching, real-time sync |
| i18n | `i18next` + `react-i18next` | 4-language support |
| Monorepo | Turborepo with pnpm workspaces | Shared types, shared UI components |

---

## 3. Monorepo Structure

```
tasgo/
├── apps/
│   ├── mobile/          # Client App (Expo)
│   ├── staff/           # Staff App — Collector, Carrier, Cashier (Expo)
│   ├── admin/           # Admin Web Dashboard (Next.js)
│   └── pos/             # Cashier POS (Next.js PWA, same codebase as admin, separate route group)
├── packages/
│   ├── ui/              # Shared React Native + Web components
│   ├── types/           # Shared TypeScript types (Database, API contracts)
│   ├── config/          # Shared constants (delivery zone, order statuses, etc.)
│   ├── i18n/            # Shared translation files (uz-latn, uz-cyrl, ru, en)
│   └── supabase/        # Supabase client, typed DB client, Edge Functions
├── supabase/
│   ├── migrations/      # All DB migrations in order
│   ├── functions/       # Edge Functions (order assignment, translation, push, payment)
│   └── seed.sql         # Dev seed data
├── CLAUDE.md            # This file
└── .env.example         # All required environment variables listed
```

---

## 4. Environment Variables

Create `.env.example` with ALL of the following. Never hardcode any of these.

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Eskiz.uz SMS
ESKIZ_EMAIL=
ESKIZ_PASSWORD=

# Octo Payment Gateway
OCTO_SHOP_ID=
OCTO_SECRET_KEY=
OCTO_API_URL=https://secure.octo.uz

# Google Cloud Translation
GOOGLE_CLOUD_TRANSLATION_API_KEY=

# Yandex Maps
YANDEX_MAPS_API_KEY=

# Expo Push
EXPO_ACCESS_TOKEN=

# Delivery Zone (fill in when client confirms location)
DELIVERY_ZONE_CENTER_LAT=41.2995
DELIVERY_ZONE_CENTER_LNG=69.2401
DELIVERY_ZONE_RADIUS_KM=2.0

# Store Config
STORE_NAME=TasGo
STORE_OPERATING_HOURS=24/7
MIN_ORDER_FREE_DELIVERY_UZS=30000
DELIVERY_FEE_UZS=5000
```

---

## 5. Database Schema

### 5.1 Users & Auth

```sql
-- Managed by Supabase Auth (auth.users table)
-- Extended by:

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('client', 'collector', 'carrier', 'cashier', 'admin')),
  full_name TEXT,
  phone TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE client_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  default_address TEXT,
  default_address_lat DOUBLE PRECISION,
  default_address_lng DOUBLE PRECISION,
  loyalty_points INT DEFAULT 0
);

CREATE TABLE carrier_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  last_location_update TIMESTAMPTZ
);
```

### 5.2 Catalog

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_uz_latn TEXT NOT NULL,
  name_uz_cyrl TEXT,
  name_ru TEXT,
  name_en TEXT,
  image_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id),
  barcode TEXT UNIQUE,
  name_uz_latn TEXT NOT NULL,
  name_uz_cyrl TEXT,
  name_ru TEXT,
  name_en TEXT,
  description_uz_latn TEXT,
  description_uz_cyrl TEXT,
  description_ru TEXT,
  description_en TEXT,
  image_url TEXT,
  price_uzs BIGINT NOT NULL,         -- price in tiyin (smallest UZS unit × 100)
  stock_quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  has_discount BOOLEAN DEFAULT false,
  discount_percent INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_uz_latn TEXT,
  title_ru TEXT,
  image_url TEXT NOT NULL,
  link_type TEXT CHECK (link_type IN ('product', 'category', 'url', 'none')),
  link_value TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ
);
```

### 5.3 Orders

```sql
CREATE TYPE order_status AS ENUM (
  'placed',
  'collector_assigned',
  'collecting',
  'ready_for_pickup',
  'carrier_assigned',
  'in_transit',
  'delivered',
  'cancelled'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'refunded',
  'failed'
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,               -- human-readable order number
  client_id UUID REFERENCES profiles(id),
  collector_id UUID REFERENCES profiles(id),
  carrier_id UUID REFERENCES profiles(id),
  status order_status DEFAULT 'placed',
  payment_status payment_status DEFAULT 'pending',
  payment_method TEXT CHECK (payment_method IN ('octo_online')),
  octo_transaction_id TEXT,
  octo_payment_url TEXT,
  delivery_address TEXT NOT NULL,
  delivery_lat DOUBLE PRECISION NOT NULL,
  delivery_lng DOUBLE PRECISION NOT NULL,
  subtotal_uzs BIGINT NOT NULL,
  delivery_fee_uzs BIGINT NOT NULL DEFAULT 0,
  total_uzs BIGINT NOT NULL,
  client_note TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  rating_comment TEXT,
  placed_at TIMESTAMPTZ DEFAULT now(),
  collected_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name_snapshot TEXT NOT NULL,  -- name at time of order
  price_snapshot_uzs BIGINT NOT NULL,   -- price at time of order
  quantity INT NOT NULL,
  subtotal_uzs BIGINT NOT NULL
);
```

### 5.4 Inventory Transactions

```sql
CREATE TYPE inventory_action AS ENUM (
  'in_stock',        -- admin adds stock
  'cashier_sale',    -- POS in-store sale scan
  'order_reserved',  -- collector scans when collecting online order
  'adjustment',      -- manual admin correction
  'return'
);

CREATE TABLE inventory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  action inventory_action NOT NULL,
  quantity_change INT NOT NULL,        -- negative for outgoing
  performed_by UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.5 Notifications & Promos

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percent', 'fixed_uzs')),
  discount_value INT NOT NULL,
  min_order_uzs BIGINT DEFAULT 0,
  max_uses INT,
  used_count INT DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);
```

---

## 6. Row Level Security (RLS) Rules

Enable RLS on all tables. Apply these policies:

- `profiles`: Users can read/update their own row. Admin can read/update all.
- `products`, `categories`, `banners`: All authenticated users can read. Only admin can write.
- `orders`: Clients see only their orders. Collectors see orders assigned to them + `placed` status. Carriers see orders assigned to them + `ready_for_pickup`. Admin sees all.
- `order_items`: Follows parent order RLS.
- `inventory_log`: Collectors, cashiers, and admin can insert. Admin can read all.
- `carrier_profiles`: Carriers update their own location. Admin reads all. Clients can read location of carrier assigned to their active order only.

---

## 7. Account Types & Role Routing

### 7.1 Roles
| Role | App | Primary Function |
|------|-----|-----------------|
| `client` | Client App | Browse catalog, place orders, track delivery |
| `collector` | Staff App | Receive assigned orders, scan/collect items, hand to carrier |
| `carrier` | Staff App | Receive assigned orders, navigate to store, navigate to client |
| `cashier` | Staff App + POS | Scan products for in-store sales (reduces stock) |
| `admin` | Admin Web Dashboard | Full control: catalog, orders, users, analytics |

### 7.2 Staff App Role Routing
On login, Staff App reads `profiles.role` and routes:
- `collector` → CollectorHome screen
- `carrier` → CarrierHome screen
- `cashier` → CashierHome screen (or redirect to POS browser if on tablet)
- Any other role → show error and sign out

### 7.3 Admin adds staff
Admin creates staff accounts from the web dashboard. Staff cannot self-register at MVP. Admin sets name, phone, and role. Supabase Auth invite or admin-created OTP login is used.

---

## 8. Feature Specifications by Surface

### 8.1 Client App (React Native + Expo)

**Onboarding & Auth**
- Splash screen → language selector (Uzbek Latin default, UZ Cyrillic, Russian, English) → phone number entry → OTP via Eskiz.uz SMS → profile setup (name, address with Yandex map pin)
- Auth state persisted via Supabase session + SecureStore

**Home Screen**
- Sticky top bar: TasGo logo, search icon, cart icon with badge
- Promotional banners carousel (auto-scroll, from `banners` table)
- "Featured Products" horizontal scroll section (`is_featured = true`)
- Category grid (icons + names)
- "On Sale" section (`has_discount = true`)

**Catalog**
- Category screen → product grid (image, name, price, stock badge)
- Product detail: image gallery, name, description, price, stock indicator, quantity selector, "Add to Cart"
- If `stock_quantity = 0`: show "Out of Stock" badge, disable add to cart
- Search: full-text search across `name_uz_latn`, `name_ru` (Supabase full-text search)

**Cart**
- Persistent cart (Zustand + AsyncStorage)
- Show: items, quantities, subtotal, delivery fee logic:
  - If subtotal ≥ 30,000 UZS → delivery fee = 0
  - If subtotal < 30,000 UZS → delivery fee = 5,000 UZS
- Promo code input field
- "Place Order" button → triggers address confirmation → payment

**Checkout & Payment**
- Confirm delivery address (default or pick new point on Yandex map, validated inside delivery zone)
- If address is outside delivery zone radius → show error "Delivery is not available to this address yet"
- Payment: Octo online payment only at MVP
- On "Pay": call Supabase Edge Function `create-order` → Edge Function creates order record + calls Octo API to generate payment URL → open Octo payment page in in-app WebView
- On successful payment callback: update `orders.payment_status = 'paid'`, trigger auto-assignment pipeline

**Order Tracking**
- Active order screen: animated order status progress bar matching the status chain
- When status = `in_transit`: show Yandex map with carrier's real-time location (live from `carrier_profiles.current_lat/lng` via Supabase real-time subscription)
- Push notifications for every status change
- Order history: past orders, tap to view items + receipt

**Order Cancellation**
- Cancellation allowed only when `status = 'placed'` (before collector is assigned)
- After that: no cancellation from client side
- If payment was made: trigger Octo refund via Edge Function `refund-order`

**Rating**
- After delivery: prompt rating screen (1–5 stars + optional text comment)
- Stored on `orders.rating` and `orders.rating_comment`

**Profile**
- Name, phone (read-only), saved address, language setting, order history, logout

---

### 8.2 Staff App (React Native + Expo) — Role-Based

#### Collector Home
- List of orders assigned to this collector, sorted by `placed_at`
- Order card: order number, items count, delivery address
- Tap order → item list with checkboxes
- For each item: show product name, barcode, quantity needed
- Scan barcode (`expo-barcode-scanner`) to confirm each item collected
- On all items scanned: "Mark as Ready for Pickup" button → status → `ready_for_pickup` → triggers carrier auto-assignment
- Inventory is decremented via `inventory_log` entry on each scan

**Fallback**: If collector is unavailable (none online), incoming orders queue in `placed` status. System sends push notification to admin alerting "No collector available — manual action needed."

#### Carrier Home
- Toggle: Online / Offline (updates `carrier_profiles.is_online`)
- When Online: assigned orders appear as push notification + in-app alert
- Active order screen: 
  - Step 1: Navigate to store (Yandex map route to store location)
  - Step 2: Confirm pickup (tap "Picked Up" → status → `in_transit`)
  - Step 3: Navigate to client (Yandex map route to delivery address)
  - Step 4: "Confirm Delivery" button → status → `delivered`
- Location update: while carrier has active order, send GPS coords to `carrier_profiles` every 5 seconds (background task via `expo-task-manager`)

**Fallback**: If no carrier is online when order is `ready_for_pickup`, system sends push to client: "Your order is ready — a carrier will be assigned shortly. We apologize for the delay." Admin also receives alert.

#### Cashier View (in Staff App or POS browser)
- Large scan input field (hardware Bluetooth scanner inputs here as keyboard)
- Scanned product appears: name, price, image
- Quantity control
- Running total in UZS
- "Complete Sale" button → creates `inventory_log` entry with `action = 'cashier_sale'` → decrements `products.stock_quantity`
- No payment processing in POS at MVP (cash handled physically)
- Print receipt: not required at MVP

---

### 8.3 Admin Web Dashboard (Next.js)

**Layout**: Sidebar navigation + main content area. Responsive but optimized for desktop (1280px+).

**Dashboard Home (KPIs)**
Real-time panel:
- Live active orders (count + list)
- Carriers online right now (count + names)
- Low stock alerts (products below `low_stock_threshold`)
- Pending collector assignments

Today's summary:
- Orders placed / delivered / cancelled
- Revenue (UZS)
- Average delivery time (minutes)
- Delivery rating average

Historical analytics (date range picker):
- Revenue over time (line chart)
- Orders over time (bar chart)
- Top 10 selling products
- Peak order hours (heatmap by hour of day)
- Cancellation rate

**Order Management**
- Table: all orders, filterable by status, date, carrier, collector
- Order detail: full item list, client info, assigned staff, status timeline with timestamps
- Manual override: admin can reassign carrier/collector, change status manually
- Refund trigger: button on order detail → calls Edge Function `refund-order` → Octo API reversal

**Catalog Management**
- Categories: CRUD with image upload, sort order drag-and-drop
- Products: CRUD table with search/filter by category/barcode/stock
- Add product form:
  - Barcode (manual entry or scan via laptop camera)
  - Name in Uzbek Latin (required)
  - "Auto-translate" button → calls Google Cloud Translation API Edge Function → fills UZ Cyrillic, Russian, English fields
  - Description (same auto-translate flow)
  - Category, Price (UZS), Stock quantity, Low stock threshold
  - Image upload (Supabase Storage → CDN URL saved)
  - Featured toggle, Discount toggle + percent
- Bulk stock adjustment: select multiple products → add quantity
- Inventory log: full history filterable by product / action type / date

**User Management**
- Client list: name, phone, order count, join date
- Staff management: add/edit/deactivate collector, carrier, cashier accounts
- Carrier locations: live map showing all online carriers (Yandex map)

**Promotions**
- Banners: CRUD with image upload, schedule start/end dates, link target
- Promo codes: CRUD with usage stats
- Push notifications: compose and send to all clients or segments (admin-broadcast)

**Settings**
- Delivery zone: adjust center lat/lng and radius on a Yandex map (saves to Supabase config table)
- Min order for free delivery: editable
- Delivery fee: editable
- Store operating hours: editable (future use)

---

## 9. Auto-Assignment Pipeline (Edge Function: `assign-order`)

Triggered when:
- New order payment confirmed → assign collector
- Order status → `ready_for_pickup` → assign carrier

Logic:
```
1. Query all profiles with target role (collector/carrier) where is_active = true
2. For carriers: filter where is_online = true
3. For collectors: filter where not currently assigned to another active order
4. If none available → send push to admin + (for carrier) push to client with delay warning
5. If available → pick the one with fewest active assignments (load balancing)
6. Update order record with assigned staff ID
7. Update order status to next stage
8. Send push notification to assigned staff
9. Send push notification to client confirming assignment
```

---

## 10. Payment Flow (Octo)

### Create Payment
```
Client taps "Pay" 
→ Edge Function `create-payment`:
    1. Create order record in DB (status: placed, payment_status: pending)
    2. POST to Octo API: { shop_id, secret, amount_uzs, order_id, return_url, description }
    3. Octo returns { payment_url, transaction_id }
    4. Save transaction_id to orders table
    5. Return payment_url to client app
→ Client app opens payment_url in WebView
→ User completes payment on Octo page
→ Octo sends webhook to Edge Function `payment-webhook`
→ Webhook verifies signature, updates payment_status = 'paid'
→ Triggers assign-order pipeline
```

### Refund
```
Admin clicks "Refund" on order
→ Edge Function `refund-order`:
    1. Verify order is eligible (delivered, paid)
    2. POST to Octo refund API: { transaction_id, amount }
    3. On success: update payment_status = 'refunded', log refund
    4. Send push to client: "Your refund has been initiated"
```

---

## 11. Internationalization (i18n)

- Library: `i18next` + `react-i18next` for both mobile and web
- 4 locale files: `uz-latn.json`, `uz-cyrl.json`, `ru.json`, `en.json`
- Claude Code generates all 4 locale files with all UI string keys at project scaffold
- Default locale: `uz-latn`
- User can change language in profile settings; preference saved to `profiles` table and AsyncStorage
- Product names/descriptions: pulled from DB by locale (`name_uz_latn`, `name_ru`, etc.)
- Auto-translation for product content: Edge Function `translate-product` calls Google Cloud Translation API:
  - Input: `name_uz_latn` + `description_uz_latn`
  - Output: fills `name_uz_cyrl`, `name_ru`, `name_en` and `description_*` equivalents
  - Triggered on admin's tap of "Auto-translate" button in product form
  - Admin can manually override any translated field after auto-fill

---

## 12. Push Notification Triggers

Use Expo Push Notification API. Store tokens in `push_tokens` table.

| Event | Recipient | Message |
|-------|-----------|---------|
| Order placed | Client | "Your order #[N] has been received!" |
| Collector assigned | Client | "We're collecting your items now." |
| Ready for pickup | Client | "Your order is packed and waiting for a carrier." |
| Carrier assigned + in transit | Client | "Your order is on the way! Track it live." |
| Delivered | Client | "Delivered! Rate your experience." |
| Order cancelled | Client | "Your order was cancelled. Refund initiated." |
| Carrier unavailable | Client | "Your order is ready — carrier being assigned shortly. Sorry for the wait." |
| New order assigned | Collector | "New order #[N] — start collecting." |
| Order ready for pickup | Carrier | "Order #[N] ready — go to store." |
| No collector available | Admin | "⚠️ No collector online for order #[N]." |
| No carrier available | Admin | "⚠️ No carrier online for order #[N]." |
| Low stock | Admin | "⚠️ [Product name] is running low ([N] left)." |
| Promo broadcast | All clients | Admin-composed message |
| AI personalized offer (Phase 2) | Individual client | Personalized product suggestion |

---

## 13. Delivery Zone Validation

Client app and backend both validate delivery zone:

```typescript
// packages/config/deliveryZone.ts
export function isInsideDeliveryZone(
  lat: number,
  lng: number
): boolean {
  const R = 6371; // Earth radius km
  const dLat = toRad(lat - DELIVERY_ZONE_CENTER_LAT);
  const dLng = toRad(lng - DELIVERY_ZONE_CENTER_LNG);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(DELIVERY_ZONE_CENTER_LAT)) *
    Math.cos(toRad(lat)) *
    Math.sin(dLng / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return d <= DELIVERY_ZONE_RADIUS_KM;
}
```

Validate on:
1. Client selects delivery address on map (real-time visual feedback)
2. Order creation in Edge Function (server-side re-validation, reject if outside zone)

---

## 14. Order Status Flow

```
placed
  └─→ collector_assigned   (auto-assign pipeline, triggered on payment success)
        └─→ collecting      (collector accepts / starts collecting)
              └─→ ready_for_pickup  (collector scans all items, marks complete)
                    └─→ carrier_assigned  (auto-assign pipeline)
                          └─→ in_transit   (carrier confirms pickup from store)
                                └─→ delivered  (carrier confirms delivery)

Any status before carrier_assigned → can be cancelled by admin
placed only → can be cancelled by client (triggers refund if paid)
```

---

## 15. Cashier POS — Device Spec

- Target device: Android tablet, 10-inch screen (1280×800px landscape)
- Deployment: Browser PWA (Next.js, `/pos` route group)
- Hardware barcode scanner: Bluetooth HID, pairs as keyboard device
- Input method: scanner output lands in focused `<input>` field as string → triggers product lookup by barcode
- No payment processing in POS at MVP
- Session: admin logs in on tablet once, session persists

---

## 16. App Store Distribution

- **Expo EAS Build** for both iOS (`.ipa`) and Android (`.aab`)
- Apple Developer Account: client must create their own ($99/year). Clarify ownership with client before submission.
- Google Play Developer Account: client must create their own ($25 one-time).
- Before store approval: use **Expo Go** for client testing + **Expo internal distribution** (EAS internal build) for staff app
- Bundle IDs: `uz.tasgo.client` (client app), `uz.tasgo.staff` (staff app)

---

## 17. Development Phases

### Phase 1 — Foundation (do this first)
1. Monorepo scaffold with Turborepo + pnpm
2. Supabase project setup — all migrations, RLS policies, seed data
3. Shared packages: `types`, `config`, `i18n` (all 4 locale files)
4. Auth flow: both apps (phone OTP via Eskiz)
5. Admin web: product CRUD + category CRUD (so catalog can be populated before apps launch)
6. Cashier POS: barcode scan → stock decrement (unblocks store opening)

### Phase 2 — Core Delivery Loop
7. Client app: home screen, catalog browse, product detail, cart
8. Client app: checkout, Octo payment, order placement
9. Auto-assignment Edge Function
10. Collector app: order queue, item scanning, status updates
11. Carrier app: online toggle, order accept, navigation, delivery confirm
12. Push notifications for full status chain

### Phase 3 — Polish & Launch Prep
13. Client app: live carrier tracking on Yandex map
14. Admin dashboard: full analytics + live KPI home screen
15. Refund flow via Octo API
16. Rating/review system
17. Promotions: banners, promo codes, admin push broadcasts
18. Auto-translate on product entry
19. Delivery zone enforcement (map visual + backend validation)
20. EAS Build → TestFlight + Play Console internal testing

### Phase 4 (Post-Launch)
- AI personalized recommendations (pgvector embeddings on order history)
- Multi-store expansion (store_id foreign keys already in schema from day 1)
- Scheduled/slot delivery
- Multiple store locations

---

## 18. Rules Claude Code Must Follow

1. **Never hardcode secrets, API keys, or coordinates.** Always use environment variables.
2. **All prices stored as integers (tiyin = UZS × 100).** Display formatted as "125 000 UZS". Never use floats for money.
3. **RLS must be enabled and tested on every Supabase table.** Never use `service_role` key in client-facing code.
4. **Every Supabase Edge Function must verify auth JWT** before processing.
5. **Delivery zone validation runs on both client and server.** Client-side is UX. Server-side is enforcement.
6. **All DB writes that affect stock go through `inventory_log`.** Never update `products.stock_quantity` directly — use a trigger that sums `inventory_log` entries.
7. **i18n keys must be defined in all 4 locale files** before any UI component uses them. No undefined keys.
8. **Real-time carrier location updates only run when carrier has an active order.** Stop background task immediately on delivery confirmation to preserve battery.
9. **Octo payment webhook must verify the request signature** before updating order status.
10. **Product images stored in Supabase Storage**, served via CDN URL. Never store base64 in the database.
11. **Multi-store ready**: include `store_id UUID` column on `products`, `orders`, `inventory_log` from day 1 (even if only one store at launch). Default to the single store's UUID.
12. **Design standard**: every screen must match professional Uzbek consumer app quality. No placeholder lorem ipsum, no generic card layouts without real content hierarchy.
13. **TypeScript strict mode on all packages.** No `any` types without explicit justification comment.
14. **Test each integration in this order**: Eskiz OTP → Supabase Auth → Octo sandbox → Yandex Maps → Expo Push → Google Translate.

---

## 19. Key Contacts & Accounts

- Developer: Odilbek Iriskulov, Oxforder LLC — ceo@oxforder.uz
- App bundle owner: Client (TasGo) — Apple + Google accounts to be created by client
- Store location: To be provided by client (update `DELIVERY_ZONE_CENTER_LAT/LNG` in config)
- Neighborhood/mahalla: To be confirmed by client

---

## 20. Do Not Build (MVP Exclusions)

- Cash on delivery
- Multi-store support (schema-ready, not UI-ready)
- Pro/premium tier for clients
- AI personalized recommendations
- Order scheduling / time slots
- Loyalty points redemption
- Self-registration for staff
- In-app chat between client and carrier
- Receipt printing from POS
- Invoice generation
