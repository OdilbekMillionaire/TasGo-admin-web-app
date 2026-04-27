"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatPrice } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const GREEN = "#22C55E";
const GREEN_LIGHT = "rgba(34,197,94,0.15)";
const AMBER = "#F59E0B";
const CHARCOAL = "#1C1C1A";
const GRAY = "#6B6B67";

type OrderRow = {
  id: string;
  total_uzs: number;
  status: string;
  placed_at: string;
  delivered_at: string | null;
};

type TopProduct = { name: string; sold: number };
type HourCount = { hour: number; count: number };

function isoDay(d: string) {
  return d.slice(0, 10);
}

function buildDayLabels(from: string, to: string): string[] {
  const days: string[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    days.push(isoDay(cur.toISOString()));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function formatDay(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <p className="text-xs font-semibold text-[#6B6B67] uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1 text-[#1C1C1A]">{value}</p>
      {sub && <p className="text-xs text-[#ABABAB] mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <h3 className="text-sm font-semibold text-[#1C1C1A] mb-4">{title}</h3>
      {children}
    </div>
  );
}

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: GRAY, font: { size: 11 } } },
    y: { grid: { color: "#F0F0EE" }, ticks: { color: GRAY, font: { size: 11 } } },
  },
};

export default function AnalyticsPage() {
  const defaultFrom = () => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  };

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const fromIso = from + "T00:00:00";
    const toIso = to + "T23:59:59";

    const { data: ordersData } = await supabaseAdmin
      .from("orders")
      .select("id, total_uzs, status, placed_at, delivered_at")
      .gte("placed_at", fromIso)
      .lte("placed_at", toIso)
      .order("placed_at");

    const rows = (ordersData ?? []) as OrderRow[];
    setOrders(rows);

    if (rows.length > 0) {
      const orderIds = rows.map((o) => o.id);
      const { data: itemsData } = await supabaseAdmin
        .from("order_items")
        .select("product_name_snapshot, quantity")
        .in("order_id", orderIds);

      const tally: Record<string, number> = {};
      const items = (itemsData ?? []) as { product_name_snapshot: string; quantity: number }[];
      for (const item of items) {
        tally[item.product_name_snapshot] = (tally[item.product_name_snapshot] ?? 0) + item.quantity;
      }
      const sorted = Object.entries(tally)
        .map(([name, sold]) => ({ name, sold }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 10);
      setTopProducts(sorted);
    } else {
      setTopProducts([]);
    }

    setLoading(false);
  }, [from, to]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const delivered = orders.filter((o) => o.status === "delivered");
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const totalRevenue = delivered.reduce((s, o) => s + o.total_uzs, 0);
  const cancellationRate = orders.length > 0 ? Math.round((cancelled.length / orders.length) * 100) : 0;

  const days = buildDayLabels(from, to);

  const revenueByDay: Record<string, number> = {};
  const ordersByDay: Record<string, number> = {};
  for (const day of days) { revenueByDay[day] = 0; ordersByDay[day] = 0; }
  for (const o of orders) {
    const day = isoDay(o.placed_at);
    if (ordersByDay[day] !== undefined) {
      ordersByDay[day]++;
      if (o.status === "delivered") revenueByDay[day] += o.total_uzs;
    }
  }

  const hourCounts: HourCount[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  for (const o of orders) {
    const h = new Date(o.placed_at).getHours();
    hourCounts[h].count++;
  }

  const dayLabels = days.map(formatDay);

  const revenueDataset = {
    labels: dayLabels,
    datasets: [{
      data: days.map((d) => Math.round(revenueByDay[d] / 100)),
      borderColor: GREEN,
      backgroundColor: GREEN_LIGHT,
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: GREEN,
    }],
  };

  const ordersDataset = {
    labels: dayLabels,
    datasets: [{
      data: days.map((d) => ordersByDay[d]),
      backgroundColor: GREEN,
      borderRadius: 6,
    }],
  };

  const topProductsDataset = {
    labels: topProducts.map((p) => p.name.length > 22 ? p.name.slice(0, 22) + "…" : p.name),
    datasets: [{
      data: topProducts.map((p) => p.sold),
      backgroundColor: GREEN,
      borderRadius: 4,
    }],
  };

  const peakHoursDataset = {
    labels: hourCounts.map((h) => `${String(h.hour).padStart(2, "0")}:00`),
    datasets: [{
      data: hourCounts.map((h) => h.count),
      backgroundColor: hourCounts.map((h) =>
        h.count === Math.max(...hourCounts.map((x) => x.count)) ? AMBER : GREEN_LIGHT.replace("0.15", "0.6")
      ),
      borderRadius: 3,
    }],
  };

  const lineOptions = {
    ...baseChartOptions,
    scales: {
      ...baseChartOptions.scales,
      y: {
        ...baseChartOptions.scales.y,
        ticks: {
          ...baseChartOptions.scales.y.ticks,
          callback: (v: number | string) => {
            const n = typeof v === "number" ? v : parseFloat(v);
            return n >= 1000 ? `${Math.round(n / 1000)}K` : n;
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1A]">Tahlil</h1>
          <p className="text-sm text-[#6B6B67] mt-0.5">Savdo va buyurtmalar statistikasi</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-[#E8E8E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32] bg-white"
          />
          <span className="text-[#6B6B67] text-sm">—</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-[#E8E8E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32] bg-white"
          />
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Yangilash
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Jami buyurtmalar" value={orders.length} />
            <KpiCard label="Yetkazib berildi" value={delivered.length} />
            <KpiCard label="Jami daromad" value={formatPrice(totalRevenue)} sub="Yetkazib berilgan buyurtmalar bo'yicha" />
            <KpiCard label="Bekor qilish" value={`${cancellationRate}%`} sub={`${cancelled.length} ta bekor qilindi`} />
          </div>

          {/* Revenue chart */}
          <ChartCard title="Daromad (so'm, kunlik)">
            <div style={{ height: 240 }}>
              <Line data={revenueDataset} options={lineOptions as Parameters<typeof Line>[0]["options"]} />
            </div>
          </ChartCard>

          {/* Orders chart */}
          <ChartCard title="Buyurtmalar soni (kunlik)">
            <div style={{ height: 220 }}>
              <Bar data={ordersDataset} options={baseChartOptions as Parameters<typeof Bar>[0]["options"]} />
            </div>
          </ChartCard>

          {/* Top products + Peak hours */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Top 10 mahsulot (sotilgan dona)">
              {topProducts.length === 0 ? (
                <p className="text-sm text-[#ABABAB] text-center py-8">Ma&apos;lumot yo&apos;q</p>
              ) : (
                <div style={{ height: 280 }}>
                  <Bar
                    data={topProductsDataset}
                    options={{
                      ...baseChartOptions,
                      indexAxis: "y" as const,
                      scales: {
                        x: { grid: { color: "#F0F0EE" }, ticks: { color: GRAY, font: { size: 11 } } },
                        y: { grid: { display: false }, ticks: { color: CHARCOAL, font: { size: 11 } } },
                      },
                    } as Parameters<typeof Bar>[0]["options"]}
                  />
                </div>
              )}
            </ChartCard>

            <ChartCard title="Buyurtmalar soat bo'yicha (eng yuqori — sariq)">
              <div style={{ height: 280 }}>
                <Bar
                  data={peakHoursDataset}
                  options={{
                    ...baseChartOptions,
                    scales: {
                      x: { grid: { display: false }, ticks: { color: GRAY, font: { size: 9 }, maxRotation: 45 } },
                      y: { grid: { color: "#F0F0EE" }, ticks: { color: GRAY, font: { size: 11 } } },
                    },
                  } as Parameters<typeof Bar>[0]["options"]}
                />
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
