"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  type: "member" | "project" | "diwaniya" | "hr_note" | "hr_contact" | "hr_doc";
  title: string;
  description?: string;
  date: string;
  href: string;
  icon: string;
  color: string;
  isNew: boolean;
};

const STORAGE_KEY = "lastSeenNotifications";

export function NotificationBell({
  canModerate,
  isHR,
}: {
  canModerate: boolean;
  isHR: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const ref = useRef<HTMLDivElement>(null);

  // قراءة آخر زيارة
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setLastSeen(stored ? parseInt(stored) : 0);
  }, []);

  // جلب البيانات الأولية + الاشتراك بالـ realtime
  useEffect(() => {
    if (!canModerate) return;

    async function load() {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const sinceIso = since.toISOString();

      const queries: any[] = [
        supabase
          .from("profiles")
          .select("id, full_name, phone_number, created_at")
          .eq("role", "pending")
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .then((r: any) => r),
        supabase
          .from("projects")
          .select("id, title, owner_name, approval_status, created_at")
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .then((r: any) => r),
        supabase
          .from("diwaniyas")
          .select("id, title, name, owner_name, created_at")
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .then((r: any) => r),
      ];

      if (isHR) {
        queries.push(
          supabase
            .from("hr_notes")
            .select("id, member_id, note, created_at, profiles!hr_notes_member_id_fkey(full_name)")
            .gte("created_at", sinceIso)
            .order("created_at", { ascending: false })
            .then((r: any) => r)
        );
        queries.push(
          supabase
            .from("hr_contact_log")
            .select("id, member_id, reason, contacted_at, profiles!hr_contact_log_member_id_fkey(full_name)")
            .gte("contacted_at", sinceIso)
            .order("contacted_at", { ascending: false })
            .then((r: any) => r)
        );
      }

      const results: any[] = await Promise.all(queries);
      const items: Notification[] = [];

      results[0]?.data?.forEach((m: any) => {
        if (!m.full_name) return;
        items.push({
          id: `pm-${m.id}`,
          type: "member",
          title: `طلب انضمام: ${m.full_name}`,
          description: m.phone_number ? `📞 ${m.phone_number}` : undefined,
          date: m.created_at,
          href: "/admin/pending-members",
          icon: "👤",
          color: "#F59E0B",
          isNew: new Date(m.created_at).getTime() > lastSeen,
        });
      });

      results[1]?.data?.forEach((p: any) => {
        items.push({
          id: `proj-${p.id}`,
          type: "project",
          title: `مشروع: ${p.title}`,
          description: `${p.owner_name} · ${p.approval_status === "pending" ? "ينتظر موافقة" : "منشور"}`,
          date: p.created_at,
          href: p.approval_status === "pending" ? "/admin/pending-projects" : "/projects",
          icon: "💼",
          color: "#06B6D4",
          isNew: new Date(p.created_at).getTime() > lastSeen,
        });
      });

      results[2]?.data?.forEach((d: any) => {
        items.push({
          id: `diw-${d.id}`,
          type: "diwaniya",
          title: `ديوانية: ${d.title || d.name}`,
          description: d.owner_name,
          date: d.created_at,
          href: "/diwaniyas",
          icon: "🏛️",
          color: "#D97706",
          isNew: new Date(d.created_at).getTime() > lastSeen,
        });
      });

      if (isHR) {
        results[3]?.data?.forEach((n: any) => {
          items.push({
            id: `note-${n.id}`,
            type: "hr_note",
            title: `📝 ملاحظة على ${n.profiles?.full_name ?? "—"}`,
            description: n.note?.slice(0, 60),
            date: n.created_at,
            href: `/admin/profiles/${n.member_id}`,
            icon: "🔒",
            color: "#5438DC",
            isNew: new Date(n.created_at).getTime() > lastSeen,
          });
        });

        results[4]?.data?.forEach((c: any) => {
          items.push({
            id: `cont-${c.id}`,
            type: "hr_contact",
            title: `📞 تواصل مع ${c.profiles?.full_name ?? "—"}`,
            description: c.reason,
            date: c.contacted_at,
            href: `/admin/profiles/${c.member_id}`,
            icon: "🔒",
            color: "#3B82F6",
            isNew: new Date(c.contacted_at).getTime() > lastSeen,
          });
        });
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotifications(items.slice(0, 30));
    }

    load();

    // اشتراك realtime
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "diwaniyas" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "hr_notes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "hr_contact_log" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canModerate, isHR, lastSeen]);

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

  function markAllSeen() {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, String(now));
    setLastSeen(now);
    setNotifications((prev) => prev.map((n) => ({ ...n, isNew: false })));
  }

  function handleOpen() {
    setOpen(!open);
    if (!open) {
      // علّم الكل كمقروءة عند الفتح
      setTimeout(markAllSeen, 1000);
    }
  }

  if (!canModerate) return null;

  const newCount = notifications.filter((n) => n.isNew).length;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={handleOpen}
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
              <p className="text-[10px] text-[#64748B]">آخر ٧ أيام</p>
            </div>
            {newCount > 0 && (
              <button
                onClick={markAllSeen}
                className="text-xs text-[#357DED] font-bold hover:underline"
              >
                علّم الكل مقروء
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[#E2E8F0]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">🌱</div>
                <p className="text-sm text-[#64748B]">لا يوجد نشاط جديد</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-2.5 p-3 hover:bg-[#F8FAFC] transition ${
                    n.isNew ? "bg-[#FEF9E7]/40" : ""
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 relative"
                    style={{ background: `${n.color}15`, color: n.color }}
                  >
                    {n.icon}
                    {n.isNew && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#EF4444]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-[#0F172A] truncate">
                      {n.title}
                    </div>
                    {n.description && (
                      <div className="text-[10px] text-[#64748B] truncate mt-0.5">
                        {n.description}
                      </div>
                    )}
                    <div className="text-[10px] text-[#94A3B8] mt-0.5">
                      {timeAgo(n.date)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
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
