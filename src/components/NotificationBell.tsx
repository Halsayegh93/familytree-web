"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { notificationMeta } from "@/lib/notification-router";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  created_at: string;
  is_read: boolean;
  created_by: string | null;
  target_member_id: string;
};

export function NotificationBell({
  canModerate,
}: {
  canModerate: boolean;
  isHR?: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // المستخدم الحالي
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  // جلب الإشعارات + اشتراك realtime
  useEffect(() => {
    if (!userId) return;

    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, kind, created_at, is_read, created_by, target_member_id")
        .eq("target_member_id", userId)
        .order("created_at", { ascending: false })
        .limit(40);

      setItems((data ?? []) as NotificationRow[]);
    }

    load();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `target_member_id=eq.${userId}`,
        },
        load
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // إغلاق عند الضغط خارج
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleNotificationClick(n: NotificationRow) {
    setOpen(false);

    // علّم كمقروء فوراً (optimistic)
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }

    const meta = notificationMeta(n.kind, {
      canModerate,
      createdBy: n.created_by,
      targetMemberId: n.target_member_id,
    });

    router.push(meta.href);
  }

  async function markAllRead() {
    if (!userId) return;
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("target_member_id", userId)
      .eq("is_read", false);
  }

  if (!userId) return null;

  const newCount = items.filter((n) => !n.is_read).length;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-lg bg-[#F1F5F9] hover:bg-[#357DED] hover:text-white flex items-center justify-center text-lg transition"
        title="الإشعارات"
      >
        🔔
        {newCount > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-black flex items-center justify-center animate-pulse">
            {newCount > 9 ? "9+" : newCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-[#0F172A]">🔔 الإشعارات</h3>
              <p className="text-[10px] text-[#64748B]">
                {items.length > 0 ? `${items.length} إشعار` : "لا توجد إشعارات"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {newCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[#357DED] font-bold hover:underline"
                >
                  علّم الكل مقروء
                </button>
              )}
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-[#64748B] font-bold hover:text-[#357DED]"
                title="عرض الكل"
              >
                ↗
              </Link>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[#E2E8F0]">
            {items.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">🌱</div>
                <p className="text-sm text-[#64748B]">لا يوجد إشعارات</p>
              </div>
            ) : (
              items.slice(0, 15).map((n) => {
                const meta = notificationMeta(n.kind, {
                  canModerate,
                  createdBy: n.created_by,
                  targetMemberId: n.target_member_id,
                });
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-right flex items-start gap-2.5 p-3 hover:bg-[#F8FAFC] transition ${
                      !n.is_read ? "bg-[#FEF9E7]/40" : ""
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 relative"
                      style={{ background: `${meta.color}15`, color: meta.color }}
                    >
                      {meta.icon}
                      {!n.is_read && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#EF4444]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-[#0F172A] truncate">
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-[10px] text-[#64748B] line-clamp-2 mt-0.5">
                          {n.body}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-bold" style={{ color: meta.color }}>
                          {meta.labelAr}
                        </span>
                        <span className="text-[9px] text-[#94A3B8]">·</span>
                        <span className="text-[10px] text-[#94A3B8]">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {items.length > 15 && (
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-center text-sm font-bold text-[#357DED] hover:bg-[#F8FAFC] border-t border-[#E2E8F0]"
            >
              عرض الكل ({items.length}) ←
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function timeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);

  if (d >= 1) return `قبل ${d} يوم`;
  if (h >= 1) return `قبل ${h} ساعة`;
  if (m >= 1) return `قبل ${m} دقيقة`;
  return "الآن";
}
