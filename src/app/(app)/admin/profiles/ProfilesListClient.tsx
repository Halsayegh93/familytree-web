"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
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
  branch_id?: string | null;
  branch_name?: string | null;
};

type StatusFilter = "all" | "living" | "deceased" | "frozen" | "inactive";
type SortMode = "name" | "recent" | "role" | "activity" | "branch";

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
  const isInactive = !member.is_deceased && member.status !== "frozen" && member.is_active !== true;
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
            {isInactive && <Badge color="#EF4444">💤 غير نشط</Badge>}
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all"); // "all" أو branch_id
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [displayLimit, setDisplayLimit] = useState(18);
  const [busy, setBusy] = useState<string | null>(null);

  const [confirmMember, setConfirmMember] = useState<Member | null>(null);
  const [confirmAction, setConfirmAction] = useState<"freeze" | "activate">("freeze");

  useEffect(() => { setMembers(initialMembers); }, [initialMembers]);
  useEffect(() => { setDisplayLimit(18); }, [search, statusFilter, branchFilter, sortMode]);

  // قائمة الفروع المتاحة مع عدد الأعضاء (تبقى ثابتة من كل الأعضاء)
  const branches = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    members.forEach((m) => {
      if (!m.branch_id || !m.branch_name) return;
      const existing = map.get(m.branch_id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(m.branch_id, { id: m.branch_id, name: m.branch_name, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [members]);

  // الأعضاء بعد تطبيق فلتر الفرع — يُستخدم لحساب الإحصائيات + الفلترة
  const branchScopedMembers = useMemo(() => {
    if (branchFilter === "all") return members;
    return members.filter((m) => m.branch_id === branchFilter);
  }, [members, branchFilter]);

  // الإحصائيات تتبع الفرع المختار
  const counts = useMemo(() => ({
    all:      branchScopedMembers.length,
    // النشط = دخل التطبيق فعلياً
    living:   branchScopedMembers.filter((m) => m.is_active === true && !m.is_deceased && m.status !== "frozen").length,
    deceased: branchScopedMembers.filter((m) => !!m.is_deceased).length,
    frozen:   branchScopedMembers.filter((m) => m.status === "frozen").length,
    inactive: branchScopedMembers.filter((m) => m.is_active !== true && !m.is_deceased && m.status !== "frozen").length,
  }), [branchScopedMembers]);

  const filtered = useMemo(() => {
    let result = [...members];
    if (statusFilter === "living")   result = result.filter((m) => m.is_active === true && !m.is_deceased && m.status !== "frozen");
    if (statusFilter === "deceased") result = result.filter((m) => !!m.is_deceased);
    if (statusFilter === "frozen")   result = result.filter((m) => m.status === "frozen");
    if (statusFilter === "inactive") result = result.filter((m) => m.is_active !== true && !m.is_deceased && m.status !== "frozen");

    // فلترة بالفرع
    if (branchFilter !== "all") {
      result = result.filter((m) => m.branch_id === branchFilter);
    }

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
    } else if (sortMode === "branch") {
      // ترتيب بالفرع
      result.sort((a, b) => {
        const ab = a.branch_name ?? "";
        const bb = b.branch_name ?? "";
        const cmp = ab.localeCompare(bb, "ar");
        if (cmp !== 0) return cmp;
        return a.full_name.localeCompare(b.full_name, "ar");
      });
    } else {
      result.sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));
    }

    return result;
  }, [members, search, statusFilter, branchFilter, sortMode]);

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
    <div className="space-y-2">

      {/* === الفروع (قائمة منسدلة) === */}
      {branches.length > 0 && (
        <BranchPicker
          branches={branches}
          totalCount={members.length}
          selectedId={branchFilter}
          onSelect={setBranchFilter}
        />
      )}

      {/* === توولبار موحّد: بحث + ترتيب === */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-2 flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="🔍 ابحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED] text-[#0F172A] text-sm font-semibold"
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

        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="px-2 rounded-xl bg-[#F1F5F9] text-xs font-bold text-[#475569] outline-none focus:ring-2 focus:ring-[#357DED] cursor-pointer"
        >
          <option value="name">↓ بالاسم</option>
          <option value="recent">↓ الأحدث</option>
          <option value="branch">↓ بالفرع</option>
          <option value="activity">↓ نشاط</option>
        </select>
      </div>

      {/* === فلاتر مدمجة (تعمل كإحصائيات) === */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 px-0.5">
        <FilterChip active={statusFilter === "all"}      onClick={() => setStatusFilter("all")}      label="الكل"     count={counts.all}      color="#5438DC" />
        <FilterChip active={statusFilter === "living"}   onClick={() => setStatusFilter("living")}   label="نشط"      count={counts.living}   color="#10B981" />
        {counts.inactive > 0 && (
          <FilterChip active={statusFilter === "inactive"} onClick={() => setStatusFilter("inactive")} label="💤 غير نشط" count={counts.inactive} color="#EF4444" />
        )}
        {counts.deceased > 0 && (
          <FilterChip active={statusFilter === "deceased"} onClick={() => setStatusFilter("deceased")} label="🕊️ متوفى" count={counts.deceased} color="#6B7B8D" />
        )}
        {counts.frozen > 0 && (
          <FilterChip active={statusFilter === "frozen"} onClick={() => setStatusFilter("frozen")} label="🔒 مجمّد" count={counts.frozen} color="#EF4444" />
        )}
      </div>

      {/* === الفراغ === */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center">
          <div className="text-4xl mb-2">📂</div>
          <p className="text-[#0F172A] font-bold text-sm">لا توجد نتائج</p>
        </div>
      )}

      {/* === القائمة الموحّدة === */}
      {filtered.length > 0 && (
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
            onClick={() => setDisplayLimit((l) => l + 30)}
            className="px-5 py-2 rounded-full bg-white border border-[#E2E8F0] text-[#357DED] text-xs font-black hover:bg-[#EBF3FE] transition"
          >
            عرض المزيد ({filtered.length - displayLimit}) ▾
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

// ─── Branch Picker (قائمة منسدلة) ─────────────────────────────────────────────
function BranchPicker({
  branches,
  totalCount,
  selectedId,
  onSelect,
}: {
  branches: { id: string; name: string; count: number }[];
  totalCount: number;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // إغلاق عند الضغط خارج
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const selected =
    selectedId === "all"
      ? { name: "كل الفروع", count: totalCount, color: "#5438DC" }
      : (() => {
          const b = branches.find((x) => x.id === selectedId);
          return b
            ? { name: b.name, count: b.count, color: branchColorOf(b.id) }
            : { name: "كل الفروع", count: totalCount, color: "#5438DC" };
        })();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-white rounded-2xl border-2 border-[#E2E8F0] hover:border-[#5438DC] transition p-3 flex items-center gap-3 text-right"
      >
        {/* أيقونة الفرع */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
          style={{ background: `${selected.color}15`, color: selected.color }}
        >
          🌳
        </div>

        {/* الاسم + العدد (يظهر فقط للفرع المحدد) */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-[#94A3B8] mb-0.5">
            🌳 حصر الفروع — {branches.length} فرع
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-[#0F172A] truncate">
              {selected.name}
            </span>
            {selectedId !== "all" && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-black flex-shrink-0"
                style={{ background: selected.color, color: "white" }}
              >
                {selected.count}
              </span>
            )}
          </div>
        </div>

        {/* السهم */}
        <span
          className={`text-[#94A3B8] text-base flex-shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {/* القائمة المنسدلة */}
      {open && (
        <div className="absolute top-full mt-2 right-0 left-0 bg-white rounded-2xl border-2 border-[#E2E8F0] shadow-xl z-40 overflow-hidden max-h-96 overflow-y-auto">
          <BranchOption
            label="كل الفروع"
            count={totalCount}
            color="#5438DC"
            active={selectedId === "all"}
            onClick={() => {
              onSelect("all");
              setOpen(false);
            }}
          />
          <div className="border-t border-[#F1F5F9]" />
          {branches.map((b) => (
            <BranchOption
              key={b.id}
              label={b.name}
              count={b.count}
              color={branchColorOf(b.id)}
              active={selectedId === b.id}
              onClick={() => {
                onSelect(b.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BranchOption({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] transition text-right ${
        active ? "bg-[#F8FAFC]" : ""
      }`}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
        style={{ background: `${color}15`, color }}
      >
        🌳
      </div>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        <span
          className={`font-bold text-sm truncate ${
            active ? "text-[#0F172A]" : "text-[#475569]"
          }`}
        >
          {label}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-black text-white flex-shrink-0"
          style={{ background: color }}
        >
          {count}
        </span>
      </div>
      {active && <span className="text-[#10B981] text-base">✓</span>}
    </button>
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

// تخصيص لون لكل فرع بناءً على hash
function branchColorOf(id: string): string {
  const colors = ["#357DED", "#10B981", "#F59E0B", "#EC4899", "#06B6D4", "#5438DC", "#EF4444", "#84CC16", "#A855F7"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "short", year: "numeric" }).format(d);
}
