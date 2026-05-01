"use client";

import { useMemo, useState, useEffect } from "react";
import { MemberFullEditClient } from "@/app/(app)/admin/profiles/[id]/MemberFullEditClient";
import { formatPhone } from "@/lib/format-phone";
import Link from "next/link";

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
}: {
  members: Member[];
  canModerate?: boolean;
  isHR?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, Member>();
    members.forEach((x) => m.set(x.id, x));
    return m;
  }, [members]);

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

  // الأشقاء (أبناء الأب باستثناء العضو الحالي)
  const siblings = useMemo(() => {
    if (!focused?.father_id) return [];
    const all = childrenByFather.get(focused.father_id) ?? [];
    return all.filter((m) => m.id !== focused.id);
  }, [focused, childrenByFather]);

  // عدد الأحفاد (الأبناء + الأحفاد + ...)
  const totalDescendants = useMemo(() => {
    if (!focused) return 0;
    let count = 0;
    function dfs(id: string) {
      const kids = childrenByFather.get(id) ?? [];
      count += kids.length;
      kids.forEach((k) => dfs(k.id));
    }
    dfs(focused.id);
    return count;
  }, [focused, childrenByFather]);

  // الجيل (المستوى من الجذر)
  const generation = useMemo(() => ancestors.length, [ancestors]);

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
    <div className="space-y-1.5">
      {/* ═══════ شريط الأدوات (مختصر) ═══════ */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-2 sticky top-14 z-30 shadow-sm space-y-1.5">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="🔍 ابحث في الشجرة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-4 pl-10 py-2 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#10B981] text-sm font-semibold"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#E2E8F0] text-[#64748B] text-xs hover:bg-[#CBD5E1]"
              >
                ✕
              </button>
            )}
            {filteredSearch.length > 0 && (
              <div className="absolute top-full mt-2 right-0 left-0 bg-white rounded-2xl border border-[#E2E8F0] z-50 max-h-72 overflow-y-auto shadow-xl">
                {filteredSearch.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => focus(m.id)}
                    className="w-full text-right px-4 py-2.5 hover:bg-[#F1F5F9] border-b border-[#E2E8F0] last:border-0 flex items-center gap-3"
                  >
                    <div
                      className="w-9 h-9 rounded-lg text-white flex items-center justify-center font-black overflow-hidden flex-shrink-0"
                      style={{ background: roleColorOf(m.role) }}
                    >
                      {m.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        m.full_name.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-[#0F172A] truncate">{m.full_name}</div>
                      <div className="text-[11px] text-[#64748B]">
                        {m.is_deceased ? "🕊️ متوفى" : roleAr(m.role)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* أزرار التنقل السريع */}
          <div className="flex gap-1.5 flex-shrink-0">
            {root && focusId !== root.id && (
              <button
                onClick={() => focus(root.id)}
                className="px-3 h-10 bg-[#10B981] text-white rounded-xl font-bold text-sm hover:opacity-90"
                title="الجذر"
              >
                🏠
              </button>
            )}
            {focused?.father_id && (
              <button
                onClick={() => focus(focused.father_id!)}
                className="px-3 h-10 bg-[#357DED] text-white rounded-xl font-bold text-sm hover:opacity-90"
                title="الأب"
              >
                ↑
              </button>
            )}
          </div>
        </div>

        {/* مسار الأجداد — مدمج في نفس الشريط */}
        {focused && ancestors.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap text-xs px-1">
            <span className="text-[#94A3B8] text-[10px] font-bold ml-1">📍</span>
            {ancestors.map((a, i) => (
              <span key={a.id} className="flex items-center gap-1">
                <button
                  onClick={() => focus(a.id)}
                  className="px-2 py-0.5 rounded-md bg-[#F1F5F9] hover:bg-[#10B981] hover:text-white font-bold transition"
                >
                  {a.first_name}
                </button>
                {i < ancestors.length - 1 && <span className="text-[#CBD5E1]">›</span>}
              </span>
            ))}
            <span className="text-[#CBD5E1]">›</span>
            <span className="px-2 py-0.5 rounded-md bg-gradient-to-l from-[#10B981] to-[#059669] text-white font-black">
              {focused.first_name}
            </span>
          </div>
        )}
      </div>

      {focused && (
        <>
          {/* ═══════ بطاقة العضو المحوري ═══════ */}
          <FocusedMemberCard
            member={focused}
            generation={generation}
            childrenCount={directChildren.length}
            totalDescendants={totalDescendants}
            father={focused.father_id ? byId.get(focused.father_id) ?? null : null}
            canModerate={canModerate}
            onFatherClick={() => focused.father_id && focus(focused.father_id)}
          />

          {/* ═══════ الأشقاء ═══════ */}
          {siblings.length > 0 && (
            <Section
              title="الإخوة"
              count={siblings.length}
              icon="👥"
              color="#F59E0B"
              compact
            >
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                {siblings.map((s) => (
                  <NodeCard
                    key={s.id}
                    member={s}
                    onClick={() => focus(s.id)}
                    childrenCount={childrenByFather.get(s.id)?.length ?? 0}
                    compact
                  />
                ))}
              </div>
            </Section>
          )}

          {/* ═══════ الأبناء ═══════ */}
          {directChildren.length > 0 ? (
            <Section
              title="الأبناء"
              count={directChildren.length}
              icon="👨‍👦"
              color="#5438DC"
              compact
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                {directChildren.map((c) => (
                  <NodeCard
                    key={c.id}
                    member={c}
                    onClick={() => focus(c.id)}
                    childrenCount={childrenByFather.get(c.id)?.length ?? 0}
                    compact
                  />
                ))}
              </div>
            </Section>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 text-center">
              <div className="text-3xl mb-1">🍃</div>
              <p className="text-[#0F172A] font-bold text-sm">نهاية الفرع</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════ Focused Member Card ═══════════
function FocusedMemberCard({
  member,
  generation,
  childrenCount,
  totalDescendants,
  father,
  canModerate,
  onFatherClick,
}: {
  member: Member;
  generation: number;
  childrenCount: number;
  totalDescendants: number;
  father: Member | null;
  canModerate: boolean;
  onFatherClick: () => void;
}) {
  const roleColor = roleColorOf(member.role);
  void generation; // مخفي بناءً على طلب المستخدم
  void childrenCount;

  return (
    <div
      className="relative bg-white rounded-2xl border-2 shadow-md overflow-hidden"
      style={{ borderColor: `${roleColor}40` }}
    >
      {/* رأس البطاقة */}
      <div
        className="px-4 py-4 flex items-center gap-4"
        style={{
          background: `linear-gradient(135deg, ${roleColor}15, ${roleColor}05)`,
        }}
      >
        {/* الصورة (مكبّرة) */}
        <div className="relative flex-shrink-0">
          <div
            className="w-28 h-28 md:w-32 md:h-32 rounded-2xl flex items-center justify-center text-5xl font-black text-white overflow-hidden shadow-lg ring-4 ring-white"
            style={{
              background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc)`,
            }}
          >
            {member.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              member.full_name.charAt(0)
            )}
          </div>
        </div>

        {/* الاسم + بيانات */}
        <div className="flex-1 min-w-0">
          {father && (
            <button
              onClick={onFatherClick}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black transition hover:scale-105 mb-1.5"
              style={{ background: `${roleColor}25`, color: roleColor }}
            >
              <span className="opacity-80">الأب:</span>
              <span>↑</span>
              <span>{father.first_name}</span>
            </button>
          )}
          <h2 className="font-black text-[#0F172A] text-lg md:text-xl leading-tight">
            {member.full_name}
          </h2>
          <div className="flex flex-wrap items-center gap-1 mt-2">
            <LabelPill label="الذرّية" icon="🌳" value={String(totalDescendants)} color="#10B981" />
            {member.is_deceased ? (
              member.death_date && (
                <LabelPill label="الوفاة" icon="🕊️" value={formatDate(member.death_date)} color="#6B7B8D" />
              )
            ) : (
              <>
                {member.phone_number && (
                  <a
                    href={`tel:${member.phone_number}`}
                    className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#357DED]/15 text-[#357DED] hover:bg-[#357DED] hover:text-white transition"
                  >
                    <span className="opacity-80">الهاتف:</span>
                    <span>📞</span>
                    <span dir="ltr">{formatPhone(member.phone_number)}</span>
                  </a>
                )}
                {member.birth_date && (
                  <LabelPill label="الميلاد" icon="🎂" value={formatDate(member.birth_date)} color="#EC4899" />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* شريط الإجراءات السفلي (للمدراء) */}
      {canModerate && (
        <div className="flex border-t border-[#E2E8F0] divide-x divide-[#E2E8F0]">
          <Link
            href={`/admin/profiles/${member.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold text-[#357DED] hover:bg-[#EBF3FE] transition"
          >
            <span>📂</span>
            <span>فتح الملف الكامل</span>
          </Link>
          <div className="flex items-center justify-center px-1">
            <MemberFullEditClient
              key={member.id}
              member={member}
              canManageRoles={canModerate}
              variant="icon"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════ Label Pill (مسمى + أيقونة + قيمة) ═══════════
function LabelPill({
  label,
  icon,
  value,
  color,
}: {
  label: string;
  icon: string;
  value: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black"
      style={{ background: `${color}18`, color }}
    >
      <span className="opacity-80">{label}:</span>
      <span>{icon}</span>
      <span>{value}</span>
    </span>
  );
}

// ═══════════ Pill ═══════════
function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black"
      style={{ background: `${color}18`, color }}
    >
      {children}
    </span>
  );
}

// ═══════════ Section ═══════════
function Section({
  title,
  count,
  icon,
  color,
  compact,
  children,
}: {
  title: string;
  count: number;
  icon: string;
  color: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      <div
        className="px-3 py-1.5 flex items-center justify-between border-b border-[#E2E8F0]"
        style={{ background: `${color}08` }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <h3 className="font-black text-xs" style={{ color }}>
            {title}
          </h3>
          <span
            className="px-1.5 py-0 rounded-full text-[10px] font-black"
            style={{ background: color, color: "white" }}
          >
            {count}
          </span>
        </div>
      </div>
      <div className={compact ? "p-1.5" : "p-2"}>{children}</div>
    </div>
  );
}

// ═══════════ Node Card ═══════════
function NodeCard({
  member,
  onClick,
  childrenCount = 0,
  compact = false,
}: {
  member: Member;
  onClick: () => void;
  childrenCount?: number;
  compact?: boolean;
}) {
  const roleColor = roleColorOf(member.role);
  const dimmed = member.is_deceased;

  return (
    <button
      onClick={onClick}
      className={`group relative bg-white rounded-lg border border-[#E2E8F0] hover:border-[#10B981] hover:shadow-sm transition w-full overflow-hidden ${
        compact ? "p-1" : "p-1.5"
      }`}
    >
      <div className="flex flex-col items-center text-center gap-1">
        <div
          className={`rounded-lg flex items-center justify-center text-white font-black overflow-hidden flex-shrink-0 transition-transform group-hover:scale-110 ${
            compact ? "w-9 h-9 text-sm" : "w-10 h-10 text-base"
          } ${dimmed ? "grayscale opacity-70" : ""}`}
          style={{
            background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc)`,
          }}
        >
          {member.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            member.first_name.charAt(0)
          )}
        </div>
        <div className="w-full min-w-0">
          <div
            className={`font-black truncate ${compact ? "text-[10px]" : "text-[11px]"} ${
              dimmed ? "text-[#94A3B8]" : "text-[#0F172A]"
            }`}
          >
            {member.first_name}
          </div>
          {(member.is_deceased || childrenCount > 0) && (
            <div className="flex items-center justify-center gap-0.5 flex-wrap">
              {member.is_deceased && (
                <span className="text-[9px] text-[#6B7B8D]">🕊️</span>
              )}
              {childrenCount > 0 && (
                <span
                  className="px-1 py-0 rounded-full text-[9px] font-black"
                  style={{ background: `${roleColor}18`, color: roleColor }}
                >
                  +{childrenCount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ═══════════ Helpers ═══════════
function roleAr(role: string): string {
  switch (role) {
    case "owner":
    case "admin":
      return "مدير";
    case "monitor":
      return "مراقب";
    case "supervisor":
      return "مشرف";
    default:
      return "عضو";
  }
}

function roleColorOf(role: string): string {
  switch (role) {
    case "owner":
    case "admin":
      return "#5438DC";
    case "monitor":
      return "#10B981";
    case "supervisor":
      return "#F59E0B";
    case "member":
      return "#357DED";
    default:
      return "#6B7B8D";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ar", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
