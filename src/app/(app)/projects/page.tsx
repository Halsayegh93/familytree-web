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

  return (
    <PageBackground theme="projects">
      <main className="max-w-5xl mx-auto p-6 space-y-4">
      <PageHero
        theme="projects"
        title="مشاريع العائلة"
        subtitle={`اكتشف المشاريع التي تجمع أفراد العائلة — ${projects?.length ?? 0} مشروع`}
      />

      <div className="flex justify-end">
        <AddProjectButton ownerId={getProfileId(user)!} ownerName={viewer?.full_name ?? "—"} />
      </div>

      {(!projects || projects.length === 0) && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
          <div className="text-5xl mb-3">💼</div>
          <p className="text-[#64748B]">لا توجد مشاريع حالياً</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map((p: any) => (
          <article key={p.id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="p-4 flex-1">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/15 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">💼</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-black text-sm text-[#0F172A] truncate">{p.title}</h2>
                  <div className="text-xs text-[#64748B] truncate">
                    {p.owner_name}
                  </div>
                </div>
              </div>

              {p.description && (
                <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              )}
            </div>

            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
              {p.website_url && <SocialLink href={p.website_url} icon="🌐" label="الموقع" />}
              {p.instagram_url && <SocialLink href={instaUrl(p.instagram_url)} icon="📷" label="Instagram" />}
              {p.twitter_url && <SocialLink href={xUrl(p.twitter_url)} icon="𝕏" label="X" />}
              {p.whatsapp_number && <SocialLink href={`https://wa.me/${p.whatsapp_number.replace(/\D/g, "")}`} icon="💬" label="واتساب" />}
              {p.phone_number && <SocialLink href={`tel:${p.phone_number}`} icon="📞" label="اتصال" />}
            </div>
          </article>
        ))}
      </div>
    </main>
    </PageBackground>
  );
}

function SocialLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="px-3 py-2 rounded-xl text-xs font-bold bg-[#F1F5F9] hover:bg-[#357DED] hover:text-white transition flex items-center gap-1"
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
