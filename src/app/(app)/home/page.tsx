import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { applyCountableFilters, COUNT_LABELS } from "@/lib/member-counts";
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
  // عدّاد دقيق على السيرفر بدل تحميل قائمة كاملة وفلترتها بالعميل
  const { count: membersCount } = await applyCountableFilters(
    supabase.from("profiles").select("*", { count: "exact", head: true })
  );

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
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-6">
        {/* ═══════ Hero ═══════ */}
        <HeroBanner
          firstName={profile?.first_name ?? "بك"}
          fullName={profile?.full_name ?? null}
          role={profile?.role ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          unreadCount={unreadCount ?? 0}
          membersCount={membersCount ?? 0}
        />

        {/* ═══════ Admin: Pending alert ═══════ */}
        {canModerate && totalPending > 0 && (
          <PendingAlert
            members={pendingMembers}
            projects={pendingProjects}
            diwaniyas={pendingDiwaniyas}
          />
        )}

        {/* ═══════ نظرة سريعة (Bento) ═══════ */}
        <Section icon="📊" title="نظرة سريعة" subtitle="إحصائيات العائلة">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard
              icon="👨‍👩‍👧"
              label={COUNT_LABELS.family}
              value={membersCount ?? 0}
              tint="#357DED"
            />
            <StatCard
              icon="🏛️"
              label="ديوانيات"
              value={diwaniyasCount ?? 0}
              tint="#D97706"
            />
            <StatCard
              icon="💼"
              label="مشاريع"
              value={projectsCount ?? 0}
              tint="#06B6D4"
            />
            <StatCard
              icon="🔔"
              label="إشعاراتي"
              value={unreadCount ?? 0}
              tint="#EF4444"
              href="/notifications"
              highlight={(unreadCount ?? 0) > 0}
            />
          </div>
        </Section>

        {/* ═══════ الأقسام ═══════ */}
        <Section icon="🧭" title="الأقسام" subtitle="تنقل سريع">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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
            <div className="bg-white rounded-3xl border border-[#E9EEF5] divide-y divide-[#EEF2F7] overflow-hidden shadow-[0_2px_16px_-8px_rgba(15,23,42,0.15)]">
              {recentNotifs.map((n) => (
                <Link
                  key={n.id}
                  href="/notifications"
                  className={`flex items-start gap-3 p-3.5 hover:bg-[#F8FAFC] transition ${
                    !n.is_read ? "bg-[#EFF6FF]/50" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#F1F5F9] flex items-center justify-center text-lg flex-shrink-0 relative">
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
                  <span className="text-[#CBD5E1] self-center">←</span>
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
  membersCount,
}: {
  firstName: string;
  fullName: string | null;
  role: string | null;
  avatarUrl: string | null;
  unreadCount: number;
  membersCount: number;
}) {
  const greeting = getGreeting();

  return (
    <div className="relative overflow-hidden rounded-[28px] p-6 md:p-8 shadow-[0_20px_60px_-24px_rgba(53,125,237,0.6)]">
      {/* طبقة التدرج */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#357DED] via-[#4A63E0] to-[#5438DC]" />
      {/* شبكة زخرفية */}
      <div className="absolute -top-16 -left-10 w-56 h-56 rounded-full bg-white/15 blur-3xl" />
      <div className="absolute -bottom-20 -right-10 w-72 h-72 rounded-full bg-[#22D3EE]/20 blur-3xl" />
      <div className="absolute top-1/2 right-1/3 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
      {/* شجرة باهتة */}
      <div className="absolute -bottom-6 left-4 text-[120px] leading-none opacity-[0.08] select-none pointer-events-none">
        🌳
      </div>

      <div className="relative">
        <div className="flex items-center gap-4">
          {/* الأفاتار */}
          <div className="relative flex-shrink-0">
            <div className="w-[68px] h-[68px] md:w-20 md:h-20 rounded-3xl bg-white/20 backdrop-blur-md border border-white/40 overflow-hidden shadow-xl ring-2 ring-white/30">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white">
                  {firstName?.[0] ?? "؟"}
                </div>
              )}
            </div>
            <span className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-white flex items-center justify-center text-[11px] shadow-md">
              ⭐
            </span>
          </div>

          <div className="flex-1 min-w-0 text-white">
            <div className="text-xs md:text-sm font-bold text-white/75 mb-0.5">
              {greeting} 👋
            </div>
            <h1 className="text-2xl md:text-3xl font-black truncate leading-tight">
              {firstName}
            </h1>
            {fullName && (
              <p className="text-xs md:text-sm text-white/70 truncate mt-0.5">
                {fullName}
              </p>
            )}
          </div>

          {/* بادج الدور — يمين */}
          <div className="hidden sm:flex flex-col items-end gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-white/20 backdrop-blur text-white border border-white/25">
              <span>{roleEmoji(role)}</span>
              <span>{roleLabel(role)}</span>
            </span>
          </div>
        </div>

        {/* شريط سفلي زجاجي: تاريخ + إحصائية + إشعارات */}
        <div className="mt-5 flex items-center gap-2 flex-wrap">
          <HeroChip icon="📅" text={todayArabic()} />
          <HeroChip icon="👨‍👩‍👧" text={`${membersCount.toLocaleString("ar")} فرد`} />
          {unreadCount > 0 ? (
            <Link
              href="/notifications"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-black bg-[#EF4444] text-white shadow-md hover:bg-[#DC2626] transition"
            >
              <span>🔔</span>
              <span>{unreadCount} إشعار جديد</span>
            </Link>
          ) : (
            <HeroChip icon="✅" text="لا إشعارات جديدة" />
          )}
        </div>
      </div>
    </div>
  );
}

function HeroChip({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-white/15 backdrop-blur text-white border border-white/20">
      <span>{icon}</span>
      <span>{text}</span>
    </span>
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
      className="group relative block overflow-hidden rounded-3xl p-0.5 shadow-lg hover:shadow-xl transition"
    >
      <div className="absolute inset-0 bg-gradient-to-l from-[#F59E0B] via-[#F97316] to-[#EF4444]" />
      <div className="relative m-[2px] rounded-[22px] bg-gradient-to-l from-[#F59E0B] to-[#F97316] p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
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
          <span className="text-2xl text-white/90 group-hover:-translate-x-1 transition-transform">←</span>
        </div>
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
      <div className="flex items-center justify-between mb-3.5 px-1">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-white border border-[#E9EEF5] flex items-center justify-center text-lg shadow-sm">
            {icon}
          </span>
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
  tint,
  href,
  highlight,
}: {
  icon: string;
  label: string;
  value: number | string;
  tint: string;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <div
      className="group relative bg-white rounded-3xl border p-4 md:p-5 transition hover:shadow-lg hover:-translate-y-1 overflow-hidden shadow-[0_2px_16px_-10px_rgba(15,23,42,0.2)]"
      style={{ borderColor: highlight ? `${tint}55` : "#E9EEF5" }}
    >
      {/* هالة لونية أعلى البطاقة */}
      <div
        className="absolute -top-10 -left-6 w-24 h-24 rounded-full blur-2xl opacity-30 transition group-hover:opacity-50"
        style={{ background: tint }}
      />
      {highlight && (
        <span
          className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ background: tint }}
        />
      )}
      <div className="relative">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm mb-3"
          style={{ background: `${tint}18`, boxShadow: `0 8px 20px -8px ${tint}70` }}
        >
          {icon}
        </div>
        <div className="text-3xl font-black text-[#0F172A] leading-none tabular-nums">
          {typeof value === "number" ? value.toLocaleString("ar") : value}
        </div>
        <div className="text-xs text-[#64748B] mt-1.5 font-bold">{label}</div>
      </div>
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
      className="group relative bg-white rounded-3xl border border-[#E9EEF5] p-4 md:p-5 transition hover:shadow-lg hover:-translate-y-1 overflow-hidden shadow-[0_2px_16px_-10px_rgba(15,23,42,0.2)]"
    >
      {/* شريط لوني علوي يظهر عند المرور */}
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-0 group-hover:opacity-100 transition"
        style={{ background: color }}
      />
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-3 left-3 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#EF4444] text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-3 transition-transform group-hover:scale-110 group-hover:-rotate-6"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <h3 className="font-black text-[#0F172A] text-sm md:text-base leading-tight">{title}</h3>
      <p className="text-[11px] md:text-xs text-[#64748B] mt-1 line-clamp-1">{desc}</p>
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
      className="group relative rounded-3xl p-4 transition hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-3 border overflow-hidden"
      style={{
        background: hasBadge
          ? `linear-gradient(135deg, ${color}1F 0%, ${color}0A 100%)`
          : "#FFFFFF",
        borderColor: hasBadge ? `${color}45` : "#E9EEF5",
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md"
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
        className="text-xl flex-shrink-0 group-hover:-translate-x-1 transition-transform"
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

function roleEmoji(role?: string | null): string {
  switch (role) {
    case "owner":
    case "admin":
      return "🛡️";
    case "monitor":
      return "👁️";
    case "supervisor":
      return "⭐";
    default:
      return "👤";
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

function todayArabic(): string {
  try {
    return new Intl.DateTimeFormat("ar", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  } catch {
    return "";
  }
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
