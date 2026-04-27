import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AssignOrderRequest {
  orderId: string;
  assignRole: "collector" | "carrier";
}

async function sendPush(userId: string | null, userIds: string[] | null, event: string, data: Record<string, string | number | null>) {
  if (!userId && (!userIds || userIds.length === 0)) return;
  await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      ...(userId ? { userId } : { userIds }),
      event,
      data,
    }),
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId, assignRole }: AssignOrderRequest = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get order details
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

    if (assignRole === "collector") {
      // Find available collectors: active, not currently assigned to an active order
      const { data: busyCollectors } = await supabase
        .from("orders")
        .select("collector_id")
        .in("status", ["collector_assigned", "collecting"])
        .not("collector_id", "is", null);

      const busyIds = (busyCollectors ?? []).map((o) => o.collector_id).filter(Boolean);

      const { data: candidates } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "collector")
        .eq("is_active", true)
        .not("id", "in", busyIds.length > 0 ? `(${busyIds.join(",")})` : "(null)");

      if (!candidates || candidates.length === 0) {
        // No collector available — alert admin
        const { data: admins } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "admin");

        const adminIds = (admins ?? []).map((a) => a.id);
        if (adminIds.length > 0) {
          await sendPush(null, adminIds, "admin_no_collector", { orderNumber: order.order_number });
        }

        return new Response(JSON.stringify({ assigned: false, reason: "no_collector_available" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Load balance: pick collector with fewest active assigned orders
      const assignCounts: Record<string, number> = {};
      for (const c of candidates) assignCounts[c.id] = 0;

      const { data: activeCounts } = await supabase
        .from("orders")
        .select("collector_id")
        .in("status", ["collector_assigned", "collecting", "ready_for_pickup"])
        .in("collector_id", candidates.map((c) => c.id));

      for (const o of activeCounts ?? []) {
        if (o.collector_id) assignCounts[o.collector_id] = (assignCounts[o.collector_id] ?? 0) + 1;
      }

      const chosen = candidates.reduce((best, c) =>
        (assignCounts[c.id] ?? 0) < (assignCounts[best.id] ?? 0) ? c : best
      );

      // Update order
      await supabase
        .from("orders")
        .update({ collector_id: chosen.id, status: "collector_assigned" })
        .eq("id", orderId);

      // Notify collector + client
      await sendPush(chosen.id, null, "collector_new_order", { orderNumber: order.order_number });
      await sendPush(order.client_id, null, "collector_assigned", { orderNumber: order.order_number });

      return new Response(JSON.stringify({ assigned: true, collectorId: chosen.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // Assign carrier
      const { data: onlineCarriers } = await supabase
        .from("carrier_profiles")
        .select("id")
        .eq("is_online", true);

      if (!onlineCarriers || onlineCarriers.length === 0) {
        // No carrier online — notify client + admin
        const { data: admins } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "admin");

        const adminIds = (admins ?? []).map((a) => a.id);
        if (adminIds.length > 0) {
          await sendPush(null, adminIds, "admin_no_carrier", { orderNumber: order.order_number });
        }
        await sendPush(order.client_id, null, "carrier_unavailable", { orderNumber: order.order_number });

        return new Response(JSON.stringify({ assigned: false, reason: "no_carrier_online" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const carrierIds = onlineCarriers.map((c) => c.id);

      // Load balance among online carriers
      const { data: activeCarrierOrders } = await supabase
        .from("orders")
        .select("carrier_id")
        .in("status", ["carrier_assigned", "in_transit"])
        .in("carrier_id", carrierIds);

      const carrierLoad: Record<string, number> = {};
      for (const id of carrierIds) carrierLoad[id] = 0;
      for (const o of activeCarrierOrders ?? []) {
        if (o.carrier_id) carrierLoad[o.carrier_id] = (carrierLoad[o.carrier_id] ?? 0) + 1;
      }

      const chosenCarrierId = Object.entries(carrierLoad).reduce((best, [id, count]) =>
        count < carrierLoad[best] ? id : best
      , carrierIds[0]);

      // Update order
      await supabase
        .from("orders")
        .update({ carrier_id: chosenCarrierId, status: "carrier_assigned" })
        .eq("id", orderId);

      // Notify carrier + client
      await sendPush(chosenCarrierId, null, "carrier_new_order", { orderNumber: order.order_number });
      await sendPush(order.client_id, null, "carrier_assigned", { orderNumber: order.order_number });

      return new Response(JSON.stringify({ assigned: true, carrierId: chosenCarrierId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
