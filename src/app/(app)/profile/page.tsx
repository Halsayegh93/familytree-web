import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageBackground, PageHero } from "@/components/PageHero";
import { formatPhone } from "@/lib/format-phone";
import { EditMyProfileButton } from "./EditMyProfileButton";
import { AvatarUpload } from "./AvatarUpload";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profileId = getProfileId(user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId!)
    .single();

  const { data: children } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, avatar_url, is_deceased")
    .eq("father_id", profileId!)
    .order("sort_order", { ascending: true });

  let father = null;
  if (profile?.father_id) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url")
      .eq("id", profile.father_id)
      .single();
    father = data;
  }

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

  return (
    <PageBackground theme="profile">
      <main className="max-w-3xl mx-auto p-6 space-y-3">

        {/* Hero */}
        <PageHero
          theme="profile"
          title={profile?.full_name ?? "حسابي"}
          subtitle={profile?.phone_number ? formatPhone(profile.phone_number) : undefined}
        />

        {/* Profile header card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="flex items-center gap-3">
            <AvatarUpload
              profileId={profileId!}
              currentUrl={profile?.avatar_url ?? null}
              fallback={initials(profile?.full_name ?? "؟")}
            />
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm text-[#0F172A] leading-tight truncate">
                {profile?.full_name}
              </div>
              {profile?.phone_number && (
                <div className="text-xs text-[#475569] mt-0.5 font-semibold" dir="ltr">
                  📞 {formatPhone(profile.phone_number)}
                </div>
              )}
              <div className="flex flex-wrap gap-1 mt-1.5">
                <RoleBadge role={profile?.role} />
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

        {/* Basic info */}
        <Section title="📋" label="بيانات أساسية">
          <Field label="الاسم الأول"   value={profile?.first_name ?? "—"} />
          <Field label="الاسم الكامل"  value={profile?.full_name ?? "—"} />
          {profile?.birth_date && (
            <Field label="تاريخ الميلاد" value={new Date(profile.birth_date).toLocaleDateString("ar")} />
          )}
          <Field
            label="الهاتف"
            value={profile?.phone_number ? formatPhone(profile.phone_number) : "—"}
            dir="ltr"
          />
        </Section>

        {/* Father */}
        {father && (
          <Section title="👨" label="الأب">
            <PersonRow person={father} />
          </Section>
        )}

        {/* Siblings */}
        {siblings.length > 0 && (
          <Section title="👥" label={`الإخوة (${siblings.length})`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {siblings.map((s: any) => <PersonRow key={s.id} person={s} />)}
            </div>
          </Section>
        )}

        {/* Children */}
        {children && children.length > 0 && (
          <Section title="👨‍👦" label={`الأبناء (${children.length})`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {children.map((c: any) => <PersonRow key={c.id} person={c} />)}
            </div>
          </Section>
        )}

        {/* Account info */}
        <Section title="⚙️" label="معلومات الحساب">
          <Field label="الدور"   value={roleAr(profile?.role)} />
          <Field label="الحالة"  value={profile?.status === "active" ? "نشط ✅" : profile?.status ?? "—"} />
          {profile?.created_at && (
            <Field
              label="تاريخ الانضمام"
              value={new Date(profile.created_at).toLocaleDateString("ar")}
            />
          )}
        </Section>

      </main>
    </PageBackground>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, label, children }: { title: string; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F1F5F9]">
        <span>{title}</span>
        <span className="font-black text-sm text-[#0F172A]">{label}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, value, dir }: { label: string; value: string; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
      <span className="text-xs text-[#64748B]">{label}</span>
      <span className="font-bold text-sm text-[#0F172A]" dir={dir}>{value}</span>
    </div>
  );
}

function PersonRow({ person }: { person: any }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#357DED] hover:shadow-sm transition">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#357DED] to-[#10B981] text-white flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
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

function RoleBadge({ role }: { role?: string | null }) {
  const map: Record<string, { label: string; color: string }> = {
    owner:      { label: "مدير",   color: "#5438DC" },
    admin:      { label: "مدير",   color: "#5438DC" },
    monitor:    { label: "مراقب",  color: "#10B981" },
    supervisor: { label: "مشرف",   color: "#F59E0B" },
    member:     { label: "عضو",    color: "#357DED" },
  };
  const { label, color } = map[role ?? ""] ?? { label: "عضو", color: "#357DED" };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: `${color}15`, color }}
    >
      {label}
    </span>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(" ");
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

function roleAr(role?: string | null): string {
  switch (role) {
    case "owner": case "admin": return "مدير";
    case "monitor":    return "مراقب";
    case "supervisor": return "مشرف";
    case "member":     return "عضو";
    default:           return "عضو";
  }
}
