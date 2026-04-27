"use client";

import { useState } from "react";
import { formatPhone } from "@/lib/format-phone";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Member = {
  id: string;
  first_name: string;
  full_name: string;
  phone_number: string | null;
  created_at: string;
  avatar_url: string | null;
};

export function PendingMembersClient({
  members,
  canReject,
}: {
  members: Member[];
  canReject: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(memberId: string) {
    if (!confirm("الموافقة على هذا العضو؟")) return;
    setBusy(memberId);
    const { error } = await supabase
      .from("profiles")
      .update({ role: "member", status: "active" })
      .eq("id", memberId);
    setBusy(null);
    if (error) {
      alert("خطأ: " + error.message);
    } else {
      router.refresh();
    }
  }

  async function reject(memberId: string) {
    if (!confirm("رفض وحذف هذا الطلب؟ لا يمكن التراجع.")) return;
    setBusy(memberId);
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", memberId);
    setBusy(null);
    if (error) {
      alert("خطأ: " + error.message);
    } else {
      router.refresh();
    }
  }

  if (members.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
        <div className="text-5xl mb-3">✅</div>
        <p className="text-[#64748B]">لا توجد طلبات معلقة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((m) => (
        <article key={m.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#EF4444] text-white flex items-center justify-center font-black overflow-hidden flex-shrink-0">
              {m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                m.first_name?.[0] ?? "؟"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-[#0F172A] truncate">{m.full_name}</h3>
              <div className="text-xs text-[#64748B] mt-0.5">
                📅 {new Date(m.created_at).toLocaleDateString("ar")}
              </div>
            </div>
          </div>

          {/* رقم الهاتف بارز */}
          {m.phone_number && (
            <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-3 mb-3 flex items-center gap-2">
              <span className="text-2xl">📞</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-[#92400E] uppercase">رقم المسجِّل</div>
                <a
                  href={`tel:${m.phone_number}`}
                  className="font-black text-[#0F172A] text-base hover:text-[#357DED]"
                  dir="ltr"
                >
                  {formatPhone(m.phone_number)}
                </a>
              </div>
              <a
                href={`https://wa.me/${m.phone_number.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener"
                className="px-3 py-1.5 bg-[#25D366] text-white rounded-lg font-bold text-xs hover:opacity-90"
              >
                💬 واتساب
              </a>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => approve(m.id)}
              disabled={busy === m.id}
              className="flex-1 px-4 py-2.5 bg-[#10B981] text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50"
            >
              ✓ موافقة
            </button>
            {canReject && (
              <button
                onClick={() => reject(m.id)}
                disabled={busy === m.id}
                className="flex-1 px-4 py-2.5 bg-[#EF4444] text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50"
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
