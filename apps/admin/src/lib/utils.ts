import type { ClassValue } from "clsx";

// Simple className utility (avoids needing clsx dependency)
export function cn(...classes: ClassValue[]): string {
  return classes
    .filter(Boolean)
    .map((c) => (typeof c === "string" ? c : ""))
    .join(" ");
}

// Format price from tiyin to display string — matches @tasgo/config canonical format
export function formatPrice(tiyin: number): string {
  const uzs = Math.round(tiyin / 100);
  return uzs.toLocaleString("ru-RU").replace(/,/g, " ") + " UZS";
}

// Format date
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU");
}

// Order status badge colors
export const ORDER_STATUS_COLORS: Record<string, string> = {
  placed: "bg-gray-100 text-gray-700",
  collector_assigned: "bg-blue-100 text-blue-700",
  collecting: "bg-purple-100 text-purple-700",
  ready_for_pickup: "bg-amber-100 text-amber-700",
  carrier_assigned: "bg-orange-100 text-orange-700",
  in_transit: "bg-green-100 text-green-700",
  delivered: "bg-green-200 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  placed: "Qabul qilindi",
  collector_assigned: "Yig'uvchi tayinlandi",
  collecting: "Yig'ilmoqda",
  ready_for_pickup: "Kuryer uchun tayyor",
  carrier_assigned: "Kuryer tayinlandi",
  in_transit: "Yo'lda",
  delivered: "Yetkazildi",
  cancelled: "Bekor qilindi",
};
