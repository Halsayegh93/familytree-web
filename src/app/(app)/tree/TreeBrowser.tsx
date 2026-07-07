"use client";

import { useMemo, useState, useEffect } from "react";
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
  husband_id: string | null;
  gender: string | null;
  is_deceased: boolean | null;
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
};

export function TreeBrowser({
  members,
  canModerate = false,
  canManageRoles = false,
  canEditMembers = false,
  women = [],
  externalSpouses = [],
}: {
  members: Member[];
  canModerate?: boolean;
  canManageRoles?: boolean;
  canEditMembers?: boolean;
  isHR?: boolean;
  women?: WomanMember[];
  externalSpouses?: ExternalSpouse[];
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
                count={daughters.length + (mother ? 1 : 0)}
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
              daughters={daughters}
              internalHusbandName={internalHusbandName}
              externalByWoman={externalByWoman}
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
  daughters,
  internalHusbandName,
  externalByWoman,
  onFocus,
  childrenCountOf,
}: {
  focused: Member;
  mother: WomanMember | null;
  sons: Member[];
  daughters: WomanMember[];
  internalHusbandName: (husbandId: string | null) => string | null;
  externalByWoman: Map<string, ExternalSpouse[]>;
  onFocus: (id: string) => void;
  childrenCountOf: (id: string) => number;
}) {
  const nothing =
    !mother && sons.length === 0 && daughters.length === 0;

  return (
    <div className="space-y-2">
      <div className="bg-[#FDF2F8] border border-[#FBCFE8] rounded-2xl px-3 py-2 text-[11px] text-[#9D174D] font-bold flex items-center gap-1.5">
        <span>💠</span>
        <span>لوحة العلاقات — خاصة بالويب والمدراء فقط. تشمل الأم والزوجات والأبناء والبنات والأزواج من خارج العائلة.</span>
      </div>

      {nothing && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 text-center">
          <div className="text-3xl mb-1">🔗</div>
          <p className="text-[#0F172A] font-bold text-sm">لا توجد علاقات مسجّلة لهذا العضو</p>
        </div>
      )}

      {/* الأم */}
      {mother && (
        <Section title="الأم" count={1} icon="👩" color="#DB2777" compact>
          <WomanRow woman={mother} externals={externalByWoman.get(mother.id) ?? []} />
        </Section>
      )}

      {/* الأبناء */}
      {sons.length > 0 && (
        <Section title="الأبناء" count={sons.length} icon="👨‍👦" color="#5438DC" compact>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
            {sons.map((c) => (
              <NodeCard
                key={c.id}
                member={c}
                onClick={() => onFocus(c.id)}
                childrenCount={childrenCountOf(c.id)}
                compact
              />
            ))}
          </div>
        </Section>
      )}

      {/* البنات + الزوج الخارجي */}
      {daughters.length > 0 && (
        <Section title="البنات" count={daughters.length} icon="👧" color="#EC4899" compact>
          <div className="space-y-1.5">
            {daughters.map((d) => (
              <DaughterRow
                key={d.id}
                daughter={d}
                internalHusbandName={internalHusbandName(d.husband_id)}
                externals={externalByWoman.get(d.id) ?? []}
              />
            ))}
          </div>
        </Section>
      )}
      <div className="text-[10px] text-[#94A3B8] text-center pt-1">
        {focused.full_name}
      </div>
    </div>
  );
}

// صف امرأة (أم/زوجة) — عرض فقط + عرض الزوج الخارجي إن وُجد
function WomanRow({
  woman,
  externals,
}: {
  woman: WomanMember;
  externals: ExternalSpouse[];
}) {
  return (
    <div className="flex items-center gap-3 bg-[#FDF2F8]/60 border border-[#FCE7F3] rounded-xl p-2">
      <Avatar name={woman.first_name} url={woman.avatar_url} color="#DB2777" deceased={woman.is_deceased} />
      <div className="flex-1 min-w-0">
        <div className="font-black text-sm text-[#0F172A] truncate">
          {woman.full_name}
          {woman.is_deceased && <span className="mr-1 text-[11px] text-[#6B7B8D]">🕊️</span>}
        </div>
        {externals.length > 0 && (
          <div className="text-[11px] text-[#9D174D] font-bold mt-0.5">
            الزوج (خارج العائلة): {externals.map((e) => e.full_name || e.first_name).join("، ")}
          </div>
        )}
      </div>
    </div>
  );
}

