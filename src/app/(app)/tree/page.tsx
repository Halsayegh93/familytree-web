import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { TreeBrowser } from "./TreeBrowser";

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

export default async function TreePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: viewer } = await supabase
    .from("profiles")
    .select("role, is_hr_member")
    .eq("id", getProfileId(user)!)
    .single();

  const canModerate = MODERATOR_ROLES.includes(viewer?.role ?? "");
  const isHR = viewer?.is_hr_member === true;

  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, full_name, father_id, role, status, avatar_url, is_deceased, is_hidden_from_tree, sort_order, birth_date, death_date, phone_number")
    .order("sort_order", { ascending: true })
    .limit(10000);

  const visible = (members ?? []).filter(
    (m) => !m.is_hidden_from_tree && m.role !== "pending" && m.status !== "frozen"
  );

  return (
    <PageBackground theme="tree">
      <main className="max-w-6xl mx-auto p-6 space-y-4">
        <PageHero
          theme="tree"
          title="شجرة العائلة"
          subtitle={`تصفّح شجرة العائلة الكاملة — ${visible.length} عضو`}
        />

        <TreeBrowser members={visible} canModerate={canModerate} isHR={isHR} />
      </main>
    </PageBackground>
  );
}
