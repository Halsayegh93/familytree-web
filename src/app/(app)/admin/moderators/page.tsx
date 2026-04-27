import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { ModeratorsClient } from "./ModeratorsClient";

export default async function ModeratorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", getProfileId(user)!).single();
  if (profile?.role !== "owner") redirect("/home");

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, phone_number, role, avatar_url")
    .neq("role", "pending")
    .order("full_name");

  return (
    <PageBackground theme="admin">
      <main className="max-w-4xl mx-auto p-6 space-y-4">
      <PageHero
        theme="admin"
        title="⭐ إدارة الأدوار"
        subtitle="تعيين أدوار فريق الإدارة (مدير · مراقب · مشرف)"
      />

      <ModeratorsClient members={members ?? []} />
    </main>
    </PageBackground>
  );
}
