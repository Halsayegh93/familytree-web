// Web Push — تسجيل واشتراك المتصفح في الإشعارات
import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buf = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return buf;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** هل المتصفح يدعم Web Push؟ */
export function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** الحالة الحالية للإذن */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isWebPushSupported()) return "unsupported";
  return Notification.permission;
}

/** اشترك في Web Push */
export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isWebPushSupported()) return { ok: false, reason: "unsupported" };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "missing VAPID public key" };

  // اطلب الإذن
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  // سجل الـ service worker
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  // اشترك
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const json = sub.toJSON();
  const endpoint = json.endpoint || sub.endpoint;
  const p256dh = arrayBufferToBase64(sub.getKey("p256dh"));
  const authKey = arrayBufferToBase64(sub.getKey("auth"));

  // أرسل للسيرفر
  const supabase = createClient();
  const { error } = await supabase.rpc("register_web_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: authKey,
    p_user_agent: navigator.userAgent,
  });

  if (error) {
    console.warn("[WebPush] فشل تسجيل الاشتراك:", error);
    return { ok: false, reason: error.message };
  }

  return { ok: true };
}

/** ألغ الاشتراك */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isWebPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();

  const supabase = createClient();
  await supabase.rpc("unregister_web_push_subscription", { p_endpoint: endpoint });
  return true;
}
