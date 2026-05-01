import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageBackground } from "@/components/PageHero";
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

  return (
    <PageBackground theme="profile">
      <main className="max-w-3xl mx-auto p-3 md:p-4 space-y-2">

        {/* بطاقة موحّدة: الصورة + الاسم + الشارات + الهاتف + التعديل */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="flex items-center gap-3">
            <AvatarUpload
              profileId={profileId!}
              currentUrl={profile?.avatar_url ?? null}
              fallback={initials(profile?.full_name ?? "؟")}
            />
            <div className="flex-1 min-w-0">
              <h1 className="font-black text-base text-[#0F172A] leading-tight truncate">
                {profile?.full_name}
              </h1>
              <div className="flex flex-wrap items-center gap-1 mt-1">
                <RoleBadge role={profile?.role} />
                {profile?.is_hr_member && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5438DC]/15 text-[#5438DC]">
                    📋 لجنة
                  </span>
                )}
              </div>
              {profile?.phone_number && (
                <a
                  href={`tel:${profile.phone_number}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#357DED] hover:underline mt-1.5"
                  dir="ltr"
                >
                  📞 {formatPhone(profile.phone_number)}
                </a>
              )}
            </div>
          </div>

          {/* بيانات إضافية مدمجة كأسطر */}
          {(profile?.birth_date || profile?.created_at) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-[#F1F5F9] text-xs">
              {profile?.birth_date && (
                <span className="text-[#64748B] font-semibold">
                  🎂 <span className="text-[#0F172A]">{formatDate(profile.birth_date)}</span>
                </span>
              )}
              {profile?.created_at && (
                <span className="text-[#64748B] font-semibold">
                  📅 انضم في <span className="text-[#0F172A]">{formatDate(profile.created_at)}</span>
                </span>
              )}
            </div>
          )}

          <div className="mt-3">
            <EditMyProfileButton profile={profile} />
          </div>
        </div>

        {/* الأب */}
        {father && (
          <Section title="الأب" icon="👨">
            <PersonRow person={father} />
          </Section>
        )}

        {/* الأبناء */}
        {children && children.length > 0 && (
          <Section title="الأبناء" icon="👨‍👦" count={children.length}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {children.map((c: any) => <PersonRow key={c.id} person={c} />)}
            </div>
          </Section>
        )}

      </main>
    </PageBackground>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#F1F5F9] bg-[#F8FAFC]">
        <span className="text-base">{icon}</span>
        <span className="font-black text-sm text-[#0F172A]">{title}</span>
        {count !== undefined && (
          <span className="px-1.5 py-0 rounded-full bg-[#5438DC]/15 text-[#5438DC] text-[10px] font-black">
            {count}
          </span>
        )}
      </div>
      <div className="p-2.5">{children}</div>
    </div>
  );
}

function PersonRow({ person }: { person: any }) {
  return (
    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#357DED] hover:shadow-sm transition">
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
        <div className="text-[11px] text-[#64748B]">
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
      ⭐ {label}
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" }).format(d);
}
