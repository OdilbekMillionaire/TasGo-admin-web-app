"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatPrice, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils";
import type { Database } from "@tasgo/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

const STATUS_OPTIONS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Barchasi" },
  { value: "placed", label: "Qabul qilindi" },
  { value: "collector_assigned", label: "Yig'uvchi" },
  { value: "collecting", label: "Yig'ilmoqda" },
  { value: "ready_for_pickup", label: "Tayyor" },
  { value: "carrier_assigned", label: "Kuryer" },
  { value: "in_transit", label: "Yo'lda" },
  { value: "delivered", label: "Yetkazildi" },
  { value: "cancelled", label: "Bekor" },
];

const PAGE_SIZE = 25;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabaseAdmin
      .from("orders")
      .select("*", { count: "exact" })
      .order("placed_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, count, error } = await query;
    if (!error) {
      setOrders(data ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  async function handleRefund(orderId: string) {
    if (!confirm("Ushbu buyurtmani qaytarasizmi?")) return;
    const res = await fetch("/api/refund-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    if (res.ok) {
      void fetchOrders();
    } else {
      alert("Qaytarish xatosi. Qaytadan urinib ko'ring.");
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1A]">Buyurtmalar</h1>
          <p className="text-sm text-[#6B6B67] mt-0.5">{total} ta buyurtma</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(0); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === opt.value
                ? "bg-[#2E7D32] text-white"
                : "bg-white border border-[#E8E8E4] text-[#6B6B67] hover:border-[#2E7D32]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E8E4] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#6B6B67]">Yuklanmoqda...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-[#6B6B67]">Buyurtmalar topilmadi</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF8] border-b border-[#E8E8E4]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">#</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Holat</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Manzil</th>
                <th className="text-right px-4 py-3 font-semibold text-[#6B6B67]">Summa</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Vaqt</th>
                <th className="text-right px-4 py-3 font-semibold text-[#6B6B67]">Amal</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-[#E8E8E4] last:border-0 hover:bg-[#FAFAF8]">
                  <td className="px-4 py-3 font-bold text-[#1C1C1A]">#{order.order_number}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6B6B67] max-w-[200px] truncate">
                    {order.delivery_address}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#1C1C1A]">
                    {formatPrice(order.total_uzs)}
                  </td>
                  <td className="px-4 py-3 text-[#6B6B67] text-xs">
                    {new Date(order.placed_at).toLocaleString("uz-UZ", {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-xs text-[#2E7D32] font-medium hover:underline"
                      >
                        Ko'rish
                      </Link>
                      {order.payment_status === "paid" && order.status !== "refunded" && (
                        <button
                          onClick={() => handleRefund(order.id)}
                          className="text-xs text-red-600 font-medium hover:underline"
                        >
                          Qaytarish
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#6B6B67]">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-[#E8E8E4] text-sm disabled:opacity-40 hover:border-[#2E7D32]"
            >
              ← Oldingi
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-[#E8E8E4] text-sm disabled:opacity-40 hover:border-[#2E7D32]"
            >
              Keyingi →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
