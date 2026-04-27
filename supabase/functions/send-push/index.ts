import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN");

type PushEvent =
  | "order_placed"
  | "collector_assigned"
  | "ready_for_pickup"
  | "carrier_assigned"
  | "delivered"
  | "cancelled"
  | "carrier_unavailable"
  | "collector_new_order"
  | "carrier_new_order"
  | "admin_no_collector"
  | "admin_no_carrier"
  | "admin_low_stock"
  | "broadcast";

interface SendPushRequest {
  userId?: string;
  userIds?: string[];
  event: PushEvent;
  data?: Record<string, string | number | null>;
  broadcastMessage?: string;
  broadcastTitle?: string;
}

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
  priority?: "default" | "normal" | "high";
}

function buildMessage(event: PushEvent, data: Record<string, string | number | null> = {}): { title: string; body: string } {
  const n = data.orderNumber;
  const p = data.productName;
  const stock = data.stockCount;

  switch (event) {
    case "order_placed":
      return { title: "TasGo", body: `Buyurtmangiz #${n} qabul qilindi! ✅` };
    case "collector_assigned":
      return { title: "TasGo", body: "Buyurtmangiz mahsulotlari yig'ilmoqda 🧺" };
    case "ready_for_pickup":
      return { title: "TasGo", body: "Buyurtmangiz tayyor, kuryer kutmoqda 📦" };
    case "carrier_assigned":
      return { title: "TasGo", body: "Buyurtmangiz yo'lda! Jonli kuzatish ↗️" };
    case "delivered":
      return { title: "TasGo", body: "Yetkazildi! Tajribangizni baholang ⭐" };
    case "cancelled":
      return { title: "TasGo", body: "Buyurtmangiz bekor qilindi. To'lov qaytariladi." };
    case "carrier_unavailable":
      return { title: "TasGo", body: "Buyurtmangiz tayyor — kuryer tez biriktiriladi. Kechikish uchun uzr." };
    case "collector_new_order":
      return { title: "Yangi buyurtma", body: `#${n} — yig'ishni boshlang 🧺` };
    case "carrier_new_order":
      return { title: "Buyurtma tayyor", body: `#${n} — do'konga yuring 🚴` };
    case "admin_no_collector":
      return { title: "⚠️ Yig'uvchi yo'q", body: `#${n} uchun yig'uvchi mavjud emas` };
    case "admin_no_carrier":
      return { title: "⚠️ Kuryer yo'q", body: `#${n} uchun kuryer mavjud emas` };
    case "admin_low_stock":
      return { title: "⚠️ Kam qoldi", body: `${p ?? "Mahsulot"}: ${stock} dona qoldi` };
    case "broadcast":
      return { title: "TasGo", body: "" }; // handled by caller
    default:
      return { title: "TasGo", body: "" };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: SendPushRequest = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Collect target user IDs
    const targetIds: string[] = [];
    if (body.userId) targetIds.push(body.userId);
    if (body.userIds) targetIds.push(...body.userIds);

    if (targetIds.length === 0) {
      return new Response(JSON.stringify({ error: "No target users" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch push tokens for targets
    const { data: tokens, error } = await supabase
      .from("push_tokens")
      .select("token")
      .in("user_id", targetIds);

    if (error || !tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: "no_tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, body: msgBody } = buildMessage(body.event, body.data ?? {});

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: body.broadcastTitle ?? title,
      body: body.broadcastMessage ?? msgBody,
      sound: "default",
      priority: "high",
      data: body.data ?? {},
    }));

    // Send to Expo Push API in chunks of 100
    const chunkSize = 100;
    let sent = 0;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (EXPO_ACCESS_TOKEN) headers["Authorization"] = `Bearer ${EXPO_ACCESS_TOKEN}`;

      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers,
        body: JSON.stringify(chunk),
      });

      if (res.ok) sent += chunk.length;
    }

    return new Response(JSON.stringify({ sent }), {
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
