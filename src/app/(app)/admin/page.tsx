import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHero, PageBackground } from "@/components/PageHero";

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

export default async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_hr_member")
    .eq("id", getProfileId(user)!)
    .single();

  if (!MODERATOR_ROLES.includes(profile?.role ?? "")) {
    redirect("/home");
  }

  const isOwner = profile?.role === "owner";
  const canEdit = ["owner", "admin", "monitor"].includes(profile?.role ?? "");
  // عضو لجنة شؤون العائلة — فقط المحددين بالـ flag (حتى المالك ما يشوف إلا لو محدد)
  const isCommittee = profile?.is_hr_member === true;

  // إحصائيات
  const [
    { count: totalMembers },
    { count: pendingMembers },
    { count: pendingProjects },
    { count: pendingDiwaniyas },
    { count: bannedPhones },
    { count: frozenAccounts },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "pending"),
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
    supabase.from("diwaniyas").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
    supabase.from("banned_phones").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "frozen"),
  ]);

  return (
    <PageBackground theme="admin">
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <PageHero
        theme="admin"
        title="لوحة الإدارة"
        subtitle={`مرحباً ${roleAr(profile?.role)} — تحكم كامل بالتطبيق`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="إجمالي الأعضاء" value={totalMembers ?? 0} icon="👥" color="#357DED" />
        <StatCard label="طلبات معلقة" value={pendingMembers ?? 0} icon="⏳" color="#F59E0B" badge />
        <StatCard label="مشاريع للموافقة" value={pendingProjects ?? 0} icon="💼" color="#3B82F6" badge />
        <StatCard label="حسابات مجمّدة" value={frozenAccounts ?? 0} icon="🔒" color="#EF4444" />
        <StatCard label="أرقام محظورة" value={bannedPhones ?? 0} icon="🚫" color="#6B7B8D" />
      </div>

      {/* Sections */}
      <Section title="الطلبات والموافقات" icon="📋" color="#F59E0B">
        <ActionRow
          href="/admin/pending-members"
          icon="👤"
          title="طلبات الأعضاء"
          subtitle="موافقة على الأعضاء الجدد"
          badge={pendingMembers ?? 0}
          color="#F59E0B"
        />
        <ActionRow
          href="/admin/pending-projects"
          icon="💼"
          title="موافقة المشاريع"
          subtitle="مراجعة المشاريع قبل عرضها"
          badge={pendingProjects ?? 0}
          color="#3B82F6"
        />
        <ActionRow
          href="/admin/pending-diwaniyas"
          icon="🏛️"
          title="موافقة الديوانيات"
          subtitle="مراجعة الديوانيات قبل عرضها"
          badge={pendingDiwaniyas ?? 0}
          color="#D97706"
        />
      </Section>

      <Section title="إدارة الأعضاء" icon="👥" color="#357DED">
        <ActionRow
          href="/admin/profiles"
          icon="📇"
          title="الأعضاء"
          subtitle="عرض وتعديل وإدارة كل الأعضاء"
          color="#357DED"
        />
        {canEdit && (
          <ActionRow
            href="/admin/register"
            icon="➕"
            title="تسجيل عضو جديد"
            subtitle="إضافة عضو يدوياً"
            color="#10B981"
          />
        )}
        <ActionRow
          href="/admin/tree-health"
          icon="🌳"
          title="صحة الشجرة"
          subtitle="أعضاء بدون أب أو بيانات ناقصة"
          color="#5438DC"
        />
        {canEdit && (
          <ActionRow
            href="/admin/branch-supervisors"
            icon="⭐"
            title="مشرفو الفروع"
            subtitle="مسؤول عن اعتماد بيانات كل فرع"
            color="#F59E0B"
          />
        )}
      </Section>

      {/* لجنة شؤون العائلة موجودة كتاب داخل الأعضاء الآن */}

      <Section title="التقارير والإشعارات" icon="📊" color="#10B981">
        <ActionRow
          href="/admin/notifications"
          icon="📢"
          title="إرسال إشعارات"
          subtitle="إشعارات للأعضاء"
          color="#357DED"
        />
        <ActionRow
          href="/admin/analytics"
          icon="📊"
          title="الإحصائيات الشاملة"
          subtitle="نظرة عامة + رسوم بيانية + PDF"
          color="#5438DC"
        />
        <ActionRow
          href="/admin/reports"
          icon="📋"
          title="تقرير مخصص"
          subtitle="اختر الحقول والفلتر — CSV / PDF"
          color="#10B981"
        />
      </Section>

      {isOwner && (
        <Section title="إعدادات النظام" icon="⚙️" color="#5438DC">
          <ActionRow
            href="/admin/system-health"
            icon="💚"
            title="صحة النظام"
            subtitle="النشاط · الأجهزة · الإشعارات"
            color="#10B981"
          />
          <ActionRow
            href="/admin/settings"
            icon="⚙️"
            title="إعدادات التطبيق"
            subtitle="التسجيل · الأخبار · الميزات · الصيانة"
            color="#357DED"
          />
          <ActionRow
            href="/admin/moderators"
            icon="⭐"
            title="المدراء والمشرفون"
            subtitle="تعيين الأدوار وإدارة الصلاحيات"
            color="#5438DC"
          />
          <ActionRow
            href="/admin/banned"
            icon="🚫"
            title="الأرقام المحظورة"
            subtitle="منع أرقام معينة من التسجيل"
            badge={bannedPhones ?? 0}
            color="#EF4444"
          />
        </Section>
      )}
    </main>
    </PageBackground>
  );
}

// نفس نمط StatCard في الرئيسية: horizontal مع avatar + value + label
function StatCard({
  label,
  value,
  icon,
  color,
  badge,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  badge?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 transition hover:shadow-sm hover:-translate-y-0.5 relative">
      {badge && value > 0 && (
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
      )}
      <div className="flex items-center gap-2.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-black text-[#0F172A] leading-tight">{value}</div>
          <div className="text-xs text-[#64748B] truncate">{label}</div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        borderTop: `3px solid ${color}`,
      }}
    >
      <div className="px-5 py-3 flex items-center gap-2 border-b border-[#F1F5F9]">
        <span className="text-base">{icon}</span>
        <h2 className="font-black text-sm" style={{ color }}>
          {title}
        </h2>
      </div>
      <div>{children}</div>
    </div>
  );
}

// نفس نمط FeatureCard في الرئيسية: avatar + title + desc + chevron
function ActionRow({
  href,
  icon,
  title,
  subtitle,
  badge,
  color,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  badge?: number;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-5 py-2.5 hover:bg-[#F8FAFC] transition border-b border-[#F1F5F9] last:border-0"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
        style={{ background: `${color}10`, color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[#0F172A] truncate text-sm">{title}</div>
        <div className="text-[11px] text-[#94A3B8] truncate">{subtitle}</div>
      </div>
      {badge !== undefined && badge > 0 && (
        <span
          className="min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10px] font-black flex items-center justify-center"
          style={{ background: color }}
        >
          {badge}
        </span>
      )}
      <span className="text-xs text-[#94A3B8] flex-shrink-0 group-hover:text-[#5438DC]">←</span>
    </Link>
  );
}

function roleAr(role?: string | null): string {
  switch (role) {
    case "owner":
      return "مالك";
    case "admin":
      return "مدير";
    case "monitor":
      return "مراقب";
    case "supervisor":
      return "مشرف";
    default:
      return "مدير";
  }
}
