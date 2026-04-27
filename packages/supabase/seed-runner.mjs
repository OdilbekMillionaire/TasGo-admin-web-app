import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pvucajzucrlsbdrjjcot.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dWNhanp1Y3Jsc2JkcmpqY290Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIxNDYzMywiZXhwIjoyMDkyNzkwNjMzfQ.C6mL695NdsP3blfxcMiBM2GTF0oHbvlIllxb2de04no";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const CAT = {
  fruits:    "11000001-0000-0000-0000-000000000001",
  bread:     "11000001-0000-0000-0000-000000000002",
  dairy:     "11000001-0000-0000-0000-000000000003",
  meat:      "11000001-0000-0000-0000-000000000004",
  beverages: "11000001-0000-0000-0000-000000000005",
};
const PROD = {
  apples:    "22000001-0000-0000-0000-000000000001",
  bananas:   "22000001-0000-0000-0000-000000000002",
  tomatoes:  "22000001-0000-0000-0000-000000000003",
  cucumbers: "22000001-0000-0000-0000-000000000004",
  lavash:    "22000001-0000-0000-0000-000000000005",
  bread:     "22000001-0000-0000-0000-000000000006",
  milk:      "22000001-0000-0000-0000-000000000007",
  tvorog:    "22000001-0000-0000-0000-000000000008",
  qatiq:     "22000001-0000-0000-0000-000000000009",
  chicken:   "22000001-0000-0000-0000-000000000010",
  beef:      "22000001-0000-0000-0000-000000000011",
  cola:      "22000001-0000-0000-0000-000000000012",
  water:     "22000001-0000-0000-0000-000000000013",
  juice:     "22000001-0000-0000-0000-000000000014",
  potatoes:  "22000001-0000-0000-0000-000000000015",
};
const STORE_ID = "00000000-0000-0000-0000-000000000001";

