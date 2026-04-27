// ============================================================
// TasGo — Shared Config & Utilities
// ============================================================

// ============================================================
// Delivery zone — values from environment, never hardcoded
// ============================================================

export const DELIVERY_ZONE_CENTER_LAT = parseFloat(
  process.env["EXPO_PUBLIC_DELIVERY_ZONE_CENTER_LAT"] ??
    process.env["NEXT_PUBLIC_DELIVERY_ZONE_CENTER_LAT"] ??
    process.env["DELIVERY_ZONE_CENTER_LAT"] ??
    "41.2995"
);

export const DELIVERY_ZONE_CENTER_LNG = parseFloat(
  process.env["EXPO_PUBLIC_DELIVERY_ZONE_CENTER_LNG"] ??
    process.env["NEXT_PUBLIC_DELIVERY_ZONE_CENTER_LNG"] ??
    process.env["DELIVERY_ZONE_CENTER_LNG"] ??
    "69.2401"
);

export const DELIVERY_ZONE_RADIUS_KM = parseFloat(
  process.env["EXPO_PUBLIC_DELIVERY_ZONE_RADIUS_KM"] ??
    process.env["NEXT_PUBLIC_DELIVERY_ZONE_RADIUS_KM"] ??
    process.env["DELIVERY_ZONE_RADIUS_KM"] ??
    "2.0"
);

// ============================================================
// Store constants
// ============================================================

export const MIN_ORDER_FREE_DELIVERY_UZS = parseInt(
  process.env["EXPO_PUBLIC_MIN_ORDER_FREE_DELIVERY_UZS"] ??
    process.env["NEXT_PUBLIC_MIN_ORDER_FREE_DELIVERY_UZS"] ??
    process.env["MIN_ORDER_FREE_DELIVERY_UZS"] ??
    "30000",
  10
);

export const DELIVERY_FEE_UZS = parseInt(
  process.env["EXPO_PUBLIC_DELIVERY_FEE_UZS"] ??
    process.env["NEXT_PUBLIC_DELIVERY_FEE_UZS"] ??
    process.env["DELIVERY_FEE_UZS"] ??
    "5000",
  10
);

export const STORE_NAME =
  process.env["EXPO_PUBLIC_STORE_NAME"] ??
  process.env["NEXT_PUBLIC_STORE_NAME"] ??
  process.env["STORE_NAME"] ??
  "TasGo";

// ============================================================
// Delivery zone validation — Haversine formula
// ============================================================

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function isInsideDeliveryZone(
  lat: number,
  lng: number,
  centerLat = DELIVERY_ZONE_CENTER_LAT,
  centerLng = DELIVERY_ZONE_CENTER_LNG,
  radiusKm = DELIVERY_ZONE_RADIUS_KM
): boolean {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat - centerLat);
  const dLng = toRad(lng - centerLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(centerLat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return d <= radiusKm;
}

export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// Price formatting
// Prices are stored as integers in tiyin (UZS × 100)
// Display: "125 000 UZS"
// ============================================================

export function formatPrice(tiyin: number): string {
  const uzs = Math.round(tiyin / 100);
  // Uzbek number formatting: space as thousands separator
  return uzs.toLocaleString("ru-RU").replace(/,/g, " ") + " UZS";
}

export function tiyinToUzs(tiyin: number): number {
  return Math.round(tiyin / 100);
}

export function uzsToTiyin(uzs: number): number {
  return Math.round(uzs * 100);
}

// ============================================================
// Delivery fee calculation
// ============================================================

export function calculateDeliveryFee(subtotalTiyin: number): number {
  const minFreeUzs = MIN_ORDER_FREE_DELIVERY_UZS * 100; // convert to tiyin for comparison
  return subtotalTiyin >= minFreeUzs ? 0 : DELIVERY_FEE_UZS * 100;
}

// ============================================================
// Order statuses
// ============================================================

export const ORDER_STATUS_LABELS: Record<string, string> = {
  placed: "Buyurtma qabul qilindi",
  collector_assigned: "Yig'uvchi tayinlandi",
  collecting: "Yig'ilmoqda",
  ready_for_pickup: "Kuryer uchun tayyor",
  carrier_assigned: "Kuryer tayinlandi",
  in_transit: "Yo'lda",
  delivered: "Yetkazildi",
  cancelled: "Bekor qilindi",
};

// ============================================================
// Store location (for navigation)
// ============================================================

export const STORE_LOCATION_LAT = DELIVERY_ZONE_CENTER_LAT;
export const STORE_LOCATION_LNG = DELIVERY_ZONE_CENTER_LNG;

// ============================================================
// Carrier location update interval (milliseconds)
// Must stop immediately on delivery confirmation (rule §8)
// ============================================================

export const CARRIER_LOCATION_UPDATE_INTERVAL_MS = 5000;

// ============================================================
// Background task name (used by expo-task-manager)
// ============================================================

export const CARRIER_LOCATION_TASK_NAME = "TASGO_CARRIER_LOCATION";
