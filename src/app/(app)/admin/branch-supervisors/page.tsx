import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { BranchSupervisorsClient } from "./BranchSupervisorsClient";

const ALLOWED = ["owner", "admin"];

export default async function BranchSupervisorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", getProfileId(user)!)
    .single();
  if (!ALLOWED.includes(profile?.role ?? "")) redirect("/home");

  // كل الأعضاء (للاختيار)
  const { data: allMembers } = await supabase
    .from("profiles")
    .select("id, full_name, father_id, role, avatar_url")
    .neq("role", "pending")
    .order("full_name");

  // الفروع الحالية
  const { data: existing } = await supabase
    .from("branch_supervisors")
    .select(`
      id, branch_root_id, supervisor_id, notes, created_at,
      branch:profiles!branch_supervisors_branch_root_id_fkey(id, full_name, avatar_url),
      supervisor:profiles!branch_supervisors_supervisor_id_fkey(id, full_name, avatar_url)
    `);

  // اقتراح الفروع المحتملة (الجيل 3 و 4 من عبدالله)
  const memberById = new Map<string, any>();
  (allMembers ?? []).forEach((m: any) => memberById.set(m.id, m));

  function depthFromRoot(id: string): number {
    let depth = 0;
    let cur = memberById.get(id);
    while (cur?.father_id && depth < 50) {
      const parent = memberById.get(cur.father_id);
      if (!parent) break;
      depth++;
      cur = parent;
    }
    return depth;
  }

  const suggestedBranches = (allMembers ?? []).filter((m: any) => {
    const d = depthFromRoot(m.id);
    return d === 2 || d === 3; // الجيل 3 (depth 2) أو الجيل 4 (depth 3)
  });

  return (
    <PageBackground theme="admin">
      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <PageHero
          theme="admin"
          title="مشرفو الفروع"
          subtitle={`${(existing ?? []).length} فرع لديه مشرف معيّن — يعتمد بيانات أعضائه`}
        />

        <BranchSupervisorsClient
          existing={(existing as any) ?? []}
          allMembers={(allMembers as any) ?? []}
          suggestedBranches={suggestedBranches}
        />
      </main>
    </PageBackground>
  );
}
