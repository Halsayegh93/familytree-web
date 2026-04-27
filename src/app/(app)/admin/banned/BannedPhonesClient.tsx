"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function BannedPhonesClient({ banned, userId }: { banned: any[]; userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function addBan() {
    if (!phone.trim()) return;
    const cleaned = phone.replace(/\D/g, "");
    const finalPhone = cleaned.startsWith("965") ? `+${cleaned}` : `+965${cleaned}`;

    setBusy(true);
    const { error } = await supabase.from("banned_phones").insert({
      phone: finalPhone,
      reason: reason.trim() || null,
      banned_by: userId,
    });
    setBusy(false);
    if (error) alert("خطأ: " + error.message);
    else {
      setPhone("");
      setReason("");
      router.refresh();
    }
  }

  async function removeBan(id: string) {
    if (!confirm("إزالة الحظر؟")) return;
    const { error } = await supabase.from("banned_phones").delete().eq("id", id);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
        <h2 className="font-black text-[#0F172A]">إضافة رقم محظور</h2>
        <div className="flex gap-2">
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="رقم الهاتف (+965...)"
            className="flex-1 px-4 py-3 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
            dir="ltr"
          />
        </div>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="السبب (اختياري)"
          className="w-full px-4 py-3 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
        />
        <button
          onClick={addBan}
          disabled={busy || !phone.trim()}
          className="w-full bg-[#EF4444] text-white py-3 rounded-2xl font-bold hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "..." : "🚫 حظر الرقم"}
        </button>
      </div>

      {banned.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-[#64748B]">لا توجد أرقام محظورة</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          {banned.map((b, i) => (
            <div
              key={b.id}
              className={`flex items-center gap-3 px-5 py-3 ${
                i < banned.length - 1 ? "border-b border-[#E2E8F0]" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-[#EF4444]/15 flex items-center justify-center text-xl flex-shrink-0">
                🚫
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#0F172A]" dir="ltr">{b.phone}</div>
                {b.reason && <div className="text-xs text-[#64748B]">{b.reason}</div>}
                <div className="text-xs text-[#64748B]">
                  {new Date(b.created_at).toLocaleDateString("ar")}
                </div>
              </div>
              <button
                onClick={() => removeBan(b.id)}
                className="px-3 py-2 bg-[#10B981] text-white rounded-xl text-xs font-bold"
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
