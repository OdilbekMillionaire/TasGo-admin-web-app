"use client";

import { useEffect, useState } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatPrice } from "@/lib/utils";
import type { AdminDashboardStats } from "@tasgo/types";

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <p className="text-sm font-medium text-[#6B6B67]">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color ?? "text-[#1C1C1A]"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-[#ABABAB] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Partial<AdminDashboardStats>>({});
  const [liveOrders, setLiveOrders] = useState<
    Array<{ id: string; order_number: number; status: string; client_id: string | null; placed_at: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [
      { count: activeOrders },
      { count: carriersOnline },
      { count: lowStock },
      { count: pendingAssignment },
      { data: todayOrdersData },
    ] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("*", { count: "exact", head: true })
        .in("status", ["placed", "collector_assigned", "collecting", "ready_for_pickup", "carrier_assigned", "in_transit"]),
      supabaseAdmin
        .from("carrier_profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_online", true),
      supabaseAdmin
        .from("low_stock_products")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "placed"),
      supabaseAdmin
        .from("orders")
        .select("total_uzs, status, delivered_at, placed_at, rating")
        .gte("placed_at", todayStart),
    ]);

    const todayOrders = todayOrdersData ?? [];
    const delivered = todayOrders.filter((o) => o.status === "delivered");
    const cancelled = todayOrders.filter((o) => o.status === "cancelled");
    const revenue = delivered.reduce((sum, o) => sum + o.total_uzs, 0);
    const avgRating =
      delivered.filter((o) => o.rating).reduce((sum, o) => sum + (o.rating ?? 0), 0) /
        (delivered.filter((o) => o.rating).length || 1);

    setStats({
      liveActiveOrders: activeOrders ?? 0,
      carriersOnline: carriersOnline ?? 0,
      lowStockCount: lowStock ?? 0,
      pendingCollectorAssignments: pendingAssignment ?? 0,
      todayOrders: todayOrders.length,
      todayRevenue: revenue,
      todayCancelled: cancelled.length,
      avgRating: parseFloat(avgRating.toFixed(1)),
    });
  }

  async function fetchLiveOrders() {
    const { data } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status, client_id, placed_at")
      .in("status", ["placed", "collector_assigned", "collecting", "ready_for_pickup", "carrier_assigned", "in_transit"])
      .order("placed_at", { ascending: false })
      .limit(10);
    setLiveOrders(data ?? []);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLiveOrders()]);
      setLoading(false);
    }
    void load();

    // Real-time subscription for live orders
    const channel = supabaseAdmin
      .channel("live-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        void fetchStats();
        void fetchLiveOrders();
      })
      .subscribe();

    return () => { void supabaseAdmin.removeChannel(channel); };
  }, []);

  const STATUS_LABELS: Record<string, string> = {
    placed: "Qabul qilindi",
    collector_assigned: "Yig'uvchi tayinlandi",
    collecting: "Yig'ilmoqda",
    ready_for_pickup: "Kuryer uchun tayyor",
    carrier_assigned: "Kuryer tayinlandi",
    in_transit: "Yo'lda",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1C1C1A]">Dashboard</h1>
        <p className="text-sm text-[#6B6B67] mt-0.5">Jonli holat va bugungi statistika</p>
      </div>

      {/* Live panel */}
      <div>
        <h2 className="text-sm font-semibold text-[#6B6B67] uppercase tracking-wider mb-3">
          Jonli holat
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Faol buyurtmalar"
            value={loading ? "—" : (stats.liveActiveOrders ?? 0)}
            color="text-blue-700"
          />
          <StatCard
            label="Onlayn kuryer"
            value={loading ? "—" : (stats.carriersOnline ?? 0)}
            color="text-[#2E7D32]"
          />
          <StatCard
            label="Yig'uvchi kutmoqda"
            value={loading ? "—" : (stats.pendingCollectorAssignments ?? 0)}
            color="text-amber-700"
          />
          <StatCard
            label="Kam qolgan mahsulot"
            value={loading ? "—" : (stats.lowStockCount ?? 0)}
            color="text-red-700"
          />
        </div>
      </div>

      {/* Today's summary */}
      <div>
        <h2 className="text-sm font-semibold text-[#6B6B67] uppercase tracking-wider mb-3">
          Bugun
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Buyurtmalar" value={loading ? "—" : (stats.todayOrders ?? 0)} />
          <StatCard
            label="Daromad"
            value={loading ? "—" : formatPrice(stats.todayRevenue ?? 0)}
          />
          <StatCard
            label="Bekor qilingan"
            value={loading ? "—" : (stats.todayCancelled ?? 0)}
          />
          <StatCard
            label="O'rtacha reyting"
            value={loading ? "—" : `${stats.avgRating ?? 0} ⭐`}
          />
        </div>
      </div>

      {/* Live orders list */}
      <div>
        <h2 className="text-sm font-semibold text-[#6B6B67] uppercase tracking-wider mb-3">
          Faol buyurtmalar
        </h2>
        <div className="bg-white rounded-2xl border border-[#E8E8E4] overflow-hidden">
          {liveOrders.length === 0 ? (
            <div className="p-6 text-center text-[#6B6B67] text-sm">
              {loading ? "Yuklanmoqda..." : "Faol buyurtmalar yo'q"}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF8] border-b border-[#E8E8E4]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Holat</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Vaqt</th>
                </tr>
              </thead>
              <tbody>
                {liveOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[#E8E8E4] last:border-0 hover:bg-[#FAFAF8] transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-[#1C1C1A]">
                      #{order.order_number}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B6B67]">
                      {new Date(order.placed_at).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
