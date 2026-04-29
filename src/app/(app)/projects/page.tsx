import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { AddProjectButton } from "./AddProjectButton";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: viewer } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", getProfileId(user)!)
    .single();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false });

  const total = projects?.length ?? 0;

  return (
    <PageBackground theme="projects">
      <main className="max-w-5xl mx-auto p-6 space-y-4">

        <PageHero
          theme="projects"
          title="مشاريع العائلة"
          subtitle={`اكتشف المشاريع التي تجمع أفراد العائلة — ${total} مشروع`}
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon="💼" value={total} label="إجمالي المشاريع" color="#10B981" />
          <StatCard
            icon="🌐"
            value={projects?.filter((p: any) => p.website_url).length ?? 0}
            label="لديها موقع"
            color="#357DED"
          />
          <StatCard
            icon="📷"
            value={projects?.filter((p: any) => p.instagram_url).length ?? 0}
            label="على انستغرام"
            color="#EC4899"
          />
        </div>

        {/* Add button */}
        <div className="flex justify-end">
          <AddProjectButton ownerId={getProfileId(user)!} ownerName={viewer?.full_name ?? "—"} />
        </div>

        {/* Empty state */}
        {total === 0 && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-14 text-center">
            <div className="text-5xl mb-3">💼</div>
            <p className="text-[#64748B]">لا توجد مشاريع حالياً</p>
          </div>
        )}

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects?.map((p: any) => (
            <article
              key={p.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden flex flex-col hover:shadow-sm hover:-translate-y-0.5 transition"
            >
              <div className="p-4 flex-1">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">💼</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-black text-sm text-[#0F172A] truncate leading-tight">{p.title}</h2>
                    <div className="text-xs text-[#64748B] truncate mt-0.5">{p.owner_name}</div>
                  </div>
                </div>

                {p.description && (
                  <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                )}
              </div>

              {/* Social links */}
              {(p.website_url || p.instagram_url || p.twitter_url || p.whatsapp_number || p.phone_number) && (
                <div className="px-4 pb-4 flex flex-wrap gap-1.5 border-t border-[#F1F5F9] pt-3">
                  {p.website_url    && <SocialLink href={p.website_url} icon="🌐" label="الموقع" />}
                  {p.instagram_url  && <SocialLink href={instaUrl(p.instagram_url)} icon="📷" label="Instagram" />}
                  {p.twitter_url    && <SocialLink href={xUrl(p.twitter_url)} icon="𝕏" label="X" />}
                  {p.whatsapp_number && <SocialLink href={`https://wa.me/${p.whatsapp_number.replace(/\D/g, "")}`} icon="💬" label="واتساب" />}
                  {p.phone_number   && <SocialLink href={`tel:${p.phone_number}`} icon="📞" label="اتصال" />}
                </div>
              )}
            </article>
          ))}
        </div>
      </main>
    </PageBackground>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 flex items-center gap-2.5 hover:shadow-sm hover:-translate-y-0.5 transition">
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
  );
}

function SocialLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#F1F5F9] text-[#475569] hover:bg-[#357DED] hover:text-white transition flex items-center gap-1"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function instaUrl(v: string): string {
  if (v.startsWith("http")) return v;
  return `https://instagram.com/${v.replace("@", "")}`;
}

function xUrl(v: string): string {
  if (v.startsWith("http")) return v;
  return `https://x.com/${v.replace("@", "")}`;
}
