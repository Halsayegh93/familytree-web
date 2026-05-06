"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notificationMeta, ACTIVITY_KINDS, ACTIONABLE_KINDS } from "@/lib/notification-router";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  created_at: string;
  is_read: boolean;
  created_by: string | null;
  target_member_id: string | null;
  request_id?: string | null;
  request_type?: string | null;
};

type TabKey = "personal" | "activity";

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
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<NotificationRow[]>(initialNotifications);
  const [tab, setTab] = useState<TabKey>("personal");
  const [busy, setBusy] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<NotificationRow | null>(null);

  // ── Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    const refetch = async () => {
      let q = supabase
        .from("notifications")
        .select("id, title, body, kind, created_at, is_read, created_by, target_member_id, request_id, request_type")
        .order("created_at", { ascending: false })
        .limit(300);
      if (canModerate) {
        q = q.or(`target_member_id.eq.${userId},target_member_id.is.null`);
      } else {
        q = q.eq("target_member_id", userId);
      }
      const { data } = await q;
      setItems((data ?? []) as NotificationRow[]);
    };

    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, refetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, canModerate, supabase]);

  // ── Filtering by tab ────────────────────────────────────────────
  const personalNotifications = useMemo(
    () => items.filter(n => n.target_member_id !== null || !ACTIVITY_KINDS.has(n.kind)),
    [items]
  );
  const activityNotifications = useMemo(
    () => items.filter(n => n.target_member_id === null && ACTIVITY_KINDS.has(n.kind)),
    [items]
  );

  const visible = canModerate
    ? (tab === "activity" ? activityNotifications : personalNotifications)
    : personalNotifications;

  const personalUnread = personalNotifications.filter(n => !n.is_read).length;
  const activityUnread = activityNotifications.filter(n => !n.is_read).length;

  // ── Group by date ───────────────────────────────────────────────
  const grouped = useMemo(() => groupByDate(visible), [visible]);

  // ── Actions ────────────────────────────────────────────────────
  async function markAsRead(id: string) {
    setItems(prev => prev.map(x => x.id === id ? { ...x, is_read: true } : x));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function markAllRead() {
    if (busy) return;
    setBusy(true);
    const ids = visible.filter(n => !n.is_read).map(n => n.id);
    if (ids.length === 0) { setBusy(false); return; }
    setItems(prev => prev.map(x => ids.includes(x.id) ? { ...x, is_read: true } : x));
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    setBusy(false);
  }

  async function deleteNotification(id: string) {
    setItems(prev => prev.filter(x => x.id !== id));
    setSelected(null);
    await supabase.from("notifications").delete().eq("id", id);
  }

  async function approveRequest(n: NotificationRow) {
    if (!n.request_id || !n.request_type) return;
    if (actingId) return;
    setActingId(n.id);
    try {
      const { error } = await supabase.rpc("approveRequest" as never, {} as never);
      // Fallback: direct update on admin_requests
      if (error) {
        if (n.request_type === "join_request") {
          await supabase.from("profiles").update({
            role: "member", status: "active", is_hidden_from_tree: false,
          }).eq("id", n.request_id);
        } else {
          await supabase.from("admin_requests").update({ status: "approved" }).eq("id", n.request_id);
        }
      }
      await deleteNotification(n.id);
    } finally {
      setActingId(null);
    }
  }

  async function rejectRequest(n: NotificationRow) {
    if (!n.request_id || !n.request_type) return;
    if (actingId) return;
    setActingId(n.id);
    try {
      if (n.request_type === "join_request") {
        await supabase.from("admin_requests").delete().eq("requester_id", n.request_id);
        await supabase.from("profiles").delete().eq("id", n.request_id);
      } else {
        await supabase.from("admin_requests").update({ status: "rejected" }).eq("id", n.request_id);
      }
      await deleteNotification(n.id);
    } finally {
      setActingId(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-3">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#357DED] to-[#5438DC] flex items-center justify-center text-2xl">
          🔔
        </div>
        <div className="flex-1">
          <h1 className="font-black text-xl text-[#0F172A]">الإشعارات</h1>
          <p className="text-sm text-[#64748B]">{items.length} إشعار</p>
        </div>
        {visible.some(n => !n.is_read) && (
          <button
            onClick={markAllRead}
            disabled={busy}
            className="px-3 py-2 text-xs text-[#10B981] font-bold hover:bg-[#F0FDF4] rounded-xl disabled:opacity-50 whitespace-nowrap"
          >
            ✓ علّم الكل
          </button>
        )}
      </div>

      {/* Tab picker — للمدراء فقط */}
      {canModerate && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1.5 flex gap-1">
          <TabButton
            label="الإشعارات"
            icon="✉️"
            active={tab === "personal"}
            unread={personalUnread}
            onClick={() => setTab("personal")}
            color="#357DED"
          />
          <TabButton
            label="حركة التطبيق"
            icon="🔔"
            active={tab === "activity"}
            unread={activityUnread}
            onClick={() => setTab("activity")}
            color="#10B981"
          />
        </div>
      )}

      {/* List */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
          <div className="text-5xl mb-3">{tab === "activity" ? "📭" : "✅"}</div>
          <p className="text-[#64748B] font-semibold">
            {tab === "activity" ? "لا يوجد نشاط" : "لا يوجد إشعارات"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([section, rows]) => (
            <div key={section}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-xs font-bold text-[#94A3B8]">{section}</span>
                <div className="flex-1 h-px bg-[#E2E8F0]" />
              </div>
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden divide-y divide-[#E2E8F0]">
                {rows.map(n => (
                  <NotificationRowItem
                    key={n.id}
                    notification={n}
                    canModerate={canModerate}
                    actingId={actingId}
                    onClick={() => { setSelected(n); if (!n.is_read) markAsRead(n.id); }}
                    onApprove={() => approveRequest(n)}
                    onReject={() => rejectRequest(n)}
                    onDelete={() => deleteNotification(n.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <DetailModal
          notification={selected}
          canModerate={canModerate}
          actingId={actingId}
          onClose={() => setSelected(null)}
          onApprove={() => approveRequest(selected)}
          onReject={() => rejectRequest(selected)}
          onDelete={() => deleteNotification(selected.id)}
        />
      )}
    </main>
  );
}

// ─── Tab Button ────────────────────────────────────────────────────
function TabButton({
  label, icon, active, unread, onClick, color,
}: { label: string; icon: string; active: boolean; unread: number; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
      style={{
        background: active ? color : "transparent",
        color: active ? "white" : "#64748B",
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {unread > 0 && (
        <span
          className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center"
          style={{
            background: active ? "rgba(255,255,255,0.25)" : "#EF4444",
            color: "white",
          }}
        >
          {unread}
        </span>
      )}
    </button>
  );
}

// ─── Notification Row ──────────────────────────────────────────────
function NotificationRowItem({
  notification: n,
  canModerate,
  actingId,
  onClick,
  onApprove,
  onReject,
  onDelete,
}: {
  notification: NotificationRow;
  canModerate: boolean;
  actingId: string | null;
  onClick: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const meta = notificationMeta(n.kind, { canModerate, createdBy: n.created_by, targetMemberId: n.target_member_id });
  const isActionable = canModerate && ACTIONABLE_KINDS.has(n.kind) && n.request_id && n.request_type;
  const isActing = actingId === n.id;

  return (
    <div className={`flex items-start gap-3 p-4 hover:bg-[#F8FAFC] transition group ${!n.is_read ? "bg-[#FEF9E7]/40" : ""}`}>
      <button
        onClick={onClick}
        className="flex items-start gap-3 flex-1 text-right min-w-0"
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
            <h3 className="flex-1 font-black text-sm text-[#0F172A] line-clamp-2">{n.title}</h3>
            <span className="text-[11px] text-[#94A3B8] font-semibold whitespace-nowrap">
              {formatRelative(n.created_at)}
            </span>
          </div>
          {n.body && (
            <p className="text-xs text-[#64748B] mt-1 line-clamp-2">{n.body}</p>
          )}
        </div>
      </button>

      {isActionable ? (
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={onApprove}
            disabled={!!actingId}
            className="px-3 py-1.5 rounded-lg bg-[#10B981] text-white text-xs font-bold hover:bg-[#059669] disabled:opacity-50 flex items-center gap-1"
          >
            {isActing ? "..." : "✓ قبول"}
          </button>
          <button
            onClick={onReject}
            disabled={!!actingId}
            className="px-3 py-1.5 rounded-lg bg-[#FEE2E2] text-[#EF4444] text-xs font-bold hover:bg-[#FECACA] disabled:opacity-50"
          >
            ✕ رفض
          </button>
        </div>
      ) : (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition w-7 h-7 rounded-lg bg-[#FEE2E2] text-[#EF4444] flex items-center justify-center text-xs font-bold flex-shrink-0"
          title="حذف"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────
function DetailModal({
  notification: n,
  canModerate,
  actingId,
  onClose,
  onApprove,
  onReject,
  onDelete,
}: {
  notification: NotificationRow;
  canModerate: boolean;
  actingId: string | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const meta = notificationMeta(n.kind, { canModerate, createdBy: n.created_by, targetMemberId: n.target_member_id });
  const isActionable = canModerate && ACTIONABLE_KINDS.has(n.kind) && n.request_id && n.request_type;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero */}
        <div className="p-6 text-center border-b border-[#E2E8F0]">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-3 shadow-lg"
            style={{ background: meta.color, boxShadow: `0 10px 30px -10px ${meta.color}80` }}
          >
            {meta.icon}
          </div>
          <span
            className="inline-block px-3 py-1 rounded-full text-[11px] font-black"
            style={{ background: `${meta.color}15`, color: meta.color }}
          >
            {meta.labelAr}
          </span>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <h2 className="font-black text-lg text-[#0F172A] text-center">{n.title}</h2>
          {n.body && (
            <p className="text-sm text-[#64748B] leading-relaxed bg-[#F8FAFC] rounded-xl p-4">
              {n.body}
            </p>
          )}

          <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
            <InfoRow label="الوقت" value={formatRelative(n.created_at)} />
            <InfoRow label="التاريخ" value={formatFullDate(n.created_at)} />
            <InfoRow label="الحالة" value={n.is_read ? "مقروء" : "غير مقروء"} />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[#E2E8F0] space-y-2">
          {isActionable && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onApprove}
                disabled={!!actingId}
                className="py-3 rounded-xl bg-[#10B981] text-white font-black flex items-center justify-center gap-2 hover:bg-[#059669] disabled:opacity-50"
              >
                ✓ قبول
              </button>
              <button
                onClick={onReject}
                disabled={!!actingId}
                className="py-3 rounded-xl bg-[#FEE2E2] text-[#EF4444] font-black hover:bg-[#FECACA] disabled:opacity-50"
              >
                ✕ رفض
              </button>
            </div>
          )}
          <button
            onClick={onDelete}
            className="w-full py-3 rounded-xl bg-[#FEE2E2] text-[#EF4444] font-bold hover:bg-[#FECACA]"
          >
            🗑️ حذف الإشعار
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-[#F1F5F9] text-[#64748B] font-bold hover:bg-[#E2E8F0]"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-[#94A3B8]">{label}</span>
      <span className="text-sm font-bold text-[#0F172A]">{value}</span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────
function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "الآن";
  if (h < 1) return `قبل ${m}د`;
  if (d < 1) return `قبل ${h}س`;
  if (d < 7) return `قبل ${d}ي`;
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "short" }).format(date);
}

function formatFullDate(iso: string): string {
  return new Intl.DateTimeFormat("ar", {
    day: "numeric", month: "long", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(iso));
}

function groupByDate(rows: NotificationRow[]): Array<[string, NotificationRow[]]> {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

  const groups: Record<string, NotificationRow[]> = { اليوم: [], أمس: [], "هذا الأسبوع": [], أقدم: [] };
  for (const r of rows) {
    const d = new Date(r.created_at);
    if (d >= today) groups["اليوم"].push(r);
    else if (d >= yesterday) groups["أمس"].push(r);
    else if (d >= weekAgo) groups["هذا الأسبوع"].push(r);
    else groups["أقدم"].push(r);
  }
  return Object.entries(groups).filter(([_, v]) => v.length > 0);
}
