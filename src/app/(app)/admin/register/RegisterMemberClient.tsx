"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RegisterMemberClient({ members }: { members: any[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [fatherSearch, setFatherSearch] = useState("");
  const [fatherId, setFatherId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const matched = useMemo(() => {
    if (!fatherSearch.trim() || fatherId) return [];
    const q = fatherSearch.toLowerCase();
    return members.filter((m) => m.full_name.toLowerCase().includes(q)).slice(0, 8);
  }, [fatherSearch, fatherId, members]);

  const fatherName = fatherId ? members.find((m) => m.id === fatherId)?.full_name : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !fullName.trim()) return;

    setBusy(true);
    setError(null);
    setSuccess(null);

    const cleanedPhone = phone.replace(/\D/g, "");
    const finalPhone = cleanedPhone
      ? cleanedPhone.startsWith("965")
        ? `+${cleanedPhone}`
        : `+965${cleanedPhone}`
      : null;

    const { error: insertErr } = await supabase.from("profiles").insert({
      first_name: firstName.trim(),
      full_name: fullName.trim(),
      father_id: fatherId,
      phone_number: finalPhone,
      birth_date: birthDate || null,
      role: "member",
      status: "active",
    });

    setBusy(false);
    if (insertErr) {
      setError("خطأ: " + insertErr.message);
    } else {
      setSuccess("✅ تم إضافة العضو بنجاح");
      setFirstName(""); setFullName(""); setPhone(""); setBirthDate("");
      setFatherSearch(""); setFatherId(null);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
      <Field label="الاسم الأول">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="w-full px-4 py-3 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
        />
      </Field>

      <Field label="الاسم الكامل (مع الجد)">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full px-4 py-3 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
        />
      </Field>

      <Field label="رقم الهاتف (اختياري)">
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+965..."
          dir="ltr"
          className="w-full px-4 py-3 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
        />
      </Field>

      <Field label="تاريخ الميلاد (اختياري)">
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full px-4 py-3 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
        />
      </Field>

      <Field label="الأب">
        {fatherName ? (
          <div className="flex items-center justify-between px-4 py-3 bg-[#F1F5F9] rounded-xl">
            <span className="font-bold">{fatherName}</span>
            <button
              type="button"
              onClick={() => { setFatherId(null); setFatherSearch(""); }}
              className="text-[#EF4444] text-sm font-bold"
            >
              تغيير
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={fatherSearch}
              onChange={(e) => setFatherSearch(e.target.value)}
              placeholder="ابحث عن الأب..."
              className="w-full px-4 py-3 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
            />
            {matched.length > 0 && (
              <div className="absolute top-full mt-2 right-0 left-0 bg-white rounded-xl border border-[#E2E8F0] z-10 max-h-60 overflow-y-auto">
                {matched.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setFatherId(m.id); setFatherSearch(""); }}
                    className="w-full text-right px-4 py-2 hover:bg-[#F1F5F9] border-b border-[#E2E8F0] last:border-0"
                  >
                    {m.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Field>

      <button
        type="submit"
        disabled={busy || !firstName.trim() || !fullName.trim()}
        className="w-full bg-gradient-to-r from-[#10B981] to-[#357DED] text-white py-3 rounded-2xl font-bold shadow-md disabled:opacity-50"
      >
        {busy ? "..." : "➕ إضافة العضو"}
      </button>

      {success && <Banner color="green">{success}</Banner>}
      {error && <Banner color="red">{error}</Banner>}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-[#0F172A] mb-2">{label}</label>
      {children}
    </div>
  );
}

function Banner({ color, children }: { color: "green" | "red"; children: React.ReactNode }) {
  return (
    <div
      className={`p-3 rounded-xl text-sm text-center font-bold ${
        color === "green" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {children}
    </div>
  );
}
