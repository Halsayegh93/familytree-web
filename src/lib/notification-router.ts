/**
 * يُحوّل نوع الإشعار إلى رابط — كل إشعار يفتح المكان المناسب.
 * يطابق منطق التطبيق: news → /home، طلبات الإدارة → /admin/...، إلخ.
 */

export type NotificationKindMeta = {
  href: string;
  icon: string;
  color: string;
  labelAr: string;
};

const META: Record<string, Omit<NotificationKindMeta, "href">> = {
  approval:           { icon: "✅", color: "#10B981", labelAr: "عضوية" },
  join_approved:      { icon: "✅", color: "#10B981", labelAr: "عضوية" },
  account_activated:  { icon: "🎉", color: "#10B981", labelAr: "تفعيل حساب" },
  news:               { icon: "📰", color: "#357DED", labelAr: "أخبار" },
  news_add:           { icon: "📰", color: "#357DED", labelAr: "أخبار" },
  news_published:     { icon: "📢", color: "#357DED", labelAr: "خبر جديد" },
  news_comment:       { icon: "💬", color: "#06B6D4", labelAr: "تعليق" },
  news_like:          { icon: "❤️", color: "#EF4444", labelAr: "إعجاب" },
  news_report:        { icon: "⚠️", color: "#F59E0B", labelAr: "بلاغ خبر" },
  admin:              { icon: "🛡️", color: "#5438DC", labelAr: "إدارة" },
  admin_request:      { icon: "🛡️", color: "#5438DC", labelAr: "إدارة" },
  link_request:       { icon: "🔗", color: "#06B6D4", labelAr: "طلب ربط" },
  child_add:          { icon: "👶", color: "#06B6D4", labelAr: "إضافة ابن" },
  phone_change:       { icon: "📞", color: "#3B82F6", labelAr: "تغيير رقم" },
  deceased_report:    { icon: "🤍", color: "#94A3B8", labelAr: "وفاة" },
  contact_message:    { icon: "✉️", color: "#357DED", labelAr: "تواصل" },
  gallery_add:        { icon: "🖼️", color: "#06B6D4", labelAr: "معرض صور" },
  profile_update:     { icon: "👤", color: "#5438DC", labelAr: "تحديث بيانات" },
  role_change:        { icon: "🛡️", color: "#F59E0B", labelAr: "تغيير الصلاحية" },
  weekly_digest:      { icon: "📋", color: "#0F766E", labelAr: "ملخص أسبوعي" },
  tree_edit:          { icon: "✏️", color: "#5438DC", labelAr: "تعديل شجرة" },
  story_pending:      { icon: "📖", color: "#06B6D4", labelAr: "قصة معلقة" },
  story_approved:     { icon: "📖", color: "#10B981", labelAr: "قصة معتمدة" },
  story_rejected:     { icon: "📖", color: "#EF4444", labelAr: "قصة مرفوضة" },
};

const FALLBACK = { icon: "🔔", color: "#357DED", labelAr: "عام" };

export function notificationMeta(
  kind: string,
  opts: { canModerate?: boolean; createdBy?: string | null; targetMemberId?: string | null } = {}
): NotificationKindMeta {
  const base = META[kind] ?? FALLBACK;
  const { canModerate = false, createdBy } = opts;

  let href = "/home";

  // طلبات الإدارة → صفحة الإدارة المناسبة (للمدراء فقط)
  if (canModerate) {
    switch (kind) {
      case "admin_request":
      case "link_request":
      case "child_add":
        href = "/admin/pending-members";
        break;
      case "phone_change":
      case "tree_edit":
      case "deceased_report":
      case "profile_update":
        // لو فيه عضو محدد → افتح بروفايله، وإلا قائمة الأعضاء
        href = createdBy ? `/admin/profiles/${createdBy}` : "/admin/profiles";
        break;
      case "role_change":
        href = createdBy ? `/admin/profiles/${createdBy}` : "/admin/moderators";
        break;
      case "contact_message":
        href = "/admin/notifications";
        break;
      case "gallery_add":
      case "story_pending":
        href = createdBy ? `/admin/profiles/${createdBy}` : "/admin";
        break;
    }
  }

  // إشعارات أخبار → الرئيسية
  if (kind.startsWith("news") || kind === "weekly_digest") {
    href = "/home";
  }

  // إشعارات الحساب → البروفايل
  if (kind === "approval" || kind === "join_approved" || kind === "account_activated") {
    href = "/profile";
  }

  if (kind === "story_approved" || kind === "story_rejected") {
    href = "/profile";
  }

  return { ...base, href };
}
