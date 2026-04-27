"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { NotificationBell } from "./NotificationBell";

const NAV = [
  { href: "/home", label: "الرئيسية", icon: "🏠" },
  { href: "/tree", label: "الشجرة", icon: "🌳" },
  { href: "/diwaniyas", label: "الديوانيات", icon: "🏛️" },
  { href: "/projects", label: "المشاريع", icon: "💼" },
  { href: "/profile", label: "حسابي", icon: "👤" },
];

export function AppHeader({
  canModerate = false,
  isHR = false,
}: {
  canModerate?: boolean;
  isHR?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#E2E8F0]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Brand */}
        <Link href="/home" className="flex items-center gap-2 ml-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#357DED] flex items-center justify-center text-base">
            🌳
          </div>
          <span className="font-bold text-[#0F172A] hidden sm:inline">
            عائلة المحمدعلي
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="flex-1 hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-semibold transition ${
                  active
                    ? "bg-[#357DED] text-white"
                    : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          {canModerate && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-semibold transition ${
                pathname.startsWith("/admin")
                  ? "bg-[#5438DC] text-white"
                  : "text-[#5438DC] hover:bg-[#5438DC]/10"
              }`}
            >
              <span>🛡️</span>
              <span>الإدارة</span>
            </Link>
          )}
        </nav>

        {/* Spacer للموبايل (يدفع الإشعارات + الخروج) */}
        <div className="md:hidden flex-1" />

        {/* الإشعارات — تظهر دائماً للمدراء */}
        <NotificationBell canModerate={canModerate} isHR={isHR} />

        {/* Logout */}
        <button
          onClick={logout}
          className="h-9 px-3 rounded-lg text-sm font-semibold text-[#EF4444] hover:bg-red-50 transition flex-shrink-0"
        >
          خروج
        </button>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden h-9 w-9 rounded-lg bg-[#F1F5F9] text-base font-semibold text-[#475569] flex items-center justify-center flex-shrink-0"
        >
          ☰
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] bg-white">
          <nav className="max-w-6xl mx-auto p-3 grid grid-cols-2 gap-2">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 h-10 rounded-lg text-sm font-semibold ${
                    active
                      ? "bg-[#357DED] text-white"
                      : "bg-[#F1F5F9] text-[#475569]"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
            {canModerate && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className={`col-span-2 flex items-center gap-2 px-3 h-10 rounded-lg text-sm font-semibold ${
                  pathname.startsWith("/admin")
                    ? "bg-[#5438DC] text-white"
                    : "bg-[#5438DC]/10 text-[#5438DC]"
                }`}
              >
                <span>🛡️</span>
                <span>الإدارة</span>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
