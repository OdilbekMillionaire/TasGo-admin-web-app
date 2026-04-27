-- ============================================================
-- TasGo — Initial Schema Migration
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- full-text/trigram search
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- accent-insensitive search

-- ============================================================
-- ENUMS
-- ============================================================

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

CREATE TYPE inventory_action AS ENUM (
  'in_stock',
  'cashier_sale',
  'order_reserved',
  'adjustment',
  'return'
);

-- ============================================================
-- USERS & AUTH (extends Supabase auth.users)
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('client', 'collector', 'carrier', 'cashier', 'admin')),
  full_name   TEXT,
  phone       TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE client_profiles (
  id                    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  default_address       TEXT,
  default_address_lat   DOUBLE PRECISION,
  default_address_lng   DOUBLE PRECISION,
  loyalty_points        INT DEFAULT 0
);

CREATE TABLE carrier_profiles (
  id                    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_online             BOOLEAN DEFAULT false,
  current_lat           DOUBLE PRECISION,
  current_lng           DOUBLE PRECISION,
  last_location_update  TIMESTAMPTZ
);

-- ============================================================
-- CATALOG
-- ============================================================

CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_uz_latn    TEXT NOT NULL,
  name_uz_cyrl    TEXT,
  name_ru         TEXT,
  name_en         TEXT,
  image_url       TEXT,
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT true
);

CREATE TABLE products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  category_id           UUID REFERENCES categories(id),
  barcode               TEXT UNIQUE,
  name_uz_latn          TEXT NOT NULL,
  name_uz_cyrl          TEXT,
  name_ru               TEXT,
  name_en               TEXT,
  description_uz_latn   TEXT,
  description_uz_cyrl   TEXT,
  description_ru        TEXT,
  description_en        TEXT,
  image_url             TEXT,
  price_uzs             BIGINT NOT NULL CHECK (price_uzs > 0),
  stock_quantity        INT NOT NULL DEFAULT 0,   -- maintained by trigger
  low_stock_threshold   INT DEFAULT 10,
  is_active             BOOLEAN DEFAULT true,
  is_featured           BOOLEAN DEFAULT false,
  has_discount          BOOLEAN DEFAULT false,
  discount_percent      INT DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  search_vector         TSVECTOR,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE banners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_uz_latn   TEXT,
  title_ru        TEXT,
  image_url       TEXT NOT NULL,
  link_type       TEXT CHECK (link_type IN ('product', 'category', 'url', 'none')),
  link_value      TEXT,
  is_active       BOOLEAN DEFAULT true,
  sort_order      INT DEFAULT 0,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ
);

-- ============================================================
-- ORDERS
-- ============================================================

CREATE SEQUENCE order_number_seq START 1000;

CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  order_number          INT NOT NULL DEFAULT nextval('order_number_seq'),
  client_id             UUID REFERENCES profiles(id),
  collector_id          UUID REFERENCES profiles(id),
  carrier_id            UUID REFERENCES profiles(id),
  status                order_status DEFAULT 'placed',
  payment_status        payment_status DEFAULT 'pending',
  payment_method        TEXT CHECK (payment_method IN ('octo_online')),
  octo_transaction_id   TEXT,
  octo_payment_url      TEXT,
  delivery_address      TEXT NOT NULL,
  delivery_lat          DOUBLE PRECISION NOT NULL,
  delivery_lng          DOUBLE PRECISION NOT NULL,
  subtotal_uzs          BIGINT NOT NULL CHECK (subtotal_uzs >= 0),
  delivery_fee_uzs      BIGINT NOT NULL DEFAULT 0 CHECK (delivery_fee_uzs >= 0),
  total_uzs             BIGINT NOT NULL CHECK (total_uzs >= 0),
  client_note           TEXT,
  rating                INT CHECK (rating BETWEEN 1 AND 5),
  rating_comment        TEXT,
  placed_at             TIMESTAMPTZ DEFAULT now(),
  collected_at          TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancellation_reason   TEXT
);

CREATE TABLE order_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id              UUID REFERENCES products(id),
  product_name_snapshot   TEXT NOT NULL,
  price_snapshot_uzs      BIGINT NOT NULL,
  quantity                INT NOT NULL CHECK (quantity > 0),
  subtotal_uzs            BIGINT NOT NULL
);

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE TABLE inventory_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  product_id      UUID REFERENCES products(id),
  action          inventory_action NOT NULL,
  quantity_change INT NOT NULL,
  performed_by    UUID REFERENCES profiles(id),
  order_id        UUID REFERENCES orders(id),
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PUSH TOKENS & PROMOS
-- ============================================================

CREATE TABLE push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT CHECK (platform IN ('ios', 'android')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE TABLE promo_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  discount_type   TEXT CHECK (discount_type IN ('percent', 'fixed_uzs')),
  discount_value  INT NOT NULL CHECK (discount_value > 0),
  min_order_uzs   BIGINT DEFAULT 0,
  max_uses        INT,
  used_count      INT DEFAULT 0,
  valid_from      TIMESTAMPTZ,
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true
);

-- ============================================================
-- STORE CONFIG (admin-editable settings)
-- ============================================================

CREATE TABLE store_config (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id                    UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' UNIQUE,
  delivery_zone_center_lat    DOUBLE PRECISION NOT NULL DEFAULT 41.2995,
  delivery_zone_center_lng    DOUBLE PRECISION NOT NULL DEFAULT 69.2401,
  delivery_zone_radius_km     DOUBLE PRECISION NOT NULL DEFAULT 2.0,
  min_order_free_delivery_uzs BIGINT NOT NULL DEFAULT 30000,
  delivery_fee_uzs            BIGINT NOT NULL DEFAULT 5000,
  store_name                  TEXT NOT NULL DEFAULT 'TasGo',
  operating_hours             TEXT NOT NULL DEFAULT '24/7',
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- Insert default store config
INSERT INTO store_config (store_id) VALUES ('00000000-0000-0000-0000-000000000001');

-- ============================================================
-- INDEXES
-- ============================================================

-- Products
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_discount ON products(has_discount) WHERE has_discount = true;
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Orders
CREATE INDEX idx_orders_client ON orders(client_id);
CREATE INDEX idx_orders_collector ON orders(collector_id);
CREATE INDEX idx_orders_carrier ON orders(carrier_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_placed_at ON orders(placed_at DESC);
CREATE INDEX idx_orders_store ON orders(store_id);

-- Inventory log
CREATE INDEX idx_inventory_product ON inventory_log(product_id);
CREATE INDEX idx_inventory_order ON inventory_log(order_id);
CREATE INDEX idx_inventory_created ON inventory_log(created_at DESC);

-- Order items
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Push tokens
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);

-- Carrier profiles
CREATE INDEX idx_carrier_online ON carrier_profiles(is_online) WHERE is_online = true;
