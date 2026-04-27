"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SettingsClient({ settings, userId }: { settings: any; userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(key: string, value: boolean) {
    setBusy(key);
    const { error } = await supabase
      .from("app_settings")
      .update({ [key]: value, updated_at: new Date().toISOString(), updated_by: userId })
      .eq("id", settings.id);
    setBusy(null);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  if (!settings) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
        <div className="text-5xl mb-3">⚠️</div>
        <p className="text-[#64748B]">جدول app_settings غير موجود</p>
      </div>
    );
  }

  const toggles: { key: string; label: string; subtitle: string; icon: string; color: string }[] = [
    {
      key: "allow_new_registrations",
      label: "السماح بالتسجيل",
      subtitle: "السماح لأعضاء جدد بالتسجيل",
      icon: "👥",
      color: "#10B981",
    },
    {
      key: "news_requires_approval",
      label: "موافقة الأخبار",
      subtitle: "يتطلب موافقة قبل النشر",
      icon: "✅",
      color: "#F59E0B",
    },
    {
      key: "maintenance_mode",
      label: "وضع الصيانة",
      subtitle: "إيقاف التطبيق مؤقتاً",
      icon: "🛠️",
      color: "#EF4444",
    },
    {
      key: "polls_enabled",
      label: "الاستطلاعات",
      subtitle: "السماح بالاستطلاعات في الأخبار",
      icon: "📊",
      color: "#3B82F6",
    },
    {
      key: "stories_enabled",
      label: "قصص العائلة",
      subtitle: "السماح بنشر القصص",
      icon: "📖",
      color: "#10B981",
    },
    {
      key: "diwaniyas_enabled",
      label: "الديوانيات",
      subtitle: "إظهار تاب الديوانيات",
      icon: "🏛️",
      color: "#357DED",
    },
    {
      key: "projects_enabled",
      label: "مشاريع العائلة",
      subtitle: "إظهار قسم المشاريع",
      icon: "💼",
      color: "#5438DC",
    },
    {
      key: "albums_enabled",
      label: "ألبوم الصور",
      subtitle: "إظهار قسم الصور",
      icon: "📷",
      color: "#3B82F6",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      {toggles.map((t, i) => {
        const value = settings[t.key] ?? true;
        return (
          <div
            key={t.key}
            className={`flex items-center gap-4 px-6 py-4 ${
              i < toggles.length - 1 ? "border-b border-[#E2E8F0]" : ""
            }`}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: `${t.color}15` }}
            >
              {t.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[#0F172A]">{t.label}</div>
              <div className="text-sm text-[#64748B]">{t.subtitle}</div>
            </div>
            <button
              onClick={() => toggle(t.key, !value)}
              disabled={busy === t.key}
              className={`relative w-14 h-8 rounded-full transition disabled:opacity-50 ${
                value ? "bg-[#10B981]" : "bg-[#E2E8F0]"
              }`}
            >
              <span
                className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition ${
                  value ? "right-1" : "right-7"
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
