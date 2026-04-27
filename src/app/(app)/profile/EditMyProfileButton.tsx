"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function EditMyProfileButton({ profile }: { profile: any }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? "");
  const [isPhoneHidden, setIsPhoneHidden] = useState(profile?.is_phone_hidden ?? false);
  const [isMarried, setIsMarried] = useState<boolean | null>(profile?.is_married ?? null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !fullName.trim()) return;

    setBusy(true);
    setError(null);

    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || null,
        birth_date: birthDate || null,
        is_phone_hidden: isPhoneHidden,
        is_married: isMarried,
      })
      .eq("id", profile.id);

    setBusy(false);
    if (updErr) {
      setError("خطأ: " + updErr.message);
    } else {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-[#357DED] text-white py-2.5 rounded-xl font-bold text-sm shadow-sm hover:opacity-90 flex items-center justify-center gap-2"
      >
        <span>✏️</span>
        <span>تعديل بياناتي</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#0F172A]">✏️ تعديل بياناتي</h2>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#475569] font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={save} className="p-5 space-y-3">
          <Field label="الاسم الأول">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
            />
          </Field>

          <Field label="الاسم الكامل">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
            />
          </Field>

          <Field label="رقم الهاتف">
            <input
              type="tel"
              inputMode="numeric"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+965..."
              dir="ltr"
              className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
            />
          </Field>

          <Field label="تاريخ الميلاد">
            <input
              type="date"
              value={birthDate || ""}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
            />
          </Field>

          <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl">
            <span className="text-xl">🔒</span>
            <span className="flex-1 font-bold text-sm text-[#0F172A]">إخفاء رقم الهاتف من الأعضاء</span>
            <button
              type="button"
              onClick={() => setIsPhoneHidden(!isPhoneHidden)}
              className={`relative w-12 h-7 rounded-full transition ${
                isPhoneHidden ? "bg-[#357DED]" : "bg-[#E2E8F0]"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition ${
                  isPhoneHidden ? "right-1" : "right-6"
                }`}
              />
            </button>
          </div>

          <Field label="الحالة الاجتماعية">
            <select
              value={isMarried === null ? "" : String(isMarried)}
              onChange={(e) => setIsMarried(e.target.value === "" ? null : e.target.value === "true")}
              className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED] font-bold"
            >
              <option value="">— غير محدد —</option>
              <option value="true">متزوج/ة</option>
              <option value="false">أعزب/عزباء</option>
            </select>
          </Field>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-bold">{error}</div>
          )}

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-white border-t border-[#E2E8F0] -mx-5 px-5 py-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-5 py-3 bg-[#F1F5F9] text-[#475569] rounded-2xl font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={busy || !firstName.trim() || !fullName.trim()}
              className="flex-1 bg-[#357DED] text-white py-3 rounded-2xl font-bold shadow-md disabled:opacity-50"
            >
              {busy ? "..." : "💾 حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-[#0F172A] mb-1.5">{label}</label>
      {children}
    </div>
  );
}
