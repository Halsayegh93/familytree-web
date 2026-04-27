"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPhone } from "@/lib/format-phone";

export function PendingDiwaniyasClient({ diwaniyas, canReject }: { diwaniyas: any[]; canReject: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(id: string) {
    setBusy(id);
    const { error } = await supabase
      .from("diwaniyas")
      .update({ approval_status: "approved" })
      .eq("id", id);
    setBusy(null);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  async function reject(id: string) {
    if (!confirm("رفض وحذف هذه الديوانية؟")) return;
    setBusy(id);
    const { error } = await supabase.from("diwaniyas").delete().eq("id", id);
    setBusy(null);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  if (diwaniyas.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
        <div className="text-5xl mb-3">✅</div>
        <p className="text-[#64748B]">لا توجد ديوانيات للمراجعة</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {diwaniyas.map((d) => (
        <article key={d.id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          {d.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.image_url} alt="" className="w-full h-32 object-cover" />
          )}
          <div className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-[#F59E0B]/15 flex items-center justify-center text-2xl flex-shrink-0">
                🏛️
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-[#0F172A]">{d.title || d.name}</h3>
                <div className="text-xs text-[#64748B]">{d.owner_name}</div>
              </div>
            </div>
            <div className="space-y-1 text-sm text-[#475569]">
              {(d.timing || d.schedule_text) && <div>🕐 {d.timing || d.schedule_text}</div>}
              {d.address && <div>📍 {d.address}</div>}
              {d.contact_phone && <div dir="ltr">📞 {formatPhone(d.contact_phone)}</div>}
              {(d.maps_url || d.location_url) && (
                <a href={d.maps_url || d.location_url} target="_blank" rel="noopener" className="text-[#357DED] underline text-xs">
                  🗺️ الموقع على الخريطة
                </a>
              )}
            </div>
          </div>
          <div className="p-3 bg-[#F1F5F9] flex gap-2">
            <button
              onClick={() => approve(d.id)}
              disabled={busy === d.id}
              className="flex-1 px-3 py-2 bg-[#10B981] text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50"
            >
              ✓ موافقة
            </button>
            {canReject && (
              <button
                onClick={() => reject(d.id)}
                disabled={busy === d.id}
                className="flex-1 px-3 py-2 bg-[#EF4444] text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50"
              >
                ✕ رفض
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
