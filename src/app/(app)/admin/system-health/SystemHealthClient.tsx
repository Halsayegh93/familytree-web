"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────
type ActiveMember = {
  member_id: string;
  full_name: string | null;
  avatar_url: string | null;
  current_screen: string | null;
  current_screen_source: string | null;
  last_active_at: string;
  seconds_since_active: number;
};
type RecentAction = {
  member_id: string;
  full_name: string | null;
  avatar_url: string | null;
  action_kind: string;
  action_label: string | null;
  action_at: string;
  source: string | null;
  minutes_ago: number;
};
type RecentlyActive = {
  member_id: string;
  full_name: string | null;
  avatar_url: string | null;
  current_screen: string | null;
  current_screen_source: string | null;
  last_active_at: string;
  hours_since_active: number;
};
type Device = {
  token: string;
  member_id: string;
  platform: string | null;
  environment: string | null;
  updated_at: string;
  device_name: string | null;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};
type WebSession = {
  member_id: string;
  user_agent: string | null;
  last_seen_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};
type WebPushSub = {
  member_id: string;
  user_agent: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

type TabKey = "activity" | "devices" | "push";

// ─── Main Client ──────────────────────────────────────────────────
export function SystemHealthClient({
  activeNow: initialActive,
  actions24h: initialActions,
  recent14d: initialRecent,
  devices,
  webSessions,
  webPushSubs,
}: {
  activeNow: ActiveMember[];
  actions24h: RecentAction[];
  recent14d: RecentlyActive[];
  devices: Device[];
  webSessions: WebSession[];
  webPushSubs: WebPushSub[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<TabKey>("activity");

  const [activeNow, setActiveNow] = useState(initialActive);
  const [actions24h, setActions24h] = useState(initialActions);
  const [recent14d, setRecent14d] = useState(initialRecent);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh activity every 20 seconds
  useEffect(() => {
    if (tab !== "activity") return;
    const t = setInterval(refresh, 20_000);
    return () => clearInterval(t);
  }, [tab]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const [{ data: an }, { data: a24 }, { data: r14 }] = await Promise.all([
        supabase.rpc("get_active_members_now"),
        supabase.rpc("get_recent_member_actions", { hours_back: 24 }),
        supabase.rpc("get_recently_active_members", { days_back: 14 }),
      ]);
      setActiveNow((an as ActiveMember[]) ?? []);
      setActions24h((a24 as RecentAction[]) ?? []);
      setRecent14d((r14 as RecentlyActive[]) ?? []);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      {/* Tab picker */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1.5 flex gap-1">
        <TabButton label="النشاط" icon="⚡" active={tab === "activity"} onClick={() => setTab("activity")} color="#10B981" />
        <TabButton label="الأجهزة" icon="📱" active={tab === "devices"} onClick={() => setTab("devices")} color="#357DED" />
        <TabButton label="الإشعارات" icon="🔔" active={tab === "push"} onClick={() => setTab("push")} color="#5438DC" />
      </div>

      {tab === "activity" && (
        <ActivityPanel
          activeNow={activeNow}
          actions24h={actions24h}
          recent14d={recent14d}
          onRefresh={refresh}
          refreshing={refreshing}
        />
      )}
      {tab === "devices" && <DevicesPanel devices={devices} webSessions={webSessions} />}
      {tab === "push" && <PushPanel devices={devices} webPushSubs={webPushSubs} />}
    </>
  );
}

// ─── Tab Button ────────────────────────────────────────────────────
function TabButton({ label, icon, active, onClick, color }: {
  label: string; icon: string; active: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
      style={{ background: active ? color : "transparent", color: active ? "white" : "#64748B" }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─── ACTIVITY PANEL ────────────────────────────────────────────────
function ActivityPanel({
  activeNow, actions24h, recent14d, onRefresh, refreshing,
}: {
  activeNow: ActiveMember[];
  actions24h: RecentAction[];
  recent14d: RecentlyActive[];
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const appCount = activeNow.filter(a => a.current_screen_source === "app").length
    + recent14d.filter(a => a.current_screen_source === "app").length;
  const webCount = activeNow.filter(a => a.current_screen_source === "web").length
    + recent14d.filter(a => a.current_screen_source === "web").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatBox label="نشط" value={activeNow.length} icon="🟢" color="#10B981" />
        <StatBox label="التطبيق" value={appCount} icon="📱" color="#357DED" />
        <StatBox label="الموقع" value={webCount} icon="🌐" color="#5438DC" />
        <StatBox label="14 يوم" value={recent14d.length} icon="📅" color="#F59E0B" />
      </div>

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="w-full py-3 rounded-2xl bg-[#357DED] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <span>{refreshing ? "⏳" : "🔄"}</span>
        <span>{refreshing ? "جاري التحديث..." : "تحديث الآن"}</span>
      </button>

      {/* Active Today */}
      <Section title="نشطون اليوم" subtitle={`${activeNow.length} عضو`} icon="🟢" color="#10B981">
        {activeNow.length === 0 ? (
          <Empty text="لا يوجد نشاط حالي" />
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {activeNow.map(m => <ActiveNowRow key={m.member_id} m={m} />)}
          </div>
        )}
      </Section>

      {/* Last 24 hours actions */}
      <Section title="آخر 24 ساعة" subtitle={`${actions24h.length} نشاط`} icon="⏱️" color="#F59E0B">
        {actions24h.length === 0 ? (
          <Empty text="لا يوجد نشاط في آخر 24 ساعة" />
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {actions24h.map((a, i) => <ActionRow24h key={`${a.member_id}-${i}`} a={a} />)}
          </div>
        )}
      </Section>

      {/* Last 14 days */}
      <Section title="نشطون آخر 14 يوم" subtitle={`${recent14d.length} عضو`} icon="📅" color="#3B82F6">
        {recent14d.length === 0 ? (
          <Empty text="لا يوجد نشاط في آخر 14 يوم" />
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {recent14d.slice(0, 50).map(m => <Recent14dRow key={m.member_id} m={m} />)}
          </div>
        )}
      </Section>
    </div>
  );
}

function ActiveNowRow({ m }: { m: ActiveMember }) {
  const trulyOnline = m.seconds_since_active < 300;
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-[#F8FAFC] transition">
      <Avatar url={m.avatar_url} online={trulyOnline} />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-[#0F172A] truncate">{m.full_name}</div>
        <div className="text-xs text-[#64748B] flex items-center gap-1">
          <span>{m.current_screen_source === "web" ? "🌐" : "📱"}</span>
          <span>{screenLabel(m.current_screen, m.current_screen_source)}</span>
        </div>
      </div>
      <span className="text-xs font-black text-[#10B981]">{secondsLabel(m.seconds_since_active)}</span>
    </div>
  );
}

function ActionRow24h({ a }: { a: RecentAction }) {
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-[#F8FAFC] transition">
      <Avatar url={a.avatar_url} online={false} />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-[#0F172A] truncate">{a.full_name}</div>
        <div className="text-xs text-[#64748B] flex items-center gap-1 truncate">
          <span>{actionIcon(a.action_kind)}</span>
          <span className="truncate">{actionLabel(a)}</span>
        </div>
      </div>
      <span className="text-xs text-[#94A3B8]">{minutesLabel(a.minutes_ago)}</span>
    </div>
  );
}

function Recent14dRow({ m }: { m: RecentlyActive }) {
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-[#F8FAFC] transition">
      <Avatar url={m.avatar_url} online={false} />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-[#0F172A] truncate">{m.full_name}</div>
        <div className="text-xs text-[#64748B] flex items-center gap-1">
          <span>{m.current_screen_source === "web" ? "🌐" : "📱"}</span>
          <span>{screenLabel(m.current_screen, m.current_screen_source)}</span>
        </div>
      </div>
      <span className="text-xs text-[#94A3B8]">{hoursLabel(m.hours_since_active)}</span>
    </div>
  );
}

// ─── DEVICES PANEL ────────────────────────────────────────────────
function DevicesPanel({ devices, webSessions }: { devices: Device[]; webSessions: WebSession[] }) {
  const iosCount = devices.filter(d => (d.platform || "ios").includes("ios")).length;
  const sandboxCount = devices.filter(d => d.environment === "sandbox").length;
  const productionCount = devices.filter(d => d.environment === "production").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <StatBox label="إجمالي" value={devices.length} icon="📱" color="#357DED" />
        <StatBox label="iOS" value={iosCount} icon="🍎" color="#5438DC" />
        <StatBox label="Production" value={productionCount} icon="🚀" color="#10B981" />
        <StatBox label="Sandbox" value={sandboxCount} icon="🧪" color="#F59E0B" />
      </div>

      <Section title="أجهزة iOS مسجلة" subtitle={`${devices.length} جهاز`} icon="📱" color="#357DED">
        {devices.length === 0 ? (
          <Empty text="لا يوجد أجهزة مسجلة" />
        ) : (
          <div className="divide-y divide-[#E2E8F0] max-h-[500px] overflow-y-auto">
            {devices.map((d, i) => (
              <div key={`${d.token}-${i}`} className="flex items-center gap-3 p-3 hover:bg-[#F8FAFC]">
                <Avatar url={d.profiles?.avatar_url} online={false} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-[#0F172A] truncate">{d.profiles?.full_name ?? "—"}</div>
                  <div className="text-xs text-[#64748B] truncate">
                    {d.device_name ?? "iPhone"} · {d.platform ?? "ios"} · {d.environment ?? "?"}
                  </div>
                </div>
                <span className="text-xs text-[#94A3B8]">{relativeDate(d.updated_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="جلسات الموقع" subtitle={`${webSessions.length} جلسة`} icon="🌐" color="#5438DC">
        {webSessions.length === 0 ? (
          <Empty text="لا يوجد جلسات ويب" />
        ) : (
          <div className="divide-y divide-[#E2E8F0] max-h-[400px] overflow-y-auto">
            {webSessions.map((s, i) => (
              <div key={`${s.member_id}-${i}`} className="flex items-center gap-3 p-3 hover:bg-[#F8FAFC]">
                <Avatar url={s.profiles?.avatar_url} online={false} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-[#0F172A] truncate">{s.profiles?.full_name ?? "—"}</div>
                  <div className="text-xs text-[#64748B] truncate">{shortUserAgent(s.user_agent)}</div>
                </div>
                <span className="text-xs text-[#94A3B8]">{relativeDate(s.last_seen_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── PUSH PANEL ───────────────────────────────────────────────────
function PushPanel({ devices, webPushSubs }: { devices: Device[]; webPushSubs: WebPushSub[] }) {
  const totalReceivers = devices.length + webPushSubs.length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="إجمالي المستلمين" value={totalReceivers} icon="📨" color="#5438DC" />
        <StatBox label="iOS Push" value={devices.length} icon="🍎" color="#357DED" />
        <StatBox label="Web Push" value={webPushSubs.length} icon="🌐" color="#10B981" />
      </div>

      <Section title="نظرة عامة" icon="📊" color="#5438DC">
        <div className="p-4 space-y-3">
          <InfoRow label="iOS Push (APNs)" value={`${devices.length} جهاز`} />
          <InfoRow
            label="Production"
            value={`${devices.filter(d => d.environment === "production").length}`}
          />
          <InfoRow
            label="Sandbox (TestFlight)"
            value={`${devices.filter(d => d.environment === "sandbox").length}`}
          />
          <div className="border-t border-[#E2E8F0] my-2" />
          <InfoRow label="Web Push (VAPID)" value={`${webPushSubs.length} اشتراك`} />
        </div>
      </Section>

      <Section title="اشتراكات إشعارات الموقع" subtitle={`${webPushSubs.length}`} icon="🌐" color="#10B981">
        {webPushSubs.length === 0 ? (
          <Empty text="لا يوجد اشتراكات web push" />
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {webPushSubs.map((s, i) => (
              <div key={`${s.member_id}-${i}`} className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-full bg-[#10B981]/15 flex items-center justify-center text-sm">
                  🌐
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-[#0F172A] truncate">{s.profiles?.full_name ?? "—"}</div>
                  <div className="text-xs text-[#64748B] truncate">{shortUserAgent(s.user_agent)}</div>
                </div>
                <span className="text-xs text-[#94A3B8]">{relativeDate(s.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Common Components ────────────────────────────────────────────
function Section({ title, subtitle, icon, color, children }: {
  title: string; subtitle?: string; icon: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-[#E2E8F0]" style={{ background: `${color}08` }}>
        <span className="text-lg">{icon}</span>
        <span className="font-black text-sm" style={{ color }}>{title}</span>
        {subtitle && <span className="text-xs text-[#94A3B8]">· {subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function StatBox({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: `${color}10` }}>
      <div className="text-base mb-0.5">{icon}</div>
      <div className="text-xl font-black" style={{ color: "#0F172A" }}>{value}</div>
      <div className="text-[11px] font-bold" style={{ color }}>{label}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-[#94A3B8]">{text}</div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#64748B]">{label}</span>
      <span className="font-bold text-sm text-[#0F172A]">{value}</span>
    </div>
  );
}

function Avatar({ url, online }: { url: string | null | undefined; online: boolean }) {
  return (
    <div className="relative flex-shrink-0">
      {url ? (
        <img src={url} alt="" className="w-10 h-10 rounded-full object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-[#357DED]/15 flex items-center justify-center text-base">👤</div>
      )}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10B981] border-2 border-white" />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────
function screenLabel(key: string | null, source: string | null): string {
  if (!key) return source === "web" ? "على الموقع" : source === "app" ? "في التطبيق" : "نشط";
  switch (key) {
    case "home": return "الرئيسية";
    case "tree": return "الشجرة";
    case "diwaniyas": return "الديوانيات";
    case "profile": return "حسابي";
    case "admin": return "الإدارة";
    case "news": return "الأخبار";
    case "projects": return "المشاريع";
    default: return key;
  }
}

function actionIcon(kind: string): string {
  if (kind.startsWith("request_")) return "📥";
  switch (kind) {
    case "screen_visit": return "👁️";
    case "news_add": return "✏️";
    case "news_comment": return "💬";
    case "news_like": return "❤️";
    case "poll_vote": return "☑️";
    case "device_active": return "📱";
    case "web_session": return "🌐";
    default: return "⚡";
  }
}

function actionLabel(a: RecentAction): string {
  const detail = a.action_label ?? "";
  switch (a.action_kind) {
    case "screen_visit": return `في: ${screenLabel(detail, a.source)}`;
    case "news_add": return `نشر: ${detail}`;
    case "news_comment": return `علّق: ${detail}`;
    case "news_like": return "أعجب بمنشور";
    case "poll_vote": return "صوّت في استطلاع";
    case "device_active": return "فتح التطبيق";
    case "web_session": return "دخل الموقع";
    default:
      if (a.action_kind.startsWith("request_")) return `طلب: ${detail}`;
      return detail;
  }
}

function secondsLabel(s: number): string {
  if (s < 30) return "الآن";
  if (s < 60) return `${s} ث`;
  return `${Math.floor(s / 60)} د`;
}

function minutesLabel(m: number): string {
  if (m < 1) return "الآن";
  if (m < 60) return `${m}د`;
  return `${Math.floor(m / 60)}س`;
}

function hoursLabel(h: number): string {
  if (h < 1) return "قريباً";
  if (h < 24) return `${h}س`;
  return `${Math.floor(h / 24)}ي`;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (m < 1) return "الآن";
  if (h < 1) return `${m}د`;
  if (day < 1) return `${h}س`;
  return `${day}ي`;
}

function shortUserAgent(ua: string | null | undefined): string {
  if (!ua) return "—";
  // Extract browser + OS hint
  const browser = /Chrome|Firefox|Safari|Edge/.exec(ua)?.[0] ?? "Browser";
  const os = /Windows|Mac OS|iPhone|Android|Linux/.exec(ua)?.[0] ?? "—";
  return `${browser} · ${os}`;
}
