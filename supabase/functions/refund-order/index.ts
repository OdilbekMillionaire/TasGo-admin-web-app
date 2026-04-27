import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OCTO_SHOP_ID = Deno.env.get("OCTO_SHOP_ID")!;
const OCTO_SECRET_KEY = Deno.env.get("OCTO_SECRET_KEY")!;
const OCTO_API_URL = Deno.env.get("OCTO_API_URL") ?? "https://secure.octo.uz";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authResult = await verifyAuth(req);
    if (!authResult.success || authResult.role !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "Order is not in paid state" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.octo_transaction_id) {
      return new Response(JSON.stringify({ error: "No Octo transaction ID" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Octo refund API
    const octoRes = await fetch(`${OCTO_API_URL}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        octo_shop_id: parseInt(OCTO_SHOP_ID, 10),
        octo_secret: OCTO_SECRET_KEY,
        octo_payment_UUID: order.octo_transaction_id,
        refund_sum: order.total_uzs,
      }),
    });

    const octoData = await octoRes.json();
    if (!octoRes.ok || octoData.error) {
      throw new Error(octoData.error ?? "Octo refund API error");
    }

    // Update order status
    await supabase
      .from("orders")
      .update({
        payment_status: "refunded",
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: "admin_refund",
      })
      .eq("id", orderId);

    // Notify client
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: order.client_id,
        event: "cancelled",
        data: { orderNumber: order.order_number },
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
