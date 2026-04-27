"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function NotificationsClient() {
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!title.trim() || !body.trim()) return;
    if (!confirm("إرسال هذا الإشعار لجميع الأعضاء؟")) return;

    setBusy(true);
    setSuccess(null);
    setError(null);

    // جلب كل الأعضاء النشطين
    const { data: members, error: fetchErr } = await supabase
      .from("profiles")
      .select("id")
      .neq("role", "pending")
      .neq("status", "frozen");

    if (fetchErr || !members) {
      setError("فشل جلب الأعضاء");
      setBusy(false);
      return;
    }

    // إنشاء notification لكل عضو
    const rows = members.map((m) => ({
      target_member_id: m.id,
      title: title.trim(),
      body: body.trim(),
      kind: "general",
      is_read: false,
    }));

    const { error: insertErr } = await supabase.from("notifications").insert(rows);

    setBusy(false);
    if (insertErr) {
      setError("خطأ: " + insertErr.message);
    } else {
      setSuccess(`✅ تم إرسال الإشعار لـ ${members.length} عضو`);
      setTitle("");
      setBody("");
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
      <div>
        <label className="block text-sm font-bold text-[#0F172A] mb-2">العنوان</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="عنوان الإشعار"
          className="w-full px-4 py-3 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-[#0F172A] mb-2">المحتوى</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          rows={5}
          placeholder="نص الإشعار..."
          className="w-full px-4 py-3 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED] resize-none"
        />
        <div className="text-xs text-[#64748B] text-left mt-1">{body.length}/500</div>
      </div>

      <button
        onClick={send}
        disabled={busy || !title.trim() || !body.trim()}
        className="w-full bg-gradient-to-r from-[#357DED] to-[#5438DC] text-white py-3 rounded-2xl font-bold shadow-md disabled:opacity-50"
      >
        {busy ? "جاري الإرسال..." : "🔔 إرسال للجميع"}
      </button>

      {success && (
        <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm text-center font-bold">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm text-center font-bold">
          {error}
        </div>
      )}
    </div>
  );
}
