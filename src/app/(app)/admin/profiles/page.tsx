import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { ProfilesListClient } from "./ProfilesListClient";
import { FollowUpDashboard } from "./FollowUpDashboard";
import { MembersTabs } from "./MembersTabs";

// لا تكاش — يجلب البيانات الحديثة في كل زيارة
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

export default async function AdminProfilesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_hr_member")
    .eq("id", getProfileId(user)!)
    .single();

  const isHR = profile?.is_hr_member === true;
  const canModerate = MODERATOR_ROLES.includes(profile?.role ?? "");
  if (!isHR && !canModerate) redirect("/home");

  const canEdit = ["owner", "admin", "monitor"].includes(profile?.role ?? "");

  // كل الأعضاء
  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, full_name, phone_number, role, status, avatar_url, is_deceased, birth_date, created_at, father_id")
    .neq("role", "pending")
    .order("full_name", { ascending: true })
    .limit(10000);

  // ============ حصر الفروع ============
  // حساب الفرع لكل عضو (الجيل ٣ من الجذر = الفرع الرئيسي)
  const memberById = new Map<string, any>();
  (members ?? []).forEach((m: any) => memberById.set(m.id, m));

  function getBranch(memberId: string): { id: string; name: string } | null {
    const lineage: any[] = [];
    let cur: any = memberById.get(memberId);
    let safety = 50;
    while (cur && safety-- > 0) {
      lineage.push(cur);
      cur = cur.father_id ? memberById.get(cur.father_id) : null;
    }
    // lineage[length-1] = الجذر، lineage[length-2] = الجيل ٢، lineage[length-3] = الجيل ٣ (الفرع)
    const branchNode =
      lineage.length >= 3
        ? lineage[lineage.length - 3]
        : lineage.length >= 2
        ? lineage[lineage.length - 2]
        : lineage[lineage.length - 1];
    if (!branchNode) return null;
    return { id: branchNode.id, name: branchNode.full_name };
  }

  const membersWithBranch = (members ?? []).map((m: any) => {
    const branch = getBranch(m.id);
    return {
      ...m,
      branch_id: branch?.id ?? null,
      branch_name: branch?.name ?? null,
    };
  });

  // جلب حالة النشاط للأعضاء (آخر فعل + جهاز نشط)
  let activityMap: Record<string, { is_active: boolean; days_since_active: number | null; last_sign_in_at: string | null }> = {};
  if (members && members.length > 0) {
    const { data: activity } = await supabase.rpc("get_members_activity", {
      member_ids: members.map((m: any) => m.id),
    });

    if (activity) {
      activityMap = (activity as any[]).reduce((acc, row) => {
        // الأحدث من last_active_at (موقع/تطبيق) أو last_device_active
        const candidates = [row.last_active_at, row.last_device_active]
          .filter((d) => d && new Date(d).getFullYear() > 2000);
        const latest = candidates.sort().reverse()[0] ?? null;
        acc[row.member_id] = {
          is_active: row.is_active,
          days_since_active: row.days_since_active,
          last_sign_in_at: latest,
        };
        return acc;
      }, {} as typeof activityMap);
    }
  }

  const membersWithActivity = membersWithBranch.map((m: any) => ({
    ...m,
    is_active: activityMap[m.id]?.is_active ?? false,
    days_since_active: activityMap[m.id]?.days_since_active ?? null,
    last_sign_in_at: activityMap[m.id]?.last_sign_in_at ?? null,
  }));

  // بيانات لوحة المتابعة (لأعضاء اللجنة فقط)
  let trackedMembers: any[] = [];
  let recentNotes: any[] = [];
  let recentContact: any[] = [];

  if (isHR) {
    const [
      { data: notesRaw },
      { data: contactRaw },
      { data: docsRaw },
    ] = await Promise.all([
      supabase.from("hr_notes").select("member_id, status, created_at"),
      supabase.from("hr_contact_log").select("member_id, status, contacted_at"),
      supabase.from("hr_documents").select("member_id, status, created_at"),
    ]);

    const latestStatusByMember = new Map<string, { status: string; date: string }>();
    function record(memberId: string, status: string | null, date: string | null) {
      if (!status || !date) return;
      const existing = latestStatusByMember.get(memberId);
      if (!existing || new Date(date) > new Date(existing.date)) {
        latestStatusByMember.set(memberId, { status, date });
      }
    }
    notesRaw?.forEach((n: any) => record(n.member_id, n.status, n.created_at));
    contactRaw?.forEach((c: any) => record(c.member_id, c.status, c.contacted_at));
    docsRaw?.forEach((d: any) => record(d.member_id, d.status, d.created_at));

    const trackedIds = Array.from(latestStatusByMember.keys());

    if (trackedIds.length > 0) {
      const { data: rows } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone_number, is_deceased, status")
        .in("id", trackedIds)
        .order("full_name");
      trackedMembers = (rows ?? []).map((m: any) => ({
        ...m,
        hr_status: latestStatusByMember.get(m.id)?.status,
      }));
    }

    const { data: rNotes } = await supabase
      .from("hr_notes")
      .select("id, member_id, note, status, created_at, profiles!hr_notes_member_id_fkey(full_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(8);
    recentNotes = rNotes ?? [];

    const { data: rContact } = await supabase
      .from("hr_contact_log")
      .select("id, member_id, reason, summary, channel, status, contacted_at, profiles!hr_contact_log_member_id_fkey(full_name, avatar_url)")
      .order("contacted_at", { ascending: false })
      .limit(8);
    recentContact = rContact ?? [];
  }

  return (
    <PageBackground theme="admin">
      <main className="max-w-6xl mx-auto px-3 md:px-4 py-3 space-y-2">
        {/* Hero مدمج صغير */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            <div>
              <h1 className="text-lg font-black text-[#0F172A] leading-tight">الأعضاء</h1>
              <p className="text-xs text-[#64748B]">{members?.length ?? 0} عضو</p>
            </div>
          </div>
          {isHR && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#5438DC]/15 text-[#5438DC]">
              🔒 لجنة
            </span>
          )}
        </div>

        <MembersTabs
          showFollowUp={isHR}
          members={
            <ProfilesListClient
              members={membersWithActivity}
              canEdit={canEdit}
              isHR={isHR}
            />
          }
          followUp={
            <FollowUpDashboard
              trackedMembers={trackedMembers}
              recentNotes={recentNotes}
              recentContact={recentContact}
              allMembers={members ?? []}
            />
          }
        />
      </main>
    </PageBackground>
  );
}
