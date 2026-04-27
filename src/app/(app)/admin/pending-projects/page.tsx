import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { PendingProjectsClient } from "./PendingProjectsClient";

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

export default async function PendingProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", getProfileId(user)!).single();
  if (!MODERATOR_ROLES.includes(profile?.role ?? "")) redirect("/home");

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("approval_status", "pending")
    .order("created_at", { ascending: false });

  return (
    <PageBackground theme="admin">
      <main className="max-w-5xl mx-auto p-6 space-y-4">
      <PageHero
        theme="admin"
        title="موافقة المشاريع"
        subtitle={`${projects?.length ?? 0} مشروع بانتظار المراجعة`}
      />

      <PendingProjectsClient
        projects={(projects as any) ?? []}
        canReject={["owner", "admin", "monitor"].includes(profile?.role ?? "")}
      />
    </main>
    </PageBackground>
  );
}
