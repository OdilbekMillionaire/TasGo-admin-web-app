"use client";
import { useState, useEffect, useCallback } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Database } from "@tasgo/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

const ROLE_TABS: { value: UserRole | "all"; label: string }[] = [
  { value: "all", label: "Barchasi" },
  { value: "client", label: "Mijozlar" },
  { value: "collector", label: "Yig'uvchilar" },
  { value: "carrier", label: "Kuryerlar" },
  { value: "cashier", label: "Kassirlar" },
  { value: "admin", label: "Adminlar" },
];

const ROLE_COLORS: Record<string, string> = {
  client: "bg-blue-50 text-blue-700",
  collector: "bg-amber-50 text-amber-700",
  carrier: "bg-green-50 text-green-700",
  cashier: "bg-purple-50 text-purple-700",
  admin: "bg-red-50 text-red-700",
};

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [loading, setLoading] = useState(true);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ phone: "", full_name: "", role: "collector" as UserRole });
  const [saving, setSaving] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    let query = supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (roleFilter !== "all") query = query.eq("role", roleFilter);
    const { data } = await query;
    setProfiles(data ?? []);
    setLoading(false);
  }, [roleFilter]);

  useEffect(() => { void fetchProfiles(); }, [fetchProfiles]);

  async function handleToggleActive(profile: Profile) {
    await supabaseAdmin
      .from("profiles")
      .update({ is_active: !profile.is_active })
      .eq("id", profile.id);
    void fetchProfiles();
  }

  async function handleAddStaff() {
    if (!newStaff.phone || !newStaff.full_name) return;
    setSaving(true);
    try {
      // Use admin auth to create user — staff invite flow
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        phone: newStaff.phone,
        phone_confirm: true,
        user_metadata: { full_name: newStaff.full_name, role: newStaff.role },
      });

      if (authError) throw authError;

      if (authData.user) {
        await supabaseAdmin.from("profiles").upsert({
          id: authData.user.id,
          phone: newStaff.phone,
          full_name: newStaff.full_name,
          role: newStaff.role,
          is_active: true,
        });
      }

      setShowAddStaff(false);
      setNewStaff({ phone: "", full_name: "", role: "collector" });
      void fetchProfiles();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1A]">Foydalanuvchilar</h1>
          <p className="text-sm text-[#6B6B67] mt-0.5">{profiles.length} ta foydalanuvchi</p>
        </div>
        <button
          onClick={() => setShowAddStaff(true)}
          className="bg-[#2E7D32] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1B5E20] transition-colors"
        >
          + Xodim qo'shish
        </button>
      </div>

      {/* Role filter */}
      <div className="flex gap-2 flex-wrap">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setRoleFilter(tab.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              roleFilter === tab.value
                ? "bg-[#2E7D32] text-white"
                : "bg-white border border-[#E8E8E4] text-[#6B6B67] hover:border-[#2E7D32]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add staff modal */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-[#1C1C1A]">Xodim qo'shish</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B67]">Telefon raqam</label>
                <input
                  type="text"
                  className="mt-1 w-full border border-[#E8E8E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2E7D32]"
                  placeholder="+998901234567"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff((s) => ({ ...s, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B67]">Ismi</label>
                <input
                  type="text"
                  className="mt-1 w-full border border-[#E8E8E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2E7D32]"
                  placeholder="Ism Familiya"
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff((s) => ({ ...s, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B67]">Rol</label>
                <select
                  className="mt-1 w-full border border-[#E8E8E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2E7D32]"
                  value={newStaff.role}
                  onChange={(e) => setNewStaff((s) => ({ ...s, role: e.target.value as UserRole }))}
                >
                  <option value="collector">Yig'uvchi</option>
                  <option value="carrier">Kuryer</option>
                  <option value="cashier">Kassir</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAddStaff(false)}
                className="flex-1 border border-[#E8E8E4] rounded-xl py-2 text-sm font-medium text-[#6B6B67] hover:border-[#2E7D32]"
              >
                Bekor
              </button>
              <button
                onClick={handleAddStaff}
                disabled={saving}
                className="flex-1 bg-[#2E7D32] text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Saqlanmoqda..." : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E8E8E4] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#6B6B67]">Yuklanmoqda...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF8] border-b border-[#E8E8E4]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Ism</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Telefon</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Rol</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Qo'shildi</th>
                <th className="text-right px-4 py-3 font-semibold text-[#6B6B67]">Holat</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b border-[#E8E8E4] last:border-0 hover:bg-[#FAFAF8]">
                  <td className="px-4 py-3 font-medium text-[#1C1C1A]">
                    {profile.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[#6B6B67]">{profile.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[profile.role] ?? "bg-gray-100 text-gray-600"}`}>
                      {profile.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6B6B67] text-xs">
                    {new Date(profile.created_at).toLocaleDateString("uz-UZ", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleActive(profile)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                        profile.is_active
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      {profile.is_active ? "Faol" : "Bloklangan"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
