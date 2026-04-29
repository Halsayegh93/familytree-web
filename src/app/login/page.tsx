"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<"phone" | "password">("phone");
  const [mode, setMode] = useState<AuthMode>("login");

  // Phone OTP
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "otp">("phone");

  // Username/Password login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Registration fields
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regBirth, setRegBirth] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function normalizeDigits(s: string): string {
    return s
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .replace(/\D/g, "");
  }

  const cleanPhone = normalizeDigits(phone);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (cleanPhone.length < 7) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      phone: `+965${cleanPhone}`,
    });
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
    if (error) setError(error.message);
    else {
      router.push("/home");
      router.refresh();
    }
    setLoading(false);
  }

  async function loginWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError(null);
    const email = `${username.trim().toLowerCase()}@familytree.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("اسم المستخدم أو كلمة السر غير صحيحة");
    else {
      router.push("/home");
      router.refresh();
    }
    setLoading(false);
  }

  async function registerWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword || !regFullName.trim()) return;
    if (regPassword !== regConfirm) {
      setError("كلمتا السر غير متطابقتين");
      return;
    }
    if (regPassword.length < 6) {
      setError("كلمة السر يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    setError(null);

    const email = `${regUsername.trim().toLowerCase()}@familytree.local`;

    // 1. إنشاء حساب Auth
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password: regPassword,
    });

    if (signUpErr || !signUpData.user) {
      setError(signUpErr?.message?.includes("already") ? "اسم المستخدم مستخدم مسبقاً" : (signUpErr?.message ?? "خطأ في التسجيل"));
      setLoading(false);
      return;
    }

    const userId = signUpData.user.id;

    // 2. تنظيف رقم الهاتف
    const cleanedPhone = normalizeDigits(regPhone);
    const finalPhone = cleanedPhone
      ? cleanedPhone.startsWith("965")
        ? `+${cleanedPhone}`
        : `+965${cleanedPhone}`
      : null;

    // 3. إضافة بيانات العضو
    const nameParts = regFullName.trim().split(" ");
    const firstName = nameParts[0] ?? regFullName.trim();

    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      first_name: firstName,
      full_name: regFullName.trim(),
      phone_number: finalPhone,
      birth_date: regBirth || null,
      role: "member",
      status: "pending",
    });

    if (profileErr) {
      // حذف الحساب إذا فشل إدراج الـ profile
      await supabase.auth.signOut();
      setError("خطأ في حفظ البيانات: " + profileErr.message);
      setLoading(false);
      return;
    }

    // 4. توجيه لصفحة الانتظار
    router.push("/pending");
    router.refresh();
    setLoading(false);
  }

  function switchTab(t: "phone" | "password") {
    setTab(t);
    setMode("login");
    setError(null);
  }

  return (
    <main className="flex-1 flex items-start md:items-center justify-center p-4 pt-8 md:pt-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 md:p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#357DED] to-[#10B981] flex items-center justify-center text-3xl">
            🌳
          </div>
          <h1 className="text-2xl font-black text-[#0F172A]">عائلة المحمدعلي</h1>
          <p className="text-sm text-[#64748B]">
            {tab === "password" && mode === "register" ? "إنشاء حساب جديد" : "سجّل دخولك"}
          </p>
        </div>

        {/* تابات الدخول الرئيسية */}
        <div className="bg-[#F1F5F9] rounded-xl p-1 flex gap-1">
          <TabBtn active={tab === "phone"} onClick={() => switchTab("phone")} icon="📱" label="رقم الهاتف" />
          <TabBtn active={tab === "password"} onClick={() => switchTab("password")} icon="👤" label="اسم مستخدم" />
        </div>

        {/* تاب الهاتف */}
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

        {/* تاب اسم المستخدم */}
        {tab === "password" && (
          <>
            {/* تبديل دخول / تسجيل */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-1 flex gap-1">
              <ModeBtn active={mode === "login"} onClick={() => { setMode("login"); setError(null); }} label="دخول" />
              <ModeBtn active={mode === "register"} onClick={() => { setMode("register"); setError(null); }} label="تسجيل جديد" />
            </div>

            {/* دخول */}
            {mode === "login" && (
              <form onSubmit={loginWithPassword} className="space-y-3">
                <Field label="اسم المستخدم">
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
                </Field>
                <Field label="كلمة السر">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-[#F1F5F9] rounded-2xl text-base font-bold outline-none focus:ring-2 focus:ring-[#357DED]"
                    dir="ltr"
                    required
                  />
                </Field>
                <button
                  type="submit"
                  disabled={loading || !username.trim() || !password}
                  className="w-full bg-gradient-to-r from-[#357DED] to-[#10B981] text-white py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-50 active:scale-95 transition"
                >
                  {loading ? "⏳ جاري الدخول..." : "دخول 🔓"}
                </button>
              </form>
            )}

            {/* تسجيل جديد */}
            {mode === "register" && (
              <form onSubmit={registerWithPassword} className="space-y-3">
                <Field label="اسم المستخدم">
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.replace(/\s/g, ""))}
                    placeholder="username"
                    className="w-full px-4 py-3 bg-[#F1F5F9] rounded-2xl text-base font-bold outline-none focus:ring-2 focus:ring-[#357DED]"
                    dir="ltr"
                    autoFocus
                    required
                  />
                </Field>
                <Field label="كلمة السر">
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="6 أحرف على الأقل"
                    className="w-full px-4 py-3 bg-[#F1F5F9] rounded-2xl text-base font-bold outline-none focus:ring-2 focus:ring-[#357DED]"
                    dir="ltr"
                    required
                  />
                </Field>
                <Field label="تأكيد كلمة السر">
                  <input
                    type="password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-[#F1F5F9] rounded-2xl text-base font-bold outline-none focus:ring-2 focus:ring-[#357DED]"
                    dir="ltr"
                    required
                  />
                </Field>

                <div className="border-t border-[#F1F5F9] pt-3">
                  <p className="text-xs text-[#94A3B8] mb-3 font-semibold">بيانات شخصية</p>
                  <div className="space-y-3">
                    <Field label="الاسم الكامل">
                      <input
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="الاسم الكامل مع الجد"
                        className="w-full px-4 py-3 bg-[#F1F5F9] rounded-2xl text-base font-bold outline-none focus:ring-2 focus:ring-[#357DED]"
                        required
                      />
                    </Field>
                    <Field label="رقم الهاتف (اختياري)">
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+965..."
                        className="w-full px-4 py-3 bg-[#F1F5F9] rounded-2xl text-base font-bold outline-none focus:ring-2 focus:ring-[#357DED]"
                        dir="ltr"
                      />
                    </Field>
                    <Field label="تاريخ الميلاد (اختياري)">
                      <input
                        type="date"
                        value={regBirth}
                        onChange={(e) => setRegBirth(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F1F5F9] rounded-2xl text-base font-bold outline-none focus:ring-2 focus:ring-[#357DED]"
                      />
                    </Field>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !regUsername.trim() || !regPassword || !regConfirm || !regFullName.trim()}
                  className="w-full bg-gradient-to-r from-[#357DED] to-[#10B981] text-white py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-50 active:scale-95 transition"
                >
                  {loading ? "⏳ جاري التسجيل..." : "إنشاء حساب ✨"}
                </button>
              </form>
            )}
          </>
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

function ModeBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
        active ? "bg-white text-[#357DED] shadow-sm" : "text-[#94A3B8] hover:text-[#475569]"
      }`}
    >
      {label}
    </button>
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
