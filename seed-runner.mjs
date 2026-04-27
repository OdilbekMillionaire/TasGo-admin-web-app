// One-time seed script — run with: node seed-runner.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://pvucajzucrlsbdrjjcot.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dWNhanp1Y3Jsc2JkcmpqY290Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIxNDYzMywiZXhwIjoyMDkyNzkwNjMzfQ.C6mL695NdsP3blfxcMiBM2GTF0oHbvlIllxb2de04no";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log("Seeding categories...");
  const { error: catError } = await supabase.from("categories").upsert([
    { id: "cat-0001-0000-0000-000000000001", name_uz_latn: "Meva va sabzavotlar", name_ru: "Фрукты и овощи", name_en: "Fruits & Vegetables", sort_order: 1, is_active: true },
    { id: "cat-0001-0000-0000-000000000002", name_uz_latn: "Non va unli mahsulotlar", name_ru: "Хлеб и выпечка", name_en: "Bread & Bakery", sort_order: 2, is_active: true },
    { id: "cat-0001-0000-0000-000000000003", name_uz_latn: "Sut mahsulotlari", name_ru: "Молочные продукты", name_en: "Dairy", sort_order: 3, is_active: true },
    { id: "cat-0001-0000-0000-000000000004", name_uz_latn: "Go'sht va baliq", name_ru: "Мясо и рыба", name_en: "Meat & Fish", sort_order: 4, is_active: true },
    { id: "cat-0001-0000-0000-000000000005", name_uz_latn: "Ichimliklar", name_ru: "Напитки", name_en: "Beverages", sort_order: 5, is_active: true },
  ], { onConflict: "id" });
  if (catError) { console.error("Categories error:", catError.message); } else { console.log("✓ Categories done"); }

  console.log("Seeding products...");
  const { error: prodError } = await supabase.from("products").upsert([
    { id: "prod-0001-0000-0000-000000000001", category_id: "cat-0001-0000-0000-000000000001", barcode: "4890000000001", name_uz_latn: "Olma (1 kg)", name_ru: "Яблоки (1 кг)", name_en: "Apples (1 kg)", price_uzs: 1200000, low_stock_threshold: 20, is_active: true, is_featured: true },
    { id: "prod-0001-0000-0000-000000000002", category_id: "cat-0001-0000-0000-000000000001", barcode: "4890000000002", name_uz_latn: "Banan (1 kg)", name_ru: "Бананы (1 кг)", name_en: "Bananas (1 kg)", price_uzs: 1500000, low_stock_threshold: 20, is_active: true, is_featured: true },
    { id: "prod-0001-0000-0000-000000000003", category_id: "cat-0001-0000-0000-000000000001", barcode: "4890000000003", name_uz_latn: "Pomidor (1 kg)", name_ru: "Помидоры (1 кг)", name_en: "Tomatoes (1 kg)", price_uzs: 900000, low_stock_threshold: 30, is_active: true },
    { id: "prod-0001-0000-0000-000000000004", category_id: "cat-0001-0000-0000-000000000001", barcode: "4890000000004", name_uz_latn: "Bodring (1 kg)", name_ru: "Огурцы (1 кг)", name_en: "Cucumbers (1 kg)", price_uzs: 700000, low_stock_threshold: 30, is_active: true },
    { id: "prod-0001-0000-0000-000000000005", category_id: "cat-0001-0000-0000-000000000002", barcode: "4890000000005", name_uz_latn: "Oq non (lavash)", name_ru: "Лепёшка (лаваш)", name_en: "Flatbread (lavash)", price_uzs: 500000, low_stock_threshold: 50, is_active: true },
    { id: "prod-0001-0000-0000-000000000006", category_id: "cat-0001-0000-0000-000000000002", barcode: "4890000000006", name_uz_latn: "Bug'doy noni", name_ru: "Пшеничный хлеб", name_en: "Wheat Bread", price_uzs: 800000, low_stock_threshold: 40, is_active: true },
    { id: "prod-0001-0000-0000-000000000007", category_id: "cat-0001-0000-0000-000000000003", barcode: "4890000000007", name_uz_latn: "Sut 1L", name_ru: "Молоко 1л", name_en: "Milk 1L", price_uzs: 1100000, low_stock_threshold: 30, is_active: true, is_featured: true },
    { id: "prod-0001-0000-0000-000000000008", category_id: "cat-0001-0000-0000-000000000003", barcode: "4890000000008", name_uz_latn: "Tvorog 200g", name_ru: "Творог 200г", name_en: "Cottage Cheese 200g", price_uzs: 1400000, low_stock_threshold: 20, is_active: true },
    { id: "prod-0001-0000-0000-000000000009", category_id: "cat-0001-0000-0000-000000000003", barcode: "4890000000009", name_uz_latn: "Qatiq 500ml", name_ru: "Катык 500мл", name_en: "Katyk 500ml", price_uzs: 900000, low_stock_threshold: 25, is_active: true },
    { id: "prod-0001-0000-0000-000000000010", category_id: "cat-0001-0000-0000-000000000004", barcode: "4890000000010", name_uz_latn: "Tovuq go'shti (1 kg)", name_ru: "Курица (1 кг)", name_en: "Chicken (1 kg)", price_uzs: 3200000, low_stock_threshold: 15, is_active: true, is_featured: true },
    { id: "prod-0001-0000-0000-000000000011", category_id: "cat-0001-0000-0000-000000000004", barcode: "4890000000011", name_uz_latn: "Mol go'shti (1 kg)", name_ru: "Говядина (1 кг)", name_en: "Beef (1 kg)", price_uzs: 7500000, low_stock_threshold: 10, is_active: true },
    { id: "prod-0001-0000-0000-000000000012", category_id: "cat-0001-0000-0000-000000000005", barcode: "4890000000012", name_uz_latn: "Coca-Cola 1L", name_ru: "Кока-Кола 1л", name_en: "Coca-Cola 1L", price_uzs: 900000, low_stock_threshold: 40, is_active: true, has_discount: true, discount_percent: 10 },
    { id: "prod-0001-0000-0000-000000000013", category_id: "cat-0001-0000-0000-000000000005", barcode: "4890000000013", name_uz_latn: "Suv 1.5L", name_ru: "Вода 1.5л", name_en: "Water 1.5L", price_uzs: 300000, low_stock_threshold: 100, is_active: true },
    { id: "prod-0001-0000-0000-000000000014", category_id: "cat-0001-0000-0000-000000000005", barcode: "4890000000014", name_uz_latn: "Sharbat apelsin 1L", name_ru: "Сок апельсин 1л", name_en: "Orange Juice 1L", price_uzs: 1200000, low_stock_threshold: 30, is_active: true, is_featured: true },
    { id: "prod-0001-0000-0000-000000000015", category_id: "cat-0001-0000-0000-000000000001", barcode: "4890000000015", name_uz_latn: "Kartoshka (1 kg)", name_ru: "Картофель (1 кг)", name_en: "Potatoes (1 kg)", price_uzs: 600000, low_stock_threshold: 50, is_active: true },
  ], { onConflict: "id" });
  if (prodError) { console.error("Products error:", prodError.message); } else { console.log("✓ Products done"); }

  console.log("Seeding inventory (stock)...");
  const stockEntries = [
    "prod-0001-0000-0000-000000000001","prod-0001-0000-0000-000000000002","prod-0001-0000-0000-000000000003",
    "prod-0001-0000-0000-000000000004","prod-0001-0000-0000-000000000005","prod-0001-0000-0000-000000000006",
    "prod-0001-0000-0000-000000000007","prod-0001-0000-0000-000000000008","prod-0001-0000-0000-000000000009",
    "prod-0001-0000-0000-000000000010","prod-0001-0000-0000-000000000011","prod-0001-0000-0000-000000000012",
    "prod-0001-0000-0000-000000000013","prod-0001-0000-0000-000000000014","prod-0001-0000-0000-000000000015",
  ].map(product_id => ({ product_id, action: "in_stock", quantity_change: 100, store_id: "00000000-0000-0000-0000-000000000001" }));

  const { error: invError } = await supabase.from("inventory_log").insert(stockEntries);
  if (invError) { console.error("Inventory error:", invError.message); } else { console.log("✓ Stock seeded (100 units each)"); }

  console.log("Seeding banners...");
  const { error: banError } = await supabase.from("banners").upsert([
    { id: "ban-00001-0000-0000-000000000001", title_uz_latn: "TasGo — Tezkor yetkazib berish!", title_ru: "TasGo — Быстрая доставка!", image_url: "https://placehold.co/1200x400/2E7D32/white?text=TasGo", link_type: "none", is_active: true, sort_order: 1 },
    { id: "ban-00001-0000-0000-000000000002", title_uz_latn: "Yangi mahsulotlar!", title_ru: "Новые товары!", image_url: "https://placehold.co/1200x400/E65100/white?text=Yangi+mahsulotlar", link_type: "none", is_active: true, sort_order: 2 },
  ], { onConflict: "id" });
  if (banError) { console.error("Banners error:", banError.message); } else { console.log("✓ Banners done"); }

  console.log("Seeding promo code...");
  const { error: promoError } = await supabase.from("promo_codes").upsert([
    { code: "TASGO10", discount_type: "percent", discount_value: 10, min_order_uzs: 50000, max_uses: 100, is_active: true },
  ], { onConflict: "code" });
  if (promoError) { console.error("Promo error:", promoError.message); } else { console.log("✓ Promo code TASGO10 done"); }

  console.log("\n✅ Seed complete!");
}

seed().catch(console.error);
