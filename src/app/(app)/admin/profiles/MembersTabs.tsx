"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function MembersTabs({
  showFollowUp,
  members,
  followUp,
}: {
  showFollowUp: boolean;
  members: React.ReactNode;
  followUp: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // قراءة التاب من URL أو sessionStorage
  const initial: "members" | "followup" = (() => {
    const view = searchParams.get("view");
    if (view === "followup" && showFollowUp) return "followup";
    if (view === "members") return "members";
    if (typeof window !== "undefined" && showFollowUp) {
      const stored = sessionStorage.getItem("admin-profiles-tab");
      if (stored === "followup") return "followup";
    }
    return "members";
  })();

  const [tab, setTab] = useState<"members" | "followup">(initial);

  // تحديث URL + sessionStorage عند تغيير التاب
  function changeTab(next: "members" | "followup") {
    setTab(next);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("admin-profiles-tab", next);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // مزامنة عند تغيير URL خارجياً
  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "followup" && showFollowUp) setTab("followup");
    else if (view === "members") setTab("members");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="space-y-3">
      {showFollowUp && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1 flex gap-1">
          <TabBtn
            active={tab === "members"}
            onClick={() => changeTab("members")}
            icon="👥"
            label="كل الأعضاء"
            color="#357DED"
          />
          <TabBtn
            active={tab === "followup"}
            onClick={() => changeTab("followup")}
            icon="📊"
            label="لوحة المتابعة"
            color="#5438DC"
            badge="🔒"
          />
        </div>
      )}

      {tab === "members" ? members : followUp}
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
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-sm transition ${
        active ? "text-white shadow-sm" : "text-[#475569] hover:bg-[#F1F5F9]"
      }`}
      style={active ? { background: color } : {}}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {badge && <span className="text-xs">{badge}</span>}
    </button>
  );
}
