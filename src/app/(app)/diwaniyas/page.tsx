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

  return (
    <PageBackground theme="diwaniyas">
      <main className="max-w-5xl mx-auto p-6 space-y-4">
        <PageHero
          theme="diwaniyas"
          title="ديوانيات العائلة"
          subtitle={`مواعيد وأماكن الديوانيات — ${diwaniyas?.length ?? 0} ديوانية`}
        />

        {profileId && (
          <div className="flex justify-end">
            <AddDiwaniyaButton ownerId={profileId} ownerName={viewer?.full_name ?? "—"} />
          </div>
        )}

        {(!diwaniyas || diwaniyas.length === 0) && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
            <div className="text-5xl mb-3">🏛️</div>
            <p className="text-[#64748B]">لا توجد ديوانيات حالياً</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {diwaniyas?.map((d: any) => (
            <article
              key={d.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden hover:shadow-sm transition"
            >
              {d.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.image_url} alt="" className="w-full h-32 object-cover" />
              )}

              <div className="p-4">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/15 flex items-center justify-center text-xl flex-shrink-0">
                    🏛️
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-black text-sm text-[#0F172A] leading-tight">
                      {d.title || d.name || "—"}
                    </h2>
                    {d.owner_name && (
                      <div className="text-xs text-[#64748B] truncate">
                        {d.owner_name}
                      </div>
                    )}
                    {d.is_closed && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-[#EF4444]/15 text-[#EF4444] rounded-full text-xs font-bold">
                        🚫 مغلقة
                      </span>
                    )}
                  </div>
                </div>

                {/* التفاصيل */}
                <div className="space-y-2 text-sm">
                  {(d.timing || d.schedule_text) && (
                    <Row
                      icon="🕐"
                      label="المواعيد"
                      value={d.timing || d.schedule_text}
                    />
                  )}
                  {d.address && <Row icon="📍" label="العنوان" value={d.address} />}
                  {d.contact_phone && (
                    <Row
                      icon="📞"
                      label="للتواصل"
                      value={formatPhone(d.contact_phone)}
                      dir="ltr"
                    />
                  )}
                </div>

                {/* الأزرار */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {(d.maps_url || d.location_url) && (
                    <a
                      href={d.maps_url || d.location_url}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 px-4 py-2 bg-[#D97706] text-white rounded-xl font-bold text-sm hover:opacity-90"
                    >
                      🗺️ فتح بالخرائط
                    </a>
                  )}
                  {d.contact_phone && (
                    <a
                      href={`tel:${d.contact_phone}`}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-[#10B981] text-white rounded-xl font-bold text-sm hover:opacity-90"
                    >
                      📞 اتصال
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </PageBackground>
  );
}

function Row({
  icon,
  label,
  value,
  dir,
}: {
  icon: string;
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-start gap-2 leading-relaxed">
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-[#64748B] flex-shrink-0">{label}:</span>
      <span className="font-bold text-[#0F172A] flex-1" dir={dir}>
        {value}
      </span>
    </div>
  );
}
