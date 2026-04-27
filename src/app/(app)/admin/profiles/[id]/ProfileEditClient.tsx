"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ROLES = [
  { value: "admin", label: "مدير" },
  { value: "monitor", label: "مراقب" },
  { value: "supervisor", label: "مشرف" },
  { value: "member", label: "عضو" },
];

export function ProfileEditClient({
  member,
  canManageRoles,
}: {
  member: any;
  canManageRoles: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  async function update(updates: Record<string, any>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update(updates).eq("id", member.id);
    setBusy(false);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      <div className="px-5 py-3 bg-[#FEF2F2] flex items-center gap-2">
        <span className="text-xl">🛠️</span>
        <h2 className="font-black text-[#EF4444]">أدوات الإدارة</h2>
      </div>
      <div className="p-5 space-y-3">
        {/* تجميد/تفعيل */}
        {!member.is_deceased && (
          <ActionBtn
            color={member.status === "frozen" ? "#10B981" : "#EF4444"}
            icon={member.status === "frozen" ? "🔓" : "🔒"}
            label={member.status === "frozen" ? "تفعيل الحساب" : "تجميد الحساب"}
            sublabel={
              member.status === "frozen"
                ? "السماح للعضو بالدخول مجدداً"
                : "منع العضو من الدخول للتطبيق"
            }
            onClick={() =>
              update(
                { status: member.status === "frozen" ? "active" : "frozen" },
                member.status === "frozen" ? "تفعيل الحساب؟" : "تجميد الحساب؟"
              )
            }
            disabled={busy}
          />
        )}

        {/* متوفى */}
        <ActionBtn
          color="#6B7B8D"
          icon="🕊️"
          label={member.is_deceased ? "إلغاء وضع متوفى" : "تسجيل كمتوفى"}
          sublabel={
            member.is_deceased
              ? "إعادة العضو لقائمة الأحياء"
              : "تحديد العضو كمتوفى"
          }
          onClick={() =>
            update(
              { is_deceased: !member.is_deceased },
              member.is_deceased ? "إلغاء وضع متوفى؟" : "تسجيل كمتوفى؟"
            )
          }
          disabled={busy}
        />

        {/* إخفاء/إظهار من الشجرة */}
        <ActionBtn
          color="#F59E0B"
          icon={member.is_hidden_from_tree ? "👁️" : "🚫"}
          label={member.is_hidden_from_tree ? "إظهار في الشجرة" : "إخفاء من الشجرة"}
          sublabel={
            member.is_hidden_from_tree
              ? "إعادة العضو للشجرة"
              : "إخفاء العضو من الشجرة العامة"
          }
          onClick={() =>
            update({ is_hidden_from_tree: !member.is_hidden_from_tree })
          }
          disabled={busy}
        />

        {/* تغيير الدور */}
        {canManageRoles && member.role !== "owner" && (
          <div className="bg-[#F1F5F9] rounded-2xl p-3">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">⭐</span>
              <span className="font-bold text-[#0F172A]">تغيير الدور</span>
            </div>
            <select
              value={member.role}
              onChange={(e) =>
                update({ role: e.target.value }, `تغيير الدور إلى ${e.target.value}؟`)
              }
              disabled={busy}
              className="w-full px-3 py-2 bg-white rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#357DED] disabled:opacity-50"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  color,
  icon,
  label,
  sublabel,
  onClick,
  disabled,
}: {
  color: string;
  icon: string;
  label: string;
  sublabel: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-2xl text-right transition disabled:opacity-50"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: `${color}20` }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[#0F172A]">{label}</div>
        <div className="text-xs text-[#64748B]">{sublabel}</div>
      </div>
      <span className="text-[#64748B]">←</span>
    </button>
  );
}
