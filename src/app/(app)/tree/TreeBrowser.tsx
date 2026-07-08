"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MemberFullEditClient } from "@/app/(app)/admin/profiles/[id]/MemberFullEditClient";
import { formatPhone } from "@/lib/format-phone";
import Link from "next/link";

type Member = {
  id: string;
  first_name: string;
  full_name: string;
  father_id: string | null;
  mother_id?: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
  is_deceased: boolean | null;
  is_married?: boolean | null;
  birth_date: string | null;
  death_date: string | null;
  phone_number: string | null;
  sort_order: number | null;
};

type WomanMember = {
  id: string;
  first_name: string;
  full_name: string;
  parent_id: string | null;
  mother_id: string | null;
  mother_name: string | null;
  husband_id: string | null;
  gender: string | null;
  is_deceased: boolean | null;
  is_married: boolean | null;
  birth_date: string | null;
  death_date: string | null;
  avatar_url: string | null;
  sort_order: number | null;
};

type ExternalSpouse = {
  id: string;
  woman_id: string;
  first_name: string;
  full_name: string | null;
  family_name: string | null;
  nationality: string | null;
  is_deceased: boolean | null;
  notes: string | null;
  husband_profile_id: string | null;
};

type WebRelative = {
  id: string;
  man_id: string;
  kind: "wife" | "daughter" | "son";
  name: string | null;
  child_profile_id: string | null;
  mother_rel_id: string | null;
  mother_name: string | null;
  linked_woman_id: string | null;
  parent_rel_id: string | null;
  parent_woman_id: string | null;
  is_deceased: boolean | null;
  is_married: boolean | null;
  husband_type: "family" | "external" | null;
  husband_profile_id: string | null;
  husband_name: string | null;
  husband_family: string | null;
  husband_nationality: string | null;
  husband_deceased: boolean | null;
  notes: string | null;
};

/** خيار زوجة للاختيار كأم (من الطبقة الويب أو من women_members) */
type WifeOption = { id: string; name: string; webId: string | null };

