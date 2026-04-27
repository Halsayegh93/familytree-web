"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DevicesClient({ devices }: { devices: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function remove(id: string) {
    if (!confirm("إزالة هذا الجهاز؟ سيتم تسجيل خروجه.")) return;
    setBusy(id);
    const { error } = await supabase.from("device_tokens").delete().eq("id", id);
    setBusy(null);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  const filtered = search.trim()
    ? devices.filter(
        (d) =>
          d.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          d.device_name?.toLowerCase().includes(search.toLowerCase())
      )
    : devices;

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 بحث..."
        className="w-full px-4 py-3 bg-white rounded-xl border border-[#E2E8F0] outline-none focus:ring-2 focus:ring-[#357DED]"
      />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
          <div className="text-5xl mb-3">📱</div>
          <p className="text-[#64748B]">لا توجد أجهزة</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
          {filtered.map((d) => (
            <div key={d.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#357DED] text-white flex items-center justify-center font-bold overflow-hidden flex-shrink-0">
                {d.profiles?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  d.profiles?.full_name?.[0] ?? "؟"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#0F172A] truncate">{d.profiles?.full_name ?? "—"}</div>
                <div className="text-xs text-[#64748B] truncate">
                  📱 {d.device_name ?? "جهاز"} · {d.platform ?? ""}
                </div>
                <div className="text-xs text-[#64748B]">
                  {new Date(d.updated_at).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
              <button
                onClick={() => remove(d.id)}
                disabled={busy === d.id}
                className="px-3 py-2 bg-[#EF4444] text-white rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50"
              >
                إزالة
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
