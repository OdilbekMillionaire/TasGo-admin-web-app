-- ============================================================
-- TasGo — Triggers Migration
-- ============================================================

-- ============================================================
-- TRIGGER: Recompute products.stock_quantity from inventory_log
-- All stock changes MUST go through inventory_log (rule §6)
-- ============================================================

CREATE OR REPLACE FUNCTION recompute_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET
    stock_quantity = COALESCE((
      SELECT SUM(quantity_change)
      FROM inventory_log
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_recompute_stock
AFTER INSERT OR UPDATE OR DELETE ON inventory_log
FOR EACH ROW EXECUTE FUNCTION recompute_stock_quantity();

-- ============================================================
-- TRIGGER: Update products.updated_at on row change
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_store_config_updated_at
BEFORE UPDATE ON store_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: Maintain products.search_vector for FTS
-- ============================================================

CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name_uz_latn, '')), 'A') ||
    setweight(to_tsvector('russian', COALESCE(NEW.name_ru, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.name_en, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description_uz_latn, '')), 'C') ||
    setweight(to_tsvector('russian', COALESCE(NEW.description_ru, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.barcode, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_search_vector
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- ============================================================
-- TRIGGER: Auto-create client_profile when profile role = client
-- ============================================================

CREATE OR REPLACE FUNCTION auto_create_role_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'client' THEN
    INSERT INTO client_profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  ELSIF NEW.role = 'carrier' THEN
    INSERT INTO carrier_profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_create_role_profile
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION auto_create_role_profile();

-- ============================================================
-- TRIGGER: Low stock push notification flag
-- Sets a notification after stock drops below threshold
-- Actual push sending is done by Edge Function polling this view
-- ============================================================

CREATE OR REPLACE VIEW low_stock_products AS
  SELECT
    p.id,
    p.name_uz_latn,
    p.stock_quantity,
    p.low_stock_threshold,
    p.store_id
  FROM products p
  WHERE
    p.is_active = true
    AND p.stock_quantity <= p.low_stock_threshold
    AND p.stock_quantity >= 0;
