import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-[#357DED] to-[#10B981] flex items-center justify-center text-5xl shadow-2xl">
          🌳
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black text-[#1A2A3A]">عائلة المحمدعلي</h1>
          <p className="text-lg text-[#6B7B8D]">النسخة الإلكترونية من شجرة العائلة</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl space-y-4">
          <p className="text-[#3A4A5A]">مرحباً 👋 — هذا هو هيكل البداية للموقع</p>
          <Link
            href="/login"
            className="inline-block bg-gradient-to-r from-[#357DED] to-[#10B981] text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:opacity-90 transition"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </main>
  );
}
