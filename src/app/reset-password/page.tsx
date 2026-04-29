"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Step = "phone" | "otp" | "password";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+965");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const COUNTRIES = [
    { code: "+965", flag: "🇰🇼" },
    { code: "+966", flag: "🇸🇦" },
    { code: "+971", flag: "🇦🇪" },
    { code: "+974", flag: "🇶🇦" },
    { code: "+973", flag: "🇧🇭" },
    { code: "+968", flag: "🇴🇲" },
    { code: "+20",  flag: "🇪🇬" },
    { code: "+962", flag: "🇯🇴" },
    { code: "+964", flag: "🇮🇶" },
    { code: "+1",   flag: "🇺🇸" },
    { code: "+44",  flag: "🇬🇧" },
  ];

  function normalizeDigits(s: string): string {
    return s
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .replace(/\D/g, "");
  }

  const fullPhone = `${countryCode}${normalizeDigits(phone)}`;
  const passwordMatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const passwordShort = newPassword.length > 0 && newPassword.length < 6;

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    if (error) setError("تأكد من رقم الهاتف وحاول مجدداً");
    else setStep("otp");

    setLoading(false);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 4) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: "sms",
    });

    if (error) setError("الرمز غير صحيح أو منتهي الصلاحية");
    else setStep("password");

    setLoading(false);
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError("كلمتا السر غير متطابقتين"); return; }
    if (newPassword.length < 6) { setError("كلمة السر 6 أحرف على الأقل"); return; }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setError("خطأ في تعيين كلمة السر: " + error.message);
    else {
      router.push("/home");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#357DED]/10 flex items-center justify-center text-3xl">
            {step === "phone" ? "🔑" : step === "otp" ? "📱" : "🔒"}
          </div>
          <h1 className="text-xl font-black text-[#0F172A]">
            {step === "phone" ? "إعادة تعيين كلمة السر" : step === "otp" ? "التحقق من الهاتف" : "كلمة السر الجديدة"}
          </h1>
          <p className="text-sm text-[#64748B]">
            {step === "phone" && "أدخل رقم هاتفك لاستلام رمز التحقق"}
            {step === "otp" && `أدخل الرمز المرسل إلى ${countryCode} ${phone}`}
            {step === "password" && "أدخل كلمة السر الجديدة"}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2">
          {(["phone", "otp", "password"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                step === s ? "bg-[#357DED] text-white" :
                (["phone", "otp", "password"].indexOf(step) > i) ? "bg-[#10B981] text-white" :
                "bg-[#F1F5F9] text-[#94A3B8]"
              }`}>
                {["phone", "otp", "password"].indexOf(step) > i ? "✓" : i + 1}
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 rounded ${["phone", "otp", "password"].indexOf(step) > i ? "bg-[#10B981]" : "bg-[#E2E8F0]"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Phone */}
        {step === "phone" && (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-1.5">رقم الهاتف</label>
              <div className="flex gap-2" dir="ltr">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="px-2 py-3 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] outline-none text-sm font-bold flex-shrink-0"
                  style={{ width: 90 }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="XXXXXXXX"
                  className="flex-1 px-4 py-3 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] outline-none focus:ring-2 focus:ring-[#357DED] text-base font-bold"
                  autoFocus
                  required
                />
              </div>
            </div>
            {error && <ErrorBox>{error}</ErrorBox>}
            <button type="submit" disabled={loading || !phone.trim()} className="btn-primary">
              {loading ? "⏳ جاري الإرسال..." : "إرسال رمز التحقق ←"}
            </button>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="------"
              value={otp}
              onChange={(e) => setOtp(normalizeDigits(e.target.value).slice(0, 6))}
              className="w-full px-4 py-4 bg-[#F1F5F9] rounded-2xl border border-[#E2E8F0] text-3xl font-black text-center tracking-widest outline-none focus:ring-2 focus:ring-[#357DED]"
              autoFocus
              required
            />
            {error && <ErrorBox>{error}</ErrorBox>}
            <button type="submit" disabled={loading || otp.length < 4} className="btn-primary">
              {loading ? "⏳ جاري التحقق..." : "تأكيد الرمز ✓"}
            </button>
            <button type="button" onClick={() => { setStep("phone"); setOtp(""); setError(null); }}
              className="w-full text-sm text-[#64748B] hover:text-[#357DED] font-bold">
              ← تغيير الرقم
            </button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === "password" && (
          <form onSubmit={resetPassword} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#475569]">كلمة السر الجديدة</label>
                {passwordShort && <span className="text-[10px] font-bold text-[#EF4444]">⚠️ أقل من 6</span>}
              </div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-3 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] outline-none text-base font-bold ${passwordShort ? "ring-2 ring-[#EF4444]" : "focus:ring-2 focus:ring-[#357DED]"}`}
                dir="ltr"
                autoFocus
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#475569]">تأكيد كلمة السر</label>
                {passwordMatch && <span className="text-[10px] font-bold text-[#EF4444]">⚠️ غير متطابقتين</span>}
                {!passwordMatch && confirmPassword.length > 0 && newPassword.length >= 6 && (
                  <span className="text-[10px] font-bold text-[#10B981]">✓ متطابقتين</span>
                )}
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-3 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] outline-none text-base font-bold ${
                  passwordMatch ? "ring-2 ring-[#EF4444]" :
                  (!passwordMatch && confirmPassword.length > 0 && newPassword.length >= 6) ? "ring-2 ring-[#10B981]" :
                  "focus:ring-2 focus:ring-[#357DED]"
                }`}
                dir="ltr"
                required
              />
            </div>
            {error && <ErrorBox>{error}</ErrorBox>}
            <button
              type="submit"
              disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
              className="btn-primary"
            >
              {loading ? "⏳ جاري الحفظ..." : "حفظ كلمة السر الجديدة 🔒"}
            </button>
          </form>
        )}

        <div className="text-center">
          <Link href="/login" className="text-sm text-[#357DED] font-bold hover:underline">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>

      <style jsx>{`
        .btn-primary {
          width: 100%;
          background: linear-gradient(to right, #357DED, #10B981);
          color: white;
          padding: 14px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 15px;
          box-shadow: 0 4px 14px rgba(53,125,237,0.25);
          transition: all 0.15s;
        }
        .btn-primary:disabled { opacity: 0.4; }
        .btn-primary:active { transform: scale(0.97); }
      `}</style>
    </main>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm text-center font-bold border border-red-100">
      {children}
    </div>
  );
}
