import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Supabase Auth SMS Hook — called by Supabase when a phone OTP is triggered.
// Supabase generates the OTP; this function forwards it to Eskiz.uz for delivery.
//
// Setup in Supabase Dashboard:
//   Auth → Hooks → Send SMS Hook → HTTPS endpoint → this function's URL
//
// Supabase sends: { "user": { "id": "...", "phone": "+998..." }, "sms": { "otp": "123456" } }

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmshookPayload {
  user: { id: string; phone: string };
  sms: { otp: string };
}

async function getEskizToken(): Promise<string> {
  const email = Deno.env.get("ESKIZ_EMAIL");
  const password = Deno.env.get("ESKIZ_PASSWORD");

  if (!email || !password) {
    throw new Error("Eskiz credentials not configured");
  }

  const formData = new URLSearchParams();
  formData.append("email", email);
  formData.append("password", password);

  const res = await fetch("https://notify.eskiz.uz/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  if (!res.ok) {
    throw new Error(`Eskiz auth failed: ${res.status}`);
  }

  const data = await res.json() as { data?: { token?: string } };
  const token = data?.data?.token;
  if (!token) throw new Error("No token in Eskiz auth response");
  return token;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const payload = (await req.json()) as SmshookPayload;
    const phone = payload?.user?.phone;
    const otp = payload?.sms?.otp;

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ error: "Missing phone or otp in payload" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const token = await getEskizToken();

    // Strip leading + for Eskiz mobile_phone field
    const mobile_phone = phone.replace(/^\+/, "");
    const message = `TasGo - tasdiqlash kodi: ${otp}. 5 daqiqa ichida foydalaning.`;

    const smsRes = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mobile_phone,
        message,
        from: "4546",
        callback_url: "",
      }),
    });

    if (!smsRes.ok) {
      const errText = await smsRes.text();
      console.error("[send-otp] Eskiz SMS error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to send SMS" }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-otp] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
