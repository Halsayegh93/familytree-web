import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

export default async function TreeHealthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", getProfileId(user)!).single();
  if (!MODERATOR_ROLES.includes(profile?.role ?? "")) redirect("/home");

  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, full_name, father_id, birth_date, phone_number, avatar_url, role, status, is_deceased")
    .neq("role", "pending")
    .limit(10000);

  const list = members ?? [];
  const noFather = list.filter((m) => !m.father_id);
  const noBirthDate = list.filter((m) => !m.birth_date);
  const noPhone = list.filter((m) => !m.phone_number && !m.is_deceased);

  return (
    <PageBackground theme="admin">
      <main className="max-w-4xl mx-auto p-6 space-y-4">
      <PageHero
        theme="admin"
        title="صحة الشجرة"
        subtitle="فحص بيانات الشجرة — أعضاء بياناتهم ناقصة"
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="بدون أب" value={noFather.length} color="#F59E0B" />
        <Stat label="بدون تاريخ ميلاد" value={noBirthDate.length} color="#3B82F6" />
        <Stat label="بدون هاتف" value={noPhone.length} color="#EF4444" />
      </div>

      <Section title="بدون أب" members={noFather} color="#F59E0B" />
      <Section title="بدون تاريخ ميلاد" members={noBirthDate.slice(0, 50)} color="#3B82F6" />
      <Section title="بدون هاتف (أحياء)" members={noPhone.slice(0, 50)} color="#EF4444" />
    </main>
    </PageBackground>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] text-center">
      <div className="text-3xl font-black" style={{ color }}>{value}</div>
      <div className="text-xs text-[#64748B] mt-1">{label}</div>
    </div>
  );
}

function Section({ title, members, color }: { title: string; members: any[]; color: string }) {
  if (members.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      <div className="px-5 py-3 font-black flex items-center gap-2" style={{ background: `${color}15`, color }}>
        ⚠️ {title} — {members.length}
      </div>
      <div className="divide-y divide-[#E2E8F0] max-h-96 overflow-y-auto">
        {members.map((m) => (
          <div key={m.id} className="px-5 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center font-bold overflow-hidden">
              {m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                m.first_name?.[0] ?? "؟"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[#0F172A] truncate">{m.full_name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
