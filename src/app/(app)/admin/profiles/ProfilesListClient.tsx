"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPhone } from "@/lib/format-phone";
import Link from "next/link";

type Member = {
  id: string;
  first_name: string;
  full_name: string;
  phone_number: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
  is_deceased: boolean | null;
  birth_date: string | null;
  created_at: string;
};

type StatusFilter = "all" | "living" | "deceased" | "frozen";

export function ProfilesListClient({
  members,
  canEdit = false,
  isHR = false,
}: {
  members: Member[];
  canEdit?: boolean;
  isHR?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleStatus(memberId: string, currentStatus: string) {
    const newStatus = currentStatus === "frozen" ? "active" : "frozen";
    if (!confirm(newStatus === "frozen" ? "تجميد الحساب؟" : "تفعيل الحساب؟")) return;
    setBusy(memberId);
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", memberId);
    setBusy(null);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  const counts = useMemo(() => ({
    all: members.length,
    living: members.filter((m) => !m.is_deceased && m.status !== "frozen").length,
    deceased: members.filter((m) => m.is_deceased).length,
    frozen: members.filter((m) => m.status === "frozen").length,
  }), [members]);

  const filtered = useMemo(() => {
    let result = members;
    if (statusFilter === "living") result = result.filter((m) => !m.is_deceased && m.status !== "frozen");
    else if (statusFilter === "deceased") result = result.filter((m) => m.is_deceased);
    else if (statusFilter === "frozen") result = result.filter((m) => m.status === "frozen");

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.first_name.toLowerCase().includes(q) ||
          (m.phone_number ?? "").includes(q)
      );
    }
    return result;
  }, [members, search, statusFilter]);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="🔍 بحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED] text-[#0F172A] text-sm"
          />
          <button
            onClick={() => setView(view === "grid" ? "list" : "grid")}
            className="px-3 bg-[#F1F5F9] text-[#475569] rounded-xl font-bold text-sm"
            title={view === "grid" ? "عرض قائمة" : "عرض شبكة"}
          >
            {view === "grid" ? "☰" : "🔲"}
          </button>
        </div>

        {/* فلاتر */}
        <div className="flex gap-1.5 overflow-x-auto">
          <FilterChip
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            label="الكل"
            count={counts.all}
            color="#5438DC"
          />
          <FilterChip
            active={statusFilter === "living"}
            onClick={() => setStatusFilter("living")}
            label="الأحياء"
            count={counts.living}
            color="#10B981"
          />
          <FilterChip
            active={statusFilter === "deceased"}
            onClick={() => setStatusFilter("deceased")}
            label="المتوفون"
            count={counts.deceased}
            color="#6B7B8D"
          />
          {counts.frozen > 0 && (
            <FilterChip
              active={statusFilter === "frozen"}
              onClick={() => setStatusFilter("frozen")}
              label="مجمّدون"
              count={counts.frozen}
              color="#EF4444"
            />
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-[#64748B]">لا توجد نتائج</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.slice(0, 200).map((m) => (
            <Link
              key={m.id}
              href={`/admin/profiles/${m.id}`}
              className="bg-white rounded-2xl border border-[#E2E8F0] hover:shadow-sm hover:border-[#357DED] transition p-4 text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#357DED] to-[#10B981] text-white flex items-center justify-center font-black text-2xl overflow-hidden mb-3">
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials(m.full_name)
                )}
              </div>
              <div className="font-bold text-[#0F172A] truncate text-sm">{m.full_name}</div>
              <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                <Badge color={roleColorOf(m.role)}>{roleAr(m.role)}</Badge>
                {m.is_deceased && <Badge color="#6B7B8D">🕊️</Badge>}
                {m.status === "frozen" && <Badge color="#EF4444">🔒</Badge>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
          {filtered.slice(0, 200).map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#F8FAFC] transition">
              <Link
                href={`/admin/profiles/${m.id}`}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#357DED] to-[#10B981] text-white flex items-center justify-center font-bold text-base overflow-hidden flex-shrink-0">
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initials(m.full_name)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[#0F172A] truncate">{m.full_name}</span>
                    <Badge color={roleColorOf(m.role)}>{roleAr(m.role)}</Badge>
                    {m.is_deceased && <Badge color="#6B7B8D">🕊️</Badge>}
                    {m.status === "frozen" && <Badge color="#EF4444">🔒</Badge>}
                  </div>
                  {m.phone_number && (
                    <div className="text-xs text-[#64748B] mt-0.5" dir="ltr">
                      {formatPhone(m.phone_number)}
                    </div>
                  )}
                </div>
              </Link>
              {canEdit && !m.is_deceased && (
                <button
                  onClick={() => toggleStatus(m.id, m.status)}
                  disabled={busy === m.id}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex-shrink-0 ${
                    m.status === "frozen"
                      ? "bg-[#10B981] text-white"
                      : "bg-[#F1F5F9] text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                  } disabled:opacity-50 transition`}
                  title={m.status === "frozen" ? "تفعيل" : "تجميد"}
                >
                  {m.status === "frozen" ? "🔓" : "🔒"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {filtered.length > 200 && (
        <div className="text-center text-sm text-[#64748B] py-3">
          عرض ٢٠٠ من {filtered.length} — ضيّق البحث
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active, onClick, label, count, color,
}: {
  active: boolean; onClick: () => void; label: string; count: number; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
        active ? "text-white shadow-sm" : "text-[#475569] bg-[#F1F5F9]"
      }`}
      style={active ? { background: color } : {}}
    >
      <span>{label}</span>
      <span
        className={`px-1.5 rounded-full text-[10px] ${
          active ? "bg-white/30" : "bg-white"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
      style={{ background: `${color}20`, color }}
    >
      {children}
    </span>
  );
}

function initials(name: string): string {
  return name.trim().charAt(0);
}

function roleAr(role: string): string {
  switch (role) {
    case "owner": case "admin": return "مدير";
    case "monitor": return "مراقب";
    case "supervisor": return "مشرف";
    default: return "عضو";
  }
}

function roleColorOf(role: string): string {
  switch (role) {
    case "owner": case "admin": return "#5438DC";
    case "monitor": return "#10B981";
    case "supervisor": return "#F59E0B";
    default: return "#357DED";
  }
}
