import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { formatPhone } from "@/lib/format-phone";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ProfileEditClient } from "./ProfileEditClient";
import { HRSectionClient } from "./HRSectionClient";
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

      {/* Hero — موحد */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 relative">
        {canEdit && (
          <div className="absolute top-2 left-2">
            <MemberFullEditClient
              member={member}
              canManageRoles={canManageRoles}
              variant="icon"
            />
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#357DED] to-[#10B981] text-white flex items-center justify-center text-2xl font-black overflow-hidden flex-shrink-0">
            {member.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initials(member.full_name)
            )}
          </div>
          <div className="flex-1 min-w-0 pl-7">
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

      <ProfileTabs
        showHR={isHR}
        showAdmin={canEdit}
        overview={
          <div className="space-y-4">
      {/* المعلومات الأساسية */}
      <Section title="معلومات أساسية" icon="ℹ️">
        <Row label="الاسم الأول" value={member.first_name} />
        <Row label="الاسم الكامل" value={member.full_name} />
        <Row label="رقم الهاتف" value={member.phone_number} dir="ltr" />
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
        <Row label="متزوج" value={member.is_married ? "نعم" : member.is_married === false ? "لا" : null} />
        <Row
          label="مخفي من الشجرة"
          value={member.is_hidden_from_tree ? "نعم 🚫" : "لا ✓"}
        />
        <Row
          label="الهاتف مخفي"
          value={member.is_phone_hidden ? "نعم 🔒" : "لا"}
        />
      </Section>

      {/* السيرة (Bio) */}
      {member.bio && Array.isArray(member.bio) && member.bio.length > 0 && (
        <Section title="السيرة الذاتية" icon="📜">
          <div className="space-y-3 px-5 py-4">
            {member.bio.map((station: any, i: number) => (
              <div key={i} className="border-r-4 border-[#357DED] pr-4 py-2">
                <div className="font-bold text-[#0F172A]">
                  {station.year && <span className="text-[#357DED]">{station.year} — </span>}
                  {station.title}
                </div>
                {station.details && (
                  <p className="text-sm text-[#64748B] mt-1">{station.details}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* العلاقات */}
      <Section title="العلاقات العائلية" icon="👨‍👩‍👧">
        <div className="px-5 py-4 space-y-4">
          {father && (
            <div>
              <div className="text-xs font-bold text-[#64748B] mb-2">الأب</div>
              <PersonChip person={father} />
            </div>
          )}

          {(siblings ?? []).length > 0 && (
            <div>
              <div className="text-xs font-bold text-[#64748B] mb-2">
                الإخوة ({(siblings ?? []).length})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {siblings?.map((s: any) => <PersonChip key={s.id} person={s} />)}
              </div>
            </div>
          )}

          {(children ?? []).length > 0 && (
            <div>
              <div className="text-xs font-bold text-[#64748B] mb-2">
                الأبناء ({(children ?? []).length})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {children?.map((c: any) => <PersonChip key={c.id} person={c} />)}
              </div>
            </div>
          )}

          {!father && (children ?? []).length === 0 && (siblings ?? []).length === 0 && (
            <p className="text-center text-[#64748B] py-4">لا توجد علاقات</p>
          )}
        </div>
      </Section>

      {/* النشاط */}
      <Section title="نشاط العضو" icon="📊">
        <div className="grid grid-cols-3 gap-3 p-5">
          <Stat label="منشورات" value={newsCount ?? 0} icon="📰" color="#10B981" />
          <Stat label="قصص" value={storiesCount ?? 0} icon="📖" color="#5438DC" />
          <Stat label="مشاريع" value={projectsCount ?? 0} icon="💼" color="#3B82F6" />
        </div>
      </Section>

      {/* معلومات النظام */}
      <Section title="معلومات النظام" icon="⚙️">
        <Row label="معرف العضو (UUID)" value={member.id} dir="ltr" mono />
        <Row
          label="تاريخ الانضمام"
          value={member.created_at ? new Date(member.created_at).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" }) : null}
        />
        <Row label="ترتيب في الشجرة" value={member.sort_order?.toString() ?? null} />
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

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      <div className="px-5 py-3 bg-[#F1F5F9] flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h2 className="font-black text-[#0F172A]">{title}</h2>
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
    <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0] last:border-0">
      <span className="text-[#64748B]">{label}</span>
      <span
        className={`font-bold text-[#0F172A] text-right max-w-[60%] truncate ${mono ? "font-mono text-xs" : ""}`}
        dir={dir}
      >
        {value ?? <span className="text-[#64748B] font-normal">—</span>}
      </span>
    </div>
  );
}

function PersonChip({ person }: { person: any }) {
  return (
    <Link
      href={`/admin/profiles/${person.id}`}
      className="flex items-center gap-2 p-2 bg-[#F1F5F9] rounded-xl hover:bg-[#357DED]/10 transition"
    >
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#357DED] to-[#10B981] text-white flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
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
