import { createClient } from "@supabase/supabase-js";

// Browser Supabase client for admin web app (anon key — RLS enforced)
// Using untyped client to avoid Database generic version mismatch with supabase-js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin = createClient<any>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);