// صف بنت — يعرض حالة الزواج + إدارة الزوج الخارجي
function DaughterRow({
  daughter,
  internalHusbandName,
  externals,
}: {
  daughter: WomanMember;
  internalHusbandName: string | null;
  externals: ExternalSpouse[];
}) {
  const ext = externals[0] ?? null;

  return (
    <div className="bg-white border border-[#F3D9E6] rounded-xl p-2.5">
      <div className="flex items-center gap-3">
        <Avatar name={daughter.first_name} url={daughter.avatar_url} color="#EC4899" deceased={daughter.is_deceased} />
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-[#0F172A] truncate">
            {daughter.full_name}
            {daughter.is_deceased && <span className="mr-1 text-[11px] text-[#6B7B8D]">🕊️</span>}
          </div>
          {/* حالة الزواج */}
          {internalHusbandName ? (
            <div className="text-[11px] text-[#357DED] font-bold mt-0.5">
              💍 الزوج: {internalHusbandName} <span className="text-[#94A3B8]">(من العائلة)</span>
            </div>
          ) : ext ? (
            <div className="text-[11px] text-[#9D174D] font-bold mt-0.5">
              🌍 الزوج (خارج العائلة): {ext.full_name || ext.first_name}
              {ext.family_name ? ` ${ext.family_name}` : ""}
              {ext.nationality ? ` — ${ext.nationality}` : ""}
              {ext.is_deceased ? " 🕊️" : ""}
            </div>
          ) : (
            <div className="text-[11px] text-[#94A3B8] font-semibold mt-0.5">لا يوجد زوج مسجّل</div>
          )}
        </div>
        {/* زر إدارة الزوج الخارجي — يظهر فقط إن لم يكن لها زوج من العائلة */}
        {!internalHusbandName && (
          <ExternalHusbandButton womanId={daughter.id} womanName={daughter.full_name} existing={ext} />
        )}
      </div>
      {ext?.notes && (
        <div className="text-[11px] text-[#64748B] mt-1.5 pr-14 whitespace-pre-wrap">
          📝 {ext.notes}
        </div>
      )}
    </div>
  );
}

// ═══════════ External Husband Modal ═══════════
function ExternalHusbandButton({
  womanId,
  womanName,
  existing,
}: {
  womanId: string;
  womanName: string;
  existing: ExternalSpouse | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(existing?.first_name ?? "");
  const [familyName, setFamilyName] = useState(existing?.family_name ?? "");
  const [nationality, setNationality] = useState(existing?.nationality ?? "");
  const [isDeceased, setIsDeceased] = useState(existing?.is_deceased ?? false);
  const [notes, setNotes] = useState(existing?.notes ?? "");

  function openModal() {
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
    if (!firstName.trim()) {
      setError("الاسم مطلوب");
      return;
    }
    setBusy(true);
    setError(null);

    const full = [firstName.trim(), familyName.trim()].filter(Boolean).join(" ");
    const payload = {
      woman_id: womanId,
      first_name: firstName.trim(),
      full_name: full || firstName.trim(),
      family_name: familyName.trim() || null,
      nationality: nationality.trim() || null,
      is_deceased: isDeceased,
      notes: notes.trim() || null,
    };

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
    if (!confirm("حذف الزوج الخارجي المسجّل؟")) return;
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
        title={existing ? "تعديل الزوج الخارجي" : "إضافة زوج من خارج العائلة"}
      >
        {existing ? "✏️ تعديل" : "➕ زوج خارجي"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <form
            onSubmit={submit}
            className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[92vh] overflow-y-auto"
          >
            {/* header */}
            <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#0F172A]">
                  {existing ? "تعديل الزوج الخارجي" : "زوج من خارج العائلة"}
                </h3>
                <p className="text-[11px] text-[#64748B]">للزوجة: {womanName}</p>
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
              <Field label="الاسم *">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="اسم الزوج"
                  className="ext-input"
                  autoFocus
                />
              </Field>
              <Field label="اسم العائلة / القبيلة">
                <input
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="مثال: العتيبي"
                  className="ext-input"
                />
              </Field>
              <Field label="الجنسية">
                <input
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="مثال: كويتي"
                  className="ext-input"
                />
              </Field>
              <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={isDeceased}
                  onChange={(e) => setIsDeceased(e.target.checked)}
                  className="w-4 h-4 accent-[#EC4899]"
                />
                <span className="text-sm font-bold text-[#0F172A]">🕊️ متوفى</span>
              </label>
              <Field label="ملاحظات">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="أي معلومات إضافية..."
                  className="ext-input resize-none"
                />
              </Field>

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
                {busy ? "جارٍ الحفظ..." : existing ? "حفظ التعديلات" : "إضافة"}
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

          {/* الزوجات — بجانب اسم العضو */}
          {(wives.length > 0 || canEditMembers) && (
            <WivesInline husbandId={member.id} wives={wives} canEdit={canEditMembers} />
          )}
        </div>
      </div>

    </div>
  );
}

// ═══════════ Wives inline (عند اسم العضو) ═══════════
function WivesInline({
  husbandId,
  wives,
  canEdit,
}: {
  husbandId: string;
  wives: WomanMember[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<WomanMember | "new" | null>(null);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      <span className="text-[10px] font-black text-[#DB2777] opacity-80">💍 الزوجات:</span>
      {wives.length === 0 && !canEdit && (
        <span className="text-[10px] text-[#94A3B8] font-bold">—</span>
      )}
      {wives.map((w) =>
        canEdit ? (
          <button
            key={w.id}
            onClick={() => setEditing(w)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FCE7F3] text-[#9D174D] hover:bg-[#FBCFE8] transition"
            title="تعديل / حذف"
          >
            <span>{w.full_name}</span>
            {w.is_deceased && <span>🕊️</span>}
            <span className="opacity-60">✎</span>
          </button>
        ) : (
          <span
            key={w.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FCE7F3] text-[#9D174D]"
          >
            <span>{w.full_name}</span>
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
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ═══════════ Wife add/edit/delete modal ═══════════
function WifeModal({
  husbandId,
  wife,
  onClose,
}: {
  husbandId: string;
  wife: WomanMember | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(wife?.full_name ?? "");
  const [isDeceased, setIsDeceased] = useState(wife?.is_deceased ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("اسم الزوجة مطلوب");
      return;
    }
    setBusy(true);
    setError(null);

    const payload = {
      first_name: name.trim(),
      full_name: name.trim(),
      husband_id: husbandId,
      gender: "female",
      is_deceased: isDeceased,
    };

    const { error: err } = wife
      ? await supabase.from("women_members").update(payload).eq("id", wife.id)
      : await supabase.from("women_members").insert(payload);

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
    if (!wife) return;
    if (!confirm(`حذف الزوجة «${wife.full_name}»؟`)) return;
    setBusy(true);
    const { error: err } = await supabase.from("women_members").delete().eq("id", wife.id);
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
          <label className="flex items-center gap-2 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={isDeceased}
              onChange={(e) => setIsDeceased(e.target.checked)}
              className="w-4 h-4 accent-[#EC4899]"
            />
            <span className="text-sm font-bold text-[#0F172A]">🕊️ متوفاة</span>
          </label>
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
