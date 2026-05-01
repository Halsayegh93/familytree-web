import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { formatPhone } from "@/lib/format-phone";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ProfileEditClient } from "./ProfileEditClient";
import { HRSectionClient } from "./HRSectionClient";
import { MemberCRMCard } from "./MemberCRMCard";
import { MemberFullEditClient } from "./MemberFullEditClient";
import { ProfileTabs } from "./ProfileTabs";

export default async function AdminProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role, is_hr_member")
    .eq("id", getProfileId(user)!)
    .single();

  const isHR = viewerProfile?.is_hr_member === true;
  const canEditAdmin = ["owner", "admin", "monitor", "supervisor"].includes(viewerProfile?.role ?? "");

  // المدراء + لجنة HR يدخلون
  if (!canEditAdmin && !isHR) redirect("/home");

  const { data: member } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!member) notFound();

  // الأب
  const father = member.father_id
    ? (await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", member.father_id)
        .single()).data
    : null;

  // الأبناء
  const { data: children } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, is_deceased")
    .eq("father_id", id)
    .order("sort_order", { ascending: true });

  // الإخوة (نفس الأب)
  const { data: siblings } = member.father_id
    ? await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role, is_deceased")
        .eq("father_id", member.father_id)
        .neq("id", id)
        .order("sort_order", { ascending: true })
    : { data: [] };

  // إحصائيات نشاطه
  const [
    { count: newsCount },
    { count: storiesCount },
    { count: projectsCount },
  ] = await Promise.all([
    supabase.from("news").select("*", { count: "exact", head: true }).eq("author_id", id),
    supabase.from("family_stories").select("*", { count: "exact", head: true }).eq("author_id", id),
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("owner_id", id),
  ]);

  // طلباته المعلقة (CRM): مشاريع/ديوانيات/طلبات إدارة
  const [
    { count: pendingProjects },
    { count: pendingDiwaniyas },
  ] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("owner_id", id).eq("approval_status", "pending"),
    supabase.from("diwaniyas").select("*", { count: "exact", head: true }).eq("owner_id", id).eq("approval_status", "pending"),
  ]);
  const pendingRequestsCount = (pendingProjects ?? 0) + (pendingDiwaniyas ?? 0);

  // الفرع — نعرض الجيل 3 + 4 للوصول لتصنيف أدق
  // الجيل 1 = عبدالله (root)
  // الجيل 2 = أبناؤه (محمدعلي، احمد، ...)
  // الجيل 3 = أحفاده (حسن، علي، ...)
  // الجيل 4 = أبناء أحفاده (محمد حسن، علي حسن، ...)
  const allMembersForChain = await supabase
    .from("profiles")
    .select("id, full_name, father_id")
    .limit(10000);
  const memberById = new Map<string, any>();
  (allMembersForChain.data ?? []).forEach((m: any) => memberById.set(m.id, m));

  // اجمع سلسلة الأجداد للعضو من الأقرب للأبعد
  const lineage: any[] = [];
  {
    let cur: any = memberById.get(id);
    let safety = 50;
    while (cur && safety-- > 0) {
      lineage.push(cur);
      cur = cur.father_id ? memberById.get(cur.father_id) : null;
    }
  }
  // lineage = [العضو, أبوه, جده, ..., الجذر]
  // الجذر = lineage[length - 1]
  // الجيل 2 = lineage[length - 2]
  // الجيل 3 = lineage[length - 3]
  // الجيل 4 = lineage[length - 4]
  // الـ id الجذر للفرع (الجيل 3 من lineage = جدّ المستوى الثالث)
  let branchRootId: string | null = null;
  // إذا العضو من جيل أقل من 4، نرجع لأقرب جيل متاح (3 ثم 2)
  let branchRootName: string | null = null;
  if (lineage.length >= 4) {
    const node = lineage[lineage.length - 4];
    branchRootName = node?.full_name ?? null;
    branchRootId = node?.id ?? null;
  } else if (lineage.length >= 3) {
    const node = lineage[lineage.length - 3];
    branchRootName = node?.full_name ?? null;
    branchRootId = node?.id ?? null;
  } else if (lineage.length >= 2) {
    const node = lineage[lineage.length - 2];
    branchRootName = node?.full_name ?? null;
    branchRootId = node?.id ?? null;
  }
  const branchSubName: string | null = null;

  // المشرف المسؤول على الفرع
  let supervisor: any = null;
  if (branchRootId) {
    const { data: bs } = await supabase
      .from("branch_supervisors")
      .select("*, profiles!branch_supervisors_supervisor_id_fkey(id, full_name, avatar_url, phone_number)")
      .eq("branch_root_id", branchRootId)
      .maybeSingle();
    supervisor = bs?.profiles ?? null;
  }

  // درجة اكتمال البيانات (CRM data quality score)
  // للمتوفى: لا نطلب إكمال الملف — نعرضه دائماً 100% لإخفاء التنبيه
  let completenessPercent = 100;
  let missingFields: string[] = [];
  if (!member.is_deceased) {
    const fieldChecks = [
      { key: "first_name", label: "الاسم الأول", value: member.first_name },
      { key: "full_name", label: "الاسم الكامل", value: member.full_name },
      { key: "phone_number", label: "رقم الهاتف", value: member.phone_number },
      { key: "birth_date", label: "تاريخ الميلاد", value: member.birth_date },
      { key: "gender", label: "الجنس", value: member.gender },
      { key: "avatar_url", label: "الصورة", value: member.avatar_url },
    ];
    const filledCount = fieldChecks.filter(
      (f) => f.value !== null && f.value !== "" && f.value !== undefined
    ).length;
    completenessPercent = Math.round((filledCount / fieldChecks.length) * 100);
    missingFields = fieldChecks
      .filter((f) => f.value === null || f.value === "" || f.value === undefined)
      .map((f) => f.label);
  }

  const canEdit = ["owner", "admin", "monitor"].includes(viewerProfile?.role ?? "");
  const canManageRoles = viewerProfile?.role === "owner";

  // بيانات HR — فقط لأعضاء اللجنة
  const hrNotes = isHR
    ? (await supabase.from("hr_notes").select("*, profiles!hr_notes_created_by_fkey(full_name)").eq("member_id", id).order("created_at", { ascending: false })).data
    : [];
  const contactLog = isHR
    ? (await supabase.from("hr_contact_log").select("*, profiles!hr_contact_log_contacted_by_fkey(full_name)").eq("member_id", id).order("contacted_at", { ascending: false })).data
    : [];
  const documents = isHR
    ? (await supabase.from("hr_documents").select("*, profiles!hr_documents_uploaded_by_fkey(full_name)").eq("member_id", id).order("created_at", { ascending: false })).data
    : [];

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-4">
      {/* رجوع */}
      <Link
        href="/admin/profiles"
        className="inline-flex items-center gap-2 text-[#475569] hover:text-[#357DED] font-bold"
      >
        ← رجوع للقائمة
      </Link>

      {/* بطاقة العضو الموحّدة — للإدارة فقط */}
      {canEdit ? (
        <div className="relative">
          <div className="absolute top-12 left-3 z-10">
            <MemberFullEditClient
              member={member}
              canManageRoles={canManageRoles}
              variant="icon"
            />
          </div>
          <MemberCRMCard
            member={member}
            father={father}
            children={(children as any) ?? []}
            branchRootName={branchRootName}
            branchSubName={branchSubName}
            supervisor={supervisor}
            pendingRequestsCount={pendingRequestsCount}
            completenessPercent={completenessPercent}
            missingFields={missingFields}
            lastActivityDate={
              ((hrNotes as any)?.[0]?.created_at) ||
              ((contactLog as any)?.[0]?.contacted_at) ||
              null
            }
            newsCount={newsCount ?? 0}
            storiesCount={storiesCount ?? 0}
            projectsCount={projectsCount ?? 0}
          />
        </div>
      ) : (
        // غير الإدارة (لجنة فقط) → بطاقة مبسّطة
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#357DED] to-[#10B981] text-white flex items-center justify-center text-2xl font-black overflow-hidden flex-shrink-0">
              {member.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                initials(member.full_name)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-lg font-black text-[#0F172A] leading-tight">{member.full_name}</h1>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <Badge color={roleColorOf(member.role)}>{roleAr(member.role)}</Badge>
                {member.is_deceased && <Badge color="#6B7B8D">🕊️ متوفى</Badge>}
                {member.status === "frozen" && <Badge color="#EF4444">🔒 مجمّد</Badge>}
                {member.status === "active" && !member.is_deceased && <Badge color="#10B981">✅ نشط</Badge>}
              </div>
            </div>
          </div>
        </div>
      )}

      <ProfileTabs
        showHR={isHR}
        showAdmin={canEdit}
        overview={
          <div className="space-y-4">
      {/* المعلومات الأساسية */}
      <Section title="المعلومات الأساسية" icon="ℹ️" accent="#357DED">
        <Row label="الاسم الأول" value={member.first_name} />
        <Row label="الاسم الكامل" value={member.full_name} />
        <Row label="رقم الهاتف" value={member.phone_number ? formatPhone(member.phone_number) : null} dir="ltr" />
        <Row
          label="تاريخ الميلاد"
          value={member.birth_date ? new Date(member.birth_date).toLocaleDateString("ar") : null}
        />
        {member.is_deceased && member.death_date && (
          <Row
            label="تاريخ الوفاة"
            value={new Date(member.death_date).toLocaleDateString("ar")}
          />
        )}
        <Row label="الجنس" value={member.gender === "male" ? "ذكر" : member.gender === "female" ? "أنثى" : null} />
        <Row label="الحالة الاجتماعية" value={member.is_married ? "متزوج" : member.is_married === false ? "أعزب" : null} />
      </Section>

      {/* الخصوصية */}
      <Section title="الخصوصية" icon="🔒" accent="#5438DC">
        <Row label="مخفي من الشجرة" value={member.is_hidden_from_tree ? "نعم" : "لا"} />
        <Row label="رقم الهاتف مخفي" value={member.is_phone_hidden ? "نعم" : "لا"} />
      </Section>

      {/* السيرة (Bio) */}
      {member.bio && Array.isArray(member.bio) && member.bio.length > 0 && (
        <Section title="السيرة الذاتية" icon="📜" accent="#06B6D4">
          <div className="space-y-3 px-5 py-4">
            {member.bio.map((station: any, i: number) => (
              <div key={i} className="border-r-2 border-[#06B6D4] pr-4 py-2">
                <div className="font-bold text-[#0F172A] text-sm">
                  {station.year && <span className="text-[#06B6D4]">{station.year} — </span>}
                  {station.title}
                </div>
                {station.details && (
                  <p className="text-xs text-[#64748B] mt-1">{station.details}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* العلاقات */}
      <Section title="العلاقات العائلية" icon="👨‍👩‍👧" accent="#10B981">
        <div className="px-5 py-4 space-y-3">
          {father && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8] mb-1.5">الأب</div>
              <PersonChip person={father} />
            </div>
          )}

          {(siblings ?? []).length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8] mb-1.5">
                الإخوة · {(siblings ?? []).length}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {siblings?.map((s: any) => <PersonChip key={s.id} person={s} />)}
              </div>
            </div>
          )}

          {(children ?? []).length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8] mb-1.5">
                الأبناء · {(children ?? []).length}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {children?.map((c: any) => <PersonChip key={c.id} person={c} />)}
              </div>
            </div>
          )}

          {!father && (children ?? []).length === 0 && (siblings ?? []).length === 0 && (
            <p className="text-center text-[#94A3B8] text-sm py-4">لا توجد علاقات</p>
          )}
        </div>
      </Section>

      {/* النشاط */}
      <Section title="نشاط العضو" icon="📊" accent="#06B6D4">
        <div className="grid grid-cols-3 px-5 py-4">
          <CompactStat label="منشورات" value={newsCount ?? 0} color="#10B981" />
          <CompactStat label="قصص" value={storiesCount ?? 0} color="#5438DC" />
          <CompactStat label="مشاريع" value={projectsCount ?? 0} color="#06B6D4" />
        </div>
      </Section>

      {/* معلومات النظام */}
      <Section title="معلومات النظام" icon="⚙️" accent="#94A3B8">
        <Row
          label="تاريخ الانضمام"
          value={member.created_at ? new Date(member.created_at).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" }) : null}
        />
        <Row label="ترتيب في الشجرة" value={member.sort_order?.toString() ?? null} />
        <Row label="معرّف العضو" value={member.id} dir="ltr" mono />
      </Section>
          </div>
        }
        admin={
          canEdit ? (
            <ProfileEditClient
              member={member}
              canManageRoles={canManageRoles}
            />
          ) : null
        }
        hr={
          isHR ? (
            <HRSectionClient
              memberId={id}
              memberName={member.full_name}
              memberPhone={member.phone_number}
              currentUserId={getProfileId(user)!}
              hrStatus={member.hr_status ?? null}
              isHrMember={member.is_hr_member ?? false}
              canManageHRMembers={viewerProfile?.role === "owner"}
              notes={(hrNotes as any) ?? []}
              contactLog={(contactLog as any) ?? []}
              documents={(documents as any) ?? []}
            />
          ) : null
        }
      />
    </main>
  );
}

function Section({ title, icon, children, accent }: { title: string; icon: string; children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        borderTop: accent ? `3px solid ${accent}` : undefined,
        border: accent ? undefined : "1px solid #E2E8F0",
      }}
    >
      <div className="px-5 py-3 flex items-center gap-2 border-b border-[#F1F5F9]">
        <span className="text-base">{icon}</span>
        <h2 className="font-black text-[#0F172A] text-sm">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  dir,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  dir?: "ltr" | "rtl";
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#F1F5F9] last:border-0">
      <span className="text-xs text-[#64748B] font-medium">{label}</span>
      <span
        className={`font-bold text-[#0F172A] text-sm text-right max-w-[60%] truncate ${mono ? "font-mono text-xs" : ""}`}
        dir={dir}
      >
        {value ?? <span className="text-[#94A3B8] font-normal">—</span>}
      </span>
    </div>
  );
}

function PersonChip({ person }: { person: any }) {
  return (
    <Link
      href={`/admin/profiles/${person.id}`}
      className="flex items-center gap-2 p-2 bg-[#F8FAFC] rounded-xl hover:bg-[#5438DC]/10 hover:border-[#5438DC]/20 transition border border-[#E2E8F0]"
    >
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5438DC] to-[#7C3AED] text-white flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0">
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          person.full_name?.[0] ?? "؟"
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-[#0F172A] truncate">{person.full_name}</div>
        {person.is_deceased && <div className="text-xs text-[#64748B]">🕊️ متوفى</div>}
      </div>
    </Link>
  );
}

function CompactStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className="font-black text-2xl tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] font-bold text-[#94A3B8] mt-0.5 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 text-center">
      <div
        className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-xl mb-2"
        style={{ background: `${color}15` }}
      >
        {icon}
      </div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-xs text-[#64748B] mt-1">{label}</div>
    </div>
  );
}

function Badge({ color, large, children }: { color: string; large?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full font-bold whitespace-nowrap ${large ? "px-4 py-1.5 text-sm" : "px-3 py-1 text-xs"}`}
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
