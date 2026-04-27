import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { RegisterMemberClient } from "./RegisterMemberClient";

export default async function RegisterMemberPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", getProfileId(user)!).single();
  if (!["owner", "admin"].includes(profile?.role ?? "")) redirect("/home");

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name")
    .neq("role", "pending")
    .order("full_name");

  return (
    <PageBackground theme="admin">
      <main className="max-w-2xl mx-auto p-6 space-y-4">
      <PageHero
        theme="admin"
        title="تسجيل عضو جديد"
        subtitle="إضافة عضو جديد يدوياً للشجرة"
      />

      <RegisterMemberClient members={members ?? []} />
    </main>
    </PageBackground>
  );
}
