import { createClient } from "@supabase/supabase-js";
import type { Database } from "@tasgo/types";

// ============================================================
// Browser / React Native client — uses anon key only (rule §3)
// Never expose service_role key to client-side code
// ============================================================

const supabaseUrl = (
  process.env["EXPO_PUBLIC_SUPABASE_URL"] ??
  process.env["NEXT_PUBLIC_SUPABASE_URL"] ??
  process.env["SUPABASE_URL"] ??
  ""
).trim();

const supabaseAnonKey = (
  process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"] ??
  process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ??
  process.env["SUPABASE_ANON_KEY"] ??
  ""
).trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[TasGo] Supabase URL or anon key not set. Check your .env file."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type SupabaseClient = typeof supabase;
