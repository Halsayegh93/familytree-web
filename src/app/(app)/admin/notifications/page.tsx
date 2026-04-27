import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { NotificationsClient } from "./NotificationsClient";

export default async function NotificationsAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", getProfileId(user)!).single();
  if (!["owner", "admin"].includes(profile?.role ?? "")) redirect("/home");

  return (
    <PageBackground theme="admin">
      <main className="max-w-3xl mx-auto p-6 space-y-4">
      <PageHero
        theme="admin"
        title="إرسال إشعار"
        subtitle="إرسال رسائل وإعلانات لكل أفراد العائلة"
      />

      <NotificationsClient />
    </main>
    </PageBackground>
  );
}
