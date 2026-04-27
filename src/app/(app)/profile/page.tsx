import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageBackground } from "@/components/PageHero";
import { themes } from "@/lib/page-themes";
import { formatPhone } from "@/lib/format-phone";
import { EditMyProfileButton } from "./EditMyProfileButton";
import { AvatarUpload } from "./AvatarUpload";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileId = getProfileId(user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId!)
    .single();

  // الأبناء (نستخدم profileId الحقيقي مو user.id)
  const { data: children } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, avatar_url, is_deceased")
    .eq("father_id", profileId!)
    .order("sort_order", { ascending: true });

  // الأب
  let father = null;
  if (profile?.father_id) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url")
      .eq("id", profile.father_id)
      .single();
    father = data;
  }

  // الإخوة
  let siblings: any[] = [];
  if (profile?.father_id) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url, is_deceased")
      .eq("father_id", profile.father_id)
      .neq("id", profileId!)
      .order("sort_order", { ascending: true });
    siblings = data ?? [];
  }

  const t = themes.profile;
  return (
    <PageBackground theme="profile">
    <main className="max-w-3xl mx-auto p-6 space-y-3">
      <div
        className="rounded-2xl border p-4"
        style={{ background: t.bg, borderColor: `${t.primary}25` }}
      >
        <div className="flex items-center gap-3">
          <AvatarUpload
            profileId={profileId!}
            currentUrl={profile?.avatar_url ?? null}
            fallback={initials(profile?.full_name ?? "؟؟")}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-black text-[#0F172A] leading-tight">{profile?.full_name}</h1>
            {profile?.phone_number && (
              <div className="text-xs text-[#475569] mt-0.5 font-semibold" dir="ltr">
                📞 {formatPhone(profile.phone_number)}
              </div>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: `${t.primary}15`, color: t.primary }}
              >
                {roleAr(profile?.role)}
              </span>
              {profile?.status === "active" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/15 text-[#10B981]">
                  ✅ نشط
                </span>
              )}
              {profile?.is_hr_member && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5438DC]/15 text-[#5438DC]">
                  📋 لجنة شؤون العائلة
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <EditMyProfileButton profile={profile} />
        </div>
      </div>

      {/* بيانات أساسية */}
      <Section title="📋 بيانات أساسية">
        <div className="space-y-2 text-sm">
          <Field label="الاسم الأول" value={profile?.first_name ?? "—"} />
          <Field label="الاسم الكامل" value={profile?.full_name ?? "—"} />
          {profile?.birth_date && (
            <Field label="تاريخ الميلاد" value={new Date(profile.birth_date).toLocaleDateString("ar")} />
          )}
          <Field label="الهاتف" value={profile?.phone_number ? formatPhone(profile.phone_number) : "—"} />
        </div>
      </Section>

      {father && (
        <Section title="👨 الأب">
          <PersonRow person={father} />
        </Section>
      )}

      {siblings.length > 0 && (
        <Section title={`👥 الإخوة (${siblings.length})`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {siblings.map((s: any) => (
              <PersonRow key={s.id} person={s} />
            ))}
          </div>
        </Section>
      )}

      {children && children.length > 0 && (
        <Section title={`👨‍👦 الأبناء (${children.length})`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {children.map((c: any) => (
              <PersonRow key={c.id} person={c} />
            ))}
          </div>
        </Section>
      )}

      <Section title="⚙️ معلومات الحساب">
        <div className="space-y-2 text-sm">
          <Field label="الدور" value={roleAr(profile?.role)} />
          <Field label="الحالة" value={profile?.status === "active" ? "نشط ✅" : profile?.status ?? "—"} />
          {profile?.created_at && (
            <Field
              label="تاريخ الانضمام"
              value={new Date(profile.created_at).toLocaleDateString("ar")}
            />
          )}
        </div>
      </Section>
    </main>
    </PageBackground>
  );
}

function PersonRow({ person }: { person: any }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#E2E8F0]">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#357DED] to-[#10B981] text-white flex items-center justify-center font-bold text-base overflow-hidden flex-shrink-0">
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          initials(person.full_name)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-[#0F172A] truncate">{person.full_name}</div>
        <div className="text-xs text-[#64748B]">
          {person.is_deceased ? "🕊️ متوفى" : roleAr(person.role)}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
      <h2 className="font-black text-[#0F172A] mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-0">
      <span className="text-[#64748B]">{label}</span>
      <span className="font-bold text-[#0F172A]">{value}</span>
    </div>
  );
}

function initials(name: string): string {
  return name.trim().charAt(0);
}

function roleAr(role?: string | null): string {
  switch (role) {
    case "owner":
    case "admin":
      return "مدير";
    case "monitor":
      return "مراقب";
    case "supervisor":
      return "مشرف";
    case "member":
      return "عضو";
    default:
      return "عضو";
  }
}
