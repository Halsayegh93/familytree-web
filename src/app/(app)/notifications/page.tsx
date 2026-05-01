import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { redirect } from "next/navigation";
import { NotificationsClient } from "./NotificationsClient";

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userId = getProfileId(user)!;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const canModerate = MODERATOR_ROLES.includes(profile?.role ?? "");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, kind, created_at, is_read, created_by, target_member_id")
    .eq("target_member_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#357DED] to-[#5438DC] flex items-center justify-center text-2xl">
          🔔
        </div>
        <div className="flex-1">
          <h1 className="font-black text-xl text-[#0F172A]">الإشعارات</h1>
          <p className="text-sm text-[#64748B]">
            {notifications?.length ?? 0} إشعار
          </p>
        </div>
      </div>

      <NotificationsClient
        initialNotifications={notifications ?? []}
        userId={userId}
        canModerate={canModerate}
      />
    </main>
  );
}
