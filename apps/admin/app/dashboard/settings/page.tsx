"use client";
import { useState, useEffect } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Database } from "@tasgo/types";

type StoreConfig = Database["public"]["Tables"]["store_config"]["Row"];

export default function SettingsPage() {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [deliveryLat, setDeliveryLat] = useState("");
  const [deliveryLng, setDeliveryLng] = useState("");
  const [deliveryRadius, setDeliveryRadius] = useState("");
  const [minOrderFreeDelivery, setMinOrderFreeDelivery] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [operatingHours, setOperatingHours] = useState("");

  useEffect(() => {
    async function fetchConfig() {
      const { data } = await supabaseAdmin.from("store_config").select("*").single();
      if (data) {
        setConfig(data);
        setDeliveryLat(String(data.delivery_zone_center_lat ?? "41.2995"));
        setDeliveryLng(String(data.delivery_zone_center_lng ?? "69.2401"));
        setDeliveryRadius(String(data.delivery_zone_radius_km ?? "2.0"));
        setMinOrderFreeDelivery(String(data.min_order_free_delivery_uzs ?? "30000"));
        setDeliveryFee(String(data.delivery_fee_uzs ?? "5000"));
        setOperatingHours(data.operating_hours ?? "24/7");
      }
    }
    void fetchConfig();
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      await supabaseAdmin.from("store_config").update({
        delivery_zone_center_lat: parseFloat(deliveryLat),
        delivery_zone_center_lng: parseFloat(deliveryLng),
        delivery_zone_radius_km: parseFloat(deliveryRadius),
        min_order_free_delivery_uzs: parseInt(minOrderFreeDelivery, 10),
        delivery_fee_uzs: parseInt(deliveryFee, 10),
        operating_hours: operatingHours,
      }).eq("id", config.id);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1C1C1A]">Sozlamalar</h1>

      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 space-y-6">
        {/* Delivery zone */}
        <div>
          <h2 className="text-sm font-bold text-[#1C1C1A] mb-4">Yetkazib berish hududi</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#6B6B67]">Kenglik (lat)</label>
              <input
                type="number"
                step="0.0001"
                className="mt-1 w-full border border-[#E8E8E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2E7D32]"
                value={deliveryLat}
                onChange={(e) => setDeliveryLat(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B6B67]">Uzunlik (lng)</label>
              <input
                type="number"
                step="0.0001"
                className="mt-1 w-full border border-[#E8E8E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2E7D32]"
                value={deliveryLng}
                onChange={(e) => setDeliveryLng(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B6B67]">Radius (km)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="20"
                className="mt-1 w-full border border-[#E8E8E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2E7D32]"
                value={deliveryRadius}
                onChange={(e) => setDeliveryRadius(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-[#ABABAB] mt-2">
            Markaziy nuqta va radius yetkazib berish hududini belgilaydi.
            Buyurtma paytida server tomonida tekshiriladi.
          </p>
        </div>

        <div className="border-t border-[#E8E8E4]" />

        {/* Delivery fee */}
        <div>
          <h2 className="text-sm font-bold text-[#1C1C1A] mb-4">Yetkazib berish narxi</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#6B6B67]">Bepul yetkazish chegarasi (UZS)</label>
              <input
                type="number"
                step="1000"
                className="mt-1 w-full border border-[#E8E8E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2E7D32]"
                value={minOrderFreeDelivery}
                onChange={(e) => setMinOrderFreeDelivery(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B6B67]">Yetkazib berish narxi (UZS)</label>
              <input
                type="number"
                step="500"
                className="mt-1 w-full border border-[#E8E8E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2E7D32]"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[#E8E8E4]" />

        {/* Operating hours */}
        <div>
          <h2 className="text-sm font-bold text-[#1C1C1A] mb-4">Ish vaqti</h2>
          <input
            type="text"
            className="w-full border border-[#E8E8E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2E7D32]"
            placeholder="24/7"
            value={operatingHours}
            onChange={(e) => setOperatingHours(e.target.value)}
          />
        </div>

        <div className="pt-2 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2E7D32] text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-[#1B5E20] transition-colors"
          >
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">✓ Saqlandi!</span>
          )}
        </div>
      </div>
    </div>
  );
}
