import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/get-profile-id";
import { PageHero, PageBackground } from "@/components/PageHero";
import { formatPhone } from "@/lib/format-phone";
import { AddDiwaniyaButton } from "./AddDiwaniyaButton";

export default async function DiwaniyasPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const profileId = getProfileId(user);
  const { data: viewer } = profileId
    ? await supabase.from("profiles").select("full_name").eq("id", profileId).single()
    : { data: null };

  const { data: diwaniyas } = await supabase
    .from("diwaniyas")
    .select("*")
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false });

  const total  = diwaniyas?.length ?? 0;
  const active = diwaniyas?.filter((d: any) => !d.is_closed).length ?? 0;
  const closed = diwaniyas?.filter((d: any) => d.is_closed).length ?? 0;

  return (
    <PageBackground theme="diwaniyas">
      <main className="max-w-5xl mx-auto p-6 space-y-4">

        <PageHero
          theme="diwaniyas"
          title="ديوانيات العائلة"
          subtitle={`مواعيد وأماكن الديوانيات — ${total} ديوانية`}
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon="🏛️" value={total}  label="إجمالي"   color="#5438DC" />
          <StatCard icon="✅" value={active} label="نشطة"     color="#10B981" />
          <StatCard icon="🚫" value={closed} label="مغلقة"    color="#EF4444" />
        </div>

        {/* Add button */}
        {profileId && (
          <div className="flex justify-end">
            <AddDiwaniyaButton ownerId={profileId} ownerName={viewer?.full_name ?? "—"} />
          </div>
        )}

        {/* Empty state */}
        {total === 0 && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-14 text-center">
            <div className="text-5xl mb-3">🏛️</div>
            <p className="text-[#64748B]">لا توجد ديوانيات حالياً</p>
          </div>
        )}

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-3">
          {diwaniyas?.map((d: any) => (
            <article
              key={d.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden hover:shadow-sm hover:-translate-y-0.5 transition"
            >
              {d.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.image_url} alt="" className="w-full h-28 object-cover" />
              )}

              <div className="p-4">
                {/* Header row */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#5438DC]/10 flex items-center justify-center text-lg flex-shrink-0">
                    🏛️
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-black text-sm text-[#0F172A] leading-tight truncate">
                      {d.title || d.name || "—"}
                    </h2>
                    {d.owner_name && (
                      <div className="text-xs text-[#64748B] truncate mt-0.5">{d.owner_name}</div>
                    )}
                    {d.is_closed && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-[#EF4444]/10 text-[#EF4444] rounded-full text-[10px] font-bold">
                        🚫 مغلقة
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  {(d.timing || d.schedule_text) && (
                    <InfoRow icon="🕐" value={d.timing || d.schedule_text} />
                  )}
                  {d.address && <InfoRow icon="📍" value={d.address} />}
                  {d.contact_phone && (
                    <InfoRow icon="📞" value={formatPhone(d.contact_phone)} dir="ltr" />
                  )}
                </div>

                {/* Actions */}
                {(d.maps_url || d.location_url || d.contact_phone) && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[#F1F5F9]">
                    {(d.maps_url || d.location_url) && (
                      <a
                        href={d.maps_url || d.location_url}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5438DC] text-white rounded-xl font-bold text-xs hover:opacity-90 transition"
                      >
                        🗺️ الخرائط
                      </a>
                    )}
                    {d.contact_phone && (
                      <a
                        href={`tel:${d.contact_phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981] text-white rounded-xl font-bold text-xs hover:opacity-90 transition"
                      >
                        📞 اتصال
                      </a>
                    )}
                  </div>
                )}
              </div>
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

function InfoRow({ icon, value, dir }: { icon: string; value: string; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <span className="text-[#475569] flex-1 leading-relaxed" dir={dir}>{value}</span>
    </div>
  );
}
