"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birth, setBirth] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function normalizeDigits(s: string): string {
    return s
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .replace(/\D/g, "");
  }

  const passwordMatch = confirm.length > 0 && password !== confirm;
  const passwordShort = password.length > 0 && password.length < 6;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("كلمتا السر غير متطابقتين"); return; }
    if (password.length < 6) { setError("كلمة السر يجب أن تكون 6 أحرف على الأقل"); return; }

    setLoading(true);
    setError(null);

    const email = `${username.trim().toLowerCase()}@familytree.local`;

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr || !signUpData.user) {
      setError(signUpErr?.message?.includes("already") ? "اسم المستخدم مستخدم مسبقاً" : (signUpErr?.message ?? "خطأ في التسجيل"));
      setLoading(false);
      return;
    }

    const userId = signUpData.user.id;
    const cleanedPhone = normalizeDigits(phone);
    const finalPhone = cleanedPhone ? (cleanedPhone.startsWith("965") ? `+${cleanedPhone}` : `+965${cleanedPhone}`) : null;
    const nameParts = fullName.trim().split(" ");

    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      first_name: nameParts[0] ?? fullName.trim(),
      full_name: fullName.trim(),
      phone_number: finalPhone,
      birth_date: birth || null,
      role: "member",
      status: "pending",
    });

    if (profileErr) {
      await supabase.auth.signOut();
      setError("خطأ في حفظ البيانات: " + profileErr.message);
      setLoading(false);
      return;
    }

    router.push("/pending");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-md space-y-4">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#357DED] to-[#10B981] flex items-center justify-center text-3xl shadow-lg">
            🌳
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0F172A]">إنشاء حساب جديد</h1>
            <p className="text-sm text-[#64748B] mt-1">سيتم مراجعة طلبك من قِبل الإدارة</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">

          {/* بيانات الحساب */}
          <Section title="🔐 بيانات الحساب">
            <Field label="اسم المستخدم">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                placeholder="username"
                className="input"
                dir="ltr"
                autoFocus
                required
              />
            </Field>

            <Field label="كلمة السر" hint={passwordShort ? "أقل من 6 أحرف" : undefined} hintColor="red">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
                className={`input ${passwordShort ? "ring-2 ring-[#EF4444]" : ""}`}
                dir="ltr"
                required
              />
            </Field>

            <Field label="تأكيد كلمة السر" hint={passwordMatch ? "كلمتا السر غير متطابقتين" : undefined} hintColor="red">
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className={`input ${passwordMatch ? "ring-2 ring-[#EF4444]" : confirm.length > 0 && !passwordMatch ? "ring-2 ring-[#10B981]" : ""}`}
                dir="ltr"
                required
              />
            </Field>
          </Section>

          {/* البيانات الشخصية */}
          <Section title="👤 البيانات الشخصية">
            <Field label="الاسم الكامل">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم الكامل مع اسم الجد"
                className="input"
                required
              />
            </Field>

            <Field label="رقم الهاتف (اختياري)">
              <div className="flex gap-2" dir="ltr">
                <div className="flex items-center gap-1 px-3 bg-[#F1F5F9] rounded-xl text-sm font-bold flex-shrink-0 border border-[#E2E8F0]">
                  🇰🇼 +965
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="XXXXXXXX"
                  className="input flex-1"
                />
              </div>
            </Field>

            <Field label="تاريخ الميلاد (اختياري)">
              <input
                type="date"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
                className="input"
              />
            </Field>
          </Section>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm text-center font-bold border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password || !confirm || !fullName.trim() || passwordMatch || passwordShort}
            className="w-full bg-gradient-to-r from-[#357DED] to-[#10B981] text-white py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-40 active:scale-95 transition"
          >
            {loading ? "⏳ جاري التسجيل..." : "إنشاء الحساب ✨"}
          </button>
        </form>

        <p className="text-center text-sm text-[#64748B]">
          لديك حساب؟{" "}
          <Link href="/login" className="text-[#357DED] font-bold hover:underline">
            سجّل دخولك
          </Link>
        </p>

      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 12px 16px;
          background: #F1F5F9;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          outline: none;
          font-size: 15px;
          font-weight: 600;
          color: #0F172A;
          transition: box-shadow 0.15s;
        }
        .input:focus {
          box-shadow: 0 0 0 2px #357DED40;
        }
      `}</style>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#F1F5F9] bg-[#F8FAFC]">
        <span className="text-sm font-black text-[#0F172A]">{title}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label, children, hint, hintColor,
}: {
  label: string; children: React.ReactNode; hint?: string; hintColor?: "red" | "green";
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-[#475569]">{label}</label>
        {hint && (
          <span className={`text-[10px] font-bold ${hintColor === "red" ? "text-[#EF4444]" : "text-[#10B981]"}`}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
