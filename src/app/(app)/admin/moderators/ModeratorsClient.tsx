"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ROLES = [
  { value: "admin", label: "مدير", color: "#5438DC", icon: "👑" },
  { value: "monitor", label: "مراقب", color: "#10B981", icon: "👁️" },
  { value: "supervisor", label: "مشرف", color: "#F59E0B", icon: "⭐" },
  { value: "member", label: "عضو", color: "#357DED", icon: "👤" },
];

export function ModeratorsClient({ members }: { members: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const moderators = useMemo(
    () => members.filter((m) => ["owner", "admin", "monitor", "supervisor"].includes(m.role)),
    [members]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return members
      .filter((m) => m.full_name.toLowerCase().includes(q) || (m.phone_number ?? "").includes(q))
      .slice(0, 20);
  }, [members, search]);

  async function changeRole(id: string, role: string) {
    if (!confirm(`تغيير الدور إلى "${ROLES.find((r) => r.value === role)?.label}"؟`)) return;
    setBusy(id);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    setBusy(null);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
        <h2 className="font-black text-[#0F172A]">تعيين دور لعضو</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 ابحث عن عضو..."
          className="w-full px-4 py-3 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
        />
        {filtered.map((m) => (
          <MemberRow key={m.id} member={m} onChange={changeRole} busy={busy === m.id} />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-3 bg-[#F1F5F9] font-black text-[#0F172A]">
          ⭐ فريق الإدارة الحالي ({moderators.length})
        </div>
        {moderators.map((m, i) => (
          <div
            key={m.id}
            className={`px-5 py-3 ${i < moderators.length - 1 ? "border-b border-[#E2E8F0]" : ""}`}
          >
            <MemberRow member={m} onChange={changeRole} busy={busy === m.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberRow({
  member,
  onChange,
  busy,
}: {
  member: any;
  onChange: (id: string, role: string) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#357DED] to-[#10B981] text-white flex items-center justify-center font-bold overflow-hidden">
        {member.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          member.full_name?.[0] ?? "؟"
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[#0F172A] truncate">{member.full_name}</div>
        <div className="text-xs text-[#64748B]">
          الدور الحالي:{" "}
          <span className="font-bold" style={{ color: ROLES.find((r) => r.value === member.role)?.color ?? "#357DED" }}>
            {member.role === "owner" ? "👑 مالك" : ROLES.find((r) => r.value === member.role)?.label ?? member.role}
          </span>
        </div>
      </div>
      {member.role !== "owner" && (
        <select
          value={member.role}
          onChange={(e) => onChange(member.id, e.target.value)}
          disabled={busy}
          className="px-3 py-2 bg-[#F1F5F9] rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#357DED] disabled:opacity-50"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.icon} {r.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
