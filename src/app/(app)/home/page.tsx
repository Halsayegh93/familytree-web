import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import Link from "next/link";

const MODERATOR_ROLES = ["owner", "admin", "monitor", "supervisor"];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, full_name, role, is_hr_member")
    .eq("id", getProfileId(user)!)
    .single();

  const canModerate = MODERATOR_ROLES.includes(profile?.role ?? "");

  // نفس فلتر الشجرة — استثناء pending + frozen + hidden
  const { data: visibleMembers } = await supabase
    .from("profiles")
    .select("id, role, status, is_hidden_from_tree")
    .neq("role", "pending")
    .neq("status", "frozen")
    .limit(10000);

  const membersCount = (visibleMembers ?? []).filter(
    (m: any) => !m.is_hidden_from_tree
  ).length;

  const { count: projectsCount } = await supabase
    .from("projects").select("*", { count: "exact", head: true })
    .eq("approval_status", "approved");

  const { count: diwaniyasCount } = await supabase
    .from("diwaniyas").select("*", { count: "exact", head: true })
    .eq("approval_status", "approved");

  return (
    <PageBackground theme="home">
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <PageHero
          theme="home"
          title={`أهلاً ${profile?.first_name ?? "بك"} 👋`}
          subtitle={profile?.full_name ?? user?.phone ?? undefined}
        />

        {/* الإحصائيات */}
        <SectionTitle icon="📊" title="نظرة سريعة" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <StatCard label="أعضاء العائلة" value={membersCount ?? 0} icon="👨‍👩‍👧" color="#357DED" />
          <StatCard label="ديوانيات" value={diwaniyasCount ?? 0} icon="🏛️" color="#D97706" />
          <StatCard label="مشاريع" value={projectsCount ?? 0} icon="💼" color="#06B6D4" />
          <StatCard label="دورك" value={roleLabel(profile?.role)} icon="⭐" color="#8B5CF6" />
        </div>

        {/* فاصل ملوّن */}
        <Divider />

        {/* أقسام التطبيق */}
        <SectionTitle icon="🎯" title="الأقسام" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <FeatureCard icon="🌳" title="الشجرة" desc="تصفح شجرة العائلة" href="/tree" color="#10B981" />
          <FeatureCard icon="🏛️" title="الديوانيات" desc="مواعيد وأماكن" href="/diwaniyas" color="#D97706" />
          <FeatureCard icon="💼" title="المشاريع" desc="مشاريع العائلة" href="/projects" color="#06B6D4" />
          <FeatureCard icon="👤" title="حسابي" desc="ملفك الشخصي" href="/profile" color="#EC4899" />
        </div>

        {/* قسم الإدارة (إذا كان مدير) */}
        {canModerate && (
          <>
            <div className="mt-4">
              <Divider />
            </div>
            <SectionTitle icon="🛡️" title="الإدارة" subtitle={`أدوات ${roleLabel(profile?.role)}`} />
            <div className="grid grid-cols-1 gap-2">
              <AdminCard
                icon="🛡️"
                title="لوحة الإدارة"
                desc="إدارة الأعضاء والمحتوى"
                href="/admin"
                color="#5438DC"
              />
            </div>
          </>
        )}
      </main>
    </PageBackground>
  );
}

// MARK: - Components

function SectionTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h2 className="font-black text-lg text-[#0F172A]">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-[#64748B] mr-7">{subtitle}</p>}
    </div>
  );
}

function Divider() {
  return (
    <div className="my-3 flex items-center gap-3">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#CBD5E1] to-transparent" />
      <span className="text-[#94A3B8] text-xs">✦</span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#CBD5E1] to-transparent" />
    </div>
  );
}

function roleLabel(role?: string | null): string {
  switch (role) {
    case "owner": case "admin": return "مدير";
    case "monitor": return "مراقب";
    case "supervisor": return "مشرف";
    case "member": return "عضو";
    default: return "عضو";
  }
}

// مقياس موحد لكل المربعات: p-3 + avatar w-10 h-10 + title text-sm

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 transition hover:shadow-sm hover:-translate-y-0.5">
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

function FeatureCard({
  icon, title, desc, href, color,
}: {
  icon: string; title: string; desc: string; href: string; color: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-xl border border-[#E2E8F0] p-3 transition hover:shadow-sm hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#0F172A] text-sm leading-tight">{title}</h3>
          <p className="text-xs text-[#64748B] truncate">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

function AdminCard({
  icon, title, desc, href, color,
}: {
  icon: string; title: string; desc: string; href: string; color: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl p-3 transition hover:shadow-sm hover:-translate-y-0.5 flex items-center gap-2.5 border"
      style={{
        background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
        borderColor: `${color}30`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: color, color: "white" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-[#0F172A] text-sm leading-tight">{title}</h3>
        <p className="text-xs text-[#64748B] truncate">{desc}</p>
      </div>
      <span className="text-base flex-shrink-0" style={{ color }}>←</span>
    </Link>
  );
}
