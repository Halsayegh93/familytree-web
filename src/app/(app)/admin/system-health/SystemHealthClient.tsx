"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
  devices: initialDevices,
  webSessions: initialSessions,
  webPushSubs: initialSubs,
}: {
  activeNow: ActiveMember[];
  actions24h: RecentAction[];
  recent14d: RecentlyActive[];
  devices: Device[];
  webSessions: WebSession[];
  webPushSubs: WebPushSub[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<TabKey>("activity");

  const [activeNow, setActiveNow] = useState(initialActive);
  const [actions24h, setActions24h] = useState(initialActions);
  const [recent14d, setRecent14d] = useState(initialRecent);
  const [devices, setDevices] = useState(initialDevices);
  const [webSessions, setWebSessions] = useState(initialSessions);
  const [webPushSubs, setWebPushSubs] = useState(initialSubs);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [
        { data: an },
        { data: a24 },
        { data: r14 },
        { data: dev },
        { data: ws },
        { data: wps },
      ] = await Promise.all([
        supabase.rpc("get_active_members_now"),
        supabase.rpc("get_recent_member_actions", { hours_back: 24 }),
        supabase.rpc("get_recently_active_members", { days_back: 14 }),
        supabase.from("device_tokens")
          .select("token, member_id, platform, environment, updated_at, device_name, profiles(full_name, avatar_url)")
          .order("updated_at", { ascending: false }),
        supabase.from("web_sessions")
          .select("member_id, user_agent, last_seen_at, profiles(full_name, avatar_url)")
          .order("last_seen_at", { ascending: false }),
        supabase.from("web_push_subscriptions")
          .select("member_id, user_agent, created_at, profiles(full_name)"),
      ]);
      setActiveNow((an as ActiveMember[]) ?? []);
      setActions24h((a24 as RecentAction[]) ?? []);
      setRecent14d((r14 as RecentlyActive[]) ?? []);
      setDevices((dev as unknown as Device[]) ?? []);
      setWebSessions((ws as unknown as WebSession[]) ?? []);
      setWebPushSubs((wps as unknown as WebPushSub[]) ?? []);
    } finally {
      setRefreshing(false);
    }
  }, [supabase]);

  // Auto-refresh activity every 20s
  useEffect(() => {
    if (tab !== "activity") return;
    const t = setInterval(refresh, 20_000);
    return () => clearInterval(t);
  }, [tab, refresh]);

  // ── Stats summary ──
  const totalActive = activeNow.length;
  const onApp = recent14d.filter(a => a.current_screen_source === "app").length;
  const onWeb = recent14d.filter(a => a.current_screen_source === "web").length;
  const totalDevices = devices.length;
  const totalWebPush = webPushSubs.length;

  return (
    <div className="space-y-4">
      {/* Top stats card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
        <div className="grid grid-cols-3 gap-3">
          <BigStat
            icon="🟢"
            label="نشط الآن"
            value={totalActive}
            color="#10B981"
            highlight={totalActive > 0}
          />
          <BigStat icon="📱" label="iOS" value={totalDevices} color="#357DED" />
          <BigStat icon="🌐" label="Web" value={totalWebPush + webSessions.length} color="#5438DC" />
        </div>
      </div>

      {/* Tab picker */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1.5 flex gap-1 sticky top-2 z-10">
        <Tab label="النشاط" icon="⚡" sub={`${activeNow.length}`} active={tab === "activity"} onClick={() => setTab("activity")} color="#10B981" />
        <Tab label="الأجهزة" icon="📱" sub={`${devices.length + webSessions.length}`} active={tab === "devices"} onClick={() => setTab("devices")} color="#357DED" />
        <Tab label="الإشعارات" icon="🔔" sub={`${devices.length + webPushSubs.length}`} active={tab === "push"} onClick={() => setTab("push")} color="#5438DC" />
      </div>

      {/* Refresh button */}
      <button
        onClick={refresh}
        disabled={refreshing}
        className="w-full py-3 rounded-2xl bg-gradient-to-l from-[#357DED] to-[#5438DC] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
      >
        {refreshing ? <Spinner /> : <span className="text-lg">🔄</span>}
        <span>{refreshing ? "جاري التحديث..." : "تحديث الآن"}</span>
      </button>

      {/* Panels */}
      {tab === "activity" && (
        <ActivityPanel
          activeNow={activeNow}
          actions24h={actions24h}
          recent14d={recent14d}
          onApp={onApp}
          onWeb={onWeb}
        />
      )}
      {tab === "devices" && <DevicesPanel devices={devices} webSessions={webSessions} />}
      {tab === "push" && <PushPanel devices={devices} webPushSubs={webPushSubs} />}
    </div>
  );
}

