import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", getProfileId(user)!).single();
  // المدير يدخل بصلاحية قراءة فقط — التعديل للمالك
  const role = profile?.role ?? "";
  if (role !== "owner" && role !== "admin") redirect("/home");
  const canEdit = role === "owner";

  const { data: settings } = await supabase.from("app_settings").select("*").limit(1).single();

  return (
    <PageBackground theme="admin">
      <main className="max-w-3xl mx-auto p-6 space-y-4">
      <PageHero
        theme="admin"
        title="️ إعدادات النظام"
        subtitle="تشغيل وإيقاف ميزات التطبيق"
      />

      {!canEdit && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#357DED]/10 border border-[#357DED]/25">
          <span className="text-lg">👁️</span>
          <div className="flex-1">
            <div className="font-bold text-sm text-[#0F172A]">وضع القراءة فقط</div>
            <div className="text-xs text-[#475569] mt-0.5">
              تقدر تتصفّح الإعدادات. التعديل متاح للمالك فقط.
            </div>
          </div>
        </div>
      )}

      <SettingsClient settings={settings ?? null} userId={getProfileId(user)!} canEdit={canEdit} />
    </main>
    </PageBackground>
  );
}
