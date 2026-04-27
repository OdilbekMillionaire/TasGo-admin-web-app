"use client";
import { useState, useEffect, useCallback } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatPrice } from "@/lib/utils";
import type { Database } from "@tasgo/types";

type Banner = Database["public"]["Tables"]["banners"]["Row"];
type PromoCode = Database["public"]["Tables"]["promo_codes"]["Row"];

export default function PromotionsPage() {
  const [tab, setTab] = useState<"banners" | "promos" | "push">("banners");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Push broadcast state
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: bannersData }, { data: promosData }] = await Promise.all([
      supabaseAdmin.from("banners").select("*").order("sort_order"),
      supabaseAdmin.from("promo_codes").select("*").order("created_at", { ascending: false }),
    ]);
    setBanners(bannersData ?? []);
    setPromos(promosData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function toggleBanner(banner: Banner) {
    await supabaseAdmin.from("banners").update({ is_active: !banner.is_active }).eq("id", banner.id);
    void fetchData();
  }

  async function togglePromo(promo: PromoCode) {
    await supabaseAdmin.from("promo_codes").update({ is_active: !promo.is_active }).eq("id", promo.id);
    void fetchData();
  }

  async function handleSendPush() {
    if (!pushMessage.trim()) return;
    setSending(true);
    try {
      // Get all client push tokens
      const { data: clients } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("role", "client");

      const clientIds = (clients ?? []).map((c) => c.id);
      if (clientIds.length === 0) {
        alert("Mijozlar topilmadi");
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userIds: clientIds,
          event: "broadcast",
          broadcastTitle: pushTitle || "TasGo",
          broadcastMessage: pushMessage,
        }),
      });

      const result = await res.json();
      alert(`${result.sent ?? 0} ta foydalanuvchiga yuborildi`);
      setPushTitle("");
      setPushMessage("");
    } catch {
      alert("Yuborishda xatolik");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1C1C1A]">Aksiyalar</h1>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-[#F4F4F2] p-1 rounded-xl w-fit">
        {(["banners", "promos", "push"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-[#1C1C1A] shadow-sm" : "text-[#6B6B67]"
            }`}
          >
            {t === "banners" ? "Bannerlar" : t === "promos" ? "Promo kodlar" : "Push xabar"}
          </button>
        ))}
      </div>

      {tab === "banners" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E8E8E4] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E8E8E4] flex items-center justify-between">
              <span className="text-sm font-semibold text-[#1C1C1A]">Bannerlar ({banners.length})</span>
            </div>
            {loading ? (
              <div className="p-6 text-center text-[#6B6B67]">Yuklanmoqda...</div>
            ) : banners.length === 0 ? (
              <div className="p-6 text-center text-[#6B6B67]">Banner yo'q</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAF8]">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B67]">Sarlavha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B67]">Turi</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B67]">Boshlanish</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B67]">Tugash</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B6B67]">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {banners.map((banner) => (
                    <tr key={banner.id} className="border-t border-[#E8E8E4] hover:bg-[#FAFAF8]">
                      <td className="px-4 py-3 font-medium text-[#1C1C1A]">{banner.title_uz_latn ?? "—"}</td>
                      <td className="px-4 py-3 text-[#6B6B67]">{banner.link_type ?? "none"}</td>
                      <td className="px-4 py-3 text-[#6B6B67] text-xs">
                        {banner.starts_at ? new Date(banner.starts_at).toLocaleDateString("uz-UZ") : "—"}
                      </td>
                      <td className="px-4 py-3 text-[#6B6B67] text-xs">
                        {banner.ends_at ? new Date(banner.ends_at).toLocaleDateString("uz-UZ") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggleBanner(banner)}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            banner.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {banner.is_active ? "Faol" : "Nofarol"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "promos" && (
        <div className="bg-white rounded-2xl border border-[#E8E8E4] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8E8E4]">
            <span className="text-sm font-semibold text-[#1C1C1A]">Promo kodlar ({promos.length})</span>
          </div>
          {loading ? (
            <div className="p-6 text-center text-[#6B6B67]">Yuklanmoqda...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF8]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B67]">Kod</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B67]">Chegirma</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B67]">Min buyurtma</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B67]">Ishlatilgan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B67]">Tugash</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B6B67]">Holat</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => (
                  <tr key={promo.id} className="border-t border-[#E8E8E4] hover:bg-[#FAFAF8]">
                    <td className="px-4 py-3 font-bold text-[#1C1C1A] font-mono">{promo.code}</td>
                    <td className="px-4 py-3 text-[#1C1C1A]">
                      {promo.discount_type === "percent"
                        ? `${promo.discount_value}%`
                        : formatPrice(promo.discount_value * 100)}
                    </td>
                    <td className="px-4 py-3 text-[#6B6B67]">
                      {promo.min_order_uzs ? formatPrice(promo.min_order_uzs * 100) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[#6B6B67]">
                      {promo.used_count}
                      {promo.max_uses ? ` / ${promo.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-[#6B6B67] text-xs">
                      {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString("uz-UZ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => togglePromo(promo)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          promo.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {promo.is_active ? "Faol" : "Nofarol"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "push" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#1C1C1A]">Barcha mijozlarga xabar yuborish</h2>
            <div>
              <label className="text-xs font-semibold text-[#6B6B67]">Sarlavha (ixtiyoriy)</label>
              <input
                type="text"
                className="mt-1 w-full border border-[#E8E8E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2E7D32]"
                placeholder="TasGo"
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B6B67]">Xabar</label>
              <textarea
                className="mt-1 w-full border border-[#E8E8E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2E7D32] resize-none"
                placeholder="Bugun maxsus chegirma! -20% barcha mahsulotlarda..."
                value={pushMessage}
                onChange={(e) => setPushMessage(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-[#ABABAB] mt-1">{pushMessage.length}/500</p>
            </div>
            <button
              onClick={handleSendPush}
              disabled={!pushMessage.trim() || sending}
              className="w-full bg-[#2E7D32] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 hover:bg-[#1B5E20] transition-colors"
            >
              {sending ? "Yuborilmoqda..." : "📢 Yuborish"}
            </button>
          </div>
          <p className="text-xs text-[#ABABAB]">
            Xabar barcha ro'yxatdan o'tgan mijozlarga yuboriladi.
          </p>
        </div>
      )}
    </div>
  );
}
