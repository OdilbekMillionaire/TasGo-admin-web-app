import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Verifies OTP code, signs in via Supabase Auth phone OTP
// Returns session tokens to client

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOtpRequest {
  phone: string;
  token: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { phone, token } = (await req.json()) as VerifyOtpRequest;

    if (!phone || !token) {
      return new Response(
        JSON.stringify({ error: "phone and token are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Supabase Auth phone OTP verification
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone.replace(/\s/g, ""),
      token,
      type: "sms",
    });

    if (error || !data.session) {
      return new Response(
        JSON.stringify({ error: error?.message ?? "Invalid or expired OTP" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Check if profile exists; create if new user
    const userId = data.user!.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .single();

    return new Response(
      JSON.stringify({
        session: data.session,
        user: data.user,
        isNewUser: !profile,
        role: profile?.role ?? null,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[verify-otp] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
