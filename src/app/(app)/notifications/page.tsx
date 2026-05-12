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
  const SELECT = "id, title, body, kind, created_at, is_read, created_by, target_member_id, request_id, request_type";

  const { data: targeted } = await supabase
    .from("notifications")
    .select(SELECT)
    .eq("target_member_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  let broadcasts: typeof targeted = [];
  if (canModerate) {
    const { data } = await supabase
      .from("notifications")
      .select(SELECT)
      .is("target_member_id", null)
      .order("created_at", { ascending: false })
      .limit(200);
    broadcasts = data ?? [];
  }

  const merged = [...(targeted ?? []), ...broadcasts];
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const notifications = merged.slice(0, 300);

  // جلب أسماء المنشئين + الأعضاء المستهدفين (للمدراء فقط — لعرض bywho)
  let creators: Record<string, { full_name: string | null; avatar_url: string | null; role: string | null }> = {};
  if (canModerate) {
    const ids = Array.from(
      new Set(
        notifications
          .flatMap((n) => [n.created_by, n.target_member_id])
          .filter((x): x is string => !!x),
      ),
    );
    if (ids.length > 0) {
      const { data: people } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .in("id", ids);
      (people ?? []).forEach((p) => {
        creators[p.id] = {
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          role: p.role,
        };
      });
    }
  }

  return (
    <NotificationsClient
      initialNotifications={notifications ?? []}
      userId={userId}
      canModerate={canModerate}
      creators={creators}
    />
  );
}
