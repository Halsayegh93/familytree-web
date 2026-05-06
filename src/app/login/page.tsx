"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<"phone" | "username">("phone");

  // Phone OTP
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "otp">("phone");

  // Username → Phone lookup → OTP
  const [username, setUsername] = useState("");
  const [usernameStep, setUsernameStep] = useState<"username" | "otp">("username");
  const [resolvedPhone, setResolvedPhone] = useState<string | null>(null);
  const [usernameOtp, setUsernameOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function normalizeDigits(s: string): string {
    return s
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .replace(/\D/g, "");
  }

  const cleanPhone = normalizeDigits(phone);

  // ─── Phone OTP flow ────────────────────────────────────────────
  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (cleanPhone.length < 7) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone: `+965${cleanPhone}` });
    if (error) setError(error.message);
    else setOtpStep("otp");
    setLoading(false);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      phone: `+965${cleanPhone}`,
      token: otp,
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

  // ─── Username → Phone OTP flow ─────────────────────────────────
  async function lookupUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError(null);

    const { data: profile } = await supabase
      .from("profiles")
      .select("phone_number, username")
      .eq("username", username.trim().toLowerCase())
      .maybeSingle();

    if (!profile) {
      setError("اسم المستخدم غير موجود — سجّل دخولك برقم هاتفك");
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
    setUsernameStep("otp");
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

  // مسح الأخطاء عند تبديل التاب
  function switchTab(t: "phone" | "username") {
    setTab(t);
    setError(null);
  }

  // عرض آخر 4 أرقام من الهاتف (للخصوصية)
  function maskedPhone(p: string) {
    const digits = p.replace(/\D/g, "");
    return `**** ${digits.slice(-4)}`;
  }

  return (
    <main className="flex-1 flex items-start md:items-center justify-center p-4 pt-8 md:pt-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 md:p-8 space-y-5">

        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#357DED] to-[#10B981] flex items-center justify-center text-3xl">
            🌳
          </div>
          <h1 className="text-2xl font-black text-[#0F172A]">عائلة المحمدعلي</h1>
          <p className="text-sm text-[#64748B]">سجّل دخولك</p>
        </div>

        {/* تابات */}
        <div className="bg-[#F1F5F9] rounded-xl p-1 flex gap-1">
          <TabBtn active={tab === "phone"} onClick={() => switchTab("phone")} icon="📱" label="رقم الهاتف" />
          <TabBtn active={tab === "username"} onClick={() => switchTab("username")} icon="👤" label="اسم مستخدم" />
        </div>

        {/* ─── تاب الهاتف ─────────────────────────────────────────── */}
        {tab === "phone" && (
          otpStep === "phone" ? (
            <form onSubmit={sendOtp} className="space-y-3">
              <div className="flex gap-2" dir="ltr">
                <div className="flex items-center gap-1 px-3 bg-[#F1F5F9] rounded-2xl text-sm font-bold flex-shrink-0">
                  🇰🇼 <span dir="ltr">+965</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="رقم الهاتف"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 min-w-0 px-4 py-3 bg-[#F1F5F9] rounded-2xl text-base font-bold outline-none focus:ring-2 focus:ring-[#357DED]"
                  dir="ltr"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || cleanPhone.length < 7}
                className="w-full bg-gradient-to-r from-[#357DED] to-[#10B981] text-white py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-50 active:scale-95 transition"
              >
                {loading ? "⏳ جاري الإرسال..." : "إرسال رمز ←"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="------"
                value={otp}
                onChange={(e) => setOtp(normalizeDigits(e.target.value).slice(0, 6))}
                className="w-full px-4 py-4 bg-[#F1F5F9] rounded-2xl text-3xl font-black text-center tracking-widest outline-none focus:ring-2 focus:ring-[#357DED]"
                autoFocus
                required
              />
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-[#357DED] to-[#10B981] text-white py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-50 active:scale-95 transition"
              >
                {loading ? "⏳ جاري التحقق..." : "تأكيد ✓"}
              </button>
              <button
                type="button"
                onClick={() => { setOtpStep("phone"); setOtp(""); setError(null); }}
                className="w-full text-sm text-[#64748B] underline"
              >
                تغيير الرقم
              </button>
            </form>
          )
        )}

        {/* ─── تاب اسم المستخدم ────────────────────────────────────── */}
        {tab === "username" && (
          usernameStep === "username" ? (
            <form onSubmit={lookupUsername} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#475569] mb-1.5">اسم المستخدم</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full px-4 py-3 bg-[#F1F5F9] rounded-2xl text-base font-bold outline-none focus:ring-2 focus:ring-[#357DED]"
                  dir="ltr"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="w-full bg-gradient-to-r from-[#357DED] to-[#10B981] text-white py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-50 active:scale-95 transition"
              >
                {loading ? "⏳ جاري البحث..." : "تسجيل الدخول ←"}
              </button>

              <div className="flex items-center justify-between pt-1">
                <Link href="/register" className="text-sm font-bold text-[#357DED] hover:underline">
                  تسجيل جديد
                </Link>
                <Link href="/reset-password" className="text-sm text-[#94A3B8] hover:text-[#357DED] font-semibold">
                  ما عندك اسم مستخدم؟
                </Link>
              </div>
            </form>
          ) : (
            /* بعد العثور على الهاتف — إرسال OTP */
            <form onSubmit={verifyUsernameOtp} className="space-y-3">
              <div className="p-3 bg-[#EBF3FE] rounded-xl text-center">
                <p className="text-xs text-[#475569] font-semibold">تم إرسال رمز التحقق إلى</p>
                <p className="text-base font-black text-[#357DED] mt-0.5" dir="ltr">
                  {maskedPhone(resolvedPhone!)}
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
              <button
                type="submit"
                disabled={loading || usernameOtp.length !== 6}
                className="w-full bg-gradient-to-r from-[#357DED] to-[#10B981] text-white py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-50 active:scale-95 transition"
              >
                {loading ? "⏳ جاري التحقق..." : "تأكيد ✓"}
              </button>
              <button
                type="button"
                onClick={() => { setUsernameStep("username"); setUsernameOtp(""); setResolvedPhone(null); setError(null); }}
                className="w-full text-sm text-[#64748B] underline"
              >
                ← تغيير اسم المستخدم
              </button>
            </form>
          )
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm text-center font-bold">
            {error}
          </div>
        )}
      </div>
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
