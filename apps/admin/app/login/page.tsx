"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError("Auth error: " + authError.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        setError("No session returned — check Supabase email confirmation setting");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        setError("Profile error: " + profileError.message);
        setLoading(false);
        return;
      }

      if (profile?.role !== "admin" && profile?.role !== "cashier") {
        await supabase.auth.signOut();
        setError(`Access denied — role is '${profile?.role ?? "none"}'`);
        setLoading(false);
        return;
      }

      router.push(profile.role === "cashier" ? "/pos" : "/dashboard");
    } catch (err) {
      setError("Unexpected error: " + String(err));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2E7D32] mb-4">
            <span className="text-2xl font-bold text-white">TG</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1C1C1A]">TasGo Admin</h1>
          <p className="text-sm text-[#6B6B67] mt-1">Do&apos;kon boshqaruv paneli</p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E8E8E4] p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#1C1C1A] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-3 border border-[#E8E8E4] rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1C1C1A] mb-1.5">
                Parol
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-[#E8E8E4] rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Kirilmoqda..." : "Kirish"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
