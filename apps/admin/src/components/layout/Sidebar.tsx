"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabaseAdmin } from "@/lib/supabase-admin";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/dashboard/orders", label: "Buyurtmalar", icon: "📦" },
  { href: "/dashboard/catalog", label: "Katalog", icon: "🛒" },
  { href: "/dashboard/analytics", label: "Tahlil", icon: "📊" },
  { href: "/dashboard/carriers", label: "Kuryerlar", icon: "🛵" },
  { href: "/dashboard/users", label: "Foydalanuvchilar", icon: "👥" },
  { href: "/dashboard/promotions", label: "Aksiyalar", icon: "🎁" },
  { href: "/dashboard/settings", label: "Sozlamalar", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabaseAdmin.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-[#E8E8E4] flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#E8E8E4]">
        <div className="w-8 h-8 rounded-lg bg-[#2E7D32] flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-white">TG</span>
        </div>
        <span className="font-bold text-[#1C1C1A] text-lg">TasGo</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    active
                      ? "bg-[#F1F8E9] text-[#2E7D32]"
                      : "text-[#6B6B67] hover:bg-[#F4F4F0] hover:text-[#1C1C1A]"
                  )}
                >
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* POS shortcut + logout */}
      <div className="p-4 border-t border-[#E8E8E4] space-y-2">
        <Link
          href="/pos"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FFF8E1] text-[#E65100] text-sm font-semibold hover:bg-[#FFECB3] transition-colors"
        >
          <span>🖥️</span>
          Kassa POS
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[#6B6B67] hover:bg-[#F4F4F0] hover:text-[#DC2626] transition-colors"
        >
          <span>↩</span>
          Chiqish
        </button>
      </div>
    </aside>
  );
}
