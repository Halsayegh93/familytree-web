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
  // عضوية + انضمام
  approval:           { icon: "🛡️", color: "#10B981", labelAr: "قبول عضوية" },
  join_approved:      { icon: "✋", color: "#10B981", labelAr: "مرحباً بك" },
  account_activated:  { icon: "✅", color: "#10B981", labelAr: "تفعيل حساب" },
  link_request:       { icon: "❓", color: "#357DED", labelAr: "طلب انضمام" },

  // طلبات
  tree_edit:          { icon: "🌳", color: "#357DED", labelAr: "تعديل شجرة" },
  child_add:          { icon: "➕", color: "#357DED", labelAr: "إضافة ابن" },
  deceased_report:    { icon: "🌙", color: "#94A3B8", labelAr: "وفاة" },
  profile_update:     { icon: "🪪", color: "#357DED", labelAr: "تحديث بيانات" },
  phone_change:       { icon: "📞", color: "#3B82F6", labelAr: "تغيير رقم" },
  name_change:        { icon: "🔤", color: "#5438DC", labelAr: "تغيير الاسم" },
  role_change:        { icon: "👑", color: "#F59E0B", labelAr: "تغيير الصلاحية" },
  photo_suggestion:   { icon: "🖼️", color: "#06B6D4", labelAr: "اقتراح صورة" },
  gallery_add:        { icon: "🖼️", color: "#06B6D4", labelAr: "معرض صور" },
  avatar_update:      { icon: "📷", color: "#06B6D4", labelAr: "تحديث صورة" },

  // أخبار + قصص
  news:               { icon: "📰", color: "#357DED", labelAr: "أخبار" },
  news_add:           { icon: "✏️", color: "#357DED", labelAr: "خبر جديد" },
  news_published:     { icon: "📢", color: "#357DED", labelAr: "خبر منشور" },
  news_delete:        { icon: "🗑️", color: "#EF4444", labelAr: "حذف منشور" },
  news_comment:       { icon: "💬", color: "#06B6D4", labelAr: "تعليق" },
  news_like:          { icon: "❤️", color: "#EF4444", labelAr: "إعجاب" },
  news_report:        { icon: "🚩", color: "#F59E0B", labelAr: "بلاغ خبر" },
  story_pending:      { icon: "⏳", color: "#06B6D4", labelAr: "قصة معلقة" },
  story_approved:     { icon: "✅", color: "#10B981", labelAr: "قصة معتمدة" },
  story_rejected:     { icon: "❌", color: "#EF4444", labelAr: "قصة مرفوضة" },

  // الإدارة + رفض
  admin:              { icon: "🔔", color: "#5438DC", labelAr: "إشعار إدارة" },
  request_rejected:   { icon: "👎", color: "#EF4444", labelAr: "طلب مرفوض" },

  // حركة التطبيق — تعديلات المدراء
  admin_edit:               { icon: "✏️", color: "#5438DC", labelAr: "تعديل بيانات" },
  admin_edit_name:          { icon: "🔤", color: "#5438DC", labelAr: "تعديل الاسم" },
  admin_edit_dates:         { icon: "📅", color: "#3B82F6", labelAr: "تعديل التواريخ" },
  admin_edit_phone:         { icon: "📞", color: "#3B82F6", labelAr: "تعديل الهاتف" },
  admin_edit_phone_remove:  { icon: "📵", color: "#EF4444", labelAr: "حذف الهاتف" },
  admin_edit_role:          { icon: "👑", color: "#F59E0B", labelAr: "تعديل الصلاحية" },
  admin_edit_father:        { icon: "🌿", color: "#5438DC", labelAr: "تعديل الأب" },
  admin_edit_avatar:        { icon: "📷", color: "#06B6D4", labelAr: "تعديل الصورة" },
  admin_edit_avatar_remove: { icon: "❌", color: "#EF4444", labelAr: "حذف الصورة" },
  admin_edit_child_add:     { icon: "➕", color: "#10B981", labelAr: "إضافة ابن" },
  admin_child_add:          { icon: "➕", color: "#10B981", labelAr: "إضافة ابن" }, // legacy
  admin_edit_child_remove:  { icon: "➖", color: "#EF4444", labelAr: "حذف ابن" },
  member_add:               { icon: "🪪", color: "#10B981", labelAr: "إضافة عضو" },
  member_delete:            { icon: "🚫", color: "#EF4444", labelAr: "حذف عضو" },

  // نظام
  admin_request:      { icon: "📥", color: "#5438DC", labelAr: "طلب إداري" },
  contact_message:    { icon: "✉️", color: "#357DED", labelAr: "تواصل" },
  weekly_digest:      { icon: "📊", color: "#0F766E", labelAr: "ملخص أسبوعي" },
  general:            { icon: "🔔", color: "#357DED", labelAr: "إشعار" },
};

/// Set of kinds that go in the "Activity" tab (admin actions only)
export const ACTIVITY_KINDS = new Set<string>([
  "tree_edit",
  "admin_edit", "admin_edit_name", "admin_edit_dates", "admin_edit_phone",
  "admin_edit_role", "admin_edit_father", "admin_edit_avatar", "admin_edit_avatar_remove",
  "admin_edit_phone_remove",
  "admin_edit_child_add", "admin_edit_child_remove", "admin_child_add",
  "member_add", "member_delete",
  "account_activated", "news_published", "news_delete", "role_change",
]);

/// Set of kinds that have an actionable request (approve/reject buttons)
export const ACTIONABLE_KINDS = new Set<string>([
  "link_request", "child_add", "phone_change", "name_change",
  "tree_edit", "deceased_report", "photo_suggestion", "news_report",
]);

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
