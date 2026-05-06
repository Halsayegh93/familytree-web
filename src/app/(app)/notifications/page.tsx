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

  // للمدراء: نجلب الإشعارات الموجهة + broadcast (target_member_id IS NULL)
  // لغير المدراء: فقط الإشعارات الموجهة
  let query = supabase
    .from("notifications")
    .select("id, title, body, kind, created_at, is_read, created_by, target_member_id, request_id, request_type")
    .order("created_at", { ascending: false })
    .limit(300);

  if (canModerate) {
    query = query.or(`target_member_id.eq.${userId},target_member_id.is.null`);
  } else {
    query = query.eq("target_member_id", userId);
  }

  const { data: notifications } = await query;

  return (
    <NotificationsClient
      initialNotifications={notifications ?? []}
      userId={userId}
      canModerate={canModerate}
    />
  );
}
