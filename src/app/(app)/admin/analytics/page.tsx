import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { PrintButton } from "./PrintButton";
import { BranchesTree } from "./BranchesTree";

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

// "نشط" = عنده هاتف + سجّل دخول للتطبيق (له device_token)
// "غير نشط" = الباقي

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", getProfileId(user)!).single();
  if (!MODERATOR_ROLES.includes(profile?.role ?? "")) redirect("/home");

  const { data: allMembers } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, phone_number, is_deceased, created_at, birth_date, father_id, gender, is_married, avatar_url, sort_order")
    .neq("role", "pending")
    .limit(10000);

  // آخر تسجيل دخول لكل عضو من auth.users
  const { data: lastSignins } = await supabase.rpc("get_members_last_signin");
  const lastSigninMap = new Map<string, string>();
  (lastSignins ?? []).forEach((r: any) => {
    if (r.last_sign_in_at) lastSigninMap.set(r.member_id, r.last_sign_in_at);
  });
  // نشط = دخل خلال آخر 30 يوم
  const ACTIVE_MS = 30 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  const loggedInIds = new Set<string>();
  for (const [id, ts] of lastSigninMap.entries()) {
    if (nowMs - new Date(ts).getTime() <= ACTIVE_MS) loggedInIds.add(id);
  }

  const list = allMembers ?? [];
  const total = list.length;
  const deceased = list.filter((m) => m.is_deceased).length;

  // النشط = هاتف + دخل التطبيق + غير متوفي + غير مجمّد
  const active = list.filter(
    (m) => !m.is_deceased
      && m.status === "active"
      && m.phone_number
      && loggedInIds.has(m.id)
  ).length;

  // غير نشط = كل الباقي
  const inactive = total - active - deceased;

  const withoutPhone = list.filter((m) => !m.phone_number && !m.is_deceased).length;

  const roleStats = {
    owner: list.filter((m) => m.role === "owner").length,
    admin: list.filter((m) => m.role === "admin").length,
    monitor: list.filter((m) => m.role === "monitor").length,
    supervisor: list.filter((m) => m.role === "supervisor").length,
    member: list.filter((m) => m.role === "member").length,
  };

  const now = new Date();
  function age(birth?: string | null): number | null {
    if (!birth) return null;
    const d = new Date(birth);
    if (isNaN(d.getTime())) return null;
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a;
  }

  const ageStats = {
    under18: list.filter((m) => { const a = age(m.birth_date); return a !== null && a < 18; }).length,
    a1830: list.filter((m) => { const a = age(m.birth_date); return a !== null && a >= 18 && a < 31; }).length,
    a3150: list.filter((m) => { const a = age(m.birth_date); return a !== null && a >= 31 && a < 51; }).length,
    a5170: list.filter((m) => { const a = age(m.birth_date); return a !== null && a >= 51 && a < 71; }).length,
    a70plus: list.filter((m) => { const a = age(m.birth_date); return a !== null && a >= 71; }).length,
    unknown: list.filter((m) => age(m.birth_date) === null).length,
  };

  const monthly: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const count = list.filter((m) => {
      if (!m.created_at) return false;
      const c = new Date(m.created_at);
      return c >= start && c < end;
    }).length;
    monthly.push({
      label: start.toLocaleDateString("ar", { month: "short", year: "2-digit" }),
      count,
    });
  }
  const maxMonthly = Math.max(...monthly.map((m) => m.count), 1);

  const fatherIds = new Set(list.map((m) => m.father_id).filter(Boolean));
  const generations = computeMaxDepth(list);
  const parents = list.filter((m) => fatherIds.has(m.id)).length;
  const rootBranches = list.filter((m) => !m.father_id && fatherIds.has(m.id)).length;

  // أكبر 10 فروع (آباء بأكثر أبناء)
  const childCount = new Map<string, number>();
  list.forEach((m) => {
    if (m.father_id) childCount.set(m.father_id, (childCount.get(m.father_id) ?? 0) + 1);
  });

  // الفروع الرئيسية = أبناء الجذر المباشرين (عبدالله المحمدعلي)
  // الجذر = العضو الى ما عنده أب (father_id = null) — عادةً واحد بس
  // كل فرع = ابنه × مجموع ذرّيته الكاملة (حفيد + حفيد حفيد...)
  const childrenByFather = new Map<string, any[]>();
  list.forEach((m) => {
    if (m.father_id) {
      const arr = childrenByFather.get(m.father_id) ?? [];
      arr.push(m);
      childrenByFather.set(m.father_id, arr);
    }
  });
  function descendantsCount(id: string, seen = new Set<string>()): number {
    if (seen.has(id)) return 0;
    seen.add(id);
    const kids = childrenByFather.get(id) ?? [];
    let n = kids.length;
    for (const k of kids) n += descendantsCount(k.id, seen);
    return n;
  }
  // نلقى الجذر — الى ما عنده أب وعنده أكبر عدد ذرّية
  const roots = list.filter((m) => !m.father_id);
  const root = roots
    .map((r) => ({ ...r, _desc: descendantsCount(r.id) }))
    .sort((a, b) => b._desc - a._desc)[0];

  // الجد الأكبر = "عبدالله المحمدعلي" (أو الجذر تلقائياً)
  const abdullahNode =
    list.find((m) => m.full_name?.includes("عبدالله") && m.full_name?.includes("المحمدعلي") && !m.father_id) ||
    list.find((m) => m.full_name?.trim() === "عبدالله المحمدعلي") ||
    list.find((m) => m.full_name?.includes("عبدالله المحمدعلي")) ||
    root;

  // ترتيب حسب ترتيب الإخوة (sort_order) — من الأكبر للأصغر
  // لأنه ما في تواريخ ميلاد لكل الأعضاء
  function sortByAge(a: any, b: any): number {
    const ao = a.sort_order ?? 999999;
    const bo = b.sort_order ?? 999999;
    if (ao !== bo) return ao - bo;
    // tiebreaker: تاريخ الإنشاء
    const ac = a.created_at ? new Date(a.created_at).getTime() : Infinity;
    const bc = b.created_at ? new Date(b.created_at).getTime() : Infinity;
    return ac - bc;
  }

  // بناء شجرة الفروع: لكل ابن مباشر لعبدالله → أبناءه المباشرين (مع إجمالي ذرّياتهم)
  type SubBranch = {
    id: string;
    name: string;
    avatar_url: string | null;
    is_deceased: boolean;
    totalCount: number;
  };
  type Branch = {
    id: string;
    name: string;
    avatar_url: string | null;
    is_deceased: boolean;
    directCount: number;
    totalCount: number;
    children: SubBranch[];
  };

  const abdullahChildren = abdullahNode ? (childrenByFather.get(abdullahNode.id) ?? []) : [];
  const abdullahBranches: Branch[] = abdullahChildren
    .slice()
    .sort(sortByAge)
    .map((m: any) => {
      const subs = (childrenByFather.get(m.id) ?? [])
        .slice()
        .sort(sortByAge)
        .map((c: any): SubBranch => ({
          id: c.id,
          name: c.full_name,
          avatar_url: c.avatar_url,
          is_deceased: c.is_deceased,
          totalCount: descendantsCount(c.id) + 1,
        }));
      return {
        id: m.id,
        name: m.full_name,
        avatar_url: m.avatar_url,
        is_deceased: m.is_deceased,
        directCount: childCount.get(m.id) ?? 0,
        totalCount: descendantsCount(m.id) + 1,
        children: subs,
      };
    });

  // توزيع الجنس (الأحياء فقط)
  const alive = list.filter((m) => !m.is_deceased);
  const males = alive.filter((m) => m.gender === "male" || m.gender === "m").length;
  const females = alive.filter((m) => m.gender === "female" || m.gender === "f").length;
  const unknownGender = alive.length - males - females;

  // الحالة الاجتماعية (للبالغين الأحياء فقط)
  const adults = alive.filter((m) => {
    const a = age(m.birth_date);
    return a !== null && a >= 18;
  });
  const married = adults.filter((m) => m.is_married === true).length;
  const single = adults.filter((m) => m.is_married === false).length;
  const unknownMarital = adults.length - married - single;

  // متوسط العمر (الأحياء فقط)
  const ages = alive.map((m) => age(m.birth_date)).filter((a): a is number => a !== null);
  const avgAge = ages.length > 0 ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : 0;

  // معدّل الأبناء لكل أب
  const avgChildren = parents > 0
    ? (Array.from(childCount.values()).reduce((s, c) => s + c, 0) / parents).toFixed(1)
    : "0";

  // توزيع شهور الميلاد (الأحياء فقط)
  const monthCounts = new Array(12).fill(0);
  alive.forEach((m) => {
    if (!m.birth_date) return;
    const d = new Date(m.birth_date);
    if (!isNaN(d.getTime())) monthCounts[d.getMonth()]++;
  });
  const monthLabels = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const maxMonth = Math.max(...monthCounts, 1);

  // أحدث 5 أعضاء انضمّوا
  const recentMembers = [...list]
    .filter((m) => m.created_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // معدّل النشاط
  const activeRate = total > 0 ? Math.round((active / (total - deceased || 1)) * 100) : 0;

  const [
    { count: projectsCount },
    { count: diwaniyasCount },
    { count: notificationsCount },
    { count: devicesCount },
  ] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("approval_status", "approved"),
    supabase.from("diwaniyas").select("*", { count: "exact", head: true }).eq("approval_status", "approved"),
    supabase.from("notifications").select("*", { count: "exact", head: true }),
    supabase.from("device_tokens").select("*", { count: "exact", head: true }),
  ]);

  const reportDate = new Date().toLocaleDateString("ar", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <PageBackground theme="admin">
      <main className="max-w-6xl mx-auto p-6 space-y-5 print-area">
        <div className="print:hidden">
          <PageHero
            theme="admin"
            title="الإحصائيات والتقارير"
            subtitle="نظرة شاملة على أعضاء العائلة ونشاط التطبيق"
          />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="hidden print:block flex-1">
            <h1 className="text-3xl font-black text-[#0F172A]">📊 تقرير عائلة المحمدعلي</h1>
            <p className="text-sm text-[#64748B] mt-1">تاريخ التقرير: {reportDate}</p>
          </div>
          <div className="print:hidden">
            <PrintButton />
          </div>
        </div>

        <Section title="ملخص عام" icon="📊" color="#357DED">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
            <Stat label="إجمالي" value={total} icon="👥" color="#357DED" />
            <Stat label="نشط" value={active} icon="✅" color="#10B981" hint="عنده هاتف ودخل التطبيق" />
            <Stat label="غير نشط" value={inactive} icon="❌" color="#EF4444" hint="ما دخل التطبيق" />
            <Stat label="متوفون" value={deceased} icon="🕊️" color="#6B7B8D" />
          </div>
        </Section>

        <Section title={`توزيع الفروع — ${abdullahNode?.full_name ?? "الجذر"}`} icon="🌳" color="#5438DC">
          {abdullahNode && (
            <div className="px-4 pt-3 pb-2 text-xs text-[#64748B]">
              {abdullahChildren.length} ابن مباشر • إجمالي الذرّية:{" "}
              {descendantsCount(abdullahNode.id)} عضو • مرتّبون حسب ترتيب الإخوة • اضغط للتوسعة
            </div>
          )}
          <BranchesTree branches={abdullahBranches} />
        </Section>

        <Section title="توزيع الأدوار" icon="⭐" color="#5438DC">
          <div className="p-4 space-y-2">
            <RoleBar label="👑 مالك" value={roleStats.owner} total={total} color="#5438DC" />
            <RoleBar label="🛡️ مدير" value={roleStats.admin} total={total} color="#357DED" />
            <RoleBar label="👁️ مراقب" value={roleStats.monitor} total={total} color="#10B981" />
            <RoleBar label="⭐ مشرف" value={roleStats.supervisor} total={total} color="#F59E0B" />
            <RoleBar label="👤 عضو" value={roleStats.member} total={total} color="#06B6D4" />
          </div>
        </Section>

        <Section title="الفئات العمرية" icon="🎂" color="#10B981">
          <div className="p-4 space-y-2">
            <RoleBar label="أقل من 18" value={ageStats.under18} total={total} color="#3B82F6" />
            <RoleBar label="18 — 30" value={ageStats.a1830} total={total} color="#10B981" />
            <RoleBar label="31 — 50" value={ageStats.a3150} total={total} color="#F59E0B" />
            <RoleBar label="51 — 70" value={ageStats.a5170} total={total} color="#EC4899" />
            <RoleBar label="فوق 70" value={ageStats.a70plus} total={total} color="#8B5CF6" />
            <RoleBar label="غير محدد" value={ageStats.unknown} total={total} color="#6B7B8D" />
          </div>
        </Section>

        <Section title="النمو الشهري — آخر 6 أشهر" icon="📈" color="#06B6D4">
          <div className="p-4">
            <div className="flex items-end justify-between gap-2 h-40">
              {monthly.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs font-bold text-[#0F172A]">{m.count}</div>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#06B6D4] to-[#22D3EE] min-h-[4px]"
                    style={{ height: `${(m.count / maxMonthly) * 100}%` }}
                  />
                  <div className="text-[10px] text-[#64748B] font-bold">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="صحة الشجرة" icon="🌳" color="#10B981">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
            <Stat label="عدد الأجيال" value={generations} icon="🌳" color="#10B981" />
            <Stat label="آباء" value={parents} icon="👨" color="#357DED" />
            <Stat label="فروع رئيسية" value={rootBranches} icon="🌿" color="#5438DC" />
            <Stat label="بدون أب" value={list.filter((m) => !m.father_id).length} icon="🍃" color="#F59E0B" />
          </div>
        </Section>

        <Section title="مؤشرات سريعة" icon="⚡" color="#F59E0B">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
            <Stat label="معدّل النشاط" value={`${activeRate}%`} icon="📊" color="#10B981" hint="نسبة الذين يدخلون" />
            <Stat label="متوسط العمر" value={avgAge} icon="🎂" color="#5438DC" hint="للأحياء" />
            <Stat label="معدّل الأبناء" value={avgChildren} icon="👨‍👦" color="#357DED" hint="لكل أب" />
            <Stat label="بدون هاتف" value={withoutPhone} icon="📵" color="#EF4444" />
          </div>
        </Section>

        <Section title="توزيع الجنس (الأحياء)" icon="⚥" color="#EC4899">
          <div className="p-4 space-y-2">
            <RoleBar label="👨 ذكور" value={males} total={alive.length} color="#357DED" />
            <RoleBar label="👩 إناث" value={females} total={alive.length} color="#EC4899" />
            <RoleBar label="❓ غير محدد" value={unknownGender} total={alive.length} color="#6B7B8D" />
          </div>
        </Section>

        <Section title="الحالة الاجتماعية (البالغون)" icon="💍" color="#F59E0B">
          <div className="p-4 space-y-2">
            <RoleBar label="💍 متزوج/ة" value={married} total={adults.length} color="#10B981" />
            <RoleBar label="🧑 أعزب/عزباء" value={single} total={adults.length} color="#F59E0B" />
            <RoleBar label="❓ غير محدد" value={unknownMarital} total={adults.length} color="#6B7B8D" />
          </div>
        </Section>

        <Section title="توزيع شهور الميلاد" icon="🎂" color="#10B981">
          <div className="p-4">
            <div className="flex items-end justify-between gap-1 h-32">
              {monthCounts.map((c, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] font-bold text-[#0F172A]">{c}</div>
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-[#10B981] to-[#34D399] min-h-[2px]"
                    style={{ height: `${(c / maxMonth) * 100}%` }}
                  />
                  <div className="text-[9px] text-[#64748B] font-bold whitespace-nowrap">
                    {monthLabels[i].slice(0, 3)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="آخر 5 منضمّين" icon="🆕" color="#06B6D4">
          <div className="divide-y divide-[#E2E8F0]">
            {recentMembers.length === 0 ? (
              <p className="p-4 text-center text-sm text-[#64748B]">لا توجد بيانات</p>
            ) : (
              recentMembers.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#06B6D4] to-[#0891B2] text-white flex items-center justify-center font-bold overflow-hidden flex-shrink-0">
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      m.full_name?.[0] ?? "؟"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-[#0F172A] truncate">{m.full_name}</div>
                    <div className="text-xs text-[#64748B]">
                      {new Date(m.created_at).toLocaleDateString("ar", { dateStyle: "medium" })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>

        <Section title="نشاط التطبيق العام" icon="📱" color="#EC4899">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
            <Stat label="الأجهزة المسجلة" value={devicesCount ?? 0} icon="📱" color="#3B82F6" />
            <Stat label="إشعارات أُرسلت" value={notificationsCount ?? 0} icon="🔔" color="#F59E0B" />
            <Stat label="مشاريع منشورة" value={projectsCount ?? 0} icon="💼" color="#06B6D4" />
            <Stat label="ديوانيات" value={diwaniyasCount ?? 0} icon="🏛️" color="#D97706" />
          </div>
        </Section>
      </main>
    </PageBackground>
  );
}

function computeMaxDepth(list: any[]): number {
  const byId = new Map(list.map((m) => [m.id, m]));
  function depth(id: string, seen = new Set<string>()): number {
    if (seen.has(id)) return 0;
    seen.add(id);
    const m = byId.get(id);
    if (!m?.father_id || !byId.has(m.father_id)) return 1;
    return 1 + depth(m.father_id, seen);
  }
  let max = 0;
  for (const m of list) {
    const d = depth(m.id);
    if (d > max) max = d;
  }
  return max;
}

function Section({
  title, icon, color, children,
}: {
  title: string; icon: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      <div
        className="px-5 py-3 flex items-center gap-2 border-b border-[#E2E8F0]"
        style={{ background: `${color}10` }}
      >
        <span className="text-xl">{icon}</span>
        <h2 className="font-black" style={{ color }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Stat({
  label, value, icon, color, hint,
}: {
  label: string; value: number | string; icon: string; color: string; hint?: string;
}) {
  return (
    <div className="bg-[#F8FAFC] rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-2xl font-black" style={{ color }}>{value}</span>
      </div>
      <div className="text-sm font-bold text-[#0F172A]">{label}</div>
      {hint && <div className="text-xs text-[#64748B] mt-0.5">{hint}</div>}
    </div>
  );
}

function RoleBar({
  label, value, total, color,
}: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-bold text-[#0F172A] mb-1">
        <span>{label}</span>
        <span>
          {value} <span className="text-[#64748B] font-normal">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
