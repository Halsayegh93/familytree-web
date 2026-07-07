import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { applyCountableFilters } from "@/lib/member-counts";
import { PageBackground } from "@/components/PageHero";
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
  const canManageRoles = viewer?.role === "owner";
  const isHR = viewer?.is_hr_member === true;

  const { data: members } = await applyCountableFilters(
    supabase
      .from("profiles")
      .select("id, first_name, full_name, father_id, mother_id, role, status, avatar_url, is_deceased, is_hidden_from_tree, sort_order, birth_date, death_date, phone_number")
      .order("sort_order", { ascending: true })
  ).limit(10000);

  const visible = members ?? [];

  // ═══ بيانات العلاقات (تاب «العلاقات» — للمدراء فقط) ═══
  // نجلب نساء العائلة والأزواج الخارجيين فقط عند الحاجة لتوفير الحِمل.
  let women: WomanRow[] = [];
  let externalSpouses: ExternalSpouseRow[] = [];

  if (canModerate) {
    const [{ data: w }, { data: ext }] = await Promise.all([
      supabase
        .from("women_members")
        .select("id, first_name, full_name, parent_id, mother_id, husband_id, gender, is_deceased, birth_date, death_date, avatar_url, sort_order")
        .limit(10000),
      supabase
        .from("external_spouses")
        .select("id, woman_id, first_name, full_name, family_name, nationality, is_deceased, notes"),
    ]);
    women = (w ?? []) as WomanRow[];
    externalSpouses = (ext ?? []) as ExternalSpouseRow[];
  }

  return (
    <PageBackground theme="tree">
      <main className="max-w-6xl mx-auto px-3 md:px-4 py-3 space-y-2">
        {/* Hero مدمج صغير */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌳</span>
            <div>
              <h1 className="text-lg font-black text-[#0F172A] leading-tight">شجرة العائلة</h1>
              <p className="text-xs text-[#64748B]">{visible.length} عضو</p>
            </div>
          </div>
        </div>

        <TreeBrowser
          members={visible}
          canModerate={canModerate}
          canManageRoles={canManageRoles}
          isHR={isHR}
          women={women}
          externalSpouses={externalSpouses}
        />
      </main>
    </PageBackground>
  );
}

type WomanRow = {
  id: string;
  first_name: string;
  full_name: string;
  parent_id: string | null;
  mother_id: string | null;
  husband_id: string | null;
  gender: string | null;
  is_deceased: boolean | null;
  birth_date: string | null;
  death_date: string | null;
  avatar_url: string | null;
  sort_order: number | null;
};

type ExternalSpouseRow = {
  id: string;
  woman_id: string;
  first_name: string;
  full_name: string | null;
  family_name: string | null;
  nationality: string | null;
  is_deceased: boolean | null;
  notes: string | null;
};
