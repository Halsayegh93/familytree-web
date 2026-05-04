import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ActivityTracker } from "@/components/ActivityTracker";
import { getProfileId } from "@/lib/get-profile-id";

// تأكد أن كل صفحة في (app) ديناميكية لتحديث last_active_at مع كل زيارة
export const dynamic = "force-dynamic";

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profileId = getProfileId(user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, is_hr_member")
    .eq("id", profileId!)
    .single();

  // عضو معلق — وجّهه لصفحة الانتظار
  if (profile?.status === "pending") redirect("/pending");

  // تحديث last_active_at — لازم await في server component، الـ fire-and-forget يُلغى
  await supabase.rpc("touch_last_active");

  const canModerate = MODERATOR_ROLES.includes(profile?.role ?? "");
  const isHR = profile?.is_hr_member === true;

  return (
    <>
      <AppHeader canModerate={canModerate} isHR={isHR} />
      <ActivityTracker />
      <div className="flex-1">{children}</div>
    </>
  );
}
