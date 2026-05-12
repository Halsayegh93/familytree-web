"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ProfileTabs({
  showHR,
  showAdmin,
  overview,
  hr,
  admin,
}: {
  showHR: boolean;
  showAdmin: boolean;
  overview: React.ReactNode;
  hr: React.ReactNode;
  admin: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  // التحديد الافتراضي حسب URL params:
  // ?tab=hr أو ?hr=notes/contact/docs → افتح تاب شؤون العائلة
  // ?tab=admin → افتح تاب الإدارة
  const initialTab: "overview" | "hr" | "admin" = (() => {
    const tabParam = searchParams.get("tab");
    const hrParam = searchParams.get("hr");
    if (showHR && (tabParam === "hr" || hrParam)) return "hr";
    if (showAdmin && tabParam === "admin") return "admin";
    return "overview";
  })();

  const [tab, setTab] = useState<"overview" | "hr" | "admin">(initialTab);

  // إذا تغيّر الـ URL وأنت في الصفحة، حدّث التاب
  useEffect(() => {
    setTab(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1 flex gap-1 sticky top-14 z-30 shadow-sm">
        <TabBtn
          active={tab === "overview"}
          onClick={() => setTab("overview")}
          icon="ℹ️"
          label="نظرة عامة"
          color="#357DED"
        />
        {showHR && (
          <TabBtn
            active={tab === "hr"}
            onClick={() => setTab("hr")}
            icon="📋"
            label="شؤون العائلة"
            color="#5438DC"
            badge="🔒"
          />
        )}
        {showAdmin && (
          <TabBtn
            active={tab === "admin"}
            onClick={() => setTab("admin")}
            icon="🛠️"
            label="أدوات الإدارة"
            color="#EF4444"
          />
        )}
      </div>

      {/* Tab Content */}
      <div>
        {tab === "overview" && overview}
        {tab === "hr" && showHR && hr}
        {tab === "admin" && showAdmin && admin}
      </div>
    </div>
  );
}

function TabBtn({
  active, onClick, icon, label, color, badge,
}: {
  active: boolean; onClick: () => void;
  icon: string; label: string; color: string; badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-sm transition ${
        active ? "text-white shadow-sm" : "text-[#475569] hover:bg-[#F1F5F9]"
      }`}
      style={active ? { background: color } : {}}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
      {badge && <span className="text-xs">{badge}</span>}
    </button>
  );
}
