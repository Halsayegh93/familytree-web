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

  // Username + Password
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  // ─── Username + Password flow ──────────────────────────────────
  async function signInWithUsername(e: React.FormEvent) {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !password) return;

    setLoading(true);
    setError(null);

    const email = `${cleanUsername}@familytree.local`;
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

    if (signInErr) {
      if (signInErr.message?.toLowerCase().includes("invalid")) {
        setError("اسم المستخدم أو كلمة السر غير صحيحة");
      } else {
        setError(signInErr.message);
      }
      setLoading(false);
      return;
    }

    await supabase.rpc("touch_last_active");
    router.push("/home");
    router.refresh();
  }

  function switchTab(t: "phone" | "username") {
    setTab(t);
    setError(null);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 py-10 bg-[#F8FAFC]">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#357DED] to-[#10B981] flex items-center justify-center text-3xl shadow-lg">
            🌳
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0F172A]">عائلة المحمدعلي</h1>
            <p className="text-sm text-[#64748B] mt-1">سجّل دخولك للمتابعة</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1 flex gap-1">
          <TabBtn active={tab === "phone"} onClick={() => switchTab("phone")} icon="📱" label="رقم الهاتف" />
          <TabBtn active={tab === "username"} onClick={() => switchTab("username")} icon="👤" label="اسم مستخدم" />
        </div>

        {/* ─── Phone tab ─────────────────────────────────────────── */}
        {tab === "phone" &&
          (otpStep === "phone" ? (
            <form onSubmit={sendOtp} className="space-y-3">
              <Section title="📱 الدخول برقم الهاتف">
                <Field label="رقم الهاتف">
                  <div className="flex gap-2" dir="ltr">
                    <div className="flex items-center gap-1 px-3 bg-[#F1F5F9] rounded-xl text-sm font-bold flex-shrink-0 border border-[#E2E8F0]">
                      🇰🇼 <span dir="ltr">+965</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="inp flex-1"
                      dir="ltr"
                      autoFocus
                      required
                    />
                  </div>
                </Field>
              </Section>

              <SubmitButton
                disabled={loading || cleanPhone.length < 7}
                loading={loading}
                loadingLabel="جاري الإرسال..."
              >
                إرسال رمز التحقق
              </SubmitButton>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-3">
              <Section title="✓ تحقق من الرمز">
                <Field label="رمز التحقق (6 أرقام)">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="------"
                    value={otp}
                    onChange={(e) => setOtp(normalizeDigits(e.target.value).slice(0, 6))}
                    className="inp text-center text-2xl font-black tracking-[0.5em]"
                    autoFocus
                    required
                  />
                </Field>
              </Section>

              <SubmitButton
                disabled={loading || otp.length !== 6}
                loading={loading}
                loadingLabel="جاري التحقق..."
              >
                تأكيد وتسجيل الدخول
              </SubmitButton>
              <button
                type="button"
                onClick={() => {
                  setOtpStep("phone");
                  setOtp("");
                  setError(null);
                }}
                className="w-full text-sm text-[#64748B] hover:text-[#357DED] font-semibold transition"
              >
                ← تغيير الرقم
              </button>
            </form>
          ))}

        {/* ─── Username + Password tab ────────────────────────────── */}
        {tab === "username" && (
          <form onSubmit={signInWithUsername} className="space-y-3">
            <Section title="🔐 الدخول باسم المستخدم">
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
                  autoComplete="username"
                />
              </Field>

              <Field label="كلمة السر">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="inp pr-12"
                    dir="ltr"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute top-1/2 -translate-y-1/2 left-3 text-[#64748B] hover:text-[#357DED] transition p-1"
                    aria-label={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </Field>
            </Section>

            <SubmitButton
              disabled={loading || !username.trim() || !password}
              loading={loading}
              loadingLabel="جاري الدخول..."
            >
              تسجيل الدخول
            </SubmitButton>

            <div className="flex items-center justify-between pt-1">
              <Link href="/register" className="text-sm font-bold text-[#357DED] hover:underline">
                تسجيل جديد ←
              </Link>
              <Link href="/reset-password" className="text-sm text-[#64748B] hover:text-[#357DED] font-semibold transition">
                نسيت كلمة السر؟
              </Link>
            </div>
          </form>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm text-center font-bold border border-red-100">
            {error}
          </div>
        )}
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

/* ──────────────────────────────────────────────────────────────────
   Sub-components — متطابقة مع نمط register
   ────────────────────────────────────────────────────────────────── */

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition ${
        active
          ? "bg-gradient-to-br from-[#357DED] to-[#10B981] text-white shadow-md"
          : "text-[#64748B] hover:text-[#0F172A]"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#475569] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SubmitButton({
  disabled,
  loading,
  loadingLabel,
  children,
}: {
  disabled?: boolean;
  loading?: boolean;
  loadingLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full bg-gradient-to-r from-[#357DED] to-[#10B981] text-white py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-40 active:scale-95 transition"
    >
      {loading ? `⏳ ${loadingLabel}` : children}
    </button>
  );
}
