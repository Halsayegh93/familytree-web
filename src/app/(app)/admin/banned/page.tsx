import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { BannedPhonesClient } from "./BannedPhonesClient";

export default async function BannedPhonesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", getProfileId(user)!).single();
  if (profile?.role !== "owner") redirect("/home");

  const { data: banned } = await supabase
    .from("banned_phones")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <PageBackground theme="admin">
      <main className="max-w-3xl mx-auto p-6 space-y-4">
      <PageHero
        theme="admin"
        title="الأرقام المحظورة"
        subtitle={`${banned?.length ?? 0} رقم محظور`}
      />

      <BannedPhonesClient banned={banned ?? []} userId={getProfileId(user)!} />
    </main>
    </PageBackground>
  );
}