export function TreeBrowser({
  members,
  canModerate = false,
  canManageRoles = false,
  canEditMembers = false,
  women = [],
  externalSpouses = [],
  webRelatives = [],
}: {
  members: Member[];
  canModerate?: boolean;
  canManageRoles?: boolean;
  canEditMembers?: boolean;
  isHR?: boolean;
  women?: WomanMember[];
  externalSpouses?: ExternalSpouse[];
  webRelatives?: WebRelative[];
}) {
  const [search, setSearch] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [tab, setTab] = useState<"tree" | "relations">("tree");

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

  // ═══ فهارس العلاقات (نساء + أزواج خارجيين) ═══
  const womenById = useMemo(() => {
    const m = new Map<string, WomanMember>();
    women.forEach((w) => m.set(w.id, w));
    return m;
  }, [women]);

  const wivesByHusband = useMemo(() => {
    const m = new Map<string, WomanMember[]>();
    women.forEach((w) => {
      if (w.gender === "female" && w.husband_id) {
        const arr = m.get(w.husband_id) ?? [];
        arr.push(w);
        m.set(w.husband_id, arr);
      }
    });
    return m;
  }, [women]);

  const daughtersByFather = useMemo(() => {
    const m = new Map<string, WomanMember[]>();
    women.forEach((w) => {
      if (w.gender === "female" && w.parent_id) {
        const arr = m.get(w.parent_id) ?? [];
        arr.push(w);
        m.set(w.parent_id, arr);
      }
    });
    m.forEach((arr) => arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
    return m;
  }, [women]);

  const externalByWoman = useMemo(() => {
    const m = new Map<string, ExternalSpouse[]>();
    externalSpouses.forEach((e) => {
      const arr = m.get(e.woman_id) ?? [];
      arr.push(e);
      m.set(e.woman_id, arr);
    });
    return m;
  }, [externalSpouses]);

  // ═══ فهارس الطبقة الويب (web_relatives) ═══
  const webWivesByMan = useMemo(() => {
    const m = new Map<string, WebRelative[]>();
    webRelatives.forEach((r) => {
      if (r.kind === "wife") {
        const arr = m.get(r.man_id) ?? [];
        arr.push(r);
        m.set(r.man_id, arr);
      }
    });
    return m;
  }, [webRelatives]);

  const webDaughtersByMan = useMemo(() => {
    const m = new Map<string, WebRelative[]>();
    webRelatives.forEach((r) => {
      if (r.kind === "daughter") {
        const arr = m.get(r.man_id) ?? [];
        arr.push(r);
        m.set(r.man_id, arr);
      }
    });
    return m;
  }, [webRelatives]);

  const webSonMotherByChild = useMemo(() => {
    const m = new Map<string, WebRelative>();
    webRelatives.forEach((r) => {
      if (r.kind === "son" && r.child_profile_id) m.set(r.child_profile_id, r);
    });
    return m;
  }, [webRelatives]);

  // أبناء ذكور خاصون بالموقع (kind='son' بدون child_profile_id) مفهرسون حسب الأب
  const webSonsByMan = useMemo(() => {
    const m = new Map<string, WebRelative[]>();
    webRelatives.forEach((r) => {
      if (r.kind === "son" && !r.child_profile_id && r.man_id && r.name) {
        const arr = m.get(r.man_id) ?? [];
        arr.push(r);
        m.set(r.man_id, arr);
      }
    });
    return m;
  }, [webRelatives]);

  // أبناء الإناث المتزوجات (خاص بالموقع) — مفهرسة حسب الأم (web daughter أو women_members)
  const childrenByFemaleWeb = useMemo(() => {
    const m = new Map<string, WebRelative[]>();
    webRelatives.forEach((r) => {
      if (r.parent_rel_id) {
        const arr = m.get(r.parent_rel_id) ?? [];
        arr.push(r);
        m.set(r.parent_rel_id, arr);
      }
    });
    return m;
  }, [webRelatives]);

  const childrenByFemaleReal = useMemo(() => {
    const m = new Map<string, WebRelative[]>();
    webRelatives.forEach((r) => {
      if (r.parent_woman_id) {
        const arr = m.get(r.parent_woman_id) ?? [];
        arr.push(r);
        m.set(r.parent_woman_id, arr);
      }
    });
    return m;
  }, [webRelatives]);

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

  // ═══ علاقات العضو المحوري ═══
  // الأم: نبحث في نسخة الرجل داخل جدول النساء (نفس الـ id) ثم نحلّ الأم
  const mother = useMemo<WomanMember | null>(() => {
    if (!focused) return null;
    const motherId = womenById.get(focused.id)?.mother_id ?? focused.mother_id ?? null;
    if (!motherId) return null;
    return womenById.get(motherId) ?? null;
  }, [focused, womenById]);

  const wives = useMemo<WomanMember[]>(() => {
    if (!focused) return [];
    return wivesByHusband.get(focused.id) ?? [];
  }, [focused, wivesByHusband]);

  const daughters = useMemo<WomanMember[]>(() => {
    if (!focused) return [];
    return daughtersByFather.get(focused.id) ?? [];
  }, [focused, daughtersByFather]);

  // زوجات/بنات الطبقة الويب للعضو المحوري
  const webWives = useMemo<WebRelative[]>(() => {
    if (!focused) return [];
    return webWivesByMan.get(focused.id) ?? [];
  }, [focused, webWivesByMan]);

  const webDaughters = useMemo<WebRelative[]>(() => {
    if (!focused) return [];
    return webDaughtersByMan.get(focused.id) ?? [];
  }, [focused, webDaughtersByMan]);

  const webSons = useMemo<WebRelative[]>(() => {
    if (!focused) return [];
    return webSonsByMan.get(focused.id) ?? [];
  }, [focused, webSonsByMan]);

  // كل الزوجات (women_members + الويب) كخيارات لاختيار الأم
  const wifeOptions = useMemo<WifeOption[]>(() => {
    const opts: WifeOption[] = [];
    wives.forEach((w) => opts.push({ id: w.id, name: w.full_name, webId: null }));
    webWives.forEach((w) => opts.push({ id: w.id, name: w.name ?? "", webId: w.id }));
    return opts.filter((o) => o.name.trim());
  }, [wives, webWives]);

  // نساء العائلة (women_members إناث) — لاختيار زوجة من العائلة
  const familyWomen = useMemo<WomanMember[]>(
    () => women.filter((w) => w.gender === "female"),
    [women]
  );

  // أم العضو المحوري = إحدى زوجات أبيه (من التطبيق أو الويب)
  const myMotherOptions = useMemo<WifeOption[]>(() => {
    if (!focused?.father_id) return [];
    const opts: WifeOption[] = [];
    (wivesByHusband.get(focused.father_id) ?? []).forEach((w) =>
      opts.push({ id: w.id, name: w.full_name, webId: null })
    );
    (webWivesByMan.get(focused.father_id) ?? []).forEach((w) =>
      opts.push({ id: w.id, name: w.name ?? "", webId: w.id })
    );
    return opts.filter((o) => o.name.trim());
  }, [focused, wivesByHusband, webWivesByMan]);

  const myMotherLink = useMemo<WebRelative | null>(
    () => (focused ? webSonMotherByChild.get(focused.id) ?? null : null),
    [focused, webSonMotherByChild]
  );

  // أسماء الأمهات المرتبطة بأبناء/بنات هذا العضو (للتحذير قبل حذف الزوجة)
  const motherNamesInUse = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    if (!focused) return s;
    webRelatives.forEach((r) => {
      if (r.man_id === focused.id && r.mother_name) s.add(r.mother_name);
    });
    return s;
  }, [focused, webRelatives]);

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

  // اسم الزوج الداخلي (رجل من العائلة) إن وُجد
  function internalHusbandName(husbandId: string | null): string | null {
    if (!husbandId) return null;
    return byId.get(husbandId)?.full_name ?? womenById.get(husbandId)?.full_name ?? null;
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
            canManageRoles={canManageRoles}
            canEditMembers={canEditMembers}
            onFatherClick={() => focused.father_id && focus(focused.father_id)}
            siblings={siblings}
            siblingChildrenCount={(id) => childrenByFather.get(id)?.length ?? 0}
            onSiblingClick={focus}
            allMembers={members}
            directChildren={directChildren}
            onNavigate={focus}
            wives={wives}
            webWives={webWives}
            wifeOptions={wifeOptions}
            sonMotherByChild={webSonMotherByChild}
            motherNamesInUse={motherNamesInUse}
            familyWomen={familyWomen}
            myMotherOptions={myMotherOptions}
            myMotherLink={myMotherLink}
          />

          {/* ═══════ التابات (العلاقات — للمدراء فقط) ═══════ */}
          {canModerate && (
            <div className="flex gap-1.5 bg-white rounded-2xl border border-[#E2E8F0] p-1 shadow-sm">
              <TabButton
                active={tab === "tree"}
                onClick={() => setTab("tree")}
                icon="👨‍👦"
                label="الأبناء"
                count={directChildren.length}
              />
              <TabButton
                active={tab === "relations"}
                onClick={() => setTab("relations")}
                icon="👨‍👩‍👧"
                label="العلاقات"
                count={daughters.length + webDaughters.length}
                accent="#EC4899"
              />
            </div>
          )}

          {/* ═══════ محتوى التاب ═══════ */}
          {tab === "relations" && canModerate ? (
            <RelationsPanel
              focused={focused}
              mother={mother}
              sons={directChildren}
              webSons={webSons}
              daughters={daughters}
              webDaughters={webDaughters}
              wifeOptions={wifeOptions}
              allMembers={members}
              internalHusbandName={internalHusbandName}
              externalByWoman={externalByWoman}
              childrenByFemaleWeb={childrenByFemaleWeb}
              childrenByFemaleReal={childrenByFemaleReal}
              canEditMembers={canEditMembers}
              onFocus={focus}
              childrenCountOf={(id) => childrenByFather.get(id)?.length ?? 0}
            />
          ) : directChildren.length > 0 ? (
            <Section title="الأبناء" count={directChildren.length} icon="👨‍👦" color="#5438DC" compact>
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

// ═══════════ Tab Button ═══════════
function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  accent = "#10B981",
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count: number;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-sm font-black transition ${
        active ? "text-white shadow-sm" : "text-[#64748B] hover:bg-[#F1F5F9]"
      }`}
      style={active ? { background: accent } : undefined}
    >
      <span>{icon}</span>
      <span>{label}</span>
      <span
        className={`px-1.5 rounded-full text-[10px] font-black ${
          active ? "bg-white/25" : "bg-[#E2E8F0] text-[#64748B]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ═══════════ Relations Panel ═══════════
function RelationsPanel({
  focused,
  mother,
  sons,
  webSons,
  daughters,
  webDaughters,
  wifeOptions,
  allMembers,
  internalHusbandName,
  externalByWoman,
  childrenByFemaleWeb,
  childrenByFemaleReal,
  canEditMembers,
  onFocus,
  childrenCountOf,
}: {
  focused: Member;
  mother: WomanMember | null;
  sons: Member[];
  webSons: WebRelative[];
  daughters: WomanMember[];
  webDaughters: WebRelative[];
  wifeOptions: WifeOption[];
  allMembers: Member[];
  internalHusbandName: (husbandId: string | null) => string | null;
  externalByWoman: Map<string, ExternalSpouse[]>;
  childrenByFemaleWeb: Map<string, WebRelative[]>;
  childrenByFemaleReal: Map<string, WebRelative[]>;
  canEditMembers: boolean;
  onFocus: (id: string) => void;
  childrenCountOf: (id: string) => number;
}) {
  const [addingDaughter, setAddingDaughter] = useState(false);
  const [selDaughter, setSelDaughter] = useState<{ id: string; source: "app" | "web" } | null>(null);
  const totalDaughters = daughters.length + webDaughters.length;
  const nothing =
    !mother && sons.length === 0 && totalDaughters === 0 && !canEditMembers;

  return (
    <div className="space-y-2">
      <div className="bg-[#FDF2F8] border border-[#FBCFE8] rounded-xl px-3 py-1.5 text-[10px] font-bold text-[#9D174D] flex items-center justify-center gap-3">
        <span>🔒 للمدراء فقط</span>
        <span className="text-[#1D4ED8]">📱 يظهر بالتطبيق</span>
        <span>🌐 الموقع فقط</span>
      </div>

      {nothing && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 text-center">
          <div className="text-3xl mb-1">🔗</div>
          <p className="text-[#0F172A] font-bold text-sm">لا توجد علاقات مسجّلة لهذا العضو</p>
        </div>
      )}

      {/* الأبناء والبنات — عمودين جنب بعض */}
      <div className="grid grid-cols-2 gap-2 items-start">
        {/* الأبناء */}
        <Section title="الأبناء" count={sons.length + webSons.length} icon="👨‍👦" color="#5438DC" compact>
          {sons.length > 0 || webSons.length > 0 ? (
            <div className="grid grid-cols-2 gap-1">
              {sons.map((c) => (
                <NodeCard
                  key={c.id}
                  member={c}
                  onClick={() => onFocus(c.id)}
                  childrenCount={childrenCountOf(c.id)}
                  compact
                />
              ))}
              {webSons.map((s) => (
                <WebSonCard key={s.id} son={s} canEdit={canEditMembers} />
              ))}
            </div>
          ) : (
            <div className="text-center py-3">
              <div className="text-2xl mb-1">👦</div>
              <p className="text-[#94A3B8] text-xs font-bold">لا يوجد أبناء</p>
            </div>
          )}
        </Section>

        {/* البنات */}
        <Section
          title="البنات"
          count={totalDaughters}
          icon="👧"
          color="#EC4899"
          compact
          action={
            canEditMembers ? (
              <button
                onClick={() => setAddingDaughter(true)}
                className="text-[10px] font-black text-white bg-[#EC4899] px-2 py-0.5 rounded-full hover:opacity-90"
              >
                ➕
              </button>
            ) : undefined
          }
        >
          {totalDaughters === 0 ? (
            <div className="text-center py-3">
              <div className="text-2xl mb-1">👧</div>
              <p className="text-[#94A3B8] text-xs font-bold">
                لا توجد بنات{canEditMembers ? " — اضغط ➕" : ""}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* مربعات البنات */}
              <div className="grid grid-cols-2 gap-1">
                {daughters.map((d) => {
                  const hasHusband =
                    d.is_married ??
                    (!!internalHusbandName(d.husband_id) || (externalByWoman.get(d.id)?.length ?? 0) > 0);
                  return (
                    <DaughterCard
                      key={"a" + d.id}
                      name={d.first_name}
                      avatarUrl={d.avatar_url}
                      isDeceased={d.is_deceased}
                      source="app"
                      hasHusband={hasHusband}
                      childCount={childrenByFemaleReal.get(d.id)?.length ?? 0}
                      selected={selDaughter?.source === "app" && selDaughter.id === d.id}
                      onClick={() =>
                        setSelDaughter((s) =>
                          s?.source === "app" && s.id === d.id ? null : { id: d.id, source: "app" }
                        )
                      }
                    />
                  );
                })}
                {webDaughters.map((d) => (
                  <DaughterCard
                    key={"w" + d.id}
                    name={d.name ?? "؟"}
                    avatarUrl={null}
                    isDeceased={d.is_deceased}
                    source="web"
                    hasHusband={d.is_married ?? !!d.husband_type}
                    childCount={childrenByFemaleWeb.get(d.id)?.length ?? 0}
                    selected={selDaughter?.source === "web" && selDaughter.id === d.id}
                    onClick={() =>
                      setSelDaughter((s) =>
                        s?.source === "web" && s.id === d.id ? null : { id: d.id, source: "web" }
                      )
                    }
                  />
                ))}
              </div>

              {/* تفاصيل البنت المختارة */}
              {selDaughter?.source === "app" &&
                (() => {
                  const d = daughters.find((x) => x.id === selDaughter.id);
                  return d ? (
                    <DaughterRow
                      daughter={d}
                      internalHusbandName={internalHusbandName(d.husband_id)}
                      externals={externalByWoman.get(d.id) ?? []}
                      canEdit={canEditMembers}
                      childrenOfHer={childrenByFemaleReal.get(d.id) ?? []}
                      allMembers={allMembers}
                      wifeOptions={wifeOptions}
                    />
                  ) : null;
                })()}
              {selDaughter?.source === "web" &&
                (() => {
                  const d = webDaughters.find((x) => x.id === selDaughter.id);
                  return d ? (
                    <WebDaughterRow
                      daughter={d}
                      manId={focused.id}
                      wifeOptions={wifeOptions}
                      allMembers={allMembers}
                      canEdit={canEditMembers}
                      childrenOfHer={childrenByFemaleWeb.get(d.id) ?? []}
                    />
                  ) : null;
                })()}
              {!selDaughter && (
                <p className="text-center text-[10px] text-[#94A3B8] font-bold pt-1">
                  👆 اضغط على بنت لعرض التفاصيل وتعديل الزوج والأبناء
                </p>
              )}
            </div>
          )}
        </Section>
      </div>

      {addingDaughter && (
        <DaughterModal
          manId={focused.id}
          daughter={null}
          wifeOptions={wifeOptions}
          allMembers={allMembers}
          onClose={() => setAddingDaughter(false)}
        />
      )}

      <div className="text-[10px] text-[#94A3B8] text-center pt-1">{focused.full_name}</div>
    </div>
  );
}

// صف بنت (طبقة ويب) — اسم + أم + زوج (عائلة/خارجي) + تعديل/حذف
function WebDaughterRow({
  daughter,
  manId,
  wifeOptions,
  allMembers,
  canEdit,
  childrenOfHer,
}: {
  daughter: WebRelative;
  manId: string;
  wifeOptions: WifeOption[];
  allMembers: Member[];
  canEdit: boolean;
  childrenOfHer: WebRelative[];
}) {
  const [editing, setEditing] = useState(false);
  const isMarried = daughter.is_married ?? !!daughter.husband_type;
  const husbandName =
    daughter.husband_type === "family"
      ? allMembers.find((m) => m.id === daughter.husband_profile_id)?.full_name ?? "—"
      : daughter.husband_type === "external"
      ? [daughter.husband_name, daughter.husband_family, daughter.husband_nationality]
          .filter(Boolean)
          .join(" ")
      : null;

  return (
    <div className="bg-white border border-[#F3D9E6] rounded-xl p-2.5">
      <div className="flex items-center gap-3">
        <Avatar name={daughter.name ?? "؟"} url={null} color="#EC4899" deceased={daughter.is_deceased} />
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-[#0F172A] truncate">
            {daughter.name}
          </div>
          <div className="flex items-center gap-1 flex-wrap mt-0.5">
            <SourceBadge kind="web" />
            <StatusPill deceased={daughter.is_deceased} />
          </div>
          {daughter.mother_name && (
            <div className="text-[11px] text-[#DB2777] font-bold mt-0.5">👩 الأم: {daughter.mother_name}</div>
          )}
          {!isMarried ? (
            <div className="text-[11px] text-[#64748B] font-bold mt-0.5">🙍‍♀️ غير متزوجة</div>
          ) : husbandName ? (
            <div
              className={`text-[11px] font-bold mt-0.5 ${
                daughter.husband_type === "family" ? "text-[#357DED]" : "text-[#9D174D]"
              }`}
            >
              {daughter.husband_type === "family" ? "💍 الزوج: " : "🌍 الزوج (خارج العائلة): "}
              {husbandName}
              {daughter.husband_type === "family" && <span className="text-[#94A3B8]"> (من العائلة)</span>}
              {daughter.husband_deceased ? " 🕊️" : ""}
            </div>
          ) : (
            <div className="text-[11px] text-[#94A3B8] font-semibold mt-0.5">💍 متزوجة — لا يوجد زوج مسجّل</div>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="flex-shrink-0 h-8 px-2.5 rounded-lg text-[11px] font-black bg-[#FCE7F3] text-[#9D174D] hover:bg-[#FBCFE8]"
          >
            ✏️ تعديل
          </button>
        )}
      </div>
      {daughter.notes && (
        <div className="text-[11px] text-[#64748B] mt-1.5 pr-14 whitespace-pre-wrap">📝 {daughter.notes}</div>
      )}
      {/* أبناؤها — فقط إذا متزوجة، مرتبطون بزوجها */}
      {isMarried && (
        <FemaleChildren
          parentRelId={daughter.id}
          parentWomanId={null}
          parentName={daughter.name ?? ""}
          childrenOfHer={childrenOfHer}
          canEdit={canEdit}
          husbandLabel={husbandName}
          husbandProfileId={daughter.husband_type === "family" ? daughter.husband_profile_id : null}
        />
      )}
      {editing && (
        <DaughterModal
          manId={manId}
          daughter={daughter}
          wifeOptions={wifeOptions}
          allMembers={allMembers}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ═══════════ أبناء الأنثى المتزوجة (خاص بالموقع) ═══════════
function FemaleChildren({
  parentRelId,
  parentWomanId,
  parentName,
  childrenOfHer,
  canEdit,
  husbandLabel,
  husbandProfileId,
}: {
  parentRelId: string | null;
  parentWomanId: string | null;
  parentName: string;
  childrenOfHer: WebRelative[];
  canEdit: boolean;
  husbandLabel: string | null;
  husbandProfileId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"son" | "daughter">("son");
  const [deceased, setDeceased] = useState(false);
  const [linkToApp, setLinkToApp] = useState(false);
  const [childPhone, setChildPhone] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hasHusband = !!husbandLabel;
  // الربط بالتطبيق ممكن لأي أنثى متزوجة (الابن يصير عضواً حقيقياً — تحت أبيه إن كان من العائلة، أو بدون أب)
  const canLinkToApp = hasHusband;
  if (childrenOfHer.length === 0 && !canEdit) return null;

  function resetForm() {
    setName("");
    setGender("son");
    setDeceased(false);
    setLinkToApp(false);
    setChildPhone("");
    setEditId(null);
    setErr(null);
  }

  async function saveChild() {
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);

    if (linkToApp && !editId) {
      // 📱 ربط بالتطبيق — الطفل يصير عضواً حقيقياً (تحت أبيه إن كان من العائلة، وإلا بدون أب)
      const underFather = husbandProfileId ? `تحت أبيه «${husbandLabel}»` : "كعضو حقيقي (أبوه خارج العائلة — بدون أب بالشجرة)";
      if (!confirm(`🔗 ربط «${name.trim()}» بالتطبيق ${underFather}؟ راح يظهر بالآيفون/الأندرويد.`)) {
        setBusy(false);
        return;
      }
      const { error } = await supabase.from("profiles").insert({
        first_name: name.trim(),
        full_name: `${name.trim()} ${husbandLabel ?? ""}`.trim(),
        father_id: husbandProfileId ?? null,
        role: "member",
        status: "active",
        gender: gender === "daughter" ? "female" : "male",
        is_deceased: deceased,
        phone_number: childPhone.trim() || null,
      });
      setBusy(false);
      if (error) return setErr("خطأ: " + error.message);
      resetForm();
      router.refresh();
      return;
    }

    const payload = {
      kind: gender,
      name: name.trim(),
      is_deceased: deceased,
      parent_rel_id: parentRelId,
      parent_woman_id: parentWomanId,
      man_id: null,
    };
    const { error } = editId
      ? await supabase.from("web_relatives").update(payload).eq("id", editId)
      : await supabase.from("web_relatives").insert(payload);
    setBusy(false);
    if (error) return setErr("خطأ: " + error.message);
    resetForm();
    router.refresh();
  }

  async function removeChild(id: string, nm: string | null) {
    if (!confirm(`حذف «${nm}»؟`)) return;
    setBusy(true);
    const { error } = await supabase.from("web_relatives").delete().eq("id", id);
    setBusy(false);
    if (error) return setErr("خطأ: " + error.message);
    if (editId === id) resetForm();
    router.refresh();
  }

  return (
    <div className="mt-1.5 border-t border-[#F3D9E6] pt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] font-black text-[#0EA5E9] hover:underline"
      >
        👶 أبناؤها {childrenOfHer.length > 0 ? `(${childrenOfHer.length})` : ""} {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-1.5 space-y-1.5">
          {/* الأب = زوج الأنثى */}
          {hasHusband ? (
            <div className="text-[10px] font-black text-[#0369A1] bg-[#E0F2FE] rounded-lg px-2 py-1">
              👨 الأب (زوجها): {husbandLabel}
            </div>
          ) : (
            <div className="text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] rounded-lg px-2 py-1 flex items-start gap-1">
              <span>⚠️</span>
              <span>لازم تسجّل زوجاً لها أولاً — الأبناء يرتبطون بزوج الأنثى.</span>
            </div>
          )}
          {childrenOfHer.map((c) => (
            <div key={c.id} className="flex items-center gap-2 bg-[#F0F9FF] rounded-lg px-2 py-1.5">
              <span className="text-sm">{c.kind === "daughter" ? "👧" : "👦"}</span>
              <span className="flex-1 min-w-0 font-bold text-xs text-[#0F172A] truncate">
                {c.name}
                {c.is_deceased && <span className="mr-1">🕊️</span>}
              </span>
              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(c.id);
                      setName(c.name ?? "");
                      setGender(c.kind === "daughter" ? "daughter" : "son");
                      setDeceased(c.is_deceased ?? false);
                    }}
                    className="text-[10px] font-black text-[#0EA5E9]"
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => removeChild(c.id, c.name)}
                    className="text-[10px] font-black text-[#EF4444]"
                  >
                    حذف
                  </button>
                </>
              )}
            </div>
          ))}

          {canEdit && hasHusband && (
            <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg p-2 space-y-1.5">
              <div className="text-[10px] font-black text-[#0369A1]">
                {editId ? "تعديل ابن" : `➕ إضافة ابن لـ ${parentName} من ${husbandLabel}`}
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم"
                className="w-full px-2.5 py-2 bg-white rounded-lg outline-none focus:ring-2 focus:ring-[#0EA5E9] text-xs"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setGender("son")}
                  className={`flex-1 h-8 rounded-lg text-[11px] font-black ${gender === "son" ? "bg-[#357DED] text-white" : "bg-white text-[#64748B]"}`}
                >
                  👦 ابن
                </button>
                <button
                  type="button"
                  onClick={() => setGender("daughter")}
                  className={`flex-1 h-8 rounded-lg text-[11px] font-black ${gender === "daughter" ? "bg-[#EC4899] text-white" : "bg-white text-[#64748B]"}`}
                >
                  👧 بنت
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-[#0F172A]">
                <input type="checkbox" checked={deceased} onChange={(e) => setDeceased(e.target.checked)} className="w-3.5 h-3.5 accent-[#0EA5E9]" />
                🕊️ متوفى
              </label>
              {/* ربط بالتطبيق — عند الإضافة (عضو حقيقي يقدر يدخل بالهاتف) */}
              {canLinkToApp && !editId ? (
                <>
                  <label
                    className={`flex items-center gap-2 cursor-pointer text-[10px] font-black p-1.5 rounded-lg border ${
                      linkToApp ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]" : "bg-[#FDF2F8] border-[#FBCFE8] text-[#9D174D]"
                    }`}
                  >
                    <input type="checkbox" checked={linkToApp} onChange={(e) => setLinkToApp(e.target.checked)} className="w-3.5 h-3.5 accent-[#1D4ED8]" />
                    {linkToApp
                      ? husbandProfileId
                        ? "📱 عضو حقيقي (تحت أبيه بالشجرة)"
                        : "📱 عضو حقيقي (أبوه خارجي — بدون أب بالشجرة)"
                      : "🌐 خاص بالموقع فقط"}
                  </label>
                  {linkToApp && (
                    <div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={childPhone}
                        onChange={(e) => setChildPhone(e.target.value)}
                        placeholder="📞 +965... (هاتف الدخول — اختياري)"
                        dir="ltr"
                        className="w-full px-2.5 py-2 bg-white rounded-lg outline-none focus:ring-2 focus:ring-[#0EA5E9] text-xs"
                      />
                      <span className="text-[9px] text-[#94A3B8] font-bold">يمكّنه من الدخول للتطبيق والموقع برقمه</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[9px] text-[#94A3B8] font-bold">🌐 خاص بالموقع</p>
              )}
              <div className="flex gap-1.5">
                {editId && (
                  <button type="button" onClick={resetForm} className="h-8 px-3 rounded-lg bg-white text-[#64748B] text-[11px] font-black">
                    إلغاء
                  </button>
                )}
                <button
                  type="button"
                  onClick={saveChild}
                  disabled={busy || !name.trim()}
                  className="flex-1 h-8 rounded-lg bg-[#0EA5E9] text-white text-[11px] font-black disabled:opacity-50"
                >
                  {busy ? "..." : editId ? "حفظ" : "إضافة"}
                </button>
              </div>
              {err && <p className="text-[10px] text-red-600 font-bold">{err}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════ Daughter add/edit/delete modal (طبقة ويب) ═══════════
function DaughterModal({
  manId,
  daughter,
  wifeOptions,
  allMembers,
  onClose,
}: {
  manId: string;
  daughter: WebRelative | null;
  wifeOptions: WifeOption[];
  allMembers: Member[];
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(daughter?.name ?? "");
  const [isDeceased, setIsDeceased] = useState(daughter?.is_deceased ?? false);
  const [motherName, setMotherName] = useState(daughter?.mother_name ?? "");
  const [husbandType, setHusbandType] = useState<"" | "family" | "external">(
    daughter?.husband_type ?? ""
  );
  const [husbandProfileId, setHusbandProfileId] = useState<string | null>(
    daughter?.husband_profile_id ?? null
  );
  const [husbandSearch, setHusbandSearch] = useState("");
  const [husbandName, setHusbandName] = useState(daughter?.husband_name ?? "");
  const [husbandFamily, setHusbandFamily] = useState(daughter?.husband_family ?? "");
  const [husbandNationality, setHusbandNationality] = useState(daughter?.husband_nationality ?? "");
  const [husbandDeceased, setHusbandDeceased] = useState(daughter?.husband_deceased ?? false);
  const [notes, setNotes] = useState(daughter?.notes ?? "");
  const [isMarried, setIsMarried] = useState(
    daughter ? daughter.is_married ?? !!daughter.husband_type : false
  );
  const [linkToApp, setLinkToApp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [husbandDeceasedOnly, setHusbandDeceasedOnly] = useState(false);
  const husbandMatches = useMemo(() => {
    if (!husbandSearch.trim()) return [];
    const q = husbandSearch.toLowerCase();
    return allMembers
      .filter((m) => m.full_name.toLowerCase().includes(q) && (!husbandDeceasedOnly || m.is_deceased))
      .slice(0, 12);
  }, [husbandSearch, allMembers, husbandDeceasedOnly]);
  const husbandChosen = husbandProfileId
    ? allMembers.find((m) => m.id === husbandProfileId) ?? null
    : null;
  const husbandChosenName = husbandChosen?.full_name ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("اسم البنت مطلوب");
      return;
    }
    setBusy(true);
    setError(null);

    if (linkToApp) {
      // 📱 ربط بالتطبيق — women_members (بنت حقيقية بشجرة النساء)
      if (
        !confirm(
          "🔗 ربط البنت بالتطبيق؟ راح تظهر بتطبيق الآيفون/الأندرويد. (بيانات الزوج/الأم تبقى خاصة بالموقع وتُضاف بعد الإنشاء.)"
        )
      ) {
        setBusy(false);
        return;
      }
      const { error: insErr } = await supabase.from("women_members").insert({
        first_name: name.trim(),
        full_name: name.trim(),
        parent_id: manId,
        gender: "female",
        is_deceased: isDeceased,
      });
      if (insErr) {
        setBusy(false);
        setError("خطأ: " + insErr.message);
        return;
      }
      if (daughter) await supabase.from("web_relatives").delete().eq("id", daughter.id);
      setBusy(false);
      onClose();
      router.refresh();
      return;
    }

    const married = isMarried;
    const payload: Record<string, any> = {
      man_id: manId,
      kind: "daughter",
      name: name.trim(),
      is_deceased: isDeceased,
      is_married: married,
      mother_name: motherName.trim() || null,
      husband_type: married ? husbandType || null : null,
      husband_profile_id: married && husbandType === "family" ? husbandProfileId : null,
      husband_name: married && husbandType === "external" ? husbandName.trim() || null : null,
      husband_family: married && husbandType === "external" ? husbandFamily.trim() || null : null,
      husband_nationality: married && husbandType === "external" ? husbandNationality.trim() || null : null,
      husband_deceased: married && husbandType === "external" ? husbandDeceased : false,
      notes: notes.trim() || null,
    };

    const { error: err } = daughter
      ? await supabase.from("web_relatives").update(payload).eq("id", daughter.id)
      : await supabase.from("web_relatives").insert(payload);

    if (err) {
      setBusy(false);
      setError("خطأ: " + err.message);
      return;
    }
    setBusy(false);
    onClose();
    router.refresh();
  }

  async function remove() {
    if (!daughter) return;
    if (!confirm(`حذف البنت «${daughter.name}»؟`)) return;
    setBusy(true);
    const { error: err } = await supabase.from("web_relatives").delete().eq("id", daughter.id);
    if (err) {
      setBusy(false);
      setError("خطأ: " + err.message);
      return;
    }
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[92vh] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
          <h3 className="font-black text-[#0F172A]">{daughter ? "تعديل بنت" : "➕ إضافة بنت"}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          <label className="block">
            <span className="text-[11px] font-black text-[#64748B] mb-1 block">اسم البنت *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم البنت"
              autoFocus
              className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#EC4899] text-sm font-semibold"
            />
          </label>

          <AppLinkToggle value={linkToApp} onChange={setLinkToApp} />

          {/* الأم — خاص بالموقع فقط */}
          {!linkToApp && (
            <label className="block">
              <span className="text-[11px] font-black text-[#64748B] mb-1 block">الأم (اختياري)</span>
              <select
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#EC4899] text-sm font-bold"
              >
                <option value="">— اختر الأم —</option>
                {wifeOptions.map((w) => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
              {wifeOptions.length === 0 && (
                <span className="text-[10px] text-[#94A3B8] font-bold">أضف زوجة أولاً لتظهر هنا كأم</span>
              )}
            </label>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={isDeceased}
              onChange={(e) => setIsDeceased(e.target.checked)}
              className="w-4 h-4 accent-[#EC4899]"
            />
            <span className="text-sm font-bold text-[#0F172A]">🕊️ متوفاة</span>
          </label>

          {/* الحالة الاجتماعية */}
          {!linkToApp && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setIsMarried(false)}
                className={`flex-1 h-9 rounded-lg text-xs font-black transition ${
                  !isMarried ? "bg-[#64748B] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                }`}
              >
                🙍‍♀️ غير متزوجة
              </button>
              <button
                type="button"
                onClick={() => setIsMarried(true)}
                className={`flex-1 h-9 rounded-lg text-xs font-black transition ${
                  isMarried ? "bg-[#EC4899] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                }`}
              >
                💍 متزوجة
              </button>
            </div>
          )}

          {/* الزوج — خاص بالموقع فقط، فقط إذا متزوجة */}
          {!linkToApp && isMarried && (
          <div className="border-t border-[#F1F5F9] pt-3">
            <span className="text-[11px] font-black text-[#64748B] mb-1.5 block">الزوج</span>
            <div className="flex gap-1.5 mb-2">
              {([
                { v: "", l: "بدون" },
                { v: "family", l: "من العائلة" },
                { v: "external", l: "خارج العائلة" },
              ] as const).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setHusbandType(o.v)}
                  className={`flex-1 h-9 rounded-lg text-xs font-black transition ${
                    husbandType === o.v ? "bg-[#EC4899] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>

            {husbandType === "family" && (
              <div className="relative">
                {husbandChosenName ? (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-[#EFF6FF] rounded-xl">
                    <span className="font-bold text-sm text-[#0F172A] truncate">
                      {husbandChosenName}
                      {husbandChosen?.is_deceased && <span className="mr-1 text-[11px] text-[#6B7B8D]">🕊️ متوفى</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHusbandProfileId(null)}
                      className="text-[#EF4444] text-xs font-bold flex-shrink-0 mr-2"
                    >
                      تغيير
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={husbandSearch}
                      onChange={(e) => setHusbandSearch(e.target.value)}
                      placeholder="ابحث عن الزوج من العائلة..."
                      className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED] text-sm"
                    />
                    <label className="flex items-center gap-1.5 cursor-pointer select-none mt-1 text-[10px] font-black text-[#6B7B8D]">
                      <input type="checkbox" checked={husbandDeceasedOnly} onChange={(e) => setHusbandDeceasedOnly(e.target.checked)} className="w-3.5 h-3.5 accent-[#6B7B8D]" />
                      🕊️ عرض المتوفّين فقط
                    </label>
                    {husbandMatches.length > 0 && (
                      <div className="absolute top-full mt-1 right-0 left-0 bg-white rounded-xl border border-[#E2E8F0] z-20 max-h-48 overflow-y-auto shadow-xl">
                        {husbandMatches.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setHusbandProfileId(m.id);
                              setHusbandSearch("");
                              if (m.is_deceased) setHusbandDeceased(true);
                            }}
                            className="w-full text-right px-3 py-2 hover:bg-[#F1F5F9] border-b border-[#E2E8F0] last:border-0 text-sm font-bold text-[#0F172A] flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{m.full_name}</span>
                            {m.is_deceased && <span className="text-[10px] text-[#6B7B8D] flex-shrink-0">🕊️ متوفى</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {husbandType === "external" && (
              <div className="space-y-2">
                <input
                  value={husbandName}
                  onChange={(e) => setHusbandName(e.target.value)}
                  placeholder="اسم الزوج"
                  className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#EC4899] text-sm"
                />
                <input
                  value={husbandFamily}
                  onChange={(e) => setHusbandFamily(e.target.value)}
                  placeholder="العائلة / القبيلة"
                  className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#EC4899] text-sm"
                />
                <input
                  value={husbandNationality}
                  onChange={(e) => setHusbandNationality(e.target.value)}
                  placeholder="الجنسية"
                  className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#EC4899] text-sm"
                />
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={husbandDeceased}
                    onChange={(e) => setHusbandDeceased(e.target.checked)}
                    className="w-4 h-4 accent-[#EC4899]"
                  />
                  <span className="text-sm font-bold text-[#0F172A]">🕊️ الزوج متوفى</span>
                </label>
              </div>
            )}
          </div>
          )}

          {!linkToApp && (
            <label className="block">
              <span className="text-[11px] font-black text-[#64748B] mb-1 block">ملاحظات</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="أي معلومات إضافية..."
                className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#EC4899] text-sm resize-none"
              />
            </label>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 text-xs font-bold rounded-xl p-2.5">{error}</div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#E2E8F0] px-4 py-3 flex items-center gap-2">
          {daughter && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="h-11 px-4 rounded-xl bg-red-50 text-red-600 font-black text-sm hover:bg-red-100 disabled:opacity-50"
            >
              🗑️ حذف
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex-1 h-11 rounded-xl bg-[#EC4899] text-white font-black text-sm hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "جارٍ الحفظ..." : daughter ? "حفظ" : "إضافة"}
          </button>
        </div>
      </form>
    </div>
  );
}

// صف بنت — يعرض حالة الزواج + إدارة الزوج الخارجي
function DaughterRow({
  daughter,
  internalHusbandName,
  externals,
  canEdit = false,
  childrenOfHer = [],
  allMembers = [],
  wifeOptions = [],
}: {
  daughter: WomanMember;
  internalHusbandName: string | null;
  externals: ExternalSpouse[];
  canEdit?: boolean;
  childrenOfHer?: WebRelative[];
  allMembers?: Member[];
  wifeOptions?: WifeOption[];
}) {
  const ext = externals[0] ?? null;
  const [editing, setEditing] = useState(false);
  // زوج من العائلة مسجّل بالويب (external_spouses.husband_profile_id)
  const extFamilyName = ext?.husband_profile_id
    ? allMembers.find((m) => m.id === ext.husband_profile_id)?.full_name ?? "—"
    : null;
  const husbandLabel =
    internalHusbandName ??
    extFamilyName ??
    (ext ? [ext.full_name || ext.first_name, ext.family_name].filter(Boolean).join(" ") : null);
  const married = daughter.is_married ?? !!husbandLabel;

  return (
    <div className="bg-white border border-[#F3D9E6] rounded-xl p-2.5">
      <div className="flex items-center gap-3">
        <Avatar name={daughter.first_name} url={daughter.avatar_url} color="#EC4899" deceased={daughter.is_deceased} />
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-[#0F172A] truncate">
            {daughter.full_name}
          </div>
          <div className="flex items-center gap-1 flex-wrap mt-0.5">
            <SourceBadge kind="app" />
            <StatusPill deceased={daughter.is_deceased} />
          </div>
          {daughter.mother_name && (
            <div className="text-[11px] text-[#DB2777] font-bold mt-0.5">👩 الأم: {daughter.mother_name}</div>
          )}
          {/* حالة الزواج */}
          {!married ? (
            <div className="text-[11px] text-[#64748B] font-bold mt-0.5">🙍‍♀️ غير متزوجة</div>
          ) : internalHusbandName ? (
            <div className="text-[11px] text-[#357DED] font-bold mt-0.5">
              💍 الزوج: {internalHusbandName} <span className="text-[#94A3B8]">(من العائلة · التطبيق)</span>
            </div>
          ) : extFamilyName ? (
            <div className="text-[11px] text-[#357DED] font-bold mt-0.5">
              💍 الزوج: {extFamilyName} <span className="text-[#94A3B8]">(من العائلة · الموقع)</span>
              {ext?.is_deceased ? " 🕊️" : ""}
            </div>
          ) : ext ? (
            <div className="text-[11px] text-[#9D174D] font-bold mt-0.5">
              🌍 الزوج (خارج العائلة): {ext.full_name || ext.first_name}
              {ext.family_name ? ` ${ext.family_name}` : ""}
              {ext.nationality ? ` — ${ext.nationality}` : ""}
              {ext.is_deceased ? " 🕊️" : ""}
            </div>
          ) : (
            <div className="text-[11px] text-[#94A3B8] font-semibold mt-0.5">💍 متزوجة — لا يوجد زوج مسجّل</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="h-8 px-2.5 rounded-lg text-[11px] font-black bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]"
              title="تعديل كامل (سجل حقيقي)"
            >
              ✏️
            </button>
          )}
          {/* إدارة الزوج — فقط إذا متزوجة وليس لها زوج من التطبيق */}
          {married && !internalHusbandName && (
            <ExternalHusbandButton
              womanId={daughter.id}
              womanName={daughter.full_name}
              existing={ext}
              allMembers={allMembers}
            />
          )}
        </div>
      </div>
      {ext?.notes && married && (
        <div className="text-[11px] text-[#64748B] mt-1.5 pr-14 whitespace-pre-wrap">
          📝 {ext.notes}
        </div>
      )}
      {/* أبناؤها — فقط إذا متزوجة ولها زوج، مرتبطون بزوجها */}
      {married && husbandLabel && (
        <FemaleChildren
          parentRelId={null}
          parentWomanId={daughter.id}
          parentName={daughter.full_name}
          childrenOfHer={childrenOfHer}
          canEdit={canEdit}
          husbandLabel={husbandLabel}
          husbandProfileId={internalHusbandName ? daughter.husband_id : ext?.husband_profile_id ?? null}
        />
      )}
      {editing && (
        <WomanMemberEditModal
          woman={daughter}
          role="daughter"
          motherOptions={wifeOptions}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ═══════════ External Husband Modal ═══════════
function ExternalHusbandButton({
  womanId,
  womanName,
  existing,
  allMembers,
}: {
  womanId: string;
  womanName: string;
  existing: ExternalSpouse | null;
  allMembers: Member[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [source, setSource] = useState<"family" | "external">(
    existing?.husband_profile_id ? "family" : "external"
  );
  const [husbandProfileId, setHusbandProfileId] = useState<string | null>(existing?.husband_profile_id ?? null);
  const [familySearch, setFamilySearch] = useState("");
  const [firstName, setFirstName] = useState(existing?.first_name ?? "");
  const [familyName, setFamilyName] = useState(existing?.family_name ?? "");
  const [nationality, setNationality] = useState(existing?.nationality ?? "");
  const [isDeceased, setIsDeceased] = useState(existing?.is_deceased ?? false);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [linkToApp, setLinkToApp] = useState(false);

  const [familyDeceasedOnly, setFamilyDeceasedOnly] = useState(false);
  const familyMatches = useMemo(() => {
    if (!familySearch.trim()) return [];
    const q = familySearch.toLowerCase();
    return allMembers
      .filter((m) => m.full_name.toLowerCase().includes(q) && (!familyDeceasedOnly || m.is_deceased))
      .slice(0, 12);
  }, [familySearch, allMembers, familyDeceasedOnly]);
  const chosenFamily = husbandProfileId
    ? allMembers.find((m) => m.id === husbandProfileId) ?? null
    : null;
  const chosenFamilyName = chosenFamily?.full_name ?? null;

  function openModal() {
    setSource(existing?.husband_profile_id ? "family" : "external");
    setHusbandProfileId(existing?.husband_profile_id ?? null);
    setFamilySearch("");
    setFirstName(existing?.first_name ?? "");
    setFamilyName(existing?.family_name ?? "");
    setNationality(existing?.nationality ?? "");
    setIsDeceased(existing?.is_deceased ?? false);
    setNotes(existing?.notes ?? "");
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    // 📱 ربط بالتطبيق — زوج من العائلة يُسجَّل على سجل المرأة بالتطبيق (women_members.husband_id)
    if (linkToApp && source === "family" && husbandProfileId) {
      if (
        !confirm(
          "🔗 ربط الزوج بالتطبيق؟ راح تظهر المرأة متزوجة به بشجرة النساء بالآيفون/الأندرويد."
        )
      )
        return;
      setBusy(true);
      setError(null);
      const { error: upErr } = await supabase
        .from("women_members")
        .update({ husband_id: husbandProfileId })
        .eq("id", womanId);
      if (upErr) {
        setBusy(false);
        setError("خطأ: " + upErr.message);
        return;
      }
      if (existing) await supabase.from("external_spouses").delete().eq("id", existing.id);
      setBusy(false);
      setOpen(false);
      router.refresh();
      return;
    }

    let payload: Record<string, any>;
    if (source === "family") {
      if (!husbandProfileId || !chosenFamilyName) {
        setError("اختر الزوج من العائلة");
        return;
      }
      payload = {
        woman_id: womanId,
        husband_profile_id: husbandProfileId,
        first_name: chosenFamilyName,
        full_name: chosenFamilyName,
        family_name: null,
        nationality: null,
        is_deceased: isDeceased,
        notes: notes.trim() || null,
      };
    } else {
      if (!firstName.trim()) {
        setError("الاسم مطلوب");
        return;
      }
      const full = [firstName.trim(), familyName.trim()].filter(Boolean).join(" ");
      payload = {
        woman_id: womanId,
        husband_profile_id: null,
        first_name: firstName.trim(),
        full_name: full || firstName.trim(),
        family_name: familyName.trim() || null,
        nationality: nationality.trim() || null,
        is_deceased: isDeceased,
        notes: notes.trim() || null,
      };
    }
    setBusy(true);
    setError(null);
    const { error: err } = existing
      ? await supabase.from("external_spouses").update(payload).eq("id", existing.id)
      : await supabase.from("external_spouses").insert(payload);
    if (err) {
      setBusy(false);
      setError("خطأ: " + err.message);
      return;
    }
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!existing) return;
    if (!confirm("حذف الزوج المسجّل؟")) return;
    setBusy(true);
    const { error: err } = await supabase.from("external_spouses").delete().eq("id", existing.id);
    if (err) {
      setBusy(false);
      setError("خطأ: " + err.message);
      return;
    }
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={openModal}
        className={`flex-shrink-0 h-8 px-2.5 rounded-lg text-[11px] font-black transition ${
          existing
            ? "bg-[#FCE7F3] text-[#9D174D] hover:bg-[#FBCFE8]"
            : "bg-[#EC4899] text-white hover:opacity-90"
        }`}
        title={existing ? "تعديل الزوج" : "إضافة زوج"}
      >
        {existing ? "✏️ الزوج" : "➕ الزوج"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <form
            onSubmit={submit}
            className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[92vh] overflow-y-auto"
          >
            {/* header */}
            <div className="sticky top-0 z-10 bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#0F172A]">زوج البنت</h3>
                <p className="text-[11px] text-[#64748B]">لـ: {womanName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* اختيار المصدر */}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setSource("family")}
                  className={`flex-1 h-9 rounded-lg text-xs font-black transition ${
                    source === "family" ? "bg-[#357DED] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  👪 من العائلة
                </button>
                <button
                  type="button"
                  onClick={() => setSource("external")}
                  className={`flex-1 h-9 rounded-lg text-xs font-black transition ${
                    source === "external" ? "bg-[#EC4899] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  🌍 خارج العائلة
                </button>
              </div>

              {source === "family" ? (
                <div>
                  <span className="text-[11px] font-black text-[#64748B] mb-1 block">اختر الزوج من العائلة *</span>
                  {chosenFamilyName ? (
                    <div className="flex items-center justify-between px-3 py-2.5 bg-[#EFF6FF] rounded-xl">
                      <span className="font-bold text-sm text-[#0F172A] truncate">
                        👪 {chosenFamilyName}
                        {chosenFamily?.is_deceased && <span className="mr-1 text-[11px] text-[#6B7B8D]">🕊️ متوفى</span>}
                      </span>
                      <button type="button" onClick={() => setHusbandProfileId(null)} className="text-[#EF4444] text-xs font-bold flex-shrink-0 mr-2">
                        تغيير
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        value={familySearch}
                        onChange={(e) => setFamilySearch(e.target.value)}
                        placeholder="ابحث عن الزوج بالاسم..."
                        className="ext-input"
                        autoFocus
                      />
                      <label className="flex items-center gap-1.5 cursor-pointer select-none mt-1 text-[10px] font-black text-[#6B7B8D]">
                        <input type="checkbox" checked={familyDeceasedOnly} onChange={(e) => setFamilyDeceasedOnly(e.target.checked)} className="w-3.5 h-3.5 accent-[#6B7B8D]" />
                        🕊️ عرض المتوفّين فقط
                      </label>
                      {familyMatches.length > 0 && (
                        <div className="absolute top-full mt-1 right-0 left-0 bg-white rounded-xl border border-[#E2E8F0] z-20 max-h-48 overflow-y-auto shadow-xl">
                          {familyMatches.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => { setHusbandProfileId(m.id); setFamilySearch(""); if (m.is_deceased) setIsDeceased(true); }}
                              className="w-full text-right px-3 py-2 hover:bg-[#F1F5F9] border-b border-[#E2E8F0] last:border-0 text-sm font-bold text-[#0F172A] flex items-center justify-between gap-2"
                            >
                              <span className="truncate">{m.full_name}</span>
                              {m.is_deceased && <span className="text-[10px] text-[#6B7B8D] flex-shrink-0">🕊️ متوفى</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Field label="الاسم *">
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="اسم الزوج" className="ext-input" />
                  </Field>
                  <Field label="اسم العائلة / القبيلة">
                    <input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="مثال: العتيبي" className="ext-input" />
                  </Field>
                  <Field label="الجنسية">
                    <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="مثال: كويتي" className="ext-input" />
                  </Field>
                </>
              )}

              <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                <input type="checkbox" checked={isDeceased} onChange={(e) => setIsDeceased(e.target.checked)} className="w-4 h-4 accent-[#EC4899]" />
                <span className="text-sm font-bold text-[#0F172A]">🕊️ متوفى</span>
              </label>
              <Field label="ملاحظات">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="أي معلومات إضافية..." className="ext-input resize-none" />
              </Field>

              {source === "family" && husbandProfileId ? (
                <AppLinkToggle value={linkToApp} onChange={setLinkToApp} />
              ) : (
                <p className="text-[10px] text-[#94A3B8] font-bold">🌐 خاص بالموقع — الربط بالتطبيق يحتاج زوجاً من العائلة</p>
              )}
              {error && (
                <div className="bg-red-50 text-red-700 text-xs font-bold rounded-xl p-2.5">{error}</div>
              )}
            </div>

            {/* footer */}
            <div className="sticky bottom-0 bg-white border-t border-[#E2E8F0] px-4 py-3 flex items-center gap-2">
              {existing && (
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  className="h-11 px-4 rounded-xl bg-red-50 text-red-600 font-black text-sm hover:bg-red-100 disabled:opacity-50"
                >
                  🗑️ حذف
                </button>
              )}
              <button
                type="submit"
                disabled={busy}
                className="flex-1 h-11 rounded-xl bg-[#EC4899] text-white font-black text-sm hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "جارٍ الحفظ..." : existing ? "حفظ" : "إضافة"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        :global(.ext-input) {
          width: 100%;
          padding: 0.6rem 0.75rem;
          background: #f1f5f9;
          border-radius: 0.75rem;
          outline: none;
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
        }
        :global(.ext-input:focus) {
          box-shadow: 0 0 0 2px #ec489955;
        }
      `}</style>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-black text-[#64748B] mb-1 block">{label}</span>
      {children}
    </label>
  );
}

// صورة دائرية صغيرة موحّدة
function Avatar({
  name,
  url,
  color,
  deceased,
}: {
  name: string;
  url: string | null;
  color: string;
  deceased?: boolean | null;
}) {
  return (
    <div
      className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-black overflow-hidden flex-shrink-0 ${
        deceased ? "grayscale opacity-70" : ""
      }`}
      style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        name.charAt(0)
      )}
    </div>
  );
}

// مفتاح: ربط بالتطبيق (📱 women_members) أو خاص بالموقع (🌐 web_relatives)
function AppLinkToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className={`flex items-center gap-2 cursor-pointer select-none p-2.5 rounded-xl border transition ${
        value ? "bg-[#EFF6FF] border-[#BFDBFE]" : "bg-[#FDF2F8] border-[#FBCFE8]"
      }`}
    >
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#1D4ED8]"
      />
      <span className={`flex-1 text-[11px] font-black ${value ? "text-[#1D4ED8]" : "text-[#9D174D]"}`}>
        {value
          ? "📱 ربط بالتطبيق — راح يظهر بالآيفون/الأندرويد"
          : "🌐 خاص بالموقع فقط — لا يظهر بالتطبيق"}
      </span>
    </label>
  );
}

// شارة الحالة: نشطة / متوفاة
function StatusPill({ deceased }: { deceased: boolean | null }) {
  return deceased ? (
    <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-black bg-[#6B7B8D]/15 text-[#6B7B8D]">
      🕊️ متوفاة
    </span>
  ) : (
    <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-black bg-[#10B981]/15 text-[#059669]">
      ✅ على قيد الحياة
    </span>
  );
}

// شارة مصدر السجل: من التطبيق (بيانات مشتركة) أو من الموقع (خاص)
function SourceBadge({ kind }: { kind: "app" | "web" }) {
  return kind === "app" ? (
    <span
      className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0 rounded-full text-[9px] font-black bg-[#EFF6FF] text-[#1D4ED8]"
      title="سجل من التطبيق — التعديل/الحذف يظهر بالآيفون والأندرويد"
    >
      📱 من التطبيق
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0 rounded-full text-[9px] font-black bg-[#FCE7F3] text-[#9D174D]"
      title="خاص بالموقع — لا يظهر بالتطبيق"
    >
      🌐 من الموقع
    </span>
  );
}

// مربّع ابن خاص بالموقع (🌐)
function WebSonCard({ son, canEdit }: { son: WebRelative; canEdit: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`حذف «${son.name}»؟`)) return;
    setBusy(true);
    await supabase.from("web_relatives").delete().eq("id", son.id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="relative bg-white rounded-lg border border-[#E2E8F0] p-1 overflow-hidden">
      <span className="absolute top-0.5 right-0.5 text-[9px]" title="خاص بالموقع">🌐</span>
      {canEdit && (
        <button
          onClick={remove}
          disabled={busy}
          className="absolute top-0.5 left-0.5 text-[9px] text-[#EF4444] font-black disabled:opacity-50"
          title="حذف"
        >
          ✕
        </button>
      )}
      <div className="flex flex-col items-center text-center gap-1">
        <div
          className={`w-16 h-16 rounded-xl flex items-center justify-center text-white font-black text-xl ${son.is_deceased ? "grayscale opacity-70" : ""}`}
          style={{ background: "linear-gradient(135deg, #357DED, #5438DCcc)" }}
        >
          {(son.name ?? "؟").charAt(0)}
        </div>
        <div className="w-full min-w-0">
          <div className={`font-black truncate text-sm ${son.is_deceased ? "text-[#94A3B8]" : "text-[#0F172A]"}`}>
            {son.name}
          </div>
          <div className="flex items-center justify-center gap-0.5 flex-wrap">
            {son.is_deceased && <span className="text-[9px]">🕊️</span>}
            {son.is_married && <span className="text-[9px]" title="متزوج">💍</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// مربّع بنت مختصر (شبكة) — يُفتح تفاصيله عند الضغط
function DaughterCard({
  name,
  avatarUrl,
  isDeceased,
  source,
  hasHusband,
  childCount,
  selected,
  onClick,
}: {
  name: string;
  avatarUrl: string | null;
  isDeceased: boolean | null;
  source: "app" | "web";
  hasHusband: boolean;
  childCount: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative bg-white rounded-lg border p-1 transition w-full overflow-hidden ${
        selected ? "border-[#EC4899] ring-2 ring-[#EC4899]/40" : "border-[#E2E8F0] hover:border-[#EC4899]"
      }`}
    >
      <span
        className="absolute top-0.5 right-0.5 text-[9px]"
        title={source === "app" ? "من التطبيق" : "من الموقع"}
      >
        {source === "app" ? "📱" : "🌐"}
      </span>
      <div className="flex flex-col items-center text-center gap-1">
        <div
          className={`w-16 h-16 rounded-xl flex items-center justify-center text-white font-black overflow-hidden flex-shrink-0 text-xl ${
            isDeceased ? "grayscale opacity-70" : ""
          }`}
          style={{ background: "linear-gradient(135deg, #EC4899, #DB2777cc)" }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            name.charAt(0)
          )}
        </div>
        <div className="w-full min-w-0">
          <div className={`font-black truncate text-sm ${isDeceased ? "text-[#94A3B8]" : "text-[#0F172A]"}`}>
            {name}
          </div>
          <div className="flex items-center justify-center gap-0.5 flex-wrap">
            {isDeceased && <span className="text-[9px]">🕊️</span>}
            {hasHusband && <span className="text-[9px]" title="لها زوج">💍</span>}
            {childCount > 0 && (
              <span className="px-1 rounded-full text-[9px] font-black bg-[#0EA5E9]/15 text-[#0369A1]">
                👶{childCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
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
  canManageRoles,
  canEditMembers,
  onFatherClick,
  siblings,
  siblingChildrenCount,
  onSiblingClick,
  allMembers,
  directChildren,
  onNavigate,
  wives,
  webWives,
  wifeOptions,
  sonMotherByChild,
  motherNamesInUse,
  familyWomen,
  myMotherOptions,
  myMotherLink,
}: {
  member: Member;
  generation: number;
  childrenCount: number;
  totalDescendants: number;
  father: Member | null;
  canModerate: boolean;
  canManageRoles: boolean;
  canEditMembers: boolean;
  onFatherClick: () => void;
  siblings: Member[];
  siblingChildrenCount: (id: string) => number;
  onSiblingClick: (id: string) => void;
  allMembers: Member[];
  directChildren: Member[];
  onNavigate: (id: string) => void;
  wives: WomanMember[];
  webWives: WebRelative[];
  wifeOptions: WifeOption[];
  sonMotherByChild: Map<string, WebRelative>;
  motherNamesInUse: Set<string>;
  familyWomen: WomanMember[];
  myMotherOptions: WifeOption[];
  myMotherLink: WebRelative | null;
}) {
  const [siblingsOpen, setSiblingsOpen] = useState(false);
  const roleColor = roleColorOf(member.role);
  void generation; // مخفي بناءً على طلب المستخدم
  void childrenCount;

  return (
    <div
      className="relative bg-white rounded-2xl border-2 shadow-md overflow-hidden"
      style={{ borderColor: `${roleColor}40` }}
    >
      {/* شريط علوي: ملف+تعديل (يسار) — الإخوة (يمين) */}
      {(canModerate || siblings.length > 0) && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          {/* يسار: أزرار للمدراء */}
          {canModerate ? (
            <div className="flex items-center gap-1.5">
              <Link
                href={`/admin/profiles/${member.id}`}
                className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] text-[#475569] flex items-center justify-center text-base hover:bg-[#357DED] hover:text-white hover:border-[#357DED] transition"
                title="فتح الملف الكامل"
              >
                📂
              </Link>
              <MemberFullEditClient
                key={member.id}
                member={member}
                canManageRoles={canManageRoles}
                variant="icon"
                allMembers={allMembers}
                childrenList={directChildren}
                onNavigate={onNavigate}
                wifeOptions={wifeOptions}
                sonMotherByChild={sonMotherByChild}
                motherOptions={myMotherOptions}
                motherLink={myMotherLink}
              />
            </div>
          ) : (
            <span />
          )}

          {/* يمين: زر الإخوة */}
          {siblings.length > 0 && (
            <button
              onClick={() => setSiblingsOpen(!siblingsOpen)}
              className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-black transition ${
                siblingsOpen
                  ? "bg-[#F59E0B] text-white"
                  : "bg-white border border-[#FCD34D] text-[#B45309] hover:bg-[#FFFBEB]"
              }`}
              title="عرض الإخوة"
            >
              <span>👥</span>
              <span>الإخوة</span>
              <span
                className={`px-1.5 rounded-full text-[10px] font-black ${
                  siblingsOpen ? "bg-white/30" : "bg-[#F59E0B] text-white"
                }`}
              >
                {siblings.length}
              </span>
              <span className={`transition-transform ${siblingsOpen ? "rotate-180" : ""}`}>▾</span>
            </button>
          )}
        </div>
      )}

      {/* قائمة الإخوة المنسدلة */}
      {siblingsOpen && siblings.length > 0 && (
        <div className="px-3 py-2.5 bg-[#FFFBEB] border-b border-[#FDE68A]">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
            {siblings.map((s) => (
              <NodeCard
                key={s.id}
                member={s}
                onClick={() => {
                  onSiblingClick(s.id);
                  setSiblingsOpen(false);
                }}
                childrenCount={siblingChildrenCount(s.id)}
                compact
              />
            ))}
          </div>
        </div>
      )}

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
                <LabelPill label="الوفاة" value={formatDate(member.death_date)} color="#6B7B8D" />
              )
            ) : (
              <>
                {member.phone_number && (
                  <a
                    href={`tel:${member.phone_number}`}
                    className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#357DED]/15 text-[#357DED] hover:bg-[#357DED] hover:text-white transition"
                  >
                    <span className="opacity-80">الهاتف:</span>
                    <span dir="ltr">{formatPhone(member.phone_number)}</span>
                  </a>
                )}
                {member.birth_date && (
                  <LabelPill label="الميلاد" value={formatDate(member.birth_date)} color="#EC4899" />
                )}
              </>
            )}
          </div>

          {/* الزوجات — بجانب اسم العضو (تظهر فقط إذا متزوج) */}
          {member.is_married === false ? (
            <div className="mt-2 text-[10px] font-black text-[#64748B]">🙍‍♂️ غير متزوج</div>
          ) : (
            (wives.length > 0 || canEditMembers) && (
              <WivesInline
                husbandId={member.id}
                wives={wives}
                webWives={webWives}
                canEdit={canEditMembers}
                motherNamesInUse={motherNamesInUse}
                familyWomen={familyWomen}
              />
            )
          )}

          {/* أم العضو — اختيار من زوجات أبيه */}
          {canEditMembers && member.father_id && (
            <MemberMotherSelect
              childId={member.id}
              fatherId={member.father_id}
              options={myMotherOptions}
              existing={myMotherLink}
            />
          )}
        </div>
      </div>

    </div>
  );
}

// ═══════════ Wives inline (عند اسم العضو) ═══════════
// يعرض زوجات women_members (من التطبيق — للقراءة) + زوجات الطبقة الويب (قابلة للتعديل)
function WivesInline({
  husbandId,
  wives,
  webWives,
  canEdit,
  motherNamesInUse,
  familyWomen,
}: {
  husbandId: string;
  wives: WomanMember[];
  webWives: WebRelative[];
  canEdit: boolean;
  motherNamesInUse: Set<string>;
  familyWomen: WomanMember[];
}) {
  const [editing, setEditing] = useState<WebRelative | "new" | null>(null);
  const [editingReal, setEditingReal] = useState<WomanMember | null>(null);
  const nothing = wives.length === 0 && webWives.length === 0;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      <span className="text-[10px] font-black text-[#DB2777] opacity-80">💍 الزوجات:</span>
      {nothing && !canEdit && <span className="text-[10px] text-[#94A3B8] font-bold">—</span>}

      {/* زوجات التطبيق (women_members) — سجل حقيقي، تعديل كامل */}
      {wives.map((w) =>
        canEdit ? (
          <button
            key={w.id}
            onClick={() => setEditingReal(w)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] transition"
            title="تعديل كامل (سجل من التطبيق)"
          >
            <span>📱</span>
            <span>{w.full_name}</span>
            {w.is_deceased && <span>🕊️</span>}
            <span className="opacity-60">✎</span>
          </button>
        ) : (
          <span
            key={w.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#F1F5F9] text-[#475569]"
            title="من شجرة النساء (التطبيق)"
          >
            <span>📱</span>
            <span>{w.full_name}</span>
            {w.is_deceased && <span>🕊️</span>}
          </span>
        )
      )}

      {/* زوجات الطبقة الويب — قابلة للتعديل */}
      {webWives.map((w) =>
        canEdit ? (
          <button
            key={w.id}
            onClick={() => setEditing(w)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FCE7F3] text-[#9D174D] hover:bg-[#FBCFE8] transition"
            title="تعديل / حذف (خاص بالموقع)"
          >
            <span>🌐</span>
            <span>{w.name}</span>
            {w.name && motherNamesInUse.has(w.name) && <span title="مرتبطة كأم لأبناء">👶</span>}
            {w.is_deceased && <span>🕊️</span>}
            <span className="opacity-60">✎</span>
          </button>
        ) : (
          <span
            key={w.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FCE7F3] text-[#9D174D]"
          >
            <span>🌐</span>
            <span>{w.name}</span>
            {w.is_deceased && <span>🕊️</span>}
          </span>
        )
      )}

      {canEdit && (
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#EC4899] text-white hover:opacity-90 transition"
        >
          ➕ زوجة
        </button>
      )}

      {editing && (
        <WifeModal
          husbandId={husbandId}
          wife={editing === "new" ? null : editing}
          isMother={editing !== "new" && !!editing.name && motherNamesInUse.has(editing.name)}
          familyWomen={familyWomen}
          onClose={() => setEditing(null)}
        />
      )}
      {editingReal && (
        <WomanMemberEditModal woman={editingReal} role="wife" onClose={() => setEditingReal(null)} />
      )}
    </div>
  );
}

// ═══════════ Wife add/edit/delete modal (طبقة ويب — web_relatives) ═══════════
function WifeModal({
  husbandId,
  wife,
  isMother,
  familyWomen,
  onClose,
}: {
  husbandId: string;
  wife: WebRelative | null;
  isMother: boolean;
  familyWomen: WomanMember[];
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [source, setSource] = useState<"manual" | "family">(
    wife?.linked_woman_id ? "family" : "manual"
  );
  const [name, setName] = useState(wife?.name ?? "");
  const [linkedWomanId, setLinkedWomanId] = useState<string | null>(wife?.linked_woman_id ?? null);
  const [familySearch, setFamilySearch] = useState("");
  const [isDeceased, setIsDeceased] = useState(wife?.is_deceased ?? false);
  const [linkToApp, setLinkToApp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const familyMatches = useMemo(() => {
    if (!familySearch.trim()) return [];
    const q = familySearch.toLowerCase();
    return familyWomen.filter((w) => w.full_name.toLowerCase().includes(q)).slice(0, 8);
  }, [familySearch, familyWomen]);
  const chosenFamilyName = linkedWomanId
    ? familyWomen.find((w) => w.id === linkedWomanId)?.full_name ?? name
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("اسم الزوجة مطلوب");
      return;
    }
    setBusy(true);
    setError(null);

    if (linkToApp) {
      // 📱 ربط بالتطبيق — women_members (يظهر بشجرة النساء بالتطبيق)
      if (
        !confirm(
          "🔗 ربط الزوجة بالتطبيق؟ راح تظهر بتطبيق الآيفون/الأندرويد (شجرة النساء)."
        )
      ) {
        setBusy(false);
        return;
      }
      let err;
      if (source === "family" && linkedWomanId) {
        ({ error: err } = await supabase
          .from("women_members")
          .update({ husband_id: husbandId })
          .eq("id", linkedWomanId));
      } else {
        ({ error: err } = await supabase.from("women_members").insert({
          first_name: name.trim(),
          full_name: name.trim(),
          husband_id: husbandId,
          gender: "female",
          is_deceased: isDeceased,
        }));
      }
      if (err) {
        setBusy(false);
        setError("خطأ: " + err.message);
        return;
      }
      // لو كانت مسجّلة بالويب ونُقلت للتطبيق → احذف صف الويب
      if (wife) await supabase.from("web_relatives").delete().eq("id", wife.id);
    } else {
      // 🌐 خاص بالموقع — web_relatives
      const payload = {
        man_id: husbandId,
        kind: "wife",
        name: name.trim(),
        linked_woman_id: source === "family" ? linkedWomanId : null,
        is_deceased: isDeceased,
      };
      const { error: err } = wife
        ? await supabase.from("web_relatives").update(payload).eq("id", wife.id)
        : await supabase.from("web_relatives").insert(payload);
      if (err) {
        setBusy(false);
        setError("خطأ: " + err.message);
        return;
      }
    }
    setBusy(false);
    onClose();
    router.refresh();
  }

  async function remove() {
    if (!wife) return;
    const msg = isMother
      ? `«${wife.name}» مرتبطة كأم لأبناء/بنات. حذف الزوجة لن يحذف الأبناء وسيبقى اسم الأم مسجّلاً عندهم. متابعة الحذف؟`
      : `حذف الزوجة «${wife.name}»؟`;
    if (!confirm(msg)) return;
    setBusy(true);
    const { error: err } = await supabase.from("web_relatives").delete().eq("id", wife.id);
    if (err) {
      setBusy(false);
      setError("خطأ: " + err.message);
      return;
    }
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-sm max-h-[92vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
          <h3 className="font-black text-[#0F172A]">
            {wife ? "تعديل زوجة" : "➕ إضافة زوجة"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* مصدر الزوجة: يدوي أو من العائلة */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => { setSource("manual"); setLinkedWomanId(null); }}
              className={`flex-1 h-9 rounded-lg text-xs font-black transition ${
                source === "manual" ? "bg-[#EC4899] text-white" : "bg-[#F1F5F9] text-[#64748B]"
              }`}
            >
              ✍️ اسم يدوي
            </button>
            <button
              type="button"
              onClick={() => setSource("family")}
              className={`flex-1 h-9 rounded-lg text-xs font-black transition ${
                source === "family" ? "bg-[#EC4899] text-white" : "bg-[#F1F5F9] text-[#64748B]"
              }`}
            >
              👪 من العائلة
            </button>
          </div>

          {source === "manual" ? (
            <label className="block">
              <span className="text-[11px] font-black text-[#64748B] mb-1 block">اسم الزوجة *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: مريم محمد العتيبي"
                autoFocus
                className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#EC4899] text-sm font-semibold"
              />
            </label>
          ) : (
            <div>
              <span className="text-[11px] font-black text-[#64748B] mb-1 block">اختر الزوجة من العائلة *</span>
              {chosenFamilyName ? (
                <div className="flex items-center justify-between px-3 py-2.5 bg-[#FDF2F8] rounded-xl">
                  <span className="font-bold text-sm text-[#0F172A] truncate">👪 {chosenFamilyName}</span>
                  <button
                    type="button"
                    onClick={() => { setLinkedWomanId(null); setName(""); }}
                    className="text-[#EF4444] text-xs font-bold flex-shrink-0 mr-2"
                  >
                    تغيير
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={familySearch}
                    onChange={(e) => setFamilySearch(e.target.value)}
                    placeholder="ابحث باسم المرأة من العائلة..."
                    className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#EC4899] text-sm"
                  />
                  {familyMatches.length > 0 && (
                    <div className="absolute top-full mt-1 right-0 left-0 bg-white rounded-xl border border-[#E2E8F0] z-20 max-h-48 overflow-y-auto shadow-xl">
                      {familyMatches.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            setLinkedWomanId(w.id);
                            setName(w.full_name);
                            setIsDeceased(w.is_deceased ?? false);
                            setFamilySearch("");
                          }}
                          className="w-full text-right px-3 py-2 hover:bg-[#F1F5F9] border-b border-[#E2E8F0] last:border-0 text-sm font-bold text-[#0F172A]"
                        >
                          {w.full_name}
                        </button>
                      ))}
                    </div>
                  )}
                  {familySearch.trim() && familyMatches.length === 0 && (
                    <p className="text-[10px] text-[#94A3B8] font-bold mt-1">ما في نتائج مطابقة</p>
                  )}
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={isDeceased}
              onChange={(e) => setIsDeceased(e.target.checked)}
              className="w-4 h-4 accent-[#EC4899]"
            />
            <span className="text-sm font-bold text-[#0F172A]">🕊️ متوفاة</span>
          </label>
          {isMother && (
            <div className="bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E] text-[11px] font-bold rounded-xl p-2.5 flex items-start gap-1.5">
              <span>👶</span>
              <span>هذه الزوجة مرتبطة كأم لأبناء/بنات. عند الحذف يبقى اسمها مسجّلاً عند الأبناء.</span>
            </div>
          )}
          <AppLinkToggle value={linkToApp} onChange={setLinkToApp} />
          {error && (
            <div className="bg-red-50 text-red-700 text-xs font-bold rounded-xl p-2.5">{error}</div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#E2E8F0] px-4 py-3 flex items-center gap-2">
          {wife && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="h-11 px-4 rounded-xl bg-red-50 text-red-600 font-black text-sm hover:bg-red-100 disabled:opacity-50"
            >
              🗑️ حذف
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex-1 h-11 rounded-xl bg-[#EC4899] text-white font-black text-sm hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "جارٍ الحفظ..." : wife ? "حفظ" : "إضافة"}
          </button>
        </div>
      </form>
    </div>
  );
}

// اختيار أم العضو من زوجات أبيه (يكتب على web_relatives — خاص بالموقع)
function MemberMotherSelect({
  childId,
  fatherId,
  options,
  existing,
}: {
  childId: string;
  fatherId: string;
  options: WifeOption[];
  existing: WebRelative | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const current = existing?.mother_name ?? "";

  async function change(value: string) {
    setBusy(true);
    if (!value) {
      if (existing) await supabase.from("web_relatives").delete().eq("id", existing.id);
    } else if (existing) {
      await supabase.from("web_relatives").update({ mother_name: value }).eq("id", existing.id);
    } else {
      await supabase.from("web_relatives").insert({
        man_id: fatherId,
        kind: "son",
        child_profile_id: childId,
        mother_name: value,
      });
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-2 flex items-center gap-1 flex-wrap">
      <span className="text-[10px] font-black text-[#DB2777] opacity-80">👩 الأم:</span>
      {options.length === 0 ? (
        <span className="text-[10px] text-[#94A3B8] font-bold">سجّل زوجات لأبيه أولاً</span>
      ) : (
        <select
          value={current}
          disabled={busy}
          onChange={(e) => change(e.target.value)}
          className="px-2 py-1 bg-[#FCE7F3] rounded-lg outline-none focus:ring-2 focus:ring-[#EC4899] text-[10px] font-black text-[#9D174D] disabled:opacity-50"
        >
          <option value="">— بدون —</option>
          {current && !options.some((o) => o.name === current) && (
            <option value={current}>{current}</option>
          )}
          {options.map((o) => (
            <option key={o.id} value={o.name}>{o.name}</option>
          ))}
        </select>
      )}
      <span className="text-[9px] text-[#94A3B8] font-bold">🌐</span>
    </div>
  );
}

// ═══════════ Woman member full editor (سجل حقيقي — women_members، يعكس بالتطبيق) ═══════════
function WomanMemberEditModal({
  woman,
  role,
  onClose,
  motherOptions = [],
}: {
  woman: WomanMember;
  role: "wife" | "mother" | "daughter";
  onClose: () => void;
  motherOptions?: WifeOption[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(woman.first_name ?? "");
  const [fullName, setFullName] = useState(woman.full_name ?? "");
  const [birthDate, setBirthDate] = useState(woman.birth_date ?? "");
  const [deathDate, setDeathDate] = useState(woman.death_date ?? "");
  const [isDeceased, setIsDeceased] = useState(woman.is_deceased ?? false);
  const [isMarried, setIsMarried] = useState(woman.is_married ?? !!woman.husband_id);
  const [motherName, setMotherName] = useState(woman.mother_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(woman.avatar_url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLabel = role === "wife" ? "الزوجة" : role === "mother" ? "الأم" : "البنت";

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("الرجاء اختيار صورة");
    if (file.size > 5 * 1024 * 1024) return setError("حجم الصورة أكبر من 5MB");
    setBusy(true);
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `women/${woman.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      setBusy(false);
      return setError("خطأ في الرفع: " + upErr.message);
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(pub.publicUrl);
    setBusy(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("الاسم مطلوب");
      return;
    }
    if (
      !confirm(
        `⚠️ «${fullName.trim()}» سجل من التطبيق (آيفون/أندرويد). الحفظ سيظهر بالتطبيق أيضاً. متابعة؟`
      )
    )
      return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from("women_members")
      .update({
        first_name: firstName.trim() || fullName.trim(),
        full_name: fullName.trim(),
        birth_date: birthDate || null,
        death_date: isDeceased ? deathDate || null : null,
        is_deceased: isDeceased,
        is_married: isMarried,
        mother_name: motherName.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq("id", woman.id);
    setBusy(false);
    if (err) return setError("خطأ: " + err.message);
    onClose();
    router.refresh();
  }

  async function remove() {
    if (
      !confirm(
        `🗑️ حذف «${woman.full_name}»؟\n⚠️ هذا سجل من التطبيق (آيفون/أندرويد) — الحذف يظهر بالتطبيق أيضاً ولا يمكن التراجع.`
      )
    )
      return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("women_members").delete().eq("id", woman.id);
    setBusy(false);
    if (err) return setError("خطأ: " + err.message);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <form
        onSubmit={save}
        className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[92vh] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
          <h3 className="font-black text-[#0F172A]">✏️ تعديل {roleLabel} <span className="text-[10px] font-bold text-[#1D4ED8]">📱 من التطبيق</span></h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* الصورة */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white shadow-md bg-gradient-to-br from-[#DB2777] to-[#EC4899] text-white flex items-center justify-center text-3xl font-black disabled:opacity-50"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (fullName || "؟").charAt(0)
              )}
            </button>
            <span className="text-[10px] text-[#94A3B8] font-bold">📷 انقر لتغيير الصورة</span>
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
          </div>

          <label className="block">
            <span className="text-[11px] font-black text-[#64748B] mb-1 block">الاسم الكامل *</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#DB2777] text-sm font-semibold"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-black text-[#64748B] mb-1 block">الاسم الأول</span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#DB2777] text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-black text-[#64748B] mb-1 block">تاريخ الميلاد</span>
            <input
              type="date"
              value={birthDate || ""}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#DB2777] text-sm"
            />
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={isDeceased}
              onChange={(e) => setIsDeceased(e.target.checked)}
              className="w-4 h-4 accent-[#DB2777]"
            />
            <span className="text-sm font-bold text-[#0F172A]">🕊️ متوفاة</span>
          </label>
          {isDeceased && (
            <label className="block">
              <span className="text-[11px] font-black text-[#64748B] mb-1 block">تاريخ الوفاة</span>
              <input
                type="date"
                value={deathDate || ""}
                onChange={(e) => setDeathDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#DB2777] text-sm"
              />
            </label>
          )}
          {/* الحالة الاجتماعية — للبنت */}
          {role === "daughter" && (
            <div>
              <span className="text-[11px] font-black text-[#64748B] mb-1 block">الحالة الاجتماعية</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsMarried(false)}
                  className={`flex-1 h-9 rounded-lg text-xs font-black ${!isMarried ? "bg-[#64748B] text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}
                >
                  🙍‍♀️ غير متزوجة
                </button>
                <button
                  type="button"
                  onClick={() => setIsMarried(true)}
                  className={`flex-1 h-9 rounded-lg text-xs font-black ${isMarried ? "bg-[#EC4899] text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}
                >
                  💍 متزوجة
                </button>
              </div>
            </div>
          )}
          {/* الأم — اختيار من زوجات أبيها */}
          {role === "daughter" && (
            <label className="block">
              <span className="text-[11px] font-black text-[#64748B] mb-1 block">الأم (اختياري)</span>
              <select
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#DB2777] text-sm font-bold"
              >
                <option value="">— اختر الأم —</option>
                {motherName && !motherOptions.some((o) => o.name === motherName) && (
                  <option value={motherName}>{motherName}</option>
                )}
                {motherOptions.map((o) => (
                  <option key={o.id} value={o.name}>{o.name}</option>
                ))}
              </select>
              {motherOptions.length === 0 && (
                <span className="text-[10px] text-[#94A3B8] font-bold">سجّل زوجات لأبيها أولاً</span>
              )}
            </label>
          )}
          <p className="text-[10px] text-[#B45309] font-bold bg-[#FEF3C7] rounded-lg p-2">
            📱 سجل من التطبيق (آيفون/أندرويد) — أي تعديل أو حذف هنا يظهر بالتطبيق أيضاً.
          </p>
          {error && (
            <div className="bg-red-50 text-red-700 text-xs font-bold rounded-xl p-2.5">{error}</div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#E2E8F0] px-4 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="h-11 px-4 rounded-xl bg-red-50 text-red-600 font-black text-sm hover:bg-red-100 disabled:opacity-50"
          >
            🗑️ حذف
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 h-11 rounded-xl bg-[#DB2777] text-white font-black text-sm hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "جارٍ الحفظ..." : "💾 حفظ"}
          </button>
        </div>
      </form>
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
  icon?: string;
  value: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black"
      style={{ background: `${color}18`, color }}
    >
      <span className="opacity-80">{label}:</span>
      {icon && <span>{icon}</span>}
      <span>{value}</span>
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
  action,
  children,
}: {
  title: string;
  count: number;
  icon: string;
  color: string;
  compact?: boolean;
  action?: React.ReactNode;
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
        {action}
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
          className={`rounded-xl flex items-center justify-center text-white font-black overflow-hidden flex-shrink-0 transition-transform group-hover:scale-110 ${
            compact ? "w-16 h-16 text-xl" : "w-20 h-20 text-2xl"
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
            className={`font-black truncate ${compact ? "text-sm" : "text-base"} ${
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
