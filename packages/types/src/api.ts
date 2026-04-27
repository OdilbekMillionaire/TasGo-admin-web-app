import type { OrderStatus, PaymentStatus } from "./database";

// ============================================================
// Cart
// ============================================================

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string | null;
  priceUzs: number;
  quantity: number;
}

// ============================================================
// Order creation
// ============================================================

export interface CreateOrderRequest {
  cartItems: Array<{
    productId: string;
    quantity: number;
  }>;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  clientNote?: string;
  promoCode?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  orderNumber: number;
  paymentUrl: string;
  totalUzs: number;
}

// ============================================================
// Payment webhook (Octo → Supabase Edge Function)
// ============================================================

export interface OctoPaymentWebhookPayload {
  shop_transaction_id: string; // our order_id
  octo_payment_uuid: string;
  status: "waiting" | "succeeded" | "failed" | "cancelled";
  total_sum: number;
  signature: string;
}

// ============================================================
// Auto-assignment
// ============================================================

export interface AssignOrderRequest {
  orderId: string;
  role: "collector" | "carrier";
}

export interface AssignOrderResponse {
  assigned: boolean;
  staffId?: string;
  staffName?: string;
  message?: string;
}

// ============================================================
// Product translation
// ============================================================

export interface TranslateProductRequest {
  nameUzLatn: string;
  descriptionUzLatn?: string;
}

export interface TranslateProductResponse {
  nameUzCyrl: string;
  nameRu: string;
  nameEn: string;
  descriptionUzCyrl?: string;
  descriptionRu?: string;
  descriptionEn?: string;
}

// ============================================================
// Push notifications
// ============================================================

export interface SendPushRequest {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

// ============================================================
// Refund
// ============================================================

export interface RefundOrderRequest {
  orderId: string;
}

export interface RefundOrderResponse {
  success: boolean;
  message: string;
}

// ============================================================
// Order status — client-facing timeline
// ============================================================

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  "placed",
  "collector_assigned",
  "collecting",
  "ready_for_pickup",
  "carrier_assigned",
  "in_transit",
  "delivered",
];

export function getOrderStatusIndex(status: OrderStatus): number {
  return ORDER_STATUS_SEQUENCE.indexOf(status);
}

// ============================================================
// Analytics (admin dashboard)
// ============================================================

export interface DailyRevenue {
  date: string;
  revenueUzs: number;
  orderCount: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalSold: number;
  revenueUzs: number;
}

export interface AdminDashboardStats {
  liveActiveOrders: number;
  carriersOnline: number;
  lowStockCount: number;
  pendingCollectorAssignments: number;
  todayOrders: number;
  todayRevenue: number;
  todayCancelled: number;
  avgDeliveryMinutes: number;
  avgRating: number;
}
