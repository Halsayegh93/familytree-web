import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { ProfilesListClient } from "./ProfilesListClient";
import { FollowUpDashboard } from "./FollowUpDashboard";
import { MembersTabs } from "./MembersTabs";

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
    .select("id, first_name, full_name, phone_number, role, status, avatar_url, is_deceased, birth_date, created_at")
    .neq("role", "pending")
    .order("full_name", { ascending: true })
    .limit(10000);

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
      <main className="max-w-6xl mx-auto p-6 space-y-3">
        <PageHero
          theme="admin"
          title="الأعضاء"
          subtitle={`${members?.length ?? 0} عضو في النظام`}
          badge={isHR ? { label: "🔒 لجنة", private: true } : undefined}
        />

        <MembersTabs
          showFollowUp={isHR}
          members={
            <ProfilesListClient
              members={members ?? []}
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