// ─── ACTIVITY PANEL ────────────────────────────────────────────────
function ActivityPanel({
  activeNow, actions24h, recent14d, onApp, onWeb,
}: {
  activeNow: ActiveMember[];
  actions24h: RecentAction[];
  recent14d: RecentlyActive[];
  onApp: number;
  onWeb: number;
}) {
  return (
    <div className="space-y-4">
      <Card title="نشطون اليوم" subtitle={`${activeNow.length}`} icon="🟢" color="#10B981">
        {activeNow.length === 0
          ? <Empty text="لا يوجد نشاط حالي" emoji="💤" />
          : <div className="divide-y divide-[#F1F5F9]">{activeNow.map(m => <ActiveNowRow key={m.member_id} m={m} />)}</div>}
      </Card>

      <Card title="آخر 24 ساعة" subtitle={`${actions24h.length}`} icon="⏱️" color="#F59E0B">
        {actions24h.length === 0
          ? <Empty text="لا يوجد نشاط في آخر 24 ساعة" emoji="⏳" />
          : <div className="divide-y divide-[#F1F5F9] max-h-[450px] overflow-y-auto">
              {actions24h.map((a, i) => <ActionRow24h key={`${a.member_id}-${i}`} a={a} />)}
            </div>}
      </Card>

      <Card title="نشطون آخر 14 يوم" subtitle={`${recent14d.length}`} icon="📅" color="#3B82F6">
        <div className="px-4 py-2 flex items-center gap-3 text-xs text-[#64748B] bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <span className="flex items-center gap-1">📱 <b>{onApp}</b></span>
          <span className="flex items-center gap-1">🌐 <b>{onWeb}</b></span>
        </div>
        {recent14d.length === 0
          ? <Empty text="لا يوجد نشاط في آخر 14 يوم" emoji="📭" />
          : <div className="divide-y divide-[#F1F5F9] max-h-[450px] overflow-y-auto">
              {recent14d.map(m => <Recent14dRow key={m.member_id} m={m} />)}
            </div>}
      </Card>
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
  const iosCount = devices.length;
  const sandbox = devices.filter(d => d.environment === "sandbox").length;
  const production = devices.filter(d => d.environment === "production").length;
  const total = iosCount + webSessions.length;

  return (
    <div className="space-y-4">
      {/* Unified stats — سطر واحد */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">📊</span>
          <span className="font-black text-sm text-[#0F172A]">الإجمالي</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-black bg-[#357DED]/15 text-[#357DED] mr-auto">
            {total}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <InlinePill icon="📱" label="iOS" value={iosCount} color="#357DED" />
          <InlinePill icon="🌐" label="Web" value={webSessions.length} color="#5438DC" />
          <InlinePill icon="🚀" label="Production" value={production} color="#10B981" />
          <InlinePill icon="🧪" label="Sandbox" value={sandbox} color="#F59E0B" />
        </div>
      </div>

      {/* iOS devices list */}
      <Card title="أجهزة iOS" subtitle={`${devices.length}`} icon="🍎" color="#357DED">
        {devices.length === 0
          ? <Empty text="لا يوجد أجهزة مسجلة" emoji="📵" />
          : <div className="divide-y divide-[#F1F5F9] max-h-[500px] overflow-y-auto">
              {devices.map((d, i) => (
                <div key={`${d.token}-${i}`} className="flex items-center gap-3 p-3 hover:bg-[#F8FAFC]">
                  <Avatar url={d.profiles?.avatar_url} online={false} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-[#0F172A] truncate">{d.profiles?.full_name ?? "—"}</div>
                    <div className="text-xs text-[#64748B] truncate flex items-center gap-1.5">
                      <span>{d.device_name ?? "iPhone"}</span>
                      <EnvBadge env={d.environment} />
                    </div>
                  </div>
                  <span className="text-xs text-[#94A3B8]">{relativeDate(d.updated_at)}</span>
                </div>
              ))}
            </div>}
      </Card>

      {/* Web sessions list */}
      <Card title="جلسات الموقع" subtitle={`${webSessions.length}`} icon="🌐" color="#5438DC">
        {webSessions.length === 0
          ? <Empty text="لا يوجد جلسات ويب" emoji="💻" />
          : <div className="divide-y divide-[#F1F5F9] max-h-[400px] overflow-y-auto">
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
            </div>}
      </Card>
    </div>
  );
}

// ─── PUSH PANEL ───────────────────────────────────────────────────
function PushPanel({ devices, webPushSubs }: { devices: Device[]; webPushSubs: WebPushSub[] }) {
  const totalReceivers = devices.length + webPushSubs.length;
  const production = devices.filter(d => d.environment === "production").length;
  const sandbox = devices.filter(d => d.environment === "sandbox").length;

  return (
    <div className="space-y-4">
      {/* Unified stats — سطر واحد */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">📨</span>
          <span className="font-black text-sm text-[#0F172A]">المستلمون</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-black bg-[#5438DC]/15 text-[#5438DC] mr-auto">
            {totalReceivers}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <InlinePill icon="📱" label="iOS" value={devices.length} color="#357DED" />
          <InlinePill icon="🌐" label="Web" value={webPushSubs.length} color="#10B981" />
          <InlinePill icon="🚀" label="Production" value={production} color="#059669" />
          <InlinePill icon="🧪" label="Sandbox" value={sandbox} color="#F59E0B" />
        </div>
      </div>

      {/* Web push subscriptions list */}
      <Card title="اشتراكات Web Push" subtitle={`${webPushSubs.length}`} icon="🌐" color="#10B981">
        {webPushSubs.length === 0
          ? <Empty text="لا يوجد اشتراكات web push" emoji="🔕" />
          : <div className="divide-y divide-[#F1F5F9] max-h-[400px] overflow-y-auto">
              {webPushSubs.map((s, i) => (
                <div key={`${s.member_id}-${i}`} className="flex items-center gap-3 p-3 hover:bg-[#F8FAFC]">
                  <div className="w-10 h-10 rounded-full bg-[#10B981]/15 flex items-center justify-center text-base">🌐</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-[#0F172A] truncate">{s.profiles?.full_name ?? "—"}</div>
                    <div className="text-xs text-[#64748B] truncate">{shortUserAgent(s.user_agent)}</div>
                  </div>
                  <span className="text-xs text-[#94A3B8]">{relativeDate(s.created_at)}</span>
                </div>
              ))}
            </div>}
      </Card>
    </div>
  );
}

// ─── Common Components ────────────────────────────────────────────
function Card({ title, subtitle, icon, color, children }: {
  title: string; subtitle?: string; icon: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F1F5F9]">
        <span className="text-base">{icon}</span>
        <span className="font-black text-sm flex-1" style={{ color }}>{title}</span>
        {subtitle && (
          <span className="text-xs px-2 py-0.5 rounded-full font-black" style={{ background: `${color}15`, color }}>
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Tab({ label, icon, sub, active, onClick, color }: {
  label: string; icon: string; sub?: string; active: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
      style={{
        background: active ? color : "transparent",
        color: active ? "white" : "#64748B",
        boxShadow: active ? `0 4px 12px -4px ${color}80` : "none",
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {sub && (
        <span className="text-[10px] px-1.5 rounded-full font-black"
          style={{ background: active ? "rgba(255,255,255,0.25)" : "#E2E8F0", color: active ? "white" : "#64748B" }}>
          {sub}
        </span>
      )}
    </button>
  );
}

function BigStat({ icon, label, value, color, highlight }: {
  icon: string; label: string; value: number; color: string; highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3 text-center transition"
      style={{
        background: `${color}10`,
        boxShadow: highlight ? `0 0 0 2px ${color}40` : "none",
      }}
    >
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-2xl font-black" style={{ color: "#0F172A" }}>{value}</div>
      <div className="text-[11px] font-bold" style={{ color }}>{label}</div>
    </div>
  );
}

function InlinePill({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
      style={{ background: `${color}12`, color }}
    >
      <span className="text-sm">{icon}</span>
      <span>{label}</span>
      <span className="font-black bg-white/40 px-1.5 rounded-full" style={{ color }}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg p-2 text-center" style={{ background: `${color}10` }}>
      <div className="text-lg font-black" style={{ color: "#0F172A" }}>{value}</div>
      <div className="text-[10px] font-bold" style={{ color }}>{label}</div>
    </div>
  );
}

function Empty({ text, emoji }: { text: string; emoji: string }) {
  return (
    <div className="p-8 text-center">
      <div className="text-3xl mb-2">{emoji}</div>
      <div className="text-sm text-[#94A3B8] font-semibold">{text}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold text-[#0F172A]">{label}</span>
      <span className="font-black text-sm text-[#357DED]">{value}</span>
    </div>
  );
}
function SubRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between pr-4">
      <span className="text-xs text-[#64748B]">↳ {label}</span>
      <span className="text-xs font-bold text-[#0F172A]">{value}</span>
    </div>
  );
}

function Avatar({ url, online }: { url: string | null | undefined; online: boolean }) {
  return (
    <div className="relative flex-shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-10 h-10 rounded-full object-cover bg-[#F1F5F9]" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-[#357DED]/15 flex items-center justify-center text-base">👤</div>
      )}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10B981] border-2 border-white" />
      )}
    </div>
  );
}

function EnvBadge({ env }: { env: string | null }) {
  if (!env) return null;
  const isProd = env === "production";
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-black"
      style={{
        background: isProd ? "#10B98120" : "#F59E0B20",
        color: isProd ? "#059669" : "#B45309",
      }}
    >
      {isProd ? "PROD" : "DEV"}
    </span>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
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
  if (s < 60) return `${s}ث`;
  return `${Math.floor(s / 60)}د`;
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
  const browser = /Chrome|Firefox|Safari|Edge/.exec(ua)?.[0] ?? "Browser";
  const os = /Windows|Mac OS|iPhone|Android|Linux/.exec(ua)?.[0] ?? "—";
  return `${browser} · ${os}`;
}
