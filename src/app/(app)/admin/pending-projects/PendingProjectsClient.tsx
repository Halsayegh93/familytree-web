"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PendingProjectsClient({ projects, canReject }: { projects: any[]; canReject: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(id: string) {
    setBusy(id);
    const { error } = await supabase
      .from("projects")
      .update({ approval_status: "approved" })
      .eq("id", id);
    setBusy(null);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  async function reject(id: string) {
    if (!confirm("رفض وحذف هذا المشروع؟")) return;
    setBusy(id);
    const { error } = await supabase.from("projects").delete().eq("id", id);
    setBusy(null);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
        <div className="text-5xl mb-3">✅</div>
        <p className="text-[#64748B]">لا توجد مشاريع للمراجعة</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {projects.map((p) => (
        <article key={p.id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <div className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-[#3B82F6]/15 flex items-center justify-center overflow-hidden flex-shrink-0">
                {p.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">💼</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-[#0F172A]">{p.title}</h3>
                <div className="text-xs text-[#64748B]">{p.owner_name}</div>
              </div>
            </div>
            {p.description && (
              <p className="text-sm text-[#475569] line-clamp-3">{p.description}</p>
            )}
          </div>
          <div className="p-3 bg-[#F1F5F9] flex gap-2">
            <button
              onClick={() => approve(p.id)}
              disabled={busy === p.id}
              className="flex-1 px-3 py-2 bg-[#10B981] text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50"
            >
              ✓ موافقة
            </button>
            {canReject && (
              <button
                onClick={() => reject(p.id)}
                disabled={busy === p.id}
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
