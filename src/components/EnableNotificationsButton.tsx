"use client";

import { useEffect, useState } from "react";
import {
  isWebPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/web-push";

/**
 * زر تفعيل/تعطيل إشعارات المتصفح
 * - يطلب الإذن أول مرة
 * - يسجل الاشتراك على السيرفر
 */
export function EnableNotificationsButton() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | "loading">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  if (permission === "loading") return null;
  if (permission === "unsupported") return null;

  const isOn = permission === "granted";

  async function toggle() {
    setBusy(true);
    try {
      if (isOn) {
        await unsubscribeFromPush();
        setPermission("default");
      } else {
        const result = await subscribeToPush();
        if (result.ok) setPermission("granted");
        else if (result.reason === "denied") {
          alert("تم رفض الإذن. فعّله من إعدادات المتصفح.");
          setPermission("denied");
        } else {
          alert("فشل التفعيل: " + (result.reason ?? "خطأ غير معروف"));
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy || permission === "denied"}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
      style={{
        background: isOn ? "rgb(220 252 231)" : "rgb(219 234 254)",
        color: isOn ? "rgb(22 101 52)" : "rgb(30 64 175)",
      }}
    >
      <span>{isOn ? "🔔" : "🔕"}</span>
      <span>
        {permission === "denied"
          ? "الإشعارات محظورة من المتصفح"
          : isOn
          ? "إيقاف إشعارات المتصفح"
          : "تفعيل إشعارات المتصفح"}
      </span>
    </button>
  );
}
