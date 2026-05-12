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

type Creator = { full_name: string | null; avatar_url: string | null; role: string | null };
type TabKey = "personal" | "activity";

export function NotificationsClient({
  initialNotifications,
  userId,
  canModerate,
  creators,
}: {
  initialNotifications: NotificationRow[];
  userId: string;
  canModerate: boolean;
  creators: Record<string, Creator>;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<NotificationRow[]>(initialNotifications);
  const [tab, setTab] = useState<TabKey>("personal");
  const [busy, setBusy] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<NotificationRow | null>(null);

  // ── Realtime ────────────────────────────────────────────────────
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

  // ── Filtering ───────────────────────────────────────────────────
  const personalNotifications = useMemo(
    () => items.filter((n) => n.target_member_id !== null || !ACTIVITY_KINDS.has(n.kind)),
    [items],
  );
  const activityNotifications = useMemo(
    () => items.filter((n) => n.target_member_id === null && ACTIVITY_KINDS.has(n.kind)),
    [items],
  );

  const visible = canModerate
    ? (tab === "activity" ? activityNotifications : personalNotifications)
    : personalNotifications;

  const personalUnread = personalNotifications.filter((n) => !n.is_read).length;
  const activityUnread = activityNotifications.filter((n) => !n.is_read).length;
  const totalUnread = visible.filter((n) => !n.is_read).length;

  const grouped = useMemo(() => groupByDate(visible), [visible]);

  // ── Actions ────────────────────────────────────────────────────
  async function markAsRead(id: string) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function markAllRead() {
    if (busy) return;
    setBusy(true);
    const ids = visible.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length === 0) { setBusy(false); return; }
    setItems((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, is_read: true } : x)));
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    setBusy(false);
  }

  async function deleteNotification(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    setSelected(null);
    await supabase.from("notifications").delete().eq("id", id);
  }

  async function approveRequest(n: NotificationRow) {
    if (!n.request_id || !n.request_type) return;
    if (actingId) return;
    setActingId(n.id);
    try {
      const { error } = await supabase.rpc("approveRequest" as never, {} as never);
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
    <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <header className="flex items-center gap-3 px-1">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#357DED] to-[#5438DC] flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20">
            🔔
          </div>
          {totalUnread > 0 && (
            <span className="absolute -top-1 -left-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#EF4444] text-white text-[10px] font-black flex items-center justify-center shadow ring-2 ring-white">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-xl text-[#0F172A] leading-tight">الإشعارات</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            {visible.length === 0
              ? "لا توجد إشعارات"
              : `${visible.length} ${visible.length === 1 ? "إشعار" : "إشعار"}${totalUnread > 0 ? ` · ${totalUnread} غير مقروء` : ""}`}
          </p>
        </div>
        {totalUnread > 0 && (
          <button
            onClick={markAllRead}
            disabled={busy}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-[#F0FDF4] text-[#10B981] hover:bg-[#DCFCE7] disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5 transition"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            علّم الكل
          </button>
        )}
      </header>

      {/* Tabs (moderators only) */}
      {canModerate && (
        <SegmentedTabs
          tab={tab}
          onChange={setTab}
          personalUnread={personalUnread}
          activityUnread={activityUnread}
        />
      )}

      {/* Body */}
      {visible.length === 0 ? (
        <EmptyState tab={tab} canModerate={canModerate} />
      ) : (
        <div className="space-y-5">
          {grouped.map(([section, rows]) => (
            <section key={section}>
              <SectionHeader label={section} count={rows.length} />
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden divide-y divide-[#F1F5F9]">
                {rows.map((n) => (
                  <NotificationRowItem
                    key={n.id}
                    notification={n}
                    canModerate={canModerate}
                    actingId={actingId}
                    creators={creators}
                    onClick={() => { setSelected(n); if (!n.is_read) markAsRead(n.id); }}
                    onApprove={() => approveRequest(n)}
                    onReject={() => rejectRequest(n)}
                    onDelete={() => deleteNotification(n.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <DetailModal
          notification={selected}
          canModerate={canModerate}
          actingId={actingId}
          creators={creators}
          onClose={() => setSelected(null)}
          onApprove={() => approveRequest(selected)}
          onReject={() => rejectRequest(selected)}
          onDelete={() => deleteNotification(selected.id)}
        />
      )}
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Segmented Tabs — sliding indicator
   ────────────────────────────────────────────────────────────────── */
function SegmentedTabs({
  tab,
  onChange,
  personalUnread,
  activityUnread,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
  personalUnread: number;
  activityUnread: number;
}) {
  return (
    <div
      className="relative bg-white rounded-2xl border border-[#E2E8F0] p-1 grid grid-cols-2 gap-1"
      dir="rtl"
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 right-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-br from-[#357DED] to-[#5438DC] shadow-md shadow-blue-500/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: tab === "personal" ? "translateX(0)" : "translateX(-100%)" }}
      />
      <TabBtn active={tab === "personal"} onClick={() => onChange("personal")} label="الإشعارات" icon="✉️" unread={personalUnread} />
      <TabBtn active={tab === "activity"} onClick={() => onChange("activity")} label="حركة التطبيق" icon="📊" unread={activityUnread} />
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  icon,
  unread,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  unread: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative z-10 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
        active ? "text-white" : "text-[#64748B] hover:text-[#0F172A]"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {unread > 0 && (
        <span
          className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ${
            active ? "bg-white/25 text-white" : "bg-[#EF4444] text-white"
          }`}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Section Header
   ────────────────────────────────────────────────────────────────── */
function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-2 px-1">
      <span className="text-[11px] font-black text-[#94A3B8] uppercase tracking-wider">{label}</span>
      <span className="text-[10px] font-bold text-[#CBD5E1] bg-[#F1F5F9] rounded-full px-2 py-0.5">{count}</span>
      <div className="flex-1 h-px bg-gradient-to-l from-[#E2E8F0] to-transparent" />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Empty State
   ────────────────────────────────────────────────────────────────── */
function EmptyState({ tab, canModerate }: { tab: TabKey; canModerate: boolean }) {
  const isActivity = canModerate && tab === "activity";
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] py-16 px-6 text-center">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#F1F5F9] to-[#E2E8F0] flex items-center justify-center text-5xl mb-4 shadow-inner">
        {isActivity ? "📭" : "🔕"}
      </div>
      <h3 className="font-black text-base text-[#0F172A] mb-1">
        {isActivity ? "لا يوجد نشاط بعد" : "صندوقك فارغ"}
      </h3>
      <p className="text-sm text-[#64748B] max-w-xs mx-auto leading-relaxed">
        {isActivity
          ? "ستظهر هنا كل التعديلات والأنشطة الإدارية في التطبيق"
          : "الإشعارات والتنبيهات الخاصة بك ستظهر هنا فور وصولها"}
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Notification Row — iOS-style rich card
   ────────────────────────────────────────────────────────────────── */
function NotificationRowItem({
  notification: n,
  canModerate,
  actingId,
  creators,
  onClick,
  onApprove,
  onReject,
  onDelete,
}: {
  notification: NotificationRow;
  canModerate: boolean;
  actingId: string | null;
  creators: Record<string, Creator>;
  onClick: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const meta = notificationMeta(n.kind, { canModerate, createdBy: n.created_by, targetMemberId: n.target_member_id });
  const isActionable = canModerate && ACTIONABLE_KINDS.has(n.kind) && n.request_id && n.request_type;
  const isActing = actingId === n.id;
  const unread = !n.is_read;
  const creator = n.created_by ? creators[n.created_by] : null;
  const showCreator = canModerate && creator && creator.full_name;

  return (
    <div
      className={`relative group transition ${unread ? "bg-white" : "bg-[#FAFBFC]"} hover:bg-[#F8FAFC]`}
    >
      {/* Unread accent bar */}
      {unread && (
        <span
          aria-hidden
          className="absolute top-3 bottom-3 right-0 w-1 rounded-l-full"
          style={{ background: meta.color }}
        />
      )}

      <div className="flex items-start gap-3 p-4">
        <button
          onClick={onClick}
          className="flex items-start gap-3 flex-1 text-right min-w-0 cursor-pointer"
        >
          {/* Icon circle */}
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ring-1 transition ${
              unread ? "" : "opacity-70"
            }`}
            style={{
              background: `${meta.color}${unread ? "1A" : "12"}`,
              color: meta.color,
              borderColor: `${meta.color}30`,
              boxShadow: unread ? `inset 0 0 0 1px ${meta.color}25` : undefined,
            }}
          >
            <span>{meta.icon}</span>
          </div>

          {/* Content */}
          <div className={`flex-1 min-w-0 space-y-1 ${unread ? "" : "opacity-70"}`}>
            {/* Title + time */}
            <div className="flex items-start gap-2">
              <h3 className={`flex-1 text-sm leading-snug line-clamp-2 ${unread ? "font-black text-[#0F172A]" : "font-bold text-[#475569]"}`}>
                {n.title}
              </h3>
              <span className="text-[11px] text-[#94A3B8] font-semibold whitespace-nowrap pt-0.5">
                {formatRelative(n.created_at)}
              </span>
            </div>

            {/* Body */}
            {n.body && (
              <p className="text-xs text-[#64748B] leading-relaxed line-clamp-2">{n.body}</p>
            )}

            {/* Chips row */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <KindChip color={meta.color} label={meta.labelAr} icon={meta.icon} />
              {showCreator && creator && (
                <CreatorChip
                  name={creator.full_name!}
                  role={creator.role}
                />
              )}
            </div>
          </div>
        </button>

        {/* Right side actions */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 self-start pt-1">
          {/* Unread dot */}
          {unread && (
            <span className="w-2 h-2 rounded-full bg-[#357DED] shadow-sm shadow-blue-400/40" aria-label="غير مقروء" />
          )}

          {/* Quick approve/reject */}
          {isActionable && (
            <div className="flex flex-col gap-1 mt-1">
              <button
                onClick={onApprove}
                disabled={!!actingId}
                className="w-7 h-7 rounded-full bg-[#10B981] text-white flex items-center justify-center hover:bg-[#059669] disabled:opacity-50 shadow-sm shadow-green-500/30 transition active:scale-95"
                title="قبول"
              >
                {isActing ? (
                  <span className="text-[10px]">...</span>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <button
                onClick={onReject}
                disabled={!!actingId}
                className="w-7 h-7 rounded-full bg-[#FEE2E2] text-[#EF4444] flex items-center justify-center hover:bg-[#FECACA] disabled:opacity-50 transition active:scale-95"
                title="رفض"
              >
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Delete (hover only) — for non-actionable rows */}
          {!isActionable && (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-[#F1F5F9] text-[#94A3B8] hover:bg-[#FEE2E2] hover:text-[#EF4444] flex items-center justify-center transition active:scale-95"
              title="حذف"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Chips
   ────────────────────────────────────────────────────────────────── */
function KindChip({ color, label, icon }: { color: string; label: string; icon: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{
        background: `${color}12`,
        color: color,
        boxShadow: `inset 0 0 0 1px ${color}20`,
      }}
    >
      <span className="text-[10px]">{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function CreatorChip({ name, role }: { name: string; role: string | null }) {
  const roleColor = roleColors[role ?? ""] ?? "#94A3B8";
  const shortName = name.split(" ").slice(0, 2).join(" ");
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[10px] font-bold text-[#475569]">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: roleColor }} />
      <span className="truncate max-w-[120px]">{shortName}</span>
    </span>
  );
}

const roleColors: Record<string, string> = {
  owner: "#F59E0B",
  admin: "#5438DC",
  monitor: "#10B981",
  supervisor: "#357DED",
  member: "#94A3B8",
  pending: "#CBD5E1",
};

/* ──────────────────────────────────────────────────────────────────
   Detail Modal
   ────────────────────────────────────────────────────────────────── */
function DetailModal({
  notification: n,
  canModerate,
  actingId,
  creators,
  onClose,
  onApprove,
  onReject,
  onDelete,
}: {
  notification: NotificationRow;
  canModerate: boolean;
  actingId: string | null;
  creators: Record<string, Creator>;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const meta = notificationMeta(n.kind, { canModerate, createdBy: n.created_by, targetMemberId: n.target_member_id });
  const isActionable = canModerate && ACTIONABLE_KINDS.has(n.kind) && n.request_id && n.request_type;
  const creator = n.created_by ? creators[n.created_by] : null;
  const target = n.target_member_id ? creators[n.target_member_id] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl md:rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#E2E8F0]" />
        </div>

        {/* Hero */}
        <div className="relative overflow-hidden p-6 text-center">
          <div
            className="absolute inset-0 opacity-10"
            style={{ background: `radial-gradient(ellipse at top, ${meta.color}, transparent 70%)` }}
          />
          <div
            className="relative w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-3 shadow-lg ring-4 ring-white"
            style={{
              background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`,
              boxShadow: `0 12px 30px -8px ${meta.color}66`,
            }}
          >
            {meta.icon}
          </div>
          <span
            className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black"
            style={{ background: `${meta.color}15`, color: meta.color }}
          >
            {meta.labelAr}
          </span>
        </div>

        {/* Content */}
        <div className="px-6 pb-2 space-y-4">
          <h2 className="font-black text-lg text-[#0F172A] text-center leading-snug">{n.title}</h2>

          {n.body && (
            <p className="text-sm text-[#475569] leading-relaxed bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0]">
              {n.body}
            </p>
          )}

          {/* Member card if target/creator known */}
          {canModerate && (target || creator) && (
            <div className="rounded-2xl border border-[#E2E8F0] divide-y divide-[#F1F5F9] overflow-hidden">
              {creator && (
                <PersonRow label="من" name={creator.full_name} avatar={creator.avatar_url} role={creator.role} />
              )}
              {target && target !== creator && (
                <PersonRow label="إلى" name={target.full_name} avatar={target.avatar_url} role={target.role} />
              )}
            </div>
          )}

          {/* Meta */}
          <div className="bg-[#F8FAFC] rounded-2xl p-3 space-y-1.5 border border-[#E2E8F0]">
            <InfoRow label="الوقت" value={formatRelative(n.created_at)} />
            <InfoRow label="التاريخ" value={formatFullDate(n.created_at)} />
            {canModerate && <CopyableIdRow label="رقم الإشعار" value={n.id} />}
            <InfoRow
              label="الحالة"
              value={n.is_read ? "مقروء" : "غير مقروء"}
              valueColor={n.is_read ? "#94A3B8" : "#357DED"}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2 sticky bottom-0 bg-white border-t border-[#F1F5F9]">
          {isActionable && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onApprove}
                disabled={!!actingId}
                className="py-3 rounded-2xl bg-[#10B981] text-white font-black hover:bg-[#059669] disabled:opacity-50 flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-green-500/20"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                قبول
              </button>
              <button
                onClick={onReject}
                disabled={!!actingId}
                className="py-3 rounded-2xl bg-[#FEE2E2] text-[#EF4444] font-black hover:bg-[#FECACA] disabled:opacity-50 flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                رفض
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onDelete}
              className="py-3 rounded-2xl bg-[#FEE2E2] text-[#EF4444] font-bold hover:bg-[#FECACA] transition active:scale-95"
            >
              حذف الإشعار
            </button>
            <button
              onClick={onClose}
              className="py-3 rounded-2xl bg-[#F1F5F9] text-[#475569] font-bold hover:bg-[#E2E8F0] transition active:scale-95"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonRow({
  label,
  name,
  avatar,
  role,
}: {
  label: string;
  name: string | null;
  avatar: string | null;
  role: string | null;
}) {
  const roleColor = roleColors[role ?? ""] ?? "#94A3B8";
  const initial = (name ?? "").trim().charAt(0) || "؟";
  return (
    <div className="flex items-center gap-3 p-3">
      <span className="text-[11px] font-black text-[#94A3B8] uppercase w-8 flex-shrink-0">{label}</span>
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#357DED] to-[#5438DC] text-white flex items-center justify-center font-black overflow-hidden flex-shrink-0">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="font-bold text-sm text-[#0F172A] truncate">{name ?? "—"}</span>
        {role && (
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: roleColor }} />
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-[#94A3B8] font-semibold">{label}</span>
      <span className="text-sm font-bold" style={{ color: valueColor ?? "#0F172A" }}>
        {value}
      </span>
    </div>
  );
}

function CopyableIdRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }
  return (
    <div className="flex items-center justify-between py-1 gap-2">
      <span className="text-xs text-[#94A3B8] font-semibold flex-shrink-0">{label}</span>
      <button
        onClick={copy}
        title="انسخ"
        className="group flex items-center gap-1.5 min-w-0 px-2 py-0.5 rounded-md hover:bg-white active:scale-95 transition"
        dir="ltr"
      >
        <span className="font-mono text-[11px] font-bold text-[#0F172A] truncate select-all" style={{ direction: "ltr" }}>
          {value}
        </span>
        {copied ? (
          <svg className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#357DED] flex-shrink-0 transition" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
            <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
          </svg>
        )}
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────── */
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

  const groups: Record<string, NotificationRow[]> = {
    "اليوم": [],
    "أمس": [],
    "هذا الأسبوع": [],
    "أقدم": [],
  };
  for (const r of rows) {
    const d = new Date(r.created_at);
    if (d >= today) groups["اليوم"].push(r);
    else if (d >= yesterday) groups["أمس"].push(r);
    else if (d >= weekAgo) groups["هذا الأسبوع"].push(r);
    else groups["أقدم"].push(r);
  }
  return Object.entries(groups).filter(([, v]) => v.length > 0);
}
