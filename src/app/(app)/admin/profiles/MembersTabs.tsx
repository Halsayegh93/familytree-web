"use client";

import { useState } from "react";

export function MembersTabs({
  showFollowUp,
  members,
  followUp,
}: {
  showFollowUp: boolean;
  members: React.ReactNode;
  followUp: React.ReactNode;
}) {
  const [tab, setTab] = useState<"members" | "followup">("members");

  return (
    <div className="space-y-3">
      {showFollowUp && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1 flex gap-1">
          <TabBtn
            active={tab === "members"}
            onClick={() => setTab("members")}
            icon="👥"
            label="كل الأعضاء"
            color="#357DED"
          />
          <TabBtn
            active={tab === "followup"}
            onClick={() => setTab("followup")}
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
