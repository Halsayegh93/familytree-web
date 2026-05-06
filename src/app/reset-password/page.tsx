"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Tab = "username" | "phone";
type Step = "lookup" | "otp" | "done";

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

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("username");
  const [step, setStep] = useState<Step>("lookup");

  // Username flow
  const [username, setUsername] = useState("");
  const [resolvedPhone, setResolvedPhone] = useState<string | null>(null);
  const [usernameOtp, setUsernameOtp] = useState("");

  // Phone flow
  const [countryCode, setCountryCode] = useState("+965");
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noUsernameMsg, setNoUsernameMsg] = useState(false);

  function normalizeDigits(s: string): string {
    return s
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .replace(/\D/g, "");
  }

  function maskedPhone(p: string) {
    const digits = p.replace(/\D/g, "");
    return `**** ${digits.slice(-4)}`;
  }

  function switchTab(t: Tab) {
    setTab(t);
    setStep("lookup");
    setError(null);
    setNoUsernameMsg(false);
  }

  // ─── Username lookup ─────────────────────────────────────────────
  async function lookupUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    setNoUsernameMsg(false);

    const { data: profile } = await supabase
      .from("profiles")
      .select("phone_number, username")
      .eq("username", username.trim().toLowerCase())
      .maybeSingle();

    if (!profile) {
      // اسم المستخدم غير موجود
      setNoUsernameMsg(true);
      setLoading(false);
      return;
    }

    if (!profile.phone_number) {
      setError("هذا الحساب ليس له رقم هاتف — تواصل مع الإدارة");
      setLoading(false);
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: profile.phone_number });
    if (otpError) {
      setError("خطأ في إرسال الرمز — " + otpError.message);
      setLoading(false);
      return;
    }

    setResolvedPhone(profile.phone_number);
    setStep("otp");
    setLoading(false);
  }

  async function verifyUsernameOtp(e: React.FormEvent) {
    e.preventDefault();
    if (usernameOtp.length !== 6 || !resolvedPhone) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      phone: resolvedPhone,
      token: usernameOtp,
      type: "sms",
    });

    if (error) {
      setError(error.message);
    } else {
      await supabase.rpc("touch_last_active");
      router.push("/home");
      router.refresh();
    }
    setLoading(false);
  }

  // ─── Phone OTP flow ──────────────────────────────────────────────
  const fullPhone = `${countryCode}${normalizeDigits(phone)}`;

  async function sendPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    if (error) setError("تأكد من رقم الهاتف وحاول مجدداً");
    else setStep("otp");

    setLoading(false);
  }

  async function verifyPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    if (phoneOtp.length < 4) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: phoneOtp,
      type: "sms",
    });

    if (error) setError("الرمز غير صحيح أو منتهي الصلاحية");
    else {
      await supabase.rpc("touch_last_active");
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
            🔑
          </div>
          <h1 className="text-xl font-black text-[#0F172A]">استعادة الوصول</h1>
          <p className="text-sm text-[#64748B]">سجّل دخولك بأي طريقة</p>
        </div>

        {/* تابات */}
        {step === "lookup" && (
          <div className="bg-[#F1F5F9] rounded-xl p-1 flex gap-1">
            <TabBtn active={tab === "username"} onClick={() => switchTab("username")} icon="👤" label="اسم مستخدم" />
            <TabBtn active={tab === "phone"} onClick={() => switchTab("phone")} icon="📱" label="رقم الهاتف" />
          </div>
        )}

        {/* ─── Username — مرحلة البحث ──────────────────────────────── */}
        {tab === "username" && step === "lookup" && (
          <div className="space-y-4">
            <form onSubmit={lookupUsername} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#475569] mb-1.5">اسم المستخدم</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setNoUsernameMsg(false); setError(null); }}
                  placeholder="username"
                  className="w-full px-4 py-3 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] outline-none focus:ring-2 focus:ring-[#357DED] text-base font-bold"
                  dir="ltr"
                  autoFocus
                  required
                />
              </div>

              {error && <ErrorBox>{error}</ErrorBox>}

              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="btn-primary"
              >
                {loading ? "⏳ جاري البحث..." : "بحث عن حسابي ←"}
              </button>
            </form>

            {/* رسالة: لا يوجد اسم مستخدم */}
            {noUsernameMsg && (
              <div className="p-4 bg-[#FFFBEB] border border-[#F59E0B]/30 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">⚠️</span>
                  <div>
                    <p className="font-black text-sm text-[#92400E]">
                      أنت ما عندك اسم مستخدم
                    </p>
                    <p className="text-xs text-[#92400E] mt-1">
                      &ldquo;{username}&rdquo; غير مسجل في النظام.
                      سجّل دخولك برقم هاتفك مباشرة، أو سجّل حساباً جديداً.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => switchTab("phone")}
                    className="flex-1 py-2.5 bg-[#357DED] text-white rounded-xl text-sm font-bold"
                  >
                    📱 دخول برقم الهاتف
                  </button>
                  <Link
                    href="/register"
                    className="flex-1 py-2.5 bg-[#F1F5F9] text-[#475569] rounded-xl text-sm font-bold text-center"
                  >
                    ✨ تسجيل جديد
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Username — مرحلة OTP ─────────────────────────────────── */}
        {tab === "username" && step === "otp" && resolvedPhone && (
          <form onSubmit={verifyUsernameOtp} className="space-y-4">
            <div className="p-3 bg-[#EBF3FE] rounded-xl text-center">
              <p className="text-xs text-[#475569] font-semibold">تم إرسال رمز التحقق إلى</p>
              <p className="text-base font-black text-[#357DED] mt-0.5" dir="ltr">
                {maskedPhone(resolvedPhone)}
              </p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="------"
              value={usernameOtp}
              onChange={(e) => setUsernameOtp(normalizeDigits(e.target.value).slice(0, 6))}
              className="w-full px-4 py-4 bg-[#F1F5F9] rounded-2xl text-3xl font-black text-center tracking-widest outline-none focus:ring-2 focus:ring-[#357DED]"
              autoFocus
              required
            />
            {error && <ErrorBox>{error}</ErrorBox>}
            <button type="submit" disabled={loading || usernameOtp.length !== 6} className="btn-primary">
              {loading ? "⏳ جاري التحقق..." : "تأكيد الدخول ✓"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("lookup"); setUsernameOtp(""); setError(null); }}
              className="w-full text-sm text-[#64748B] font-bold"
            >
              ← تغيير اسم المستخدم
            </button>
          </form>
        )}

        {/* ─── Phone — مرحلة الإدخال ───────────────────────────────── */}
        {tab === "phone" && step === "lookup" && (
          <form onSubmit={sendPhoneOtp} className="space-y-4">
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

        {/* ─── Phone — مرحلة OTP ───────────────────────────────────── */}
        {tab === "phone" && step === "otp" && (
          <form onSubmit={verifyPhoneOtp} className="space-y-4">
            <div className="p-3 bg-[#EBF3FE] rounded-xl text-center">
              <p className="text-xs text-[#475569] font-semibold">تم إرسال رمز التحقق إلى</p>
              <p className="text-base font-black text-[#357DED] mt-0.5" dir="ltr">{fullPhone}</p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="------"
              value={phoneOtp}
              onChange={(e) => setPhoneOtp(normalizeDigits(e.target.value).slice(0, 6))}
              className="w-full px-4 py-4 bg-[#F1F5F9] rounded-2xl text-3xl font-black text-center tracking-widest outline-none focus:ring-2 focus:ring-[#357DED]"
              autoFocus
              required
            />
            {error && <ErrorBox>{error}</ErrorBox>}
            <button type="submit" disabled={loading || phoneOtp.length < 4} className="btn-primary">
              {loading ? "⏳ جاري التحقق..." : "تأكيد الدخول ✓"}
            </button>
            <button type="button" onClick={() => { setStep("lookup"); setPhoneOtp(""); setError(null); }}
              className="w-full text-sm text-[#64748B] font-bold">
              ← تغيير الرقم
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

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-bold text-sm transition ${
        active ? "bg-white text-[#357DED] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm text-center font-bold border border-red-100">
      {children}
    </div>
  );
}
