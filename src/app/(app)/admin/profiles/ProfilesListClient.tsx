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
  is_active?: boolean;
  days_since_active?: number | null;
  last_sign_in_at?: string | null;
};

type StatusFilter = "all" | "living" | "deceased" | "frozen" | "inactive";
type SortMode = "name" | "recent" | "role" | "activity";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-in fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md rounded-t-3xl p-5 pb-10 animate-in slide-in-from-bottom-4">
        <div className="w-9 h-1 bg-[#E2E8F0] rounded-full mx-auto mb-4" />

        <div className="flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 mb-4">
          <Avatar member={member} size={44} radius={12} />
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
  const accentColor = roleColorOf(member.role);
  return (
    <div
      className="text-white flex items-center justify-center font-black overflow-hidden flex-shrink-0 shadow-sm"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
      }}
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

// ─── Member File Card (dossier-style) ─────────────────────────────────────────
function MemberFileCard({
  member,
  canEdit,
  busy,
  onToggle,
}: {
  member: Member;
  canEdit: boolean;
  busy: boolean;
  onToggle: (m: Member) => void;
}) {
  const accentColor = roleColorOf(member.role);
  const isInactive = !member.is_deceased && member.status !== "frozen" && member.is_active === false;
  const status = member.is_deceased
    ? { label: "متوفى", color: "#6B7B8D", emoji: "🕊️" }
    : member.status === "frozen"
    ? { label: "مجمّد", color: "#EF4444", emoji: "🔒" }
    : isInactive
    ? { label: "غير نشط", color: "#F59E0B", emoji: "💤" }
    : { label: "نشط", color: "#10B981", emoji: "●" };

  const dimmed = member.is_deceased || member.status === "frozen";

  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden transition hover:shadow-md hover:-translate-y-0.5 group relative ${
        dimmed ? "border-[#E2E8F0]" : "border-[#E2E8F0] hover:border-transparent"
      }`}
      style={!dimmed ? { } : {}}
    >
      {/* شريط علوي بلون الدور */}
      <div className="h-1.5" style={{ background: accentColor }} />

      {/* شارة غير نشط */}
      {isInactive && (
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FCD34D] text-[#B45309] text-[10px] font-black animate-pulse">
            💤 غير نشط
          </span>
        </div>
      )}

      <Link href={`/admin/profiles/${member.id}`} className="block p-4">
        {/* صف رأسي: أفاتار + اسم + حالة */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar member={member} size={56} radius={16} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h3
                className={`flex-1 font-black text-sm leading-tight ${
                  dimmed ? "text-[#94A3B8]" : "text-[#0F172A]"
                }`}
              >
                {member.full_name}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Badge color={accentColor}>{roleAr(member.role)}</Badge>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-black"
                style={{ color: status.color }}
              >
                <span>{status.emoji}</span>
                <span>{status.label}</span>
              </span>
            </div>
          </div>
        </div>

        {/* بيانات سريعة */}
        <div className="space-y-1.5">
          {member.phone_number && (
            <InfoRow icon="📞" value={formatPhone(member.phone_number)} dir="ltr" />
          )}
          {member.birth_date && (
            <InfoRow icon="🎂" value={formatBirthDate(member.birth_date)} />
          )}
          <InfoRow icon="📅" value={`سجل: ${formatJoinDate(member.created_at)}`} muted />
          {/* آخر نشاط */}
          {member.last_sign_in_at ? (
            <InfoRow icon="🟢" value={`آخر دخول: ${formatJoinDate(member.last_sign_in_at)}`} muted />
          ) : !member.is_deceased && member.status !== "frozen" ? (
            <InfoRow icon="❌" value="لم يدخل التطبيق أبداً" muted />
          ) : null}
        </div>
      </Link>

      {/* أزرار الإجراءات */}
      {canEdit && !member.is_deceased && (
        <div className="px-4 pb-3 pt-1 border-t border-[#F1F5F9] flex gap-2">
          <Link
            href={`/admin/profiles/${member.id}`}
            className="flex-1 h-8 rounded-lg bg-[#F1F5F9] text-[#475569] text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#357DED] hover:text-white transition"
          >
            <span>📂</span>
            <span>فتح الملف</span>
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggle(member);
            }}
            disabled={busy}
            className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-40 transition ${
              member.status === "frozen"
                ? "bg-[#10B981] text-white hover:opacity-90"
                : "bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEE2E2]"
            }`}
          >
            {busy ? "..." : member.status === "frozen" ? "🔓" : "🔒"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Member File Row (compact list) ───────────────────────────────────────────
function MemberFileRow({
  member,
  canEdit,
  busy,
  onToggle,
}: {
  member: Member;
  canEdit: boolean;
  busy: boolean;
  onToggle: (m: Member) => void;
}) {
  const accentColor = roleColorOf(member.role);
  const isInactive = !member.is_deceased && member.status !== "frozen" && member.is_active === false;
  const dimmed = member.is_deceased || member.status === "frozen";

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#F8FAFC] transition group relative">
      {/* خط جانبي بلون الدور */}
      <div className="absolute right-0 top-2 bottom-2 w-1 rounded-l" style={{ background: accentColor }} />

      <Link
        href={`/admin/profiles/${member.id}`}
        className="flex items-center gap-3 flex-1 min-w-0 mr-2"
      >
        <Avatar member={member} size={42} radius={12} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`font-black text-sm truncate ${
                dimmed ? "text-[#94A3B8]" : "text-[#0F172A]"
              }`}
            >
              {member.full_name}
            </span>
            <Badge color={accentColor}>{roleAr(member.role)}</Badge>
            {member.is_deceased && <Badge color="#6B7B8D">🕊️</Badge>}
            {member.status === "frozen" && <Badge color="#EF4444">🔒 مجمّد</Badge>}
            {isInactive && <Badge color="#F59E0B">💤 غير نشط</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {member.phone_number && (
              <span className="text-xs text-[#64748B] font-semibold" dir="ltr">
                📞 {formatPhone(member.phone_number)}
              </span>
            )}
            <span className="text-[11px] text-[#94A3B8]">
              {member.last_sign_in_at
                ? `🟢 ${formatJoinDate(member.last_sign_in_at)}`
                : !member.is_deceased && member.status !== "frozen"
                ? "❌ لم يدخل"
                : `📅 ${formatJoinDate(member.created_at)}`}
            </span>
          </div>
        </div>
      </Link>

      {canEdit && !member.is_deceased && (
        <button
          onClick={() => onToggle(member)}
          disabled={busy}
          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex-shrink-0 transition disabled:opacity-40 ${
            member.status === "frozen"
              ? "bg-[#10B981] text-white hover:opacity-80"
              : "bg-[#F1F5F9] text-[#EF4444] hover:bg-[#FEF2F2]"
          }`}
          title={member.status === "frozen" ? "تفعيل" : "تجميد"}
        >
          {busy ? "..." : member.status === "frozen" ? "🔓 تفعيل" : "🔒 تجميد"}
        </button>
      )}

      <Link
        href={`/admin/profiles/${member.id}`}
        className="h-8 w-8 rounded-lg bg-[#F1F5F9] text-[#475569] flex items-center justify-center text-sm font-bold hover:bg-[#357DED] hover:text-white transition flex-shrink-0"
        title="فتح الملف"
      >
        📂
      </Link>
    </div>
  );
}

function InfoRow({ icon, value, dir, muted }: { icon: string; value: string; dir?: string; muted?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${muted ? "text-[#94A3B8]" : "text-[#64748B]"}`}>
      <span className="text-[10px]">{icon}</span>
      <span className="font-semibold truncate" dir={dir}>{value}</span>
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
  const [view, setView] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [displayLimit, setDisplayLimit] = useState(18);
  const [busy, setBusy] = useState<string | null>(null);

  const [confirmMember, setConfirmMember] = useState<Member | null>(null);
  const [confirmAction, setConfirmAction] = useState<"freeze" | "activate">("freeze");

  useEffect(() => { setMembers(initialMembers); }, [initialMembers]);
  useEffect(() => { setDisplayLimit(18); }, [search, statusFilter, sortMode]);

  const counts = useMemo(() => ({
    all:      members.length,
    living:   members.filter((m) => !m.is_deceased && m.status !== "frozen").length,
    deceased: members.filter((m) => !!m.is_deceased).length,
    frozen:   members.filter((m) => m.status === "frozen").length,
    inactive: members.filter((m) => !m.is_active && !m.is_deceased && m.status !== "frozen").length,
  }), [members]);

  const filtered = useMemo(() => {
    let result = [...members];
    if (statusFilter === "living")   result = result.filter((m) => !m.is_deceased && m.status !== "frozen");
    if (statusFilter === "deceased") result = result.filter((m) => !!m.is_deceased);
    if (statusFilter === "frozen")   result = result.filter((m) => m.status === "frozen");
    if (statusFilter === "inactive") result = result.filter((m) => !m.is_active && !m.is_deceased && m.status !== "frozen");

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.first_name.toLowerCase().includes(q) ||
          (m.phone_number ?? "").includes(q)
      );
    }

    if (sortMode === "recent") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortMode === "role") {
      const order: Record<string, number> = { owner: 0, admin: 1, monitor: 2, supervisor: 3, member: 4 };
      result.sort((a, b) => (order[a.role] ?? 99) - (order[b.role] ?? 99));
    } else if (sortMode === "activity") {
      // الأقل نشاطاً أولاً
      result.sort((a, b) => {
        const aDays = a.days_since_active ?? 9999;
        const bDays = b.days_since_active ?? 9999;
        return bDays - aDays;
      });
    } else {
      result.sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));
    }

    return result;
  }, [members, search, statusFilter, sortMode]);

  const visible = filtered.slice(0, displayLimit);
  const hasMore = filtered.length > displayLimit;

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

  return (
    <div className="space-y-3">

      {/* === الإحصائيات === */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <StatCard icon="📁" value={counts.all}      label="إجمالي" color="#357DED" />
        <StatCard icon="✅" value={counts.living}   label="حسابات نشطة" color="#10B981" />
        <StatCard icon="💤" value={counts.inactive} label="غير نشط" color="#F59E0B" pulse={counts.inactive > 0} />
        <StatCard icon="🕊️" value={counts.deceased} label="متوفون" color="#6B7B8D" />
        <StatCard icon="🔒" value={counts.frozen}   label="مجمّد" color="#EF4444" pulse={counts.frozen > 0} />
      </div>

      {/* === لوحة البحث والتحكم === */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3 space-y-2.5">
        {/* بحث + عرض */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="🔍 بحث في الملفات بالاسم أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-4 pl-10 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED] text-[#0F172A] text-sm font-semibold"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#E2E8F0] text-[#64748B] text-xs hover:bg-[#CBD5E1]"
              >
                ✕
              </button>
            )}
          </div>

          {/* تبديل العرض */}
          <div className="flex bg-[#F1F5F9] rounded-xl p-0.5">
            <button
              onClick={() => setView("grid")}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition ${
                view === "grid" ? "bg-white text-[#357DED] shadow-sm" : "text-[#64748B]"
              }`}
              title="ملفات (شبكة)"
            >
              🗂️
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition ${
                view === "list" ? "bg-white text-[#357DED] shadow-sm" : "text-[#64748B]"
              }`}
              title="قائمة"
            >
              ☰
            </button>
          </div>
        </div>

        {/* الفلاتر + الترتيب */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-1">
            <FilterChip active={statusFilter === "all"}      onClick={() => setStatusFilter("all")}      label="الكل"     count={counts.all}      color="#5438DC" />
            <FilterChip active={statusFilter === "living"}   onClick={() => setStatusFilter("living")}   label="نشط"      count={counts.living}   color="#10B981" />
            {counts.inactive > 0 && (
              <FilterChip active={statusFilter === "inactive"} onClick={() => setStatusFilter("inactive")} label="💤 غير نشط" count={counts.inactive} color="#F59E0B" />
            )}
            <FilterChip active={statusFilter === "deceased"} onClick={() => setStatusFilter("deceased")} label="🕊️ متوفى" count={counts.deceased} color="#6B7B8D" />
            {counts.frozen > 0 && (
              <FilterChip active={statusFilter === "frozen"} onClick={() => setStatusFilter("frozen")} label="🔒 مجمّد" count={counts.frozen} color="#EF4444" />
            )}
          </div>

          {/* ترتيب */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="px-3 py-1.5 rounded-full bg-[#F1F5F9] text-xs font-bold text-[#475569] outline-none focus:ring-2 focus:ring-[#357DED] cursor-pointer"
          >
            <option value="name">↓ بالاسم</option>
            <option value="recent">↓ الأحدث</option>
            <option value="role">↓ الدور</option>
            <option value="activity">↓ غير النشط أولاً</option>
          </select>
        </div>
      </div>

      {/* === عداد النتائج === */}
      {(search || statusFilter !== "all") && (
        <div className="text-xs text-[#64748B] px-1 font-bold">
          📊 {filtered.length} ملف
        </div>
      )}

      {/* === الفراغ === */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-14 text-center">
          <div className="text-5xl mb-3">📂</div>
          <p className="text-[#0F172A] font-bold mb-1">لا توجد ملفات مطابقة</p>
          <p className="text-[#64748B] text-sm">جرّب تعديل البحث أو الفلتر</p>
        </div>
      )}

      {/* === عرض الشبكة (ملفات) === */}
      {filtered.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((m) => (
            <MemberFileCard
              key={m.id}
              member={m}
              canEdit={canEdit}
              busy={busy === m.id}
              onToggle={openConfirm}
            />
          ))}
        </div>
      )}

      {/* === عرض القائمة === */}
      {filtered.length > 0 && view === "list" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] divide-y divide-[#F1F5F9] overflow-hidden">
          {visible.map((m) => (
            <MemberFileRow
              key={m.id}
              member={m}
              canEdit={canEdit}
              busy={busy === m.id}
              onToggle={openConfirm}
            />
          ))}
        </div>
      )}

      {/* === تحميل المزيد === */}
      {hasMore && (
        <div className="text-center pt-1">
          <button
            onClick={() => setDisplayLimit((l) => l + 18)}
            className="px-6 py-2.5 rounded-full bg-white border-2 border-[#357DED] text-[#357DED] text-sm font-black hover:bg-[#EBF3FE] transition"
          >
            تحميل المزيد ({filtered.length - displayLimit} متبقي) ▾
          </button>
        </div>
      )}

      {/* === Confirm Dialog === */}
      {confirmMember && (
        <ConfirmDialog
          member={confirmMember}
          action={confirmAction}
          onConfirm={handleConfirm}
          onClose={() => setConfirmMember(null)}
        />
      )}

      {/* === Toast === */}
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
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3 flex items-center gap-2.5 relative hover:shadow-sm transition hover:-translate-y-0.5 overflow-hidden">
      {pulse && value > 0 && (
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
      )}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-sm"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xl font-black text-[#0F172A] leading-tight">{value}</div>
        <div className="text-[11px] text-[#64748B] truncate font-semibold">{label}</div>
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
      className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
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

function formatBirthDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "short", year: "numeric" }).format(d);
}
