import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { isInsideDeliveryZone } from "../_shared/deliveryZone.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OCTO_SHOP_ID = Deno.env.get("OCTO_SHOP_ID")!;
const OCTO_SECRET_KEY = Deno.env.get("OCTO_SECRET_KEY")!;
const OCTO_API_URL = Deno.env.get("OCTO_API_URL") ?? "https://secure.octo.uz";

interface OrderItem {
  productId: string;
  quantity: number;
  priceUzs: number;
  productName: string;
}

interface CreatePaymentBody {
  items: OrderItem[];
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  subtotalUzs: number;
  deliveryFeeUzs: number;
  totalUzs: number;
  promoCode?: string;
  promoDiscountUzs?: number;
  clientNote?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authResult.userId;
    const body: CreatePaymentBody = await req.json();

    // Server-side delivery zone validation (hard enforcement — rule §5)
    if (!isInsideDeliveryZone(body.deliveryLat, body.deliveryLng)) {
      return new Response(
        JSON.stringify({ error: "delivery_zone_error", message: "Address is outside the delivery zone" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate products + build order items snapshot
    const productIds = body.items.map((i) => i.productId);
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, name_uz_latn, price_uzs, stock_quantity, is_active, has_discount, discount_percent")
      .in("id", productIds)
      .eq("is_active", true);

    if (productError || !products) {
      return new Response(JSON.stringify({ error: "Product validation failed" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check stock
    for (const item of body.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return new Response(
          JSON.stringify({ error: "product_unavailable", productId: item.productId }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (product.stock_quantity < item.quantity) {
        return new Response(
          JSON.stringify({ error: "insufficient_stock", productId: item.productId, available: product.stock_quantity }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get store_id
    const { data: storeConfig } = await supabase
      .from("store_config")
      .select("id")
      .single();
    const storeId = storeConfig?.id ?? "00000000-0000-0000-0000-000000000001";

    // Create order record
    const orderItems = body.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const effectivePrice = product.has_discount
        ? Math.round(product.price_uzs * (1 - product.discount_percent / 100))
        : product.price_uzs;
      return {
        product_id: item.productId,
        product_name_snapshot: product.name_uz_latn,
        price_snapshot_uzs: effectivePrice,
        quantity: item.quantity,
        subtotal_uzs: effectivePrice * item.quantity,
      };
    });

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        client_id: userId,
        store_id: storeId,
        status: "placed",
        payment_status: "pending",
        payment_method: "octo_online",
        delivery_address: body.deliveryAddress,
        delivery_lat: body.deliveryLat,
        delivery_lng: body.deliveryLng,
        subtotal_uzs: body.subtotalUzs,
        delivery_fee_uzs: body.deliveryFeeUzs,
        total_uzs: body.totalUzs,
        client_note: body.clientNote ?? null,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message ?? "Failed to create order");
    }

    // Insert order items
    const { error: itemsError } = await supabase.from("order_items").insert(
      orderItems.map((item) => ({ ...item, order_id: order.id }))
    );
    if (itemsError) throw new Error(itemsError.message);

    // Create Octo payment
    const octoPayload = {
      octo_shop_id: parseInt(OCTO_SHOP_ID, 10),
      octo_secret: OCTO_SECRET_KEY,
      shop_transaction_id: order.id,
      total_sum: body.totalUzs,
      currency: "UZS",
      description: `TasGo buyurtma #${order.order_number}`,
      return_url: "tasgo://payment/success",
      notify_url: `${SUPABASE_URL}/functions/v1/payment-webhook`,
      payment_methods: [{ method: "uzcard" }, { method: "humo" }, { method: "visa_mastercard" }],
      basket: body.items.map((item) => ({
        position_desc: item.productName,
        count: item.quantity,
        price: item.priceUzs,
      })),
      auto_capture: true,
    };

    const octoRes = await fetch(`${OCTO_API_URL}/prepare_payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(octoPayload),
    });

    const octoData = await octoRes.json();

    if (!octoRes.ok || octoData.error || !octoData.octo_payment_UUID) {
      // Clean up the order we created
      await supabase.from("orders").delete().eq("id", order.id);
      throw new Error(octoData.error ?? "Octo API error");
    }

    // Save Octo transaction details
    await supabase
      .from("orders")
      .update({
        octo_transaction_id: octoData.octo_payment_UUID,
        octo_payment_url: octoData.payment_URL,
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ paymentUrl: octoData.payment_URL, orderId: order.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
