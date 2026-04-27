import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { CustomReportClient } from "./CustomReportClient";

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", getProfileId(user)!)
    .single();
  if (!MODERATOR_ROLES.includes(profile?.role ?? "")) redirect("/home");

  const [
    { data: members },
    { data: lastSignins },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, full_name, phone_number, birth_date, death_date, is_deceased, role, status, gender, is_married, father_id, created_at, sort_order, avatar_url")
      .neq("role", "pending")
      .order("full_name", { ascending: true })
      .limit(10000),
    supabase.rpc("get_members_last_signin"),
  ]);

  // معرفة آخر دخول لكل عضو
  const lastSigninMap = new Map<string, string>();
  (lastSignins ?? []).forEach((r: any) => {
    if (r.last_sign_in_at) lastSigninMap.set(r.member_id, r.last_sign_in_at);
  });

  // نشط = دخل خلال آخر 30 يوم
  const ACTIVE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const enrichedMembers = (members ?? []).map((m: any) => {
    const lastSignIn = lastSigninMap.get(m.id);
    const hasLoggedIn = !!lastSignIn;
    const isActive = lastSignIn && (now - new Date(lastSignIn).getTime()) <= ACTIVE_THRESHOLD_MS;
    return {
      ...m,
      has_logged_in: hasLoggedIn,
      last_sign_in_at: lastSignIn ?? null,
      is_recently_active: isActive,
    };
  });

  return (
    <PageBackground theme="admin">
      <main className="max-w-6xl mx-auto p-6 space-y-5">
        <div className="print:hidden">
          <PageHero
            theme="admin"
            title="تقرير مخصص"
            subtitle="اختر الحقول وفلتر الأعضاء وأنشئ تقريرك"
          />
        </div>

        <CustomReportClient members={enrichedMembers} />
      </main>
    </PageBackground>
  );
}
