import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { redirect } from "next/navigation";
import { PageHero, PageBackground } from "@/components/PageHero";
import { SystemHealthClient } from "./SystemHealthClient";

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

export default async function SystemHealthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", getProfileId(user)!)
    .single();

  if (!MODERATOR_ROLES.includes(profile?.role ?? "")) redirect("/home");

  // === Activity data (parallel fetch) ===
  const [
    { data: activeNow },
    { data: actions24h },
    { data: recent14d },
    { data: devices },
    { data: webSessions },
    { data: webPushSubs },
  ] = await Promise.all([
    supabase.rpc("get_active_members_now"),
    supabase.rpc("get_recent_member_actions", { hours_back: 24 }),
    supabase.rpc("get_recently_active_members", { days_back: 14 }),
    supabase
      .from("device_tokens")
      .select("token, member_id, platform, environment, updated_at, device_name, profiles(full_name, avatar_url)")
      .order("updated_at", { ascending: false }),
    supabase
      .from("web_sessions")
      .select("member_id, user_agent, last_seen_at, profiles(full_name, avatar_url)")
      .order("last_seen_at", { ascending: false }),
    supabase
      .from("web_push_subscriptions")
      .select("member_id, user_agent, created_at, profiles(full_name)"),
  ]);

  return (
    <PageBackground theme="admin">
      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <PageHero
          theme="admin"
          title="صحة النظام"
          subtitle="النشاط · الأجهزة · الإشعارات"
        />

        <SystemHealthClient
          activeNow={(activeNow as any) ?? []}
          actions24h={(actions24h as any) ?? []}
          recent14d={(recent14d as any) ?? []}
          devices={(devices as any) ?? []}
          webSessions={(webSessions as any) ?? []}
          webPushSubs={(webPushSubs as any) ?? []}
        />
      </main>
    </PageBackground>
  );
}
