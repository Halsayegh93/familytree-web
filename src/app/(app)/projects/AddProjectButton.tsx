"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AddProjectButton({
  ownerId,
  ownerName,
}: {
  ownerId: string;
  ownerName: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // الحقول (نفس تطبيق iOS — بدون TikTok)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setLogoUrl("");
    setWebsiteUrl("");
    setInstagramUrl("");
    setTwitterUrl("");
    setWhatsappNumber("");
    setPhoneNumber("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setBusy(true);
    setError(null);

    const payload: Record<string, any> = {
      owner_id: ownerId,
      owner_name: ownerName,
      title: title.trim(),
      approval_status: "pending",
    };

    if (description.trim()) payload.description = description.trim();
    if (logoUrl.trim()) payload.logo_url = logoUrl.trim();
    if (websiteUrl.trim()) payload.website_url = websiteUrl.trim();
    if (instagramUrl.trim()) payload.instagram_url = instagramUrl.trim();
    if (twitterUrl.trim()) payload.twitter_url = twitterUrl.trim();
    if (whatsappNumber.trim()) payload.whatsapp_number = whatsappNumber.trim();
    if (phoneNumber.trim()) payload.phone_number = phoneNumber.trim();

    const { error: insertErr } = await supabase.from("projects").insert(payload);

    setBusy(false);
    if (insertErr) {
      setError("خطأ: " + insertErr.message);
    } else {
      reset();
      setOpen(false);
      router.refresh();
      alert("✅ تم إرسال المشروع للمراجعة");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-[#06B6D4] text-white px-5 py-3 rounded-2xl font-bold shadow-md hover:opacity-90 transition flex items-center gap-2"
      >
        <span className="text-xl">➕</span>
        <span>أضف مشروعاً</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#0F172A]">💼 مشروع جديد</h2>
          <button
            onClick={() => { setOpen(false); reset(); }}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#475569] font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3">
          <Section title="معلومات أساسية">
            <Input label="اسم المشروع *" value={title} onChange={setTitle} required />
            <Textarea label="الوصف" value={description} onChange={setDescription} />
            <Input label="رابط الشعار (اختياري)" value={logoUrl} onChange={setLogoUrl} placeholder="https://..." dir="ltr" />
          </Section>

          <Section title="حسابات التواصل">
            <Input label="🌐 الموقع" value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://..." dir="ltr" />
            <Input label="📷 Instagram" value={instagramUrl} onChange={setInstagramUrl} placeholder="@username" dir="ltr" />
            <Input label="𝕏 X (Twitter)" value={twitterUrl} onChange={setTwitterUrl} placeholder="@username" dir="ltr" />
            <Input label="💬 WhatsApp" value={whatsappNumber} onChange={setWhatsappNumber} placeholder="+965..." dir="ltr" />
            <Input label="📞 هاتف" value={phoneNumber} onChange={setPhoneNumber} placeholder="+965..." dir="ltr" />
          </Section>

          <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-3 text-xs text-[#92400E]">
            ⚠️ سيتم مراجعة المشروع من الإدارة قبل ظهوره
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-bold">{error}</div>
          )}

          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="w-full bg-[#06B6D4] text-white py-3 rounded-2xl font-bold shadow-md disabled:opacity-50"
          >
            {busy ? "..." : "💾 إرسال للمراجعة"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-[#64748B] uppercase">{title}</h3>
      {children}
    </div>
  );
}

function Input({
  label, value, onChange, placeholder, required, dir,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; dir?: "ltr" | "rtl";
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-[#0F172A] mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        dir={dir}
        className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#06B6D4]"
      />
    </div>
  );
}

function Textarea({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-[#0F172A] mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#06B6D4] resize-none"
      />
    </div>
  );
}
