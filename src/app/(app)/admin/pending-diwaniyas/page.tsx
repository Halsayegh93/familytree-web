import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { PendingDiwaniyasClient } from "./PendingDiwaniyasClient";

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

export default async function PendingDiwaniyasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", getProfileId(user)!).single();
  if (!MODERATOR_ROLES.includes(profile?.role ?? "")) redirect("/home");

  const { data: diwaniyas } = await supabase
    .from("diwaniyas")
    .select("*")
    .eq("approval_status", "pending")
    .order("created_at", { ascending: false });

  return (
    <PageBackground theme="admin">
      <main className="max-w-5xl mx-auto p-6 space-y-4">
        <PageHero
          theme="admin"
          title="موافقة الديوانيات"
          subtitle={`${diwaniyas?.length ?? 0} ديوانية بانتظار المراجعة`}
        />

        <PendingDiwaniyasClient
          diwaniyas={(diwaniyas as any) ?? []}
          canReject={["owner", "admin", "monitor"].includes(profile?.role ?? "")}
        />
      </main>
    </PageBackground>
  );
}
