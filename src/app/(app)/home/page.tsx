import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageBackground } from "@/components/PageHero";
import Link from "next/link";

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = getProfileId(user)!;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, full_name, role, avatar_url, status")
    .eq("id", userId)
    .single();

  const canModerate = MODERATOR_ROLES.includes(profile?.role ?? "");

  // ============ بيانات عامة ============
  const { data: visibleMembers } = await supabase
    .from("profiles")
    .select("id, is_hidden_from_tree")
    .neq("role", "pending")
    .neq("status", "frozen")
    .limit(10000);

  const membersCount = (visibleMembers ?? []).filter(
    (m: any) => !m.is_hidden_from_tree
  ).length;

  const [
    { count: projectsCount },
    { count: diwaniyasCount },
    { count: unreadCount },
  ] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("approval_status", "approved"),
    supabase.from("diwaniyas").select("*", { count: "exact", head: true }).eq("approval_status", "approved"),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("target_member_id", userId)
      .eq("is_read", false),
  ]);

  // ============ بيانات الإدارة ============
  let pendingMembers = 0;
  let pendingProjects = 0;
  let pendingDiwaniyas = 0;

  if (canModerate) {
    const [pm, pp, pd] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "pending"),
      supabase.from("projects").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
      supabase.from("diwaniyas").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
    ]);
    pendingMembers = pm.count ?? 0;
    pendingProjects = pp.count ?? 0;
    pendingDiwaniyas = pd.count ?? 0;
  }

  const totalPending = pendingMembers + pendingProjects + pendingDiwaniyas;

  // ============ آخر إشعارات ============
  const { data: recentNotifs } = await supabase
    .from("notifications")
    .select("id, title, body, kind, created_at, is_read")
    .eq("target_member_id", userId)
    .order("created_at", { ascending: false })
    .limit(4);

  return (
    <PageBackground theme="home">
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-7 space-y-5">
        {/* ═══════ Hero ═══════ */}
        <HeroBanner
          firstName={profile?.first_name ?? "بك"}
          fullName={profile?.full_name ?? null}
          role={profile?.role ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          unreadCount={unreadCount ?? 0}
        />

        {/* ═══════ Admin: Pending alert ═══════ */}
        {canModerate && totalPending > 0 && (
          <PendingAlert
            members={pendingMembers}
            projects={pendingProjects}
            diwaniyas={pendingDiwaniyas}
          />
        )}

        {/* ═══════ نظرة سريعة ═══════ */}
        <Section icon="📊" title="نظرة سريعة" subtitle="إحصائيات العائلة">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon="👨‍👩‍👧"
              label="أعضاء العائلة"
              value={membersCount}
              gradient="from-[#357DED] to-[#5C9AF2]"
              bgTint="#357DED"
            />
            <StatCard
              icon="🏛️"
              label="ديوانيات"
              value={diwaniyasCount ?? 0}
              gradient="from-[#D97706] to-[#F59E0B]"
              bgTint="#D97706"
            />
            <StatCard
              icon="💼"
              label="مشاريع"
              value={projectsCount ?? 0}
              gradient="from-[#06B6D4] to-[#22D3EE]"
              bgTint="#06B6D4"
            />
            <StatCard
              icon="🔔"
              label="إشعاراتي"
              value={unreadCount ?? 0}
              gradient="from-[#EF4444] to-[#F87171]"
              bgTint="#EF4444"
              href="/notifications"
              highlight={(unreadCount ?? 0) > 0}
            />
          </div>
        </Section>

        {/* ═══════ الأقسام ═══════ */}
        <Section icon="🎯" title="الأقسام" subtitle="تنقل سريع">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <FeatureCard
              icon="🌳"
              title="الشجرة"
              desc="تصفح شجرة العائلة"
              href="/tree"
              color="#10B981"
            />
            <FeatureCard
              icon="🏛️"
              title="الديوانيات"
              desc="مواعيد وأماكن"
              href="/diwaniyas"
              color="#D97706"
            />
            <FeatureCard
              icon="💼"
              title="المشاريع"
              desc="مشاريع العائلة"
              href="/projects"
              color="#06B6D4"
            />
            <FeatureCard
              icon="🔔"
              title="الإشعارات"
              desc="صندوق الوارد"
              href="/notifications"
              color="#EF4444"
              badge={unreadCount ?? 0}
            />
            <FeatureCard
              icon="👤"
              title="حسابي"
              desc="ملفك الشخصي"
              href="/profile"
              color="#EC4899"
            />
            {canModerate && (
              <FeatureCard
                icon="🛡️"
                title="الإدارة"
                desc="لوحة التحكم"
                href="/admin"
                color="#5438DC"
                badge={totalPending}
              />
            )}
          </div>
        </Section>

        {/* ═══════ Admin: إجراءات سريعة ═══════ */}
        {canModerate && (
          <Section icon="⚡" title="إجراءات سريعة" subtitle={`أدوات ${roleLabel(profile?.role)}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AdminActionCard
                icon="👥"
                title="طلبات الانضمام"
                desc="مراجعة الأعضاء الجدد"
                href="/admin/pending-members"
                color="#F59E0B"
                badge={pendingMembers}
              />
              <AdminActionCard
                icon="💼"
                title="مشاريع للموافقة"
                desc="مشاريع تنتظر المراجعة"
                href="/admin/pending-projects"
                color="#06B6D4"
                badge={pendingProjects}
              />
              <AdminActionCard
                icon="🏛️"
                title="ديوانيات للموافقة"
                desc="ديوانيات تنتظر المراجعة"
                href="/admin/pending-diwaniyas"
                color="#D97706"
                badge={pendingDiwaniyas}
              />
              <AdminActionCard
                icon="📋"
                title="إدارة الأعضاء"
                desc="بحث ومتابعة"
                href="/admin/profiles"
                color="#3B82F6"
              />
              <AdminActionCard
                icon="🔔"
                title="إرسال إشعار"
                desc="رسالة لجميع الأعضاء"
                href="/admin/notifications"
                color="#5438DC"
              />
              <AdminActionCard
                icon="📊"
                title="تقارير وإحصائيات"
                desc="تحليلات العائلة"
                href="/admin/analytics"
                color="#10B981"
              />
            </div>
          </Section>
        )}

        {/* ═══════ نشاطي الأخير ═══════ */}
        {recentNotifs && recentNotifs.length > 0 && (
          <Section
            icon="📬"
            title="نشاطي الأخير"
            subtitle={`آخر ${recentNotifs.length} إشعارات`}
            action={
              <Link
                href="/notifications"
                className="text-sm font-bold text-[#357DED] hover:underline"
              >
                عرض الكل ←
              </Link>
            }
          >
            <div className="bg-white rounded-2xl border border-[#E2E8F0] divide-y divide-[#E2E8F0] overflow-hidden">
              {recentNotifs.map((n) => (
                <Link
                  key={n.id}
                  href="/notifications"
                  className={`flex items-start gap-3 p-3 hover:bg-[#F8FAFC] transition ${
                    !n.is_read ? "bg-[#FEF9E7]/40" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center text-lg flex-shrink-0 relative">
                    🔔
                    {!n.is_read && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#EF4444] border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-[#0F172A] truncate">{n.title}</h4>
                    {n.body && (
                      <p className="text-xs text-[#64748B] line-clamp-1 mt-0.5">{n.body}</p>
                    )}
                    <div className="text-[11px] text-[#94A3B8] mt-1 font-semibold">
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}
      </main>
    </PageBackground>
  );
}

// ═══════════ Components ═══════════

function HeroBanner({
  firstName,
  fullName,
  role,
  avatarUrl,
  unreadCount,
}: {
  firstName: string;
  fullName: string | null;
  role: string | null;
  avatarUrl: string | null;
  unreadCount: number;
}) {
  const greeting = getGreeting();
  const roleColor = roleColorOf(role);

  return (
    <div className="relative overflow-hidden rounded-3xl p-5 md:p-7 bg-gradient-to-br from-[#357DED] via-[#5438DC] to-[#7C3AED] shadow-xl">
      {/* خلفية زخرفية */}
      <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-16 -right-12 w-56 h-56 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex items-center gap-4">
        {/* الأفاتار */}
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/20 backdrop-blur border-2 border-white/40 overflow-hidden flex-shrink-0 shadow-lg">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white">
              {firstName?.[0] ?? "؟"}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-white">
          <div className="text-sm font-semibold text-white/80 mb-0.5">
            {greeting} 👋
          </div>
          <h1 className="text-xl md:text-2xl font-black truncate">{firstName}</h1>
          {fullName && (
            <p className="text-xs md:text-sm text-white/70 truncate mt-0.5">
              {fullName}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black"
              style={{ background: `${roleColor}30`, color: "white" }}
            >
              <span>⭐</span>
              <span>{roleLabel(role)}</span>
            </span>
            {unreadCount > 0 && (
              <Link
                href="/notifications"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#EF4444] text-white hover:bg-[#DC2626] transition"
              >
                <span>🔔</span>
                <span>{unreadCount} جديد</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingAlert({
  members,
  projects,
  diwaniyas,
}: {
  members: number;
  projects: number;
  diwaniyas: number;
}) {
  const total = members + projects + diwaniyas;
  return (
    <Link
      href="/admin"
      className="block bg-gradient-to-l from-[#F59E0B] to-[#F97316] rounded-2xl p-4 shadow-md hover:shadow-lg transition group"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/30 backdrop-blur flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
          ⚠️
        </div>
        <div className="flex-1 text-white">
          <h3 className="font-black text-base">{total} طلب ينتظر المراجعة</h3>
          <div className="flex flex-wrap gap-2 mt-1 text-xs font-semibold text-white/90">
            {members > 0 && <span>👥 {members} عضو</span>}
            {projects > 0 && <span>💼 {projects} مشروع</span>}
            {diwaniyas > 0 && <span>🏛️ {diwaniyas} ديوانية</span>}
          </div>
        </div>
        <span className="text-2xl text-white/80 group-hover:translate-x-1 transition-transform">←</span>
      </div>
    </Link>
  );
}

function Section({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <h2 className="font-black text-base md:text-lg text-[#0F172A] leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] md:text-xs text-[#64748B]">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  gradient,
  bgTint,
  href,
  highlight,
}: {
  icon: string;
  label: string;
  value: number | string;
  gradient: string;
  bgTint: string;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <div
      className={`relative bg-white rounded-2xl border p-4 transition hover:shadow-md hover:-translate-y-0.5 overflow-hidden ${
        highlight ? "border-[#EF4444]/40 shadow-sm" : "border-[#E2E8F0]"
      }`}
    >
      {highlight && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
      )}
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl shadow-sm mb-2`}
        style={{ boxShadow: `0 4px 12px ${bgTint}30` }}
      >
        {icon}
      </div>
      <div className="text-2xl font-black text-[#0F172A] leading-none">{value}</div>
      <div className="text-xs text-[#64748B] mt-1 font-semibold">{label}</div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

function FeatureCard({
  icon,
  title,
  desc,
  href,
  color,
  badge,
}: {
  icon: string;
  title: string;
  desc: string;
  href: string;
  color: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group relative bg-white rounded-2xl border border-[#E2E8F0] p-4 transition hover:shadow-md hover:-translate-y-0.5 overflow-hidden"
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-2 left-2 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#EF4444] text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 transition-transform group-hover:scale-110 group-hover:rotate-3"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <h3 className="font-black text-[#0F172A] text-sm leading-tight">{title}</h3>
      <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">{desc}</p>
    </Link>
  );
}

function AdminActionCard({
  icon,
  title,
  desc,
  href,
  color,
  badge,
}: {
  icon: string;
  title: string;
  desc: string;
  href: string;
  color: string;
  badge?: number;
}) {
  const hasBadge = badge !== undefined && badge > 0;
  return (
    <Link
      href={href}
      className="group relative rounded-2xl p-4 transition hover:shadow-md hover:-translate-y-0.5 flex items-center gap-3 border-2 overflow-hidden"
      style={{
        background: hasBadge
          ? `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`
          : `linear-gradient(135deg, ${color}10 0%, ${color}03 100%)`,
        borderColor: hasBadge ? `${color}50` : `${color}25`,
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md"
        style={{ background: color, color: "white" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-[#0F172A] text-sm leading-tight">{title}</h3>
        <p className="text-[11px] text-[#64748B] truncate mt-0.5">{desc}</p>
      </div>
      {hasBadge && (
        <span
          className="min-w-[28px] h-7 px-2 rounded-full text-xs font-black flex items-center justify-center shadow-md flex-shrink-0 animate-pulse"
          style={{ background: color, color: "white" }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <span
        className="text-xl flex-shrink-0 group-hover:translate-x-1 transition-transform"
        style={{ color }}
      >
        ←
      </span>
    </Link>
  );
}

// ═══════════ Helpers ═══════════

function roleLabel(role?: string | null): string {
  switch (role) {
    case "owner":
    case "admin":
      return "مدير";
    case "monitor":
      return "مراقب";
    case "supervisor":
      return "مشرف";
    case "member":
      return "عضو";
    default:
      return "عضو";
  }
}

function roleColorOf(role?: string | null): string {
  switch (role) {
    case "owner":
    case "admin":
      return "#5438DC";
    case "monitor":
      return "#06B6D4";
    case "supervisor":
      return "#10B981";
    default:
      return "#357DED";
  }
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "ليلة سعيدة";
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "نهارك سعيد";
  if (hour < 20) return "مساء الخير";
  return "مساء النور";
}

function timeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);

  if (d >= 1) return `قبل ${d} يوم`;
  if (h >= 1) return `قبل ${h} ساعة`;
  if (m >= 1) return `قبل ${m} دقيقة`;
  return "الآن";
}
