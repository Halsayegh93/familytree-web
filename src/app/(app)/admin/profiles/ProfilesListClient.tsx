"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
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

// ─── Toast ───────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "" } | null>(null);

  const show = useCallback((msg: string, type: "success" | "error" | "" = "") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  return { toast, show };
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({
  member,
  action,
  onConfirm,
  onClose,
}: {
  member: Member | null;
  action: "freeze" | "activate";
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!member) return null;
  const isFreeze = action === "freeze";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-sm rounded-t-3xl p-5 pb-10 animate-in slide-in-from-bottom-4">
        {/* Handle */}
        <div className="w-9 h-1 bg-[#E2E8F0] rounded-full mx-auto mb-4" />

        {/* Member preview */}
        <div className="flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 mb-4">
          <Avatar member={member} size={36} radius={10} />
          <div>
            <div className="font-bold text-sm text-[#0F172A]">{member.full_name}</div>
            <div className="text-xs text-[#94A3B8]">
              {roleAr(member.role)}
              {member.phone_number ? ` · ${formatPhone(member.phone_number)}` : ""}
            </div>
          </div>
        </div>

        <div className="font-extrabold text-base text-[#0F172A] mb-1">
          {isFreeze ? `تجميد حساب ${member.full_name}` : `تفعيل حساب ${member.full_name}`}
        </div>
        <div className="text-sm text-[#475569] mb-4">
          {isFreeze
            ? "لن يتمكن من الدخول للموقع أو التطبيق بعد التجميد."
            : "سيتمكن من الدخول مجدداً."}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-[#F1F5F9] text-[#475569] font-bold text-sm border border-[#E2E8F0]"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-11 rounded-xl font-bold text-sm text-white ${
              isFreeze ? "bg-[#EF4444]" : "bg-[#10B981]"
            }`}
          >
            {isFreeze ? "🔒 تجميد" : "✅ تفعيل"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ member, size = 40, radius = 12 }: { member: Member; size?: number; radius?: number }) {
  return (
    <div
      className="bg-gradient-to-br from-[#357DED] to-[#10B981] text-white flex items-center justify-center font-bold overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.38 }}
    >
      {member.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        initials(member.full_name)
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ProfilesListClient({
  members: initialMembers,
  canEdit = false,
}: {
  members: Member[];
  canEdit?: boolean;
  isHR?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { toast, show: showToast } = useToast();

  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [displayLimit, setDisplayLimit] = useState(15);
  const [busy, setBusy] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmMember, setConfirmMember] = useState<Member | null>(null);
  const [confirmAction, setConfirmAction] = useState<"freeze" | "activate">("freeze");

  // sync if server re-renders
  useEffect(() => { setMembers(initialMembers); }, [initialMembers]);

  // reset pagination on filter/search change
  useEffect(() => { setDisplayLimit(15); }, [search, statusFilter]);

  // ─── Counts ────────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all:      members.length,
    living:   members.filter((m) => !m.is_deceased && m.status !== "frozen").length,
    deceased: members.filter((m) => !!m.is_deceased).length,
    frozen:   members.filter((m) => m.status === "frozen").length,
  }), [members]);

  // ─── Filtered ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...members];
    if (statusFilter === "living")   result = result.filter((m) => !m.is_deceased && m.status !== "frozen");
    if (statusFilter === "deceased") result = result.filter((m) => !!m.is_deceased);
    if (statusFilter === "frozen")   result = result.filter((m) => m.status === "frozen");

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

  const visible = filtered.slice(0, displayLimit);
  const hasMore = filtered.length > displayLimit;

  // ─── Toggle status ─────────────────────────────────────────────────────────
  function openConfirm(member: Member) {
    setConfirmMember(member);
    setConfirmAction(member.status === "frozen" ? "activate" : "freeze");
  }

  async function handleConfirm() {
    if (!confirmMember) return;
    const newStatus = confirmAction === "freeze" ? "frozen" : "active";
    const memberId = confirmMember.id;
    const memberName = confirmMember.full_name;
    setConfirmMember(null);

    setBusy(memberId);
    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", memberId);
    setBusy(null);

    if (error) {
      showToast(`خطأ: ${error.message}`, "error");
    } else {
      // تحديث محلي فوري بدون انتظار router.refresh()
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, status: newStatus } : m))
      );
      showToast(
        newStatus === "frozen" ? `🔒 تم تجميد ${memberName}` : `✅ تم تفعيل ${memberName}`,
        newStatus === "frozen" ? "error" : "success"
      );
      router.refresh();
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard icon="👥" value={counts.all}      label="إجمالي الأعضاء" color="#357DED" />
        <StatCard icon="✅" value={counts.living}   label="أحياء"          color="#10B981" />
        <StatCard icon="🕊️" value={counts.deceased} label="متوفون"         color="#6B7B8D" />
        <StatCard icon="🔒" value={counts.frozen}   label="مجمّدون"        color="#EF4444" pulse={counts.frozen > 0} />
      </div>

      {/* Search + Filter card */}
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
            className="px-3 bg-[#F1F5F9] text-[#475569] rounded-xl font-bold text-sm hover:bg-[#E2E8F0] transition"
            title={view === "grid" ? "عرض قائمة" : "عرض شبكة"}
          >
            {view === "grid" ? "☰" : "🔲"}
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <FilterChip active={statusFilter === "all"}      onClick={() => setStatusFilter("all")}      label="الكل"     count={counts.all}      color="#5438DC" />
          <FilterChip active={statusFilter === "living"}   onClick={() => setStatusFilter("living")}   label="الأحياء"  count={counts.living}   color="#10B981" />
          <FilterChip active={statusFilter === "deceased"} onClick={() => setStatusFilter("deceased")} label="المتوفون" count={counts.deceased}  color="#6B7B8D" />
          {counts.frozen > 0 && (
            <FilterChip active={statusFilter === "frozen"} onClick={() => setStatusFilter("frozen")} label="🔒 مجمّدون" count={counts.frozen} color="#EF4444" />
          )}
        </div>
      </div>

      {/* Result count hint */}
      {(search || statusFilter !== "all") && (
        <div className="text-xs text-[#94A3B8] px-1">
          {filtered.length} نتيجة
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-14 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-[#64748B]">لا توجد نتائج</p>
        </div>
      )}

      {/* Grid view */}
      {filtered.length > 0 && view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {visible.map((m) => (
            <Link
              key={m.id}
              href={`/admin/profiles/${m.id}`}
              className="bg-white rounded-2xl border border-[#E2E8F0] hover:shadow-sm hover:border-[#357DED] transition p-4 text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden mb-3">
                <Avatar member={m} size={80} radius={16} />
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
      )}

      {/* List view */}
      {filtered.length > 0 && view === "list" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] divide-y divide-[#F1F5F9] overflow-hidden">
          {visible.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#F8FAFC] transition">
              <Link
                href={`/admin/profiles/${m.id}`}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <Avatar member={m} size={40} radius={12} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`font-bold text-sm truncate ${
                        m.is_deceased || m.status === "frozen"
                          ? "text-[#94A3B8]"
                          : "text-[#0F172A]"
                      }`}
                    >
                      {m.full_name}
                    </span>
                    <Badge color={roleColorOf(m.role)}>{roleAr(m.role)}</Badge>
                    {m.is_deceased && <Badge color="#6B7B8D">🕊️</Badge>}
                    {m.status === "frozen" && <Badge color="#EF4444">🔒 مجمّد</Badge>}
                  </div>
                  {m.phone_number && (
                    <div className="text-xs text-[#94A3B8] mt-0.5" dir="ltr">
                      {formatPhone(m.phone_number)}
                    </div>
                  )}
                </div>
              </Link>

              {canEdit && !m.is_deceased && (
                <button
                  onClick={() => openConfirm(m)}
                  disabled={busy === m.id}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex-shrink-0 transition disabled:opacity-40 ${
                    m.status === "frozen"
                      ? "bg-[#10B981] text-white hover:opacity-80"
                      : "bg-[#F1F5F9] text-[#EF4444] hover:bg-[#FEF2F2]"
                  }`}
                  title={m.status === "frozen" ? "تفعيل" : "تجميد"}
                >
                  {busy === m.id ? "..." : m.status === "frozen" ? "🔓 تفعيل" : "🔒 تجميد"}
                </button>
              )}

              <Link
                href={`/admin/profiles/${m.id}`}
                className="text-xs text-[#94A3B8] hover:text-[#5438DC] flex-shrink-0 transition"
              >
                ←
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="text-center pt-1">
          <button
            onClick={() => setDisplayLimit((l) => l + 15)}
            className="px-6 py-2 rounded-full border-2 border-[#357DED] text-[#357DED] text-sm font-bold hover:bg-[#EBF3FE] transition"
          >
            عرض المزيد ({filtered.length - displayLimit} متبقي) ▾
          </button>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmMember && (
        <ConfirmDialog
          member={confirmMember}
          action={confirmAction}
          onConfirm={handleConfirm}
          onClose={() => setConfirmMember(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg whitespace-nowrap transition-all ${
            toast.type === "success"
              ? "bg-[#10B981]"
              : toast.type === "error"
              ? "bg-[#EF4444]"
              : "bg-[#0F172A]"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, value, label, color, pulse = false,
}: {
  icon: string; value: number; label: string; color: string; pulse?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 flex items-center gap-2.5 relative hover:shadow-sm transition hover:-translate-y-0.5">
      {pulse && value > 0 && (
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
      )}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-lg font-black text-[#0F172A] leading-tight">{value}</div>
        <div className="text-xs text-[#64748B] truncate">{label}</div>
      </div>
    </div>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function FilterChip({
  active, onClick, label, count, color,
}: {
  active: boolean; onClick: () => void; label: string; count: number; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
        active ? "text-white shadow-sm" : "text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0]"
      }`}
      style={active ? { background: color } : {}}
    >
      <span>{label}</span>
      <span
        className={`px-1.5 rounded-full text-[10px] ${active ? "bg-white/30 text-white" : "bg-white text-[#475569]"}`}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
      style={{ background: `${color}18`, color }}
    >
      {children}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string): string {
  return name.trim().charAt(0);
}

function roleAr(role: string): string {
  switch (role) {
    case "owner": case "admin": return "مدير";
    case "monitor":    return "مراقب";
    case "supervisor": return "مشرف";
    default:           return "عضو";
  }
}

function roleColorOf(role: string): string {
  switch (role) {
    case "owner": case "admin": return "#5438DC";
    case "monitor":    return "#10B981";
    case "supervisor": return "#F59E0B";
    default:           return "#357DED";
  }
}
