"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * ActivityTracker — يبلّغ القاعدة بمكان وجود العضو في الموقع
 * يحدّث `current_screen` و `last_active_at` على profiles
 *
 * - يستدعى عند كل تغيير صفحة (pathname)
 * - heartbeat كل دقيقة لإبقاء العضو "نشط الآن"
 * - يعمل فقط داخل (app) — صفحات بعد تسجيل الدخول
 */
export function ActivityTracker() {
  const pathname = usePathname();
  const supabase = useRef(createClient()).current;
  const lastReported = useRef<{ screen: string; at: number }>({ screen: "", at: 0 });

  useEffect(() => {
    const screen = detectScreen(pathname);

    const report = async () => {
      try {
        await supabase.rpc("update_my_current_screen", {
          p_screen: screen,
          p_source: "web",
        });
        lastReported.current = { screen, at: Date.now() };
      } catch (e) {
        console.warn("[Activity] فشل التحديث:", e);
      }
    };

    // سجل جلسة الموقع مرة واحدة (يميّز web users من app users)
    const registerSession = async () => {
      try {
        await supabase.rpc("register_web_session", {
          p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        });
      } catch (e) {
        // silent — مو ضروري نظهر خطأ للمستخدم
      }
    };
    void registerSession();

    // throttle: لا ترسل نفس الشاشة أكثر من مرة كل 30 ثانية
    const same = lastReported.current.screen === screen;
    const recent = Date.now() - lastReported.current.at < 30_000;
    if (!same || !recent) {
      void report();
    }

    // heartbeat: كل دقيقة يبقى "نشط"
    const heartbeat = setInterval(() => {
      void report();
    }, 60_000);

    return () => clearInterval(heartbeat);
  }, [pathname, supabase]);

  return null;
}

function detectScreen(pathname: string): string {
  // /home, /tree, /news, /profile, /admin, /diwaniyas, /projects ...
  const seg = pathname.replace(/^\/+/, "").split("/")[0] || "home";

  // قائمة الشاشات المعروفة (تطابق التطبيق)
  const known = ["home", "tree", "diwaniyas", "profile", "admin", "news", "projects"];
  return known.includes(seg) ? seg : seg;
}
