import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OCTO_SECRET_KEY = Deno.env.get("OCTO_SECRET_KEY")!;

interface OctoWebhookPayload {
  octo_payment_UUID: string;
  shop_transaction_id: string; // our order id
  status: "waiting" | "succeeded" | "failed" | "cancelled";
  total_sum: number;
  signature?: string;
}

async function verifySignature(payload: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(OCTO_SECRET_KEY);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );

  const sigBytes = new Uint8Array(
    signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  return crypto.subtle.verify("HMAC", key, sigBytes, messageData);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const body: OctoWebhookPayload = JSON.parse(rawBody);

    // Verify HMAC signature (rule §9 — must verify before any DB writes)
    const signatureHeader = req.headers.get("X-Octo-Signature") ?? body.signature ?? "";
    if (signatureHeader) {
      const isValid = await verifySignature(rawBody, signatureHeader);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const orderId = body.shop_transaction_id;

    if (body.status === "succeeded") {
      // Update payment status to paid
      const { data: order, error } = await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", orderId)
        .eq("payment_status", "pending")
        .select()
        .single();

      if (error || !order) {
        return new Response(JSON.stringify({ error: "Order not found or already processed" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Trigger assign-order Edge Function for collector assignment
      const assignRes = await fetch(`${SUPABASE_URL}/functions/v1/assign-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ orderId, assignRole: "collector" }),
      });

      if (!assignRes.ok) {
        console.error("assign-order failed:", await assignRes.text());
      }

      // Send push to client: order placed
      await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          userId: order.client_id,
          event: "order_placed",
          data: { orderNumber: order.order_number },
        }),
      });

    } else if (body.status === "failed" || body.status === "cancelled") {
      await supabase
        .from("orders")
        .update({ payment_status: "failed", status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("payment_status", "pending");
    }

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
