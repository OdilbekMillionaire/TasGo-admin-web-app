import { createClient } from "@supabase/supabase-js";
import type { Database } from "@tasgo/types";

// ============================================================
// Server-only client — uses service_role key
// ONLY for Edge Functions and server-side Next.js routes (rule §3)
// ============================================================

export function createServiceClient() {
  const supabaseUrl = (process.env["SUPABASE_URL"] ?? "").trim();
  const serviceRoleKey = (
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? ""
  ).trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "[TasGo] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in server environment"
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
