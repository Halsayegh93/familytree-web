"use client";

import { useMemo, useState, useEffect } from "react";
import { MemberFullEditClient } from "@/app/(app)/admin/profiles/[id]/MemberFullEditClient";
import { formatPhone } from "@/lib/format-phone";

type Member = {
  id: string;
  first_name: string;
  full_name: string;
  father_id: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
  is_deceased: boolean | null;
  birth_date: string | null;
  death_date: string | null;
  phone_number: string | null;
  sort_order: number | null;
};

export function TreeBrowser({
  members,
  canModerate = false,
  isHR = false,
}: {
  members: Member[];
  canModerate?: boolean;
  isHR?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);

  // ID → Member map
  const byId = useMemo(() => {
    const m = new Map<string, Member>();
    members.forEach((x) => m.set(x.id, x));
    return m;
  }, [members]);

  // father_id → children[]
  const childrenByFather = useMemo(() => {
    const m = new Map<string | null, Member[]>();
    members.forEach((x) => {
      const arr = m.get(x.father_id) ?? [];
      arr.push(x);
      m.set(x.father_id, arr);
    });
    m.forEach((arr) =>
      arr.sort((a, b) => {
        const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (so !== 0) return so;
        return a.first_name.localeCompare(b.first_name, "ar");
      })
    );
    return m;
  }, [members]);

  // Root — أكبر جد بدون أب لكن عنده أبناء
  const root = useMemo(() => {
    const fatherIds = new Set(members.map((x) => x.father_id).filter(Boolean));
    const candidates = members
      .filter((x) => !x.father_id && fatherIds.has(x.id))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return candidates[0] ?? null;
  }, [members]);

  // أول تحميل: focus على الجذر
  useEffect(() => {
    if (root && !focusId) setFocusId(root.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root?.id]);

  const focused = focusId ? byId.get(focusId) : null;

  // الأجداد (سلسلة الأب صعوداً)
  const ancestors = useMemo(() => {
    if (!focused) return [];
    const path: Member[] = [];
    let cur = focused.father_id ? byId.get(focused.father_id) : null;
    while (cur) {
      path.unshift(cur);
      cur = cur.father_id ? byId.get(cur.father_id) : null;
    }
    return path;
  }, [focused, byId]);

  // الأبناء المباشرين
  const directChildren = useMemo(() => {
    if (!focused) return [];
    return childrenByFather.get(focused.id) ?? [];
  }, [focused, childrenByFather]);

  // البحث
  const filteredSearch = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return members
      .filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.first_name.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [members, search]);

  function focus(id: string) {
    setFocusId(id);
    setSearch("");
  }

  return (
    <div className="space-y-4">
      {/* شريط الأدوات — مبسّط */}
      <div data-tree-toolbar className="bg-white rounded-2xl border border-[#E2E8F0] p-3 flex flex-col md:flex-row gap-2 sticky top-14 z-30 shadow-sm">
        {/* البحث */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="🔍 ابحث عن عضو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#10B981]"
          />
          {filteredSearch.length > 0 && (
            <div className="absolute top-full mt-2 right-0 left-0 bg-white rounded-2xl border border-[#E2E8F0] z-50 max-h-72 overflow-y-auto shadow-xl">
              {filteredSearch.map((m) => (
                <button
                  key={m.id}
                  onClick={() => focus(m.id)}
                  className="w-full text-right px-4 py-3 hover:bg-[#F1F5F9] border-b border-[#E2E8F0] last:border-0"
                >
                  <div className="font-bold text-[#0F172A]">{m.full_name}</div>
                  <div className="text-xs text-[#64748B]">
                    {m.is_deceased ? "🕊️ متوفى" : roleAr(m.role)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* أزرار التنقل */}
        <div className="flex gap-2">
          {root && focusId !== root.id && (
            <button
              onClick={() => focus(root.id)}
              className="px-3 py-2.5 bg-[#10B981] text-white rounded-xl font-bold text-sm hover:opacity-90 whitespace-nowrap"
            >
              🏠 الجذر
            </button>
          )}
          {focused?.father_id && (
            <button
              onClick={() => focus(focused.father_id!)}
              className="px-3 py-2.5 bg-[#357DED] text-white rounded-xl font-bold text-sm hover:opacity-90 whitespace-nowrap"
            >
              ↑ الأب
            </button>
          )}
        </div>
      </div>

      {focused && (
        <>
          {/* مسار الأجداد (Breadcrumb) */}
          {ancestors.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3">
              <div className="flex items-center gap-1 flex-wrap text-sm">
                <span className="text-[#64748B] font-bold ml-1">السلسلة:</span>
                {ancestors.map((a, i) => (
                  <span key={a.id} className="flex items-center gap-1">
                    <button
                      onClick={() => focus(a.id)}
                      className="px-2 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#10B981] hover:text-white font-bold transition"
                    >
                      {a.first_name}
                    </button>
                    {i < ancestors.length - 1 && <span className="text-[#94A3B8]">←</span>}
                  </span>
                ))}
                <span className="text-[#94A3B8]">←</span>
                <span className="px-2 py-1 rounded-lg bg-[#10B981] text-white font-bold">
                  {focused.first_name}
                </span>
              </div>
            </div>
          )}

          {/* العضو المركز (الـ focus) — موحّد بنمط الرئيسية */}
          <div className="bg-[#ECFDF5] rounded-xl border-2 border-[#10B981]/40 overflow-hidden relative p-3">
            {canModerate && (
              <div className="absolute top-2 left-2 z-10">
                <MemberFullEditClient
                  member={focused}
                  canManageRoles={canModerate}
                  variant="icon"
                />
              </div>
            )}

            <div className="flex items-start gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white flex items-center justify-center text-lg font-black shadow-sm overflow-hidden flex-shrink-0">
                {focused.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={focused.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  focused.full_name.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0 pl-7">
                {focused.father_id && byId.get(focused.father_id) && (
                  <button
                    onClick={() => focus(focused.father_id!)}
                    className="inline-flex items-center gap-1 text-[10px] text-[#475569] hover:text-[#357DED] font-semibold"
                  >
                    <span>👨 ابن</span>
                    <span className="font-black underline decoration-dotted">
                      {byId.get(focused.father_id)!.first_name}
                    </span>
                  </button>
                )}
                <h2 className="text-base md:text-lg font-black text-[#0F172A] leading-tight">
                  {focused.full_name}
                </h2>
                {/* الشارات */}
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="px-2 py-0.5 bg-[#10B981] text-white rounded-full text-[10px] font-black">
                    {roleAr(focused.role)}
                  </span>
                  {focused.is_deceased && (
                    <span className="px-2 py-0.5 bg-[#6B7B8D]/15 text-[#6B7B8D] rounded-full text-[10px] font-bold">
                      🕊️ متوفى
                    </span>
                  )}
                  {focused.birth_date && (
                    <span className="px-2 py-0.5 bg-white border border-[#E2E8F0] rounded-full text-[10px] font-semibold">
                      🎂 {focused.birth_date}
                    </span>
                  )}
                  {focused.death_date && (
                    <span className="px-2 py-0.5 bg-white border border-[#E2E8F0] rounded-full text-[10px] font-semibold">
                      🕊️ {focused.death_date}
                    </span>
                  )}
                  {focused.phone_number && (
                    <a
                      href={`tel:${focused.phone_number}`}
                      dir="ltr"
                      className="px-2 py-0.5 bg-white border border-[#E2E8F0] rounded-full text-[10px] font-semibold hover:bg-[#357DED] hover:text-white transition"
                    >
                      📞 {formatPhone(focused.phone_number)}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* الأبناء */}
          {directChildren.length > 0 ? (
            <Section
              title={`الأبناء (${directChildren.length})`}
              icon="👨‍👦"
              color="#5438DC"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {directChildren.map((c) => (
                  <NodeCard
                    key={c.id}
                    member={c}
                    onClick={() => focus(c.id)}
                    size="sm"
                    showHasChildren={(childrenByFather.get(c.id)?.length ?? 0) > 0}
                    childrenCount={childrenByFather.get(c.id)?.length ?? 0}
                  />
                ))}
              </div>
            </Section>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 text-center">
              <div className="text-3xl mb-2">🍃</div>
              <p className="text-[#64748B] text-sm">لا توجد أبناء</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// MARK: - Section
function Section({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      <div
        className="px-5 py-3 flex items-center gap-2 border-b border-[#E2E8F0]"
        style={{ background: `${color}10` }}
      >
        <span className="text-xl">{icon}</span>
        <h3 className="font-black" style={{ color }}>
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// MARK: - Node Card — موحّد بنمط الرئيسية (horizontal mini)
function NodeCard({
  member,
  onClick,
  showHasChildren = false,
  childrenCount = 0,
}: {
  member: Member;
  onClick: () => void;
  size?: "sm" | "md";
  showHasChildren?: boolean;
  childrenCount?: number;
}) {
  const roleColor = roleColorOf(member.role);

  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-xl border border-[#E2E8F0] p-3 hover:border-[#10B981] hover:shadow-sm transition w-full text-right"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg overflow-hidden flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ background: roleColor }}
        >
          {member.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            member.full_name.charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-[#0F172A] truncate">{member.first_name}</div>
          <div className="flex items-center gap-1 flex-wrap mt-0.5">
            {member.is_deceased && (
              <span className="text-[10px] text-[#6B7B8D]">🕊️ متوفى</span>
            )}
            {showHasChildren && childrenCount > 0 && (
              <span className="px-1.5 py-0.5 bg-[#5438DC]/15 text-[#5438DC] rounded-full text-[10px] font-bold">
                +{childrenCount} ابناء
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// MARK: - Helpers
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
    case "member": return "#357DED";
    default: return "#6B7B8D";
  }
}
