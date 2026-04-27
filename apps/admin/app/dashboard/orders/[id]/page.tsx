"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatPrice, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils";
import type { Database } from "@tasgo/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

const STATUS_SEQUENCE: OrderStatus[] = [
  "placed",
  "collector_assigned",
  "collecting",
  "ready_for_pickup",
  "carrier_assigned",
  "in_transit",
  "delivered",
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [client, setClient] = useState<Profile | null>(null);
  const [collector, setCollector] = useState<Profile | null>(null);
  const [carrier, setCarrier] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    const { data: orderData, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();
    if (orderErr || !orderData) {
      setError("Buyurtma topilmadi");
      setLoading(false);
      return;
    }
    setOrder(orderData);

    const { data: itemsData } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", id)
      .order("id");
    setItems(itemsData ?? []);

    if (orderData.client_id) {
      const { data: p } = await supabaseAdmin.from("profiles").select("*").eq("id", orderData.client_id).single();
      setClient(p ?? null);
    }
    if (orderData.collector_id) {
      const { data: p } = await supabaseAdmin.from("profiles").select("*").eq("id", orderData.collector_id).single();
      setCollector(p ?? null);
    }
    if (orderData.carrier_id) {
      const { data: p } = await supabaseAdmin.from("profiles").select("*").eq("id", orderData.carrier_id).single();
      setCarrier(p ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { void fetchOrder(); }, [fetchOrder]);

  async function handleRefund() {
    if (!order) return;
    if (!confirm("Ushbu buyurtmani to'lovini qaytarasizmi?")) return;
    setRefunding(true);
    const res = await fetch("/api/refund-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    });
    setRefunding(false);
    if (res.ok) {
      void fetchOrder();
    } else {
      alert("Qaytarish xatosi. Qaytadan urinib ko'ring.");
    }
  }

  async function handleStatusChange(newStatus: OrderStatus) {
    if (!order) return;
    if (!confirm(`Holatni "${ORDER_STATUS_LABELS[newStatus]}" ga o'zgartirasizmi?`)) return;
    setChangingStatus(true);
    const { error: err } = await supabaseAdmin
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id);
    setChangingStatus(false);
    if (!err) void fetchOrder();
    else alert("Xatolik yuz berdi.");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#6B6B67]">Yuklanmoqda...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/orders" className="text-[#2E7D32] text-sm font-medium hover:underline">
          ← Buyurtmalarga qaytish
        </Link>
        <p className="text-red-600">{error ?? "Topilmadi"}</p>
      </div>
    );
  }

  const currentStatusIndex = STATUS_SEQUENCE.indexOf(order.status as OrderStatus);
  const canRefund = order.payment_status === "paid" && order.status !== "cancelled";
  const canChangeStatus = order.status !== "delivered" && order.status !== "cancelled";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/orders" className="text-sm text-[#6B6B67] hover:text-[#2E7D32] font-medium">
            ← Buyurtmalar
          </Link>
          <h1 className="text-2xl font-bold text-[#1C1C1A] mt-1">
            Buyurtma #{order.order_number}
          </h1>
          <p className="text-sm text-[#6B6B67] mt-0.5">{formatDate(order.placed_at)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canRefund && (
            <button
              onClick={handleRefund}
              disabled={refunding}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-40"
            >
              {refunding ? "..." : "Qaytarish"}
            </button>
          )}
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left column: status timeline + items */}
        <div className="md:col-span-2 space-y-4">
          {/* Status timeline */}
          <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5">
            <h2 className="font-semibold text-[#1C1C1A] mb-4">Buyurtma holati</h2>
            {order.status === "cancelled" ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm">✕</div>
                <div>
                  <p className="font-semibold text-red-600">Bekor qilindi</p>
                  {order.cancelled_at && (
                    <p className="text-xs text-[#6B6B67]">{formatDate(order.cancelled_at)}</p>
                  )}
                  {order.cancellation_reason && (
                    <p className="text-xs text-[#6B6B67]">Sabab: {order.cancellation_reason}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {STATUS_SEQUENCE.map((status, idx) => {
                  const isDone = idx <= currentStatusIndex;
                  const isCurrent = idx === currentStatusIndex;
                  return (
                    <div key={status} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isDone ? "bg-[#2E7D32] text-white" : "bg-[#E8E8E4] text-[#6B6B67]"
                        }`}>
                          {isDone ? "✓" : idx + 1}
                        </div>
                        {idx < STATUS_SEQUENCE.length - 1 && (
                          <div className={`w-0.5 h-6 ${isDone ? "bg-[#2E7D32]" : "bg-[#E8E8E4]"}`} />
                        )}
                      </div>
                      <div className="pt-1 pb-6">
                        <p className={`font-medium text-sm ${isCurrent ? "text-[#2E7D32]" : isDone ? "text-[#1C1C1A]" : "text-[#6B6B67]"}`}>
                          {ORDER_STATUS_LABELS[status]}
                        </p>
                        {status === "delivered" && order.delivered_at && (
                          <p className="text-xs text-[#6B6B67]">{formatDate(order.delivered_at)}</p>
                        )}
                        {status === "placed" && (
                          <p className="text-xs text-[#6B6B67]">{formatDate(order.placed_at)}</p>
                        )}
                        {status === "collecting" && order.collected_at && (
                          <p className="text-xs text-[#6B6B67]">{formatDate(order.collected_at)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Manual status override */}
            {canChangeStatus && (
              <div className="mt-2 pt-4 border-t border-[#E8E8E4]">
                <p className="text-xs text-[#6B6B67] mb-2 font-medium">Admin: holatni o'zgartirish</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_SEQUENCE.filter((s) => s !== order.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={changingStatus}
                      className="px-3 py-1 rounded-full text-xs border border-[#E8E8E4] text-[#6B6B67] hover:border-[#2E7D32] hover:text-[#2E7D32] disabled:opacity-40"
                    >
                      {ORDER_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order items */}
          <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5">
            <h2 className="font-semibold text-[#1C1C1A] mb-4">Mahsulotlar ({items.length})</h2>
            {items.length === 0 ? (
              <p className="text-[#6B6B67] text-sm">Mahsulotlar topilmadi</p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-[#E8E8E4] last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-[#1C1C1A]">{item.product_name_snapshot}</p>
                      <p className="text-xs text-[#6B6B67]">
                        {formatPrice(item.price_snapshot_uzs)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-sm text-[#1C1C1A]">
                      {formatPrice(item.subtotal_uzs)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-[#E8E8E4] space-y-1.5">
              <div className="flex justify-between text-sm text-[#6B6B67]">
                <span>Mahsulotlar</span>
                <span>{formatPrice(order.subtotal_uzs)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#6B6B67]">
                <span>Yetkazib berish</span>
                <span>{order.delivery_fee_uzs === 0 ? "Bepul" : formatPrice(order.delivery_fee_uzs)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#1C1C1A] pt-1 border-t border-[#E8E8E4]">
                <span>Jami</span>
                <span>{formatPrice(order.total_uzs)}</span>
              </div>
            </div>
          </div>

          {/* Rating (if delivered) */}
          {order.rating && (
            <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5">
              <h2 className="font-semibold text-[#1C1C1A] mb-3">Mijoz bahosi</h2>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`text-xl ${star <= order.rating! ? "text-amber-400" : "text-gray-200"}`}>★</span>
                  ))}
                </div>
                <span className="font-bold text-[#1C1C1A]">{order.rating}/5</span>
              </div>
              {order.rating_comment && (
                <p className="mt-2 text-sm text-[#6B6B67] italic">"{order.rating_comment}"</p>
              )}
            </div>
          )}
        </div>

        {/* Right column: client, staff, payment, address */}
        <div className="space-y-4">
          {/* Client */}
          <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5">
            <h2 className="font-semibold text-[#1C1C1A] mb-3 text-sm">Mijoz</h2>
            {client ? (
              <div>
                <p className="font-medium text-sm text-[#1C1C1A]">{client.full_name ?? "—"}</p>
                <p className="text-xs text-[#6B6B67] mt-0.5">{client.phone}</p>
              </div>
            ) : (
              <p className="text-xs text-[#6B6B67]">Ma'lumot yo'q</p>
            )}
          </div>

          {/* Delivery address */}
          <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5">
            <h2 className="font-semibold text-[#1C1C1A] mb-2 text-sm">Yetkazib berish manzili</h2>
            <p className="text-sm text-[#6B6B67]">{order.delivery_address}</p>
            <p className="text-xs text-[#9B9B97] mt-1">
              {order.delivery_lat?.toFixed(5)}, {order.delivery_lng?.toFixed(5)}
            </p>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5">
            <h2 className="font-semibold text-[#1C1C1A] mb-3 text-sm">To'lov</h2>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#6B6B67]">Usul</span>
                <span className="font-medium text-[#1C1C1A]">Octo</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#6B6B67]">Holat</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  order.payment_status === "paid" ? "bg-green-100 text-green-700" :
                  order.payment_status === "refunded" ? "bg-blue-100 text-blue-700" :
                  order.payment_status === "failed" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {order.payment_status === "paid" ? "To'landi" :
                   order.payment_status === "refunded" ? "Qaytarildi" :
                   order.payment_status === "failed" ? "Muvaffaqiyatsiz" : "Kutilmoqda"}
                </span>
              </div>
              {order.octo_transaction_id && (
                <div className="text-xs text-[#9B9B97] break-all mt-1">
                  TxID: {order.octo_transaction_id}
                </div>
              )}
            </div>
          </div>

          {/* Staff */}
          <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5">
            <h2 className="font-semibold text-[#1C1C1A] mb-3 text-sm">Xodimlar</h2>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-[#9B9B97]">Yig'uvchi</p>
                <p className="text-sm text-[#1C1C1A] font-medium">
                  {collector?.full_name ?? (order.collector_id ? "Tayinlangan" : "—")}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9B9B97]">Kuryer</p>
                <p className="text-sm text-[#1C1C1A] font-medium">
                  {carrier?.full_name ?? (order.carrier_id ? "Tayinlangan" : "—")}
                </p>
              </div>
            </div>
          </div>

          {/* Note */}
          {order.client_note && (
            <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5">
              <h2 className="font-semibold text-[#1C1C1A] mb-2 text-sm">Izoh</h2>
              <p className="text-sm text-[#6B6B67] italic">"{order.client_note}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
