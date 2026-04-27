import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { DevicesClient } from "./DevicesClient";

export default async function DevicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", getProfileId(user)!).single();
  if (profile?.role !== "owner") redirect("/home");

  const { data: devices } = await supabase
    .from("device_tokens")
    .select("*, profiles(full_name, avatar_url)")
    .order("updated_at", { ascending: false });

  return (
    <PageBackground theme="admin">
      <main className="max-w-4xl mx-auto p-6 space-y-4">
      <PageHero
        theme="admin"
        title="إدارة الأجهزة"
        subtitle={`${devices?.length ?? 0} جهاز مسجل`}
      />

      <DevicesClient devices={(devices as any) ?? []} />
    </main>
    </PageBackground>
  );
}
