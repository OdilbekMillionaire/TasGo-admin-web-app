import { createClient } from "@supabase/supabase-js";
import type { Database } from "@tasgo/types";

// Browser Supabase client for admin web app (anon key — RLS enforced)
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);
