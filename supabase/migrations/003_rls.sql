-- ============================================================
-- TasGo — Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_config ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: Get current user's role without RLS recursion
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_my_role() = 'admin';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- profiles
-- ============================================================

-- Users read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admin reads all profiles
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (is_admin());

-- Users update their own profile (except role)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Admin updates all profiles
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (is_admin());

-- Admin inserts profiles (creating staff accounts)
CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (is_admin());

-- Service role bypass handled automatically

-- ============================================================
-- client_profiles
-- ============================================================

CREATE POLICY "client_profiles_select_own" ON client_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "client_profiles_update_own" ON client_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "client_profiles_admin" ON client_profiles
  FOR ALL USING (is_admin());

-- ============================================================
-- carrier_profiles
-- ============================================================

-- Carrier updates their own location
CREATE POLICY "carrier_profiles_update_own" ON carrier_profiles
  FOR UPDATE USING (id = auth.uid());

-- Carrier reads their own profile
CREATE POLICY "carrier_profiles_select_own" ON carrier_profiles
  FOR SELECT USING (id = auth.uid());

-- Admin reads/writes all carrier profiles
CREATE POLICY "carrier_profiles_admin" ON carrier_profiles
  FOR ALL USING (is_admin());

-- Client reads carrier location only when carrier is assigned to their active in-transit order
CREATE POLICY "carrier_profiles_select_client_active" ON carrier_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.carrier_id = carrier_profiles.id
        AND orders.client_id = auth.uid()
        AND orders.status = 'in_transit'
    )
  );

-- ============================================================
-- categories, products, banners — public reads, admin writes
-- ============================================================

CREATE POLICY "categories_select_authenticated" ON categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "categories_admin_write" ON categories
  FOR ALL USING (is_admin());

CREATE POLICY "products_select_authenticated" ON products
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Admin sees all including inactive
CREATE POLICY "products_admin" ON products
  FOR ALL USING (is_admin());

CREATE POLICY "banners_select_authenticated" ON banners
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY "banners_admin" ON banners
  FOR ALL USING (is_admin());

-- Admin sees all banners including scheduled/expired
CREATE POLICY "banners_select_admin" ON banners
  FOR SELECT USING (is_admin());

-- ============================================================
-- orders
-- ============================================================

-- Client sees only their own orders
CREATE POLICY "orders_select_client" ON orders
  FOR SELECT USING (client_id = auth.uid());

-- Collector sees orders assigned to them + all 'placed' status orders
CREATE POLICY "orders_select_collector" ON orders
  FOR SELECT USING (
    get_my_role() = 'collector'
    AND (collector_id = auth.uid() OR status = 'placed')
  );

-- Carrier sees orders assigned to them + all 'ready_for_pickup' status orders
CREATE POLICY "orders_select_carrier" ON orders
  FOR SELECT USING (
    get_my_role() = 'carrier'
    AND (carrier_id = auth.uid() OR status = 'ready_for_pickup')
  );

-- Admin sees all orders
CREATE POLICY "orders_select_admin" ON orders
  FOR SELECT USING (is_admin());

-- Client can insert orders (via Edge Function with service role in production)
CREATE POLICY "orders_insert_client" ON orders
  FOR INSERT WITH CHECK (client_id = auth.uid());

-- Collector updates status for their assigned orders
CREATE POLICY "orders_update_collector" ON orders
  FOR UPDATE USING (
    get_my_role() = 'collector'
    AND collector_id = auth.uid()
  );

-- Carrier updates status for their assigned orders
CREATE POLICY "orders_update_carrier" ON orders
  FOR UPDATE USING (
    get_my_role() = 'carrier'
    AND carrier_id = auth.uid()
  );

-- Client can cancel their own placed orders
CREATE POLICY "orders_update_client_cancel" ON orders
  FOR UPDATE USING (
    client_id = auth.uid()
    AND status = 'placed'
  );

-- Admin updates all orders
CREATE POLICY "orders_update_admin" ON orders
  FOR UPDATE USING (is_admin());

-- ============================================================
-- order_items — follows parent order RLS
-- ============================================================

CREATE POLICY "order_items_select" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND (
          orders.client_id = auth.uid()
          OR (get_my_role() = 'collector' AND (orders.collector_id = auth.uid() OR orders.status = 'placed'))
          OR (get_my_role() = 'carrier' AND (orders.carrier_id = auth.uid() OR orders.status = 'ready_for_pickup'))
          OR is_admin()
        )
    )
  );

CREATE POLICY "order_items_insert_client" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.client_id = auth.uid()
    )
  );

-- ============================================================
-- inventory_log
-- ============================================================

-- Collectors + cashiers + admin can insert
CREATE POLICY "inventory_log_insert" ON inventory_log
  FOR INSERT WITH CHECK (
    get_my_role() IN ('collector', 'cashier', 'admin')
  );

-- Admin reads all
CREATE POLICY "inventory_log_select_admin" ON inventory_log
  FOR SELECT USING (is_admin());

-- Collector sees their own entries
CREATE POLICY "inventory_log_select_collector" ON inventory_log
  FOR SELECT USING (
    get_my_role() = 'collector'
    AND performed_by = auth.uid()
  );

-- Cashier sees their own entries
CREATE POLICY "inventory_log_select_cashier" ON inventory_log
  FOR SELECT USING (
    get_my_role() = 'cashier'
    AND performed_by = auth.uid()
  );

-- ============================================================
-- push_tokens
-- ============================================================

CREATE POLICY "push_tokens_own" ON push_tokens
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "push_tokens_admin_select" ON push_tokens
  FOR SELECT USING (is_admin());

-- ============================================================
-- promo_codes
-- ============================================================

-- All authenticated users can read active promo codes (for validation)
CREATE POLICY "promo_codes_select_authenticated" ON promo_codes
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
  );

-- Admin manages all promo codes
CREATE POLICY "promo_codes_admin" ON promo_codes
  FOR ALL USING (is_admin());

-- ============================================================
-- store_config
-- ============================================================

-- All authenticated users read store config (need delivery zone settings on client)
CREATE POLICY "store_config_select_authenticated" ON store_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin can update store config
CREATE POLICY "store_config_admin" ON store_config
  FOR UPDATE USING (is_admin());
