"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

type FilterMode = "all" | "unread";

export function NotificationsClient({
  initialNotifications,
  userId,
  canModerate,
}: {
  initialNotifications: NotificationRow[];
  userId: string;
  canModerate: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<NotificationRow[]>(initialNotifications);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [busy, setBusy] = useState(false);

  // اشتراك realtime
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `target_member_id=eq.${userId}`,
        },
        async () => {
          const { data } = await supabase
            .from("notifications")
            .select("id, title, body, kind, created_at, is_read, created_by, target_member_id")
            .eq("target_member_id", userId)
            .order("created_at", { ascending: false })
            .limit(200);
          setItems((data ?? []) as NotificationRow[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const filtered = filter === "unread" ? items.filter((n) => !n.is_read) : items;
  const unreadCount = items.filter((n) => !n.is_read).length;

  async function handleClick(n: NotificationRow) {
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
    if (busy) return;
    setBusy(true);
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("target_member_id", userId)
      .eq("is_read", false);
    setBusy(false);
  }

  async function deleteNotification(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("حذف هذا الإشعار؟")) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  }

  return (
    <div className="space-y-3">
      {/* الفلتر + الإجراءات */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-2 flex items-center gap-1">
        <button
          onClick={() => setFilter("all")}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition ${
            filter === "all"
              ? "bg-[#357DED] text-white"
              : "text-[#64748B] hover:bg-[#F1F5F9]"
          }`}
        >
          الكل ({items.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5 ${
            filter === "unread"
              ? "bg-[#EF4444] text-white"
              : "text-[#64748B] hover:bg-[#F1F5F9]"
          }`}
        >
          غير مقروء
          {unreadCount > 0 && (
            <span
              className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${
                filter === "unread" ? "bg-white text-[#EF4444]" : "bg-[#EF4444] text-white"
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={busy}
            className="px-3 py-2 text-xs text-[#10B981] font-bold hover:bg-[#F0FDF4] rounded-xl disabled:opacity-50"
          >
            ✓ علّم الكل
          </button>
        )}
      </div>

      {/* القائمة */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
          <div className="text-5xl mb-3">{filter === "unread" ? "✅" : "🌱"}</div>
          <p className="text-[#64748B] font-semibold">
            {filter === "unread" ? "لا يوجد إشعارات غير مقروءة" : "لا يوجد إشعارات"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden divide-y divide-[#E2E8F0]">
          {filtered.map((n) => {
            const meta = notificationMeta(n.kind, {
              canModerate,
              createdBy: n.created_by,
              targetMemberId: n.target_member_id,
            });
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-right flex items-start gap-3 p-4 hover:bg-[#F8FAFC] transition group ${
                  !n.is_read ? "bg-[#FEF9E7]/40" : ""
                }`}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 relative"
                  style={{ background: `${meta.color}15`, color: meta.color }}
                >
                  {meta.icon}
                  {!n.is_read && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#EF4444] border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <h3 className="flex-1 font-black text-sm text-[#0F172A]">
                      {n.title}
                    </h3>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-black flex-shrink-0"
                      style={{ background: `${meta.color}15`, color: meta.color }}
                    >
                      {meta.labelAr}
                    </span>
                  </div>
                  {n.body && (
                    <p className="text-xs text-[#64748B] mt-1 line-clamp-2">
                      {n.body}
                    </p>
                  )}
                  <div className="text-[11px] text-[#94A3B8] mt-1.5 font-semibold">
                    {formatDate(n.created_at)}
                  </div>
                </div>

                <button
                  onClick={(e) => deleteNotification(n.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition w-7 h-7 rounded-lg bg-[#FEE2E2] text-[#EF4444] flex items-center justify-center text-xs font-bold flex-shrink-0"
                  title="حذف"
                >
                  ✕
                </button>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diff = now - date.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);

  if (m < 1) return "الآن";
  if (h < 1) return `قبل ${m} دقيقة`;
  if (d < 1) return `قبل ${h} ساعة`;
  if (d < 7) return `قبل ${d} يوم`;

  return new Intl.DateTimeFormat("ar", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
