// Auto-generated types from Supabase schema
// Regenerate with: pnpm db:types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus =
  | "placed"
  | "collector_assigned"
  | "collecting"
  | "ready_for_pickup"
  | "carrier_assigned"
  | "in_transit"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export type InventoryAction =
  | "in_stock"
  | "cashier_sale"
  | "order_reserved"
  | "adjustment"
  | "return";

export type UserRole =
  | "client"
  | "collector"
  | "carrier"
  | "cashier"
  | "admin";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string | null;
          phone: string;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          role: UserRole;
          full_name?: string | null;
          phone: string;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string | null;
          phone?: string;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      client_profiles: {
        Row: {
          id: string;
          default_address: string | null;
          default_address_lat: number | null;
          default_address_lng: number | null;
          loyalty_points: number;
        };
        Insert: {
          id: string;
          default_address?: string | null;
          default_address_lat?: number | null;
          default_address_lng?: number | null;
          loyalty_points?: number;
        };
        Update: {
          default_address?: string | null;
          default_address_lat?: number | null;
          default_address_lng?: number | null;
          loyalty_points?: number;
        };
      };
      carrier_profiles: {
        Row: {
          id: string;
          is_online: boolean;
          current_lat: number | null;
          current_lng: number | null;
          last_location_update: string | null;
        };
        Insert: {
          id: string;
          is_online?: boolean;
          current_lat?: number | null;
          current_lng?: number | null;
          last_location_update?: string | null;
        };
        Update: {
          is_online?: boolean;
          current_lat?: number | null;
          current_lng?: number | null;
          last_location_update?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          name_uz_latn: string;
          name_uz_cyrl: string | null;
          name_ru: string | null;
          name_en: string | null;
          image_url: string | null;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name_uz_latn: string;
          name_uz_cyrl?: string | null;
          name_ru?: string | null;
          name_en?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          name_uz_latn?: string;
          name_uz_cyrl?: string | null;
          name_ru?: string | null;
          name_en?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          category_id: string | null;
          barcode: string | null;
          name_uz_latn: string;
          name_uz_cyrl: string | null;
          name_ru: string | null;
          name_en: string | null;
          description_uz_latn: string | null;
          description_uz_cyrl: string | null;
          description_ru: string | null;
          description_en: string | null;
          image_url: string | null;
          price_uzs: number;
          stock_quantity: number;
          low_stock_threshold: number;
          is_active: boolean;
          is_featured: boolean;
          has_discount: boolean;
          discount_percent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id?: string;
          category_id?: string | null;
          barcode?: string | null;
          name_uz_latn: string;
          name_uz_cyrl?: string | null;
          name_ru?: string | null;
          name_en?: string | null;
          description_uz_latn?: string | null;
          description_uz_cyrl?: string | null;
          description_ru?: string | null;
          description_en?: string | null;
          image_url?: string | null;
          price_uzs: number;
          stock_quantity?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          is_featured?: boolean;
          has_discount?: boolean;
          discount_percent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          category_id?: string | null;
          barcode?: string | null;
          name_uz_latn?: string;
          name_uz_cyrl?: string | null;
          name_ru?: string | null;
          name_en?: string | null;
          description_uz_latn?: string | null;
          description_uz_cyrl?: string | null;
          description_ru?: string | null;
          description_en?: string | null;
          image_url?: string | null;
          price_uzs?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          is_featured?: boolean;
          has_discount?: boolean;
          discount_percent?: number;
          updated_at?: string;
        };
      };
      banners: {
        Row: {
          id: string;
          title_uz_latn: string | null;
          title_ru: string | null;
          image_url: string;
          link_type: "product" | "category" | "url" | "none" | null;
          link_value: string | null;
          is_active: boolean;
          sort_order: number;
          starts_at: string | null;
          ends_at: string | null;
        };
        Insert: {
          id?: string;
          title_uz_latn?: string | null;
          title_ru?: string | null;
          image_url: string;
          link_type?: "product" | "category" | "url" | "none" | null;
          link_value?: string | null;
          is_active?: boolean;
          sort_order?: number;
          starts_at?: string | null;
          ends_at?: string | null;
        };
        Update: {
          title_uz_latn?: string | null;
          title_ru?: string | null;
          image_url?: string;
          link_type?: "product" | "category" | "url" | "none" | null;
          link_value?: string | null;
          is_active?: boolean;
          sort_order?: number;
          starts_at?: string | null;
          ends_at?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          store_id: string;
          order_number: number;
          client_id: string | null;
          collector_id: string | null;
          carrier_id: string | null;
          status: OrderStatus;
          payment_status: PaymentStatus;
          payment_method: "octo_online" | null;
          octo_transaction_id: string | null;
          octo_payment_url: string | null;
          delivery_address: string;
          delivery_lat: number;
          delivery_lng: number;
          subtotal_uzs: number;
          delivery_fee_uzs: number;
          total_uzs: number;
          client_note: string | null;
          rating: number | null;
          rating_comment: string | null;
          placed_at: string;
          collected_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
        };
        Insert: {
          id?: string;
          store_id?: string;
          order_number?: number;
          client_id?: string | null;
          collector_id?: string | null;
          carrier_id?: string | null;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          payment_method?: "octo_online" | null;
          octo_transaction_id?: string | null;
          octo_payment_url?: string | null;
          delivery_address: string;
          delivery_lat: number;
          delivery_lng: number;
          subtotal_uzs: number;
          delivery_fee_uzs?: number;
          total_uzs: number;
          client_note?: string | null;
          rating?: number | null;
          rating_comment?: string | null;
          placed_at?: string;
          collected_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
        };
        Update: {
          collector_id?: string | null;
          carrier_id?: string | null;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          octo_transaction_id?: string | null;
          octo_payment_url?: string | null;
          subtotal_uzs?: number;
          delivery_fee_uzs?: number;
          total_uzs?: number;
          client_note?: string | null;
          rating?: number | null;
          rating_comment?: string | null;
          collected_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name_snapshot: string;
          price_snapshot_uzs: number;
          quantity: number;
          subtotal_uzs: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name_snapshot: string;
          price_snapshot_uzs: number;
          quantity: number;
          subtotal_uzs: number;
        };
        Update: {
          quantity?: number;
          subtotal_uzs?: number;
        };
      };
      inventory_log: {
        Row: {
          id: string;
          store_id: string;
          product_id: string | null;
          action: InventoryAction;
          quantity_change: number;
          performed_by: string | null;
          order_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id?: string;
          product_id?: string | null;
          action: InventoryAction;
          quantity_change: number;
          performed_by?: string | null;
          order_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: "ios" | "android" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform?: "ios" | "android" | null;
          created_at?: string;
        };
        Update: {
          token?: string;
          platform?: "ios" | "android" | null;
        };
      };
      promo_codes: {
        Row: {
          id: string;
          code: string;
          discount_type: "percent" | "fixed_uzs" | null;
          discount_value: number;
          min_order_uzs: number;
          max_uses: number | null;
          used_count: number;
          valid_from: string | null;
          valid_until: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          code: string;
          discount_type?: "percent" | "fixed_uzs" | null;
          discount_value: number;
          min_order_uzs?: number;
          max_uses?: number | null;
          used_count?: number;
          valid_from?: string | null;
          valid_until?: string | null;
          is_active?: boolean;
        };
        Update: {
          code?: string;
          discount_type?: "percent" | "fixed_uzs" | null;
          discount_value?: number;
          min_order_uzs?: number;
          max_uses?: number | null;
          used_count?: number;
          valid_from?: string | null;
          valid_until?: string | null;
          is_active?: boolean;
        };
      };
      store_config: {
        Row: {
          id: string;
          store_id: string;
          delivery_zone_center_lat: number;
          delivery_zone_center_lng: number;
          delivery_zone_radius_km: number;
          min_order_free_delivery_uzs: number;
          delivery_fee_uzs: number;
          store_name: string;
          operating_hours: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id?: string;
          delivery_zone_center_lat?: number;
          delivery_zone_center_lng?: number;
          delivery_zone_radius_km?: number;
          min_order_free_delivery_uzs?: number;
          delivery_fee_uzs?: number;
          store_name?: string;
          operating_hours?: string;
          updated_at?: string;
        };
        Update: {
          delivery_zone_center_lat?: number;
          delivery_zone_center_lng?: number;
          delivery_zone_radius_km?: number;
          min_order_free_delivery_uzs?: number;
          delivery_fee_uzs?: number;
          store_name?: string;
          operating_hours?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      low_stock_products: {
        Row: {
          id: string;
          name_uz_latn: string;
          stock_quantity: number;
          low_stock_threshold: number;
          store_id: string;
        };
      };
    };
    Functions: {
      get_my_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      inventory_action: InventoryAction;
    };
  };
}