async function seed() {
  const { error: c } = await supabase.from("categories").upsert([
    { id: CAT.fruits,    name_uz_latn: "Meva va sabzavotlar",     name_ru: "Frukty i ovoshhi",   name_en: "Fruits & Vegetables", sort_order: 1, is_active: true },
    { id: CAT.bread,     name_uz_latn: "Non va unli mahsulotlar", name_ru: "Xleb i vypechka",    name_en: "Bread & Bakery",      sort_order: 2, is_active: true },
    { id: CAT.dairy,     name_uz_latn: "Sut mahsulotlari",        name_ru: "Molochnye produkty", name_en: "Dairy",               sort_order: 3, is_active: true },
    { id: CAT.meat,      name_uz_latn: "Gosht va baliq",          name_ru: "Myaso i ryba",       name_en: "Meat & Fish",         sort_order: 4, is_active: true },
    { id: CAT.beverages, name_uz_latn: "Ichimliklar",             name_ru: "Napitki",            name_en: "Beverages",           sort_order: 5, is_active: true },
  ], { onConflict: "id" });
  console.log(c ? "Categories ERR: " + c.message : "Categories OK");

  const { error: p } = await supabase.from("products").upsert([
    { id: PROD.apples,    category_id: CAT.fruits,    barcode:"4890000000001", name_uz_latn:"Olma (1 kg)",         name_ru:"Yabloki (1 kg)",    name_en:"Apples (1 kg)",       price_uzs:1200000, low_stock_threshold:20, is_active:true, is_featured:true,  store_id:STORE_ID },
    { id: PROD.bananas,   category_id: CAT.fruits,    barcode:"4890000000002", name_uz_latn:"Banan (1 kg)",        name_ru:"Banany (1 kg)",     name_en:"Bananas (1 kg)",      price_uzs:1500000, low_stock_threshold:20, is_active:true, is_featured:true,  store_id:STORE_ID },
    { id: PROD.tomatoes,  category_id: CAT.fruits,    barcode:"4890000000003", name_uz_latn:"Pomidor (1 kg)",      name_ru:"Pomidory (1 kg)",   name_en:"Tomatoes (1 kg)",     price_uzs:900000,  low_stock_threshold:30, is_active:true, is_featured:false, store_id:STORE_ID },
    { id: PROD.cucumbers, category_id: CAT.fruits,    barcode:"4890000000004", name_uz_latn:"Bodring (1 kg)",      name_ru:"Ogurtsy (1 kg)",    name_en:"Cucumbers (1 kg)",    price_uzs:700000,  low_stock_threshold:30, is_active:true, is_featured:false, store_id:STORE_ID },
    { id: PROD.lavash,    category_id: CAT.bread,     barcode:"4890000000005", name_uz_latn:"Oq non (lavash)",     name_ru:"Lepyoshka (lavash)",name_en:"Flatbread (lavash)",  price_uzs:500000,  low_stock_threshold:50, is_active:true, is_featured:false, store_id:STORE_ID },
    { id: PROD.bread,     category_id: CAT.bread,     barcode:"4890000000006", name_uz_latn:"Bugdoy noni",         name_ru:"Pshenichniy xleb",  name_en:"Wheat Bread",         price_uzs:800000,  low_stock_threshold:40, is_active:true, is_featured:false, store_id:STORE_ID },
    { id: PROD.milk,      category_id: CAT.dairy,     barcode:"4890000000007", name_uz_latn:"Sut 1L",              name_ru:"Moloko 1L",         name_en:"Milk 1L",             price_uzs:1100000, low_stock_threshold:30, is_active:true, is_featured:true,  store_id:STORE_ID },
    { id: PROD.tvorog,    category_id: CAT.dairy,     barcode:"4890000000008", name_uz_latn:"Tvorog 200g",         name_ru:"Tvorog 200g",       name_en:"Cottage Cheese 200g", price_uzs:1400000, low_stock_threshold:20, is_active:true, is_featured:false, store_id:STORE_ID },
    { id: PROD.qatiq,     category_id: CAT.dairy,     barcode:"4890000000009", name_uz_latn:"Qatiq 500ml",         name_ru:"Katyk 500ml",       name_en:"Katyk 500ml",         price_uzs:900000,  low_stock_threshold:25, is_active:true, is_featured:false, store_id:STORE_ID },
    { id: PROD.chicken,   category_id: CAT.meat,      barcode:"4890000000010", name_uz_latn:"Tovuq goshti (1 kg)", name_ru:"Kuritsa (1 kg)",    name_en:"Chicken (1 kg)",      price_uzs:3200000, low_stock_threshold:15, is_active:true, is_featured:true,  store_id:STORE_ID },
    { id: PROD.beef,      category_id: CAT.meat,      barcode:"4890000000011", name_uz_latn:"Mol goshti (1 kg)",   name_ru:"Govyadina (1 kg)",  name_en:"Beef (1 kg)",         price_uzs:7500000, low_stock_threshold:10, is_active:true, is_featured:false, store_id:STORE_ID },
    { id: PROD.cola,      category_id: CAT.beverages, barcode:"4890000000012", name_uz_latn:"Coca-Cola 1L",        name_ru:"Koka-Kola 1L",      name_en:"Coca-Cola 1L",        price_uzs:900000,  low_stock_threshold:40, is_active:true, is_featured:false, has_discount:true, discount_percent:10, store_id:STORE_ID },
    { id: PROD.water,     category_id: CAT.beverages, barcode:"4890000000013", name_uz_latn:"Suv 1.5L",            name_ru:"Voda 1.5L",         name_en:"Water 1.5L",          price_uzs:300000,  low_stock_threshold:100,is_active:true, is_featured:false, store_id:STORE_ID },
    { id: PROD.juice,     category_id: CAT.beverages, barcode:"4890000000014", name_uz_latn:"Sharbat apelsin 1L",  name_ru:"Sok apelsin 1L",    name_en:"Orange Juice 1L",     price_uzs:1200000, low_stock_threshold:30, is_active:true, is_featured:true,  store_id:STORE_ID },
    { id: PROD.potatoes,  category_id: CAT.fruits,    barcode:"4890000000015", name_uz_latn:"Kartoshka (1 kg)",    name_ru:"Kartofel (1 kg)",   name_en:"Potatoes (1 kg)",     price_uzs:600000,  low_stock_threshold:50, is_active:true, is_featured:false, store_id:STORE_ID },
  ], { onConflict: "id" });
  console.log(p ? "Products ERR: " + p.message : "Products OK");

  const { error: i } = await supabase.from("inventory_log").insert(
    Object.values(PROD).map(product_id => ({ product_id, action: "in_stock", quantity_change: 100, store_id: STORE_ID }))
  );
  console.log(i ? "Stock ERR: " + i.message : "Stock OK (100 each)");

  const { error: b } = await supabase.from("banners").upsert([
    { id:"33000001-0000-0000-0000-000000000001", title_uz_latn:"TasGo - Tezkor yetkazib berish!", title_ru:"TasGo - Bystrayа dostavka!", image_url:"https://placehold.co/1200x400/2E7D32/white?text=TasGo", link_type:"none", is_active:true, sort_order:1 },
    { id:"33000001-0000-0000-0000-000000000002", title_uz_latn:"Yangi mahsulotlar!", title_ru:"Novye tovary!", image_url:"https://placehold.co/1200x400/E65100/white?text=Yangi+mahsulotlar", link_type:"none", is_active:true, sort_order:2 },
  ], { onConflict: "id" });
  console.log(b ? "Banners ERR: " + b.message : "Banners OK");

  const { error: pr } = await supabase.from("promo_codes").upsert([
    { code: "TASGO10", discount_type: "percent", discount_value: 10, min_order_uzs: 50000, max_uses: 100, is_active: true },
  ], { onConflict: "code" });
  console.log(pr ? "Promo ERR: " + pr.message : "Promo TASGO10 OK");

  console.log("\nDone! Database seeded.");
}
seed().catch(console.error);
