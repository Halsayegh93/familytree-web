"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const COUNTRIES = [
  { code: "+965", flag: "🇰🇼", name: "الكويت" },
  { code: "+966", flag: "🇸🇦", name: "السعودية" },
  { code: "+971", flag: "🇦🇪", name: "الإمارات" },
  { code: "+974", flag: "🇶🇦", name: "قطر" },
  { code: "+973", flag: "🇧🇭", name: "البحرين" },
  { code: "+968", flag: "🇴🇲", name: "عُمان" },
  { code: "+20",  flag: "🇪🇬", name: "مصر" },
  { code: "+962", flag: "🇯🇴", name: "الأردن" },
  { code: "+964", flag: "🇮🇶", name: "العراق" },
  { code: "+1",   flag: "🇺🇸", name: "أمريكا" },
  { code: "+44",  flag: "🇬🇧", name: "بريطانيا" },
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+965");
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
  const canSubmit =
    !loading &&
    username.trim().length > 0 &&
    password.length >= 6 &&
    confirm.length > 0 &&
    !passwordMatch &&
    fullName.trim().length > 0 &&
    phone.trim().length > 0 &&
    birth.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("كلمتا السر غير متطابقتين"); return; }
    if (password.length < 6)  { setError("كلمة السر يجب أن تكون 6 أحرف على الأقل"); return; }

    setLoading(true);
    setError(null);

    const email = `${username.trim().toLowerCase()}@familytree.local`;

    let userId: string;

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });

    if (signUpErr?.message?.includes("already")) {
      // الحساب موجود — جرّب الدخول وأكمل حفظ البيانات
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
      if (loginErr || !loginData.user) {
        setError("اسم المستخدم مستخدم مسبقاً — استخدم اسماً آخر");
        setLoading(false);
        return;
      }
      userId = loginData.user.id;
    } else if (signUpErr || !signUpData.user) {
      setError(signUpErr?.message ?? "خطأ في التسجيل");
      setLoading(false);
      return;
    } else {
      userId = signUpData.user.id;
    }
    const cleanedPhone = normalizeDigits(phone);
    const finalPhone = cleanedPhone ? `${countryCode}${cleanedPhone}` : null;
    const nameParts = fullName.trim().split(" ");

    const profileData = {
      first_name: nameParts[0] ?? fullName.trim(),
      full_name: fullName.trim(),
      phone_number: finalPhone,
      birth_date: birth,
      role: "member",
      status: "pending",
    };

    // محاولة update أولاً (لو trigger خلق الصف تلقائياً)
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ ...profileData, registration_platform: "web", username: username.trim().toLowerCase() })
      .eq("id", userId);

    // لو فشل الـ update أو ما عنده صلاحية، جرّب insert
    if (updateErr) {
      const { error: insertErr } = await supabase
        .from("profiles")
        .insert({ id: userId, ...profileData, registration_platform: "web", username: username.trim().toLowerCase() });

      if (insertErr) {
        await supabase.auth.signOut();
        setError("خطأ في حفظ البيانات: " + insertErr.message);
        setLoading(false);
        return;
      }
    }

    router.push("/pending");
    router.refresh();
  }

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode)!;

  return (
    <main className="min-h-screen flex items-center justify-center p-4 py-10 bg-[#F8FAFC]">
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
                className="inp"
                dir="ltr"
                autoFocus
                required
              />
            </Field>

            <Field label="كلمة السر" hint={passwordShort ? "⚠️ أقل من 6 أحرف" : undefined} hintColor="red">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`inp ${passwordShort ? "ring-2 ring-[#EF4444]" : ""}`}
                dir="ltr"
                required
              />
            </Field>

            <Field
              label="تأكيد كلمة السر"
              hint={passwordMatch ? "⚠️ غير متطابقتين" : (confirm.length > 0 && !passwordMatch && password.length >= 6) ? "✓ متطابقتين" : undefined}
              hintColor={passwordMatch ? "red" : "green"}
            >
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className={`inp ${passwordMatch ? "ring-2 ring-[#EF4444]" : (confirm.length > 0 && !passwordMatch && password.length >= 6) ? "ring-2 ring-[#10B981]" : ""}`}
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
                className="inp"
                required
              />
            </Field>

            <Field label="رقم الهاتف">
              <div className="flex gap-2" dir="ltr">
                {/* Country picker */}
                <div className="relative flex-shrink-0">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="inp appearance-none pr-2 pl-8 cursor-pointer"
                    style={{ width: 110 }}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="XXXXXXXX"
                  className="inp flex-1"
                  required
                />
              </div>
            </Field>

            <Field label="تاريخ الميلاد">
              <input
                type="date"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
                className="inp"
                required
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
            disabled={!canSubmit}
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
        .inp {
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
        .inp:focus {
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
