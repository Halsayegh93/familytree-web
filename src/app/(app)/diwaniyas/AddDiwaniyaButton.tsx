"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AddDiwaniyaButton({
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

  const [title, setTitle] = useState("");
  const [timing, setTiming] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setTiming("");
    setAddress("");
    setContactPhone("");
    setMapsUrl("");
    setImageUrl("");
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

    if (timing.trim()) payload.timing = timing.trim();
    if (address.trim()) payload.address = address.trim();
    if (contactPhone.trim()) payload.contact_phone = contactPhone.trim();
    if (mapsUrl.trim()) payload.maps_url = mapsUrl.trim();
    if (imageUrl.trim()) payload.image_url = imageUrl.trim();

    const { error: insertErr } = await supabase.from("diwaniyas").insert(payload);

    setBusy(false);
    if (insertErr) {
      setError("خطأ: " + insertErr.message);
    } else {
      reset();
      setOpen(false);
      router.refresh();
      alert("✅ تم إرسال الديوانية للمراجعة");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-[#D97706] text-white px-5 py-3 rounded-2xl font-bold shadow-md hover:opacity-90 transition flex items-center gap-2"
      >
        <span className="text-xl">➕</span>
        <span>أضف ديوانية</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#0F172A]">🏛️ ديوانية جديدة</h2>
          <button
            onClick={() => { setOpen(false); reset(); }}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#475569] font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3">
          <Input label="اسم الديوانية *" value={title} onChange={setTitle} required />
          <Input label="🕐 المواعيد" value={timing} onChange={setTiming} placeholder="مثال: كل خميس بعد المغرب" />
          <Input label="📍 العنوان" value={address} onChange={setAddress} placeholder="المنطقة، الشارع، رقم البيت" />
          <Input label="📞 رقم التواصل" value={contactPhone} onChange={setContactPhone} placeholder="+965..." dir="ltr" />
          <Input label="🗺️ رابط الموقع (Google Maps)" value={mapsUrl} onChange={setMapsUrl} placeholder="https://maps.google.com/..." dir="ltr" />
          <Input label="🖼️ رابط الصورة (اختياري)" value={imageUrl} onChange={setImageUrl} placeholder="https://..." dir="ltr" />

          <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-3 text-xs text-[#92400E]">
            ⚠️ سيتم مراجعة الديوانية من الإدارة قبل ظهورها
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-bold">{error}</div>
          )}

          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="w-full bg-[#D97706] text-white py-3 rounded-2xl font-bold shadow-md disabled:opacity-50"
          >
            {busy ? "..." : "💾 إرسال للمراجعة"}
          </button>
        </form>
      </div>
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
        className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#D97706]"
      />
    </div>
  );
}
