import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", getProfileId(user)!).single();
  if (profile?.role !== "owner") redirect("/home");

  const { data: settings } = await supabase.from("app_settings").select("*").limit(1).single();

  return (
    <PageBackground theme="admin">
      <main className="max-w-3xl mx-auto p-6 space-y-4">
      <PageHero
        theme="admin"
        title="️ إعدادات النظام"
        subtitle="تشغيل وإيقاف ميزات التطبيق"
      />

      <SettingsClient settings={settings ?? null} userId={getProfileId(user)!} />
    </main>
    </PageBackground>
  );
}
