"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatPrice } from "@/lib/utils";
import type { Database } from "@tasgo/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

function BulkStockModal({
  products,
  onClose,
  onDone,
}: {
  products: Product[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(products.map((p) => [p.id, ""]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const entries = products
      .map((p) => ({ product: p, qty: parseInt(quantities[p.id] ?? "0", 10) }))
      .filter((e) => !isNaN(e.qty) && e.qty !== 0);

    if (entries.length === 0) {
      setError("Kamida bitta mahsulot miqdorini kiriting");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession();
      const adminId = session?.user.id ?? null;

      const logs = entries.map((e) => ({
        product_id: e.product.id,
        action: "adjustment" as const,
        quantity_change: e.qty,
        performed_by: adminId,
        note: `Bulk stock adjustment: ${e.qty > 0 ? "+" : ""}${e.qty}`,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("inventory_log")
        .insert(logs);

      if (insertError) throw insertError;
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E4]">
          <h2 className="font-bold text-[#1C1C1A]">Ombor qo&apos;shish</h2>
          <button
            onClick={onClose}
            className="text-[#6B6B67] hover:text-[#1C1C1A] text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-[#6B6B67]">
            Musbat qiymat — kirim, manfiy qiymat — chiqim.
          </p>
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1C1C1A] truncate">{p.name_uz_latn}</p>
                <p className="text-xs text-[#6B6B67]">Hozir: {p.stock_quantity} ta</p>
              </div>
              <input
                type="number"
                value={quantities[p.id]}
                onChange={(e) => setQuantities((q) => ({ ...q, [p.id]: e.target.value }))}
                placeholder="+10"
                className="w-24 px-3 py-2 border border-[#E8E8E4] rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
              />
            </div>
          ))}
        </div>
        {error && <p className="px-6 text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 px-6 py-4 border-t border-[#E8E8E4]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-[#E8E8E4] rounded-xl text-sm font-medium text-[#6B6B67] hover:bg-[#F4F4F0] transition-colors"
          >
            Bekor
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const PAGE_SIZE = 20;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabaseAdmin
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) {
      query = query.ilike("name_uz_latn", `%${search.trim()}%`);
    }

    const { data } = await query;
    setProducts(data ?? []);
    setLoading(false);
  }, [search, page]);

  useEffect(() => { void fetchProducts(); }, [fetchProducts]);

  async function toggleActive(id: string, current: boolean) {
    await supabaseAdmin.from("products").update({ is_active: !current }).eq("id", id);
    void fetchProducts();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  const selectedProducts = products.filter((p) => selected.has(p.id));

  return (
    <div className="space-y-5">
      {showBulkModal && (
        <BulkStockModal
          products={selectedProducts}
          onClose={() => setShowBulkModal(false)}
          onDone={() => {
            setShowBulkModal(false);
            setSelected(new Set());
            void fetchProducts();
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1A]">Mahsulotlar</h1>
          <p className="text-sm text-[#6B6B67]">{products.length} ta natija</p>
        </div>
        <Link
          href="/dashboard/catalog/products/new"
          className="inline-flex items-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          + Mahsulot qo&apos;shish
        </Link>
      </div>

      {/* Search + bulk action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Mahsulot nomi yoki shtrix kodi..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 min-w-[200px] max-w-sm pl-4 pr-4 py-2.5 border border-[#E8E8E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32] bg-white"
        />
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#6B6B67]">{selected.size} ta tanlandi</span>
            <button
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              📦 Ombor qo&apos;shish
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-[#6B6B67] hover:text-[#1C1C1A] px-3 py-2.5"
            >
              Bekor
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FAFAF8] border-b border-[#E8E8E4]">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={products.length > 0 && selected.size === products.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-[#2E7D32] cursor-pointer"
                />
              </th>
              <th className="text-left px-4 py-3 font-semibold text-[#6B6B67] w-16">Rasm</th>
              <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Nomi</th>
              <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Narx</th>
              <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Ombor</th>
              <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Holat</th>
              <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Amal</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-[#6B6B67]">
                  Yuklanmoqda...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-[#6B6B67]">
                  Mahsulotlar topilmadi
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className={`border-b border-[#E8E8E4] last:border-0 transition-colors ${
                    selected.has(product.id) ? "bg-green-50" : "hover:bg-[#FAFAF8]"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="w-4 h-4 accent-[#2E7D32] cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name_uz_latn}
                        className="w-10 h-10 rounded-lg object-cover bg-[#F4F4F0]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#F4F4F0] flex items-center justify-center text-lg">
                        🛒
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#1C1C1A]">{product.name_uz_latn}</p>
                    {product.barcode && (
                      <p className="text-xs text-[#ABABAB]">{product.barcode}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1C1C1A]">
                    {formatPrice(product.price_uzs)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        product.stock_quantity <= 0
                          ? "bg-red-50 text-red-700"
                          : product.stock_quantity <= product.low_stock_threshold
                          ? "bg-amber-50 text-amber-700"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {product.stock_quantity <= 0
                        ? "Yo'q"
                        : product.stock_quantity <= product.low_stock_threshold
                        ? `⚠ ${product.stock_quantity} ta`
                        : `${product.stock_quantity} ta`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(product.id, product.is_active)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                        product.is_active
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {product.is_active ? "Faol" : "Nofaol"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/catalog/products/${product.id}/edit`}
                      className="text-[#2E7D32] hover:underline text-xs font-medium"
                    >
                      Tahrirlash
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-3 py-1.5 rounded-lg border border-[#E8E8E4] text-sm disabled:opacity-40 hover:bg-[#F4F4F0] transition-colors"
        >
          ← Oldingi
        </button>
        <span className="text-sm text-[#6B6B67]">Sahifa {page + 1}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={products.length < PAGE_SIZE}
          className="px-3 py-1.5 rounded-lg border border-[#E8E8E4] text-sm disabled:opacity-40 hover:bg-[#F4F4F0] transition-colors"
        >
          Keyingi →
        </button>
      </div>
    </div>
  );
}
