import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { redirect } from "next/navigation";
import { PendingMembersClient } from "./PendingMembersClient";

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

export default async function PendingMembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", getProfileId(user)!)
    .single();

  if (!MODERATOR_ROLES.includes(profile?.role ?? "")) redirect("/home");

  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, full_name, phone_number, created_at, avatar_url")
    .eq("role", "pending")
    .order("created_at", { ascending: false });

  return (
    <PageBackground theme="admin">
      <main className="max-w-4xl mx-auto p-6 space-y-4">
      <PageHero
        theme="admin"
        title="⏳ طلبات الأعضاء"
        subtitle={`${members?.length ?? 0} طلب في انتظار المراجعة`}
      />

      <PendingMembersClient
        members={members ?? []}
        canReject={["owner", "admin", "monitor"].includes(profile?.role ?? "")}
      />
    </main>
    </PageBackground>
  );
}
