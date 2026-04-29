"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PendingPage() {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 text-center space-y-5">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#357DED]/20 to-[#10B981]/20 flex items-center justify-center text-4xl">
          ⏳
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-[#0F172A]">طلبك قيد المراجعة</h1>
          <p className="text-sm text-[#64748B] leading-relaxed">
            تم استلام طلب تسجيلك بنجاح. سيتم مراجعته من قِبل الإدارة والموافقة عليه قريباً.
          </p>
        </div>

        <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-2xl p-4 text-right space-y-2">
          <div className="flex items-center gap-2 text-sm text-[#15803D] font-bold">
            <span>✅</span>
            <span>تم إنشاء حسابك</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#15803D] font-bold">
            <span>✅</span>
            <span>تم إرسال الطلب للإدارة</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#94A3B8] font-bold">
            <span>⏳</span>
            <span>في انتظار الموافقة</span>
          </div>
        </div>

        <p className="text-xs text-[#94A3B8]">
          بعد الموافقة ستتمكن من الدخول للتطبيق مباشرة
        </p>

        <button
          onClick={signOut}
          className="w-full py-3 rounded-2xl border-2 border-[#E2E8F0] text-[#64748B] font-bold text-sm hover:bg-[#F8FAFC] transition"
        >
          تسجيل الخروج
        </button>
      </div>
    </main>
  );
}
