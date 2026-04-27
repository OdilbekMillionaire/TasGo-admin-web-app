"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatPrice } from "@/lib/utils";
import type { Database } from "@tasgo/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface SaleItem {
  product: Product;
  quantity: number;
}

export default function POSPage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [completing, setCompleting] = useState(false);
  const [lastMsg, setLastMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [staffName, setStaffName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Always keep focus on barcode input — hardware scanner sends keyboard events
  useEffect(() => {
    inputRef.current?.focus();

    async function getStaff() {
      const { data: { user } } = await supabaseAdmin.auth.getUser();
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        setStaffName(profile?.full_name ?? "Kassa");
      }
    }
    void getStaff();
  }, []);

  const lookupBarcode = useCallback(async (barcode: string) => {
    if (!barcode.trim()) return;
    setErrorMsg("");

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("barcode", barcode.trim())
      .eq("is_active", true)
      .single();

    if (!product) {
      setErrorMsg(`Mahsulot topilmadi: ${barcode}`);
      setBarcodeInput("");
      return;
    }

    setSaleItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setBarcodeInput("");
    setLastMsg(`Qo'shildi: ${product.name_uz_latn}`);
    setTimeout(() => setLastMsg(""), 2000);
  }, []);

  // Handle Enter key from hardware scanner
  function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      void lookupBarcode(barcodeInput);
    }
  }

  function updateQty(productId: string, delta: number) {
    setSaleItems((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(productId: string) {
    setSaleItems((prev) => prev.filter((i) => i.product.id !== productId));
  }

  const totalTiyin = saleItems.reduce(
    (sum, i) => sum + i.product.price_uzs * i.quantity,
    0
  );

  async function handleCompleteSale() {
    if (saleItems.length === 0) return;
    setCompleting(true);
    setErrorMsg("");

    const { data: { user } } = await supabaseAdmin.auth.getUser();

    // Insert inventory_log entries for each item (trigger updates stock_quantity)
    const logs = saleItems.map((item) => ({
      product_id: item.product.id,
      action: "cashier_sale" as const,
      quantity_change: -item.quantity,
      performed_by: user?.id ?? null,
      note: "POS sotuv",
    }));

    const { error } = await supabaseAdmin.from("inventory_log").insert(logs);

    if (error) {
      setErrorMsg("Xatolik: " + error.message);
      setCompleting(false);
      return;
    }

    setSaleItems([]);
    setLastMsg("✓ Sotuv yakunlandi!");
    setTimeout(() => setLastMsg(""), 4000);
    setCompleting(false);
    inputRef.current?.focus();
  }

  return (
    <div className="flex h-screen select-none" onClick={() => inputRef.current?.focus()}>
      {/* Left: Scan + item list */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2E7D32] flex items-center justify-center">
              <span className="text-sm font-bold text-white">TG</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1C1C1A]">TasGo Kassa</h1>
              <p className="text-xs text-[#6B6B67]">{staffName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastMsg && (
              <span className="text-sm font-medium text-[#2E7D32] bg-green-50 px-3 py-1 rounded-full">
                {lastMsg}
              </span>
            )}
            {errorMsg && (
              <span className="text-sm font-medium text-red-700 bg-red-50 px-3 py-1 rounded-full">
                {errorMsg}
              </span>
            )}
          </div>
        </div>

        {/* Barcode input — auto-focused, receives hardware scanner input */}
        <div className="mb-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              placeholder="Shtrix kodni skanerlang yoki kiriting..."
              className="w-full pl-12 pr-4 py-4 border-2 border-[#2E7D32] rounded-2xl text-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#2E7D32] bg-white shadow-sm"
              autoFocus
            />
          </div>
          <p className="text-xs text-[#ABABAB] mt-1.5 ml-1">
            Enter tugmasi bosilganda yoki skanerdan o&apos;tganda avtomatik qo&apos;shiladi
          </p>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {saleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-5xl mb-4">🛒</span>
              <p className="text-[#6B6B67] font-medium">Mahsulot skanerlang</p>
              <p className="text-sm text-[#ABABAB] mt-1">
                Shtrix kodni skanerga tuting yoki qo&apos;lda kiriting
              </p>
            </div>
          ) : (
            saleItems.map((item) => (
              <div
                key={item.product.id}
                className="bg-white rounded-2xl border border-[#E8E8E4] p-4 flex items-center gap-4 shadow-sm"
              >
                {/* Image */}
                <div className="w-14 h-14 rounded-xl bg-[#F4F4F0] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.product.image_url ? (
                    <img
                      src={item.product.image_url}
                      alt={item.product.name_uz_latn}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">🛒</span>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1C1C1A] truncate">
                    {item.product.name_uz_latn}
                  </p>
                  {item.product.barcode && (
                    <p className="text-xs text-[#ABABAB]">{item.product.barcode}</p>
                  )}
                  <p className="text-sm font-medium text-[#2E7D32]">
                    {formatPrice(item.product.price_uzs)} × {item.quantity} ={" "}
                    {formatPrice(item.product.price_uzs * item.quantity)}
                  </p>
                </div>
                {/* Quantity controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => updateQty(item.product.id, -1)}
                    className="w-9 h-9 rounded-full border border-[#E8E8E4] text-lg font-bold hover:bg-[#F4F4F0] transition-colors flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="text-lg font-bold w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.product.id, 1)}
                    className="w-9 h-9 rounded-full border border-[#E8E8E4] text-lg font-bold hover:bg-[#F4F4F0] transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="w-9 h-9 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Total + Complete sale */}
      <div className="w-72 flex flex-col bg-white border-l border-[#E8E8E4] p-6 shadow-lg">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-[#6B6B67] uppercase tracking-wide mb-4">
            Jami hisob
          </h2>

          {saleItems.length > 0 && (
            <div className="space-y-2 mb-6">
              {saleItems.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-[#6B6B67] truncate max-w-[140px]">
                    {item.product.name_uz_latn} × {item.quantity}
                  </span>
                  <span className="font-medium text-[#1C1C1A] flex-shrink-0">
                    {formatPrice(item.product.price_uzs * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="border-t border-[#E8E8E4] pt-2 mt-2" />
            </div>
          )}

          <div className="bg-[#F1F8E9] rounded-2xl p-4 text-center">
            <p className="text-xs font-medium text-[#6B6B67] uppercase tracking-wide mb-1">
              Jami to&apos;lov
            </p>
            <p className="text-3xl font-bold text-[#2E7D32]">
              {formatPrice(totalTiyin)}
            </p>
            <p className="text-xs text-[#6B6B67] mt-1">
              {saleItems.reduce((s, i) => s + i.quantity, 0)} ta mahsulot
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleCompleteSale}
            disabled={saleItems.length === 0 || completing}
            className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold py-4 rounded-2xl text-base transition-colors disabled:opacity-40 shadow-md"
          >
            {completing ? "Amalga oshirilmoqda..." : "✓ Sotuvni yakunlash"}
          </button>
          <button
            onClick={() => {
              if (saleItems.length > 0 && !window.confirm("Joriy sotuvni tozalamoqchimisiz?")) return;
              setSaleItems([]);
              setBarcodeInput("");
              setErrorMsg("");
            }}
            className="w-full border border-[#E8E8E4] hover:bg-[#F4F4F0] text-[#6B6B67] font-medium py-3 rounded-2xl text-sm transition-colors"
          >
            Tozalash
          </button>
        </div>
      </div>
    </div>
  );
}
