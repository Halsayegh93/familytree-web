"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STATUSES = [
  { value: "new", label: "🆕 جديد", color: "#3B82F6" },
  { value: "contacted", label: "📞 تم التواصل", color: "#F59E0B" },
  { value: "in_progress", label: "📋 قيد المتابعة", color: "#5438DC" },
  { value: "completed", label: "✅ مكتمل", color: "#10B981" },
];

const CHANNELS = [
  { value: "phone", label: "📞 مكالمة" },
  { value: "whatsapp", label: "💬 واتساب" },
  { value: "email", label: "📧 بريد" },
  { value: "meeting", label: "🤝 اجتماع" },
  { value: "other", label: "📌 أخرى" },
];

const DOC_TYPES = [
  { value: "id", label: "🪪 بطاقة هوية" },
  { value: "contract", label: "📄 عقد" },
  { value: "medical", label: "🏥 طبي" },
  { value: "other", label: "📁 آخر" },
];

function statusInfo(s?: string | null) {
  return STATUSES.find((x) => x.value === s) ?? null;
}

export function HRSectionClient({
  memberId,
  memberName,
  memberPhone,
  currentUserId,
  isHrMember,
  canManageHRMembers,
  notes,
  contactLog,
  documents,
}: {
  memberId: string;
  memberName?: string | null;
  memberPhone?: string | null;
  currentUserId: string;
  hrStatus?: string | null;
  isHrMember: boolean;
  canManageHRMembers: boolean;
  notes: any[];
  contactLog: any[];
  documents: any[];
}) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("hr") as any) ?? "timeline";
  const [activeTab, setActiveTab] = useState<"timeline" | "notes" | "contact">(
    ["timeline", "notes", "contact"].includes(initialTab) ? (initialTab as any) : "timeline"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (focusId) {
      setTimeout(() => {
        const el = document.getElementById(`hr-entry-${focusId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-[#5438DC]", "ring-offset-2");
          setTimeout(() => el.classList.remove("ring-2", "ring-[#5438DC]", "ring-offset-2"), 3000);
        }
      }, 300);
    }
  }, [searchParams, activeTab]);

  const allEntries = useMemo(() => {
    const entries: any[] = [
      ...notes.map((n) => ({ ...n, type: "note", date: n.created_at })),
      ...contactLog.map((c) => ({ ...c, type: "contact", date: c.contacted_at })),
      ...documents.map((d) => ({ ...d, type: "doc", date: d.created_at })),
    ];
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notes, contactLog, documents]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUSES.forEach((s) => (counts[s.value] = 0));
    allEntries.forEach((e) => {
      if (e.status && counts[e.status] !== undefined) counts[e.status]++;
    });
    return counts;
  }, [allEntries]);

  const latestStatus = allEntries.find((e) => e.status)?.status;
  const latestInfo = statusInfo(latestStatus);

  // آخر تواصل / آخر ملاحظة
  const lastContact = contactLog[0];
  const lastNote = notes[0];

  // حالة العلاقة (CRM): صحية / يحتاج متابعة / فاتر
  const lastActivityDate = allEntries[0]?.date;
  const daysSinceLastActivity = lastActivityDate
    ? Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / 86400000)
    : null;
  const relationshipHealth = (() => {
    if (!lastActivityDate) return { label: "ما بدأت", emoji: "⚪", color: "#94A3B8" };
    if (daysSinceLastActivity! <= 30) return { label: "نشطة", emoji: "🟢", color: "#10B981" };
    if (daysSinceLastActivity! <= 90) return { label: "تحتاج متابعة", emoji: "🟡", color: "#F59E0B" };
    return { label: "فاترة", emoji: "🔴", color: "#EF4444" };
  })();

  // E.164 phone للأزرار
  const phoneE164 = memberPhone?.replace(/\s/g, "").replace(/[^\d+]/g, "");

  // فلترة حسب البحث والحالة
  const filteredEntries = useMemo(() => {
    let list = allEntries;
    if (statusFilter) list = list.filter((e) => e.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((e) => {
        const text = `${e.note ?? ""} ${e.reason ?? ""} ${e.summary ?? ""} ${e.title ?? ""}`.toLowerCase();
        return text.includes(q);
      });
    }
    return list;
  }, [allEntries, statusFilter, searchQuery]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((n) => (n.note ?? "").toLowerCase().includes(q));
  }, [notes, searchQuery]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contactLog;
    const q = searchQuery.trim().toLowerCase();
    return contactLog.filter((c) =>
      `${c.reason ?? ""} ${c.summary ?? ""}`.toLowerCase().includes(q)
    );
  }, [contactLog, searchQuery]);

  return (
    <div className="space-y-3">
      {/* === بانر هيرو احترافي === */}
      <div className="bg-gradient-to-br from-[#5438DC] via-[#7C3AED] to-[#5438DC] rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl">
              🔒
            </div>
            <div>
              <div className="font-black text-sm">شؤون العائلة</div>
              <div className="text-[11px] text-white/80">رصد ملاحظات السلوك والتواصل • سرّي للجنة فقط</div>
            </div>
          </div>
          {canManageHRMembers && (
            <HRMembershipToggle memberId={memberId} isHrMember={isHrMember} />
          )}
        </div>

        {/* صف الإحصاءات السريعة */}
        <div className="grid grid-cols-4 gap-2">
          <HeroStat
            label="إجمالي"
            value={allEntries.length}
            sub={latestInfo ? latestInfo.label : "بدون حالة"}
          />
          <HeroStat
            label="ملاحظات"
            value={notes.length}
            sub={lastNote ? timeAgo(lastNote.created_at) : "—"}
          />
          <HeroStat
            label="تواصل"
            value={contactLog.length}
            sub={lastContact ? timeAgo(lastContact.contacted_at) : "—"}
          />
          <HeroStat
            label="آخر نشاط"
            value={allEntries[0] ? "•" : "—"}
            sub={allEntries[0] ? timeAgo(allEntries[0].date) : "لا يوجد"}
            isText
          />
        </div>
      </div>

      {/* === حالة العلاقة + أزرار سريعة (CRM) === */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3 flex items-center gap-3 flex-wrap">
        {/* حالة العلاقة */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: `${relationshipHealth.color}15` }}
          >
            {relationshipHealth.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-[#94A3B8] font-bold">حالة العلاقة</div>
            <div className="font-black text-sm" style={{ color: relationshipHealth.color }}>
              {relationshipHealth.label}
            </div>
            {daysSinceLastActivity !== null && (
              <div className="text-[10px] text-[#64748B]">
                آخر نشاط قبل {daysSinceLastActivity === 0 ? "اليوم" : `${daysSinceLastActivity} يوم`}
              </div>
            )}
          </div>
        </div>

        {/* أزرار اتصال سريع */}
        {phoneE164 && (
          <div className="flex items-center gap-1.5">
            <a
              href={`tel:${phoneE164}`}
              className="w-9 h-9 rounded-xl bg-[#10B981]/15 hover:bg-[#10B981] hover:text-white text-[#10B981] flex items-center justify-center transition"
              title="اتصال"
            >
              📞
            </a>
            <a
              href={`https://wa.me/${phoneE164.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener"
              className="w-9 h-9 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366] hover:text-white text-[#25D366] flex items-center justify-center transition"
              title="واتساب"
            >
              💬
            </a>
            <button
              onClick={() => setActiveTab("contact")}
              className="px-3 h-9 rounded-xl bg-[#5438DC] text-white text-xs font-bold hover:opacity-90"
            >
              + سجل تواصل
            </button>
          </div>
        )}
      </div>

      {/* === شريط الأدوات: بحث + فلتر حالة === */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-2 space-y-2">
        {/* البحث */}
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="text-[#94A3B8]">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في الملاحظات والتواصل..."
            className="flex-1 outline-none text-sm placeholder:text-[#94A3B8]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[#94A3B8] hover:text-[#475569] text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* فلتر الحالة */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
              statusFilter === "" ? "bg-[#5438DC] text-white" : "bg-[#F1F5F9] text-[#475569]"
            }`}
          >
            الكل {allEntries.length > 0 && `(${allEntries.length})`}
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value === statusFilter ? "" : s.value)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
                statusFilter === s.value ? "text-white" : "text-[#475569]"
              }`}
              style={{
                background: statusFilter === s.value ? s.color : `${s.color}15`,
                color: statusFilter === s.value ? "white" : s.color,
              }}
            >
              {s.label} {statusCounts[s.value] > 0 && `(${statusCounts[s.value]})`}
            </button>
          ))}
        </div>
      </div>

      {/* === تابات === */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1 flex gap-1">
        <Tab
          active={activeTab === "timeline"}
          onClick={() => setActiveTab("timeline")}
          icon="📅"
          label="الخط الزمني"
          count={filteredEntries.length}
          color="#5438DC"
        />
        <Tab
          active={activeTab === "notes"}
          onClick={() => setActiveTab("notes")}
          icon="📝"
          label="ملاحظات"
          count={filteredNotes.length}
          color="#F59E0B"
        />
        <Tab
          active={activeTab === "contact"}
          onClick={() => setActiveTab("contact")}
          icon="📞"
          label="تواصل"
          count={filteredContacts.length}
          color="#3B82F6"
        />
      </div>

      {/* === محتوى التاب === */}
      {activeTab === "timeline" && (
        <TimelineView
          entries={filteredEntries}
          memberId={memberId}
          currentUserId={currentUserId}
        />
      )}
      {activeTab === "notes" && (
        <NotesSection memberId={memberId} currentUserId={currentUserId} notes={filteredNotes} />
      )}
      {activeTab === "contact" && (
        <ContactLogSection memberId={memberId} currentUserId={currentUserId} log={filteredContacts} />
      )}
    </div>
  );
}

// عداد منذ متى
function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `${min}د`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}س`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}ي`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}ش`;
  return `${Math.floor(mo / 12)}س`;
}

function HeroStat({
  label, value, sub, isText,
}: {
  label: string; value: number | string; sub: string; isText?: boolean;
}) {
  return (
    <div className="bg-white/15 backdrop-blur rounded-xl px-2 py-2 text-center">
      <div className={`text-[10px] font-bold text-white/70 mb-0.5`}>{label}</div>
      <div className={`font-black text-white ${isText ? "text-base" : "text-xl"}`}>{value}</div>
      <div className="text-[9px] text-white/80 truncate mt-0.5">{sub}</div>
    </div>
  );
}

// MARK: - Timeline — تجميع زمني احترافي بمجموعات (اليوم/أمس/هذا الأسبوع/سابق)
function TimelineView({
  entries, memberId, currentUserId,
}: {
  entries: any[]; memberId: string; currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center">
        <div className="text-5xl mb-3">📭</div>
        <p className="font-bold text-[#0F172A] text-sm">لا توجد سجلات بعد</p>
        <p className="text-xs text-[#94A3B8] mt-1">ابدأ بإضافة ملاحظة أو تسجيل تواصل من التابات أعلاه</p>
      </div>
    );
  }

  async function handleDelete(entry: any) {
    if (!confirm("حذف هذا الإدخال؟")) return;
    const table = entry.type === "note" ? "hr_notes" : entry.type === "contact" ? "hr_contact_log" : "hr_documents";
    const { error } = await supabase.from(table).delete().eq("id", entry.id);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  // تجميع بالـ buckets الزمنية
  const groups: Record<string, any[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  };
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = startOfDay(now);
  const yestStart = todayStart - 86400000;
  const weekStart = todayStart - 6 * 86400000;
  const monthStart = todayStart - 30 * 86400000;

  for (const e of entries) {
    const t = new Date(e.date).getTime();
    if (t >= todayStart) groups.today.push(e);
    else if (t >= yestStart) groups.yesterday.push(e);
    else if (t >= weekStart) groups.thisWeek.push(e);
    else if (t >= monthStart) groups.thisMonth.push(e);
    else groups.older.push(e);
  }

  const sections: { key: string; label: string; items: any[] }[] = [
    { key: "today", label: "اليوم", items: groups.today },
    { key: "yesterday", label: "أمس", items: groups.yesterday },
    { key: "thisWeek", label: "هذا الأسبوع", items: groups.thisWeek },
    { key: "thisMonth", label: "هذا الشهر", items: groups.thisMonth },
    { key: "older", label: "أقدم", items: groups.older },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.key}>
          {/* عنوان المجموعة */}
          <div className="flex items-center gap-2 px-1 mb-2">
            <div className="h-px flex-1 bg-[#E2E8F0]"></div>
            <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-wider px-2">
              {section.label}
            </span>
            <span className="text-[10px] font-bold text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
              {section.items.length}
            </span>
            <div className="h-px flex-1 bg-[#E2E8F0]"></div>
          </div>
          <div className="space-y-2">
            {section.items.map((e) =>
              e.type === "note" ? (
                <NoteItem key={`note-${e.id}`} note={e} onDelete={() => handleDelete(e)} />
              ) : e.type === "contact" ? (
                <ContactItem key={`contact-${e.id}`} item={e} onDelete={() => handleDelete(e)} />
              ) : (
                <DocItem key={`doc-${e.id}`} doc={e} onDelete={() => handleDelete(e)} />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


// MARK: - Tab
function Tab({
  active, onClick, icon, label, count, color,
}: {
  active: boolean; onClick: () => void;
  icon: string; label: string; count: number; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-2 py-2 rounded-xl flex flex-col items-center gap-0.5 transition ${
        active ? "text-white shadow-sm" : "text-[#475569] hover:bg-[#F1F5F9]"
      }`}
      style={active ? { background: color } : {}}
    >
      <span className="text-base">{icon}</span>
      <span className="font-bold text-[10px] flex items-center gap-1">
        {label}
        <span
          className={`px-1 rounded-full text-[9px] font-black ${
            active ? "bg-white/30" : "bg-[#E2E8F0] text-[#475569]"
          }`}
        >
          {count}
        </span>
      </span>
    </button>
  );
}

// MARK: - HR Membership
function HRMembershipToggle({
  memberId, isHrMember,
}: {
  memberId: string; isHrMember: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ is_hr_member: !isHrMember })
      .eq("id", memberId);
    setBusy(false);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition disabled:opacity-50 ${
        isHrMember
          ? "bg-[#10B981] text-white"
          : "bg-white border border-[#E2E8F0] text-[#475569]"
      }`}
    >
      <span>{isHrMember ? "✅" : "⚪"}</span>
      <span>عضو لجنة</span>
    </button>
  );
}

// MARK: - Status Selector & Badge
function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-[#5438DC]"
    >
      <option value="">— بدون حالة —</option>
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const info = statusInfo(status);
  if (!info) return null;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap"
      style={{ background: `${info.color}15`, color: info.color }}
    >
      {info.label}
    </span>
  );
}

// MARK: - Notes
// قوالب سريعة لتسهيل الإدخال
const NOTE_TEMPLATES = [
  { emoji: "👤", label: "سلوك", prefix: "[سلوك] " },
  { emoji: "🏥", label: "صحة", prefix: "[صحة] " },
  { emoji: "👨‍👩‍👧‍👦", label: "أسري", prefix: "[أسري] " },
  { emoji: "💼", label: "عمل", prefix: "[عمل] " },
  { emoji: "📚", label: "دراسة", prefix: "[دراسة] " },
  { emoji: "💰", label: "مالي", prefix: "[مالي] " },
];

function NotesSection({
  memberId, currentUserId, notes,
}: {
  memberId: string; currentUserId: string; notes: any[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("new");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("hr_notes").insert({
      member_id: memberId,
      note: text.trim(),
      status: status || null,
      created_by: currentUserId,
    });
    setBusy(false);
    if (error) alert("خطأ: " + error.message);
    else { setText(""); setStatus("new"); router.refresh(); }
  }

  async function remove(id: string) {
    if (!confirm("حذف الملاحظة؟")) return;
    const { error } = await supabase.from("hr_notes").delete().eq("id", id);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  function applyTemplate(prefix: string) {
    if (text.startsWith(prefix)) return;
    // شيل أي prefix قديم وضع الجديد
    const cleaned = text.replace(/^\[[^\]]+\]\s*/, "");
    setText(prefix + cleaned);
  }

  return (
    <div className="space-y-3">
      {/* === نموذج الإدخال السريع — دائماً ظاهر === */}
      <div className="bg-white border border-[#FEF3C7] rounded-2xl overflow-hidden shadow-sm">
        {/* رأس النموذج */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-l from-[#FFFBEB] to-white border-b border-[#FEF3C7]">
          <span className="text-base">📝</span>
          <span className="font-bold text-sm text-[#92400E]">ملاحظة جديدة</span>
          <span className="text-[10px] text-[#94A3B8]">سرّي للجنة فقط</span>
        </div>

        {/* قوالب سريعة */}
        <div className="px-3 pt-2.5 flex flex-wrap gap-1.5">
          {NOTE_TEMPLATES.map((t) => {
            const active = text.startsWith(t.prefix);
            return (
              <button
                key={t.label}
                onClick={() => applyTemplate(t.prefix)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                  active
                    ? "bg-[#F59E0B] text-white"
                    : "bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9]"
                }`}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* النص */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") add();
          }}
          placeholder="مثال: لاحظت تغير في سلوكه مؤخراً، يحتاج متابعة..."
          rows={3}
          className="w-full px-3 py-2.5 mt-2 outline-none resize-none text-sm placeholder:text-[#CBD5E1]"
        />

        {/* الأزرار */}
        <div className="flex gap-2 items-center px-3 pb-3 border-t border-[#F1F5F9] pt-2">
          <StatusSelect value={status} onChange={setStatus} />
          <span className="text-[10px] text-[#94A3B8] mr-auto hidden md:inline">
            ⌘ + Enter للحفظ
          </span>
          <button
            onClick={add}
            disabled={busy || !text.trim()}
            className="px-5 bg-[#F59E0B] text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50 hover:opacity-90"
          >
            {busy ? "..." : "💾 حفظ"}
          </button>
        </div>
      </div>

      {/* الملاحظات الحالية */}
      {notes.length === 0 ? (
        <EmptyState icon="📝" message="لا توجد ملاحظات بعد" />
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <NoteItem key={n.id} note={n} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteItem({ note, onDelete }: { note: any; onDelete: (id: string) => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.note);
  const [status, setStatus] = useState(note.status ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("hr_notes")
      .update({ note: text.trim(), status: status || null, updated_at: new Date().toISOString() })
      .eq("id", note.id);
    setBusy(false);
    if (error) alert("خطأ: " + error.message);
    else { setEditing(false); router.refresh(); }
  }

  if (editing) {
    return (
      <div className="bg-[#FFFBEB] rounded-2xl border-2 border-[#F59E0B] p-3 space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          autoFocus
          className="w-full px-3 py-2 bg-white border border-[#FEF3C7] rounded-lg outline-none text-sm resize-none"
        />
        <div className="flex gap-2 items-center">
          <StatusSelect value={status} onChange={setStatus} />
          <button
            onClick={() => { setEditing(false); setText(note.note); setStatus(note.status ?? ""); }}
            className="px-3 py-2 bg-[#F1F5F9] text-[#475569] rounded-lg font-bold text-xs"
          >
            إلغاء
          </button>
          <button
            onClick={save}
            disabled={busy || !text.trim()}
            className="flex-1 bg-[#F59E0B] text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50"
          >
            {busy ? "..." : "💾 حفظ"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id={`hr-entry-${note.id}`} className="bg-white rounded-2xl border border-[#E2E8F0] p-3 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <StatusBadge status={note.status} />
        <ItemActions onEdit={() => setEditing(true)} onDelete={() => onDelete(note.id)} />
      </div>
      <p className="text-[#0F172A] whitespace-pre-wrap text-sm leading-relaxed">{note.note}</p>
      <div className="text-xs text-[#94A3B8] mt-2 pt-2 border-t border-[#F1F5F9]">
        👤 {note.profiles?.full_name ?? "—"} ·{" "}
        {new Date(note.created_at).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" })}
      </div>
    </div>
  );
}

function ItemActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onEdit}
        title="تعديل الإدخال"
        className="group inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-[#357DED]/10 hover:bg-[#357DED] hover:text-white text-[#357DED] text-[11px] font-bold transition border border-[#357DED]/20 hover:border-[#357DED]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3 h-3"
        >
          <path d="M2.695 14.763l-1.262 3.155a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
        </svg>
        <span>تعديل</span>
      </button>
      <button
        onClick={onDelete}
        title="حذف الإدخال"
        className="group inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-[#EF4444]/10 hover:bg-[#EF4444] hover:text-white text-[#EF4444] text-[11px] font-bold transition border border-[#EF4444]/20 hover:border-[#EF4444]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3 h-3"
        >
          <path
            fillRule="evenodd"
            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
            clipRule="evenodd"
          />
        </svg>
        <span>حذف</span>
      </button>
    </div>
  );
}

// MARK: - Contact Log
function ContactLogSection({
  memberId, currentUserId, log,
}: {
  memberId: string; currentUserId: string; log: any[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [reason, setReason] = useState("");
  const [summary, setSummary] = useState("");
  const [channel, setChannel] = useState("phone");
  const [status, setStatus] = useState("contacted");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function add() {
    if (!reason.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("hr_contact_log").insert({
      member_id: memberId,
      reason: reason.trim(),
      summary: summary.trim() || null,
      channel,
      status: status || null,
      contacted_by: currentUserId,
    });
    setBusy(false);
    if (error) alert("خطأ: " + error.message);
    else { setReason(""); setSummary(""); setShowForm(false); router.refresh(); }
  }

  async function remove(id: string) {
    if (!confirm("حذف التواصل؟")) return;
    const { error } = await supabase.from("hr_contact_log").delete().eq("id", id);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-[#3B82F6] text-white py-3 rounded-2xl font-bold shadow-sm hover:opacity-90"
        >
          ➕ تسجيل تواصل جديد
        </button>
      ) : (
        <div className="bg-white border border-[#DBEAFE] rounded-2xl p-3 space-y-2">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="w-full px-3 py-2 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg text-sm font-bold outline-none"
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="السبب (مطلوب)"
            autoFocus
            className="w-full px-3 py-2 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg outline-none text-sm"
          />
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="ملخص (اختياري)"
            rows={2}
            className="w-full px-3 py-2 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg outline-none resize-none text-sm"
          />
          <div className="flex gap-2 items-center">
            <StatusSelect value={status} onChange={setStatus} />
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-2 bg-[#F1F5F9] text-[#475569] rounded-lg font-bold text-xs"
            >
              إلغاء
            </button>
            <button
              onClick={add}
              disabled={busy || !reason.trim()}
              className="flex-1 bg-[#3B82F6] text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50"
            >
              {busy ? "..." : "💾 حفظ"}
            </button>
          </div>
        </div>
      )}

      {log.length === 0 ? (
        <EmptyState icon="📞" message="لا يوجد سجل تواصل" />
      ) : (
        <div className="space-y-2">
          {log.map((c) => (
            <ContactItem key={c.id} item={c} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactItem({ item, onDelete }: { item: any; onDelete: (id: string) => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState(item.reason);
  const [summary, setSummary] = useState(item.summary ?? "");
  const [channel, setChannel] = useState(item.channel ?? "phone");
  const [status, setStatus] = useState(item.status ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!reason.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("hr_contact_log")
      .update({
        reason: reason.trim(),
        summary: summary.trim() || null,
        channel,
        status: status || null,
      })
      .eq("id", item.id);
    setBusy(false);
    if (error) alert("خطأ: " + error.message);
    else { setEditing(false); router.refresh(); }
  }

  if (editing) {
    return (
      <div className="bg-[#EFF6FF] rounded-2xl border-2 border-[#3B82F6] p-3 space-y-2">
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-[#DBEAFE] rounded-lg text-sm font-bold outline-none"
        >
          {CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="السبب"
          autoFocus
          className="w-full px-3 py-2 bg-white border border-[#DBEAFE] rounded-lg outline-none text-sm"
        />
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="ملخص"
          rows={2}
          className="w-full px-3 py-2 bg-white border border-[#DBEAFE] rounded-lg outline-none resize-none text-sm"
        />
        <div className="flex gap-2 items-center">
          <StatusSelect value={status} onChange={setStatus} />
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-2 bg-white text-[#475569] rounded-lg font-bold text-xs"
          >
            إلغاء
          </button>
          <button
            onClick={save}
            disabled={busy || !reason.trim()}
            className="flex-1 bg-[#3B82F6] text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50"
          >
            {busy ? "..." : "💾 حفظ"}
          </button>
        </div>
      </div>
    );
  }

  const ch = CHANNELS.find((x) => x.value === item.channel);
  return (
    <div id={`hr-entry-${item.id}`} className="bg-white rounded-2xl border border-[#E2E8F0] p-3 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#1E40AF] rounded-full text-[10px] font-bold border border-[#DBEAFE]">
            {ch?.label ?? item.channel}
          </span>
          <StatusBadge status={item.status} />
        </div>
        <ItemActions onEdit={() => setEditing(true)} onDelete={() => onDelete(item.id)} />
      </div>
      <div className="font-bold text-[#0F172A] text-sm">{item.reason}</div>
      {item.summary && (
        <p className="text-sm text-[#475569] mt-1 leading-relaxed">{item.summary}</p>
      )}
      <div className="text-xs text-[#94A3B8] mt-2 pt-2 border-t border-[#F1F5F9]">
        👤 {item.profiles?.full_name ?? "—"} ·{" "}
        {new Date(item.contacted_at).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" })}
      </div>
    </div>
  );
}

// MARK: - Documents
function DocumentsSection({
  memberId, currentUserId, docs,
}: {
  memberId: string; currentUserId: string; docs: any[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [docType, setDocType] = useState("id");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function add() {
    if (!name.trim() || !url.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("hr_documents").insert({
      member_id: memberId,
      name: name.trim(),
      file_url: url.trim(),
      doc_type: docType,
      status: status || null,
      uploaded_by: currentUserId,
    });
    setBusy(false);
    if (error) alert("خطأ: " + error.message);
    else { setName(""); setUrl(""); setShowForm(false); router.refresh(); }
  }

  async function remove(id: string) {
    if (!confirm("حذف المستند؟")) return;
    const { error } = await supabase.from("hr_documents").delete().eq("id", id);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-[#10B981] text-white py-3 rounded-2xl font-bold shadow-sm hover:opacity-90"
        >
          ➕ إضافة مستند جديد
        </button>
      ) : (
        <div className="bg-white border border-[#D1FAE5] rounded-2xl p-3 space-y-2">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full px-3 py-2 bg-[#ECFDF5] border border-[#D1FAE5] rounded-lg text-sm font-bold outline-none"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم المستند"
            autoFocus
            className="w-full px-3 py-2 bg-[#ECFDF5] border border-[#D1FAE5] rounded-lg outline-none text-sm"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="رابط الملف (Drive / Dropbox)"
            dir="ltr"
            className="w-full px-3 py-2 bg-[#ECFDF5] border border-[#D1FAE5] rounded-lg outline-none text-sm"
          />
          <div className="flex gap-2 items-center">
            <StatusSelect value={status} onChange={setStatus} />
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-2 bg-[#F1F5F9] text-[#475569] rounded-lg font-bold text-xs"
            >
              إلغاء
            </button>
            <button
              onClick={add}
              disabled={busy || !name.trim() || !url.trim()}
              className="flex-1 bg-[#10B981] text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50"
            >
              {busy ? "..." : "💾 حفظ"}
            </button>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <EmptyState icon="📁" message="لا توجد مستندات" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {docs.map((d) => (
            <DocItem key={d.id} doc={d} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  );
}

function DocItem({ doc, onDelete }: { doc: any; onDelete: (id: string) => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(doc.name);
  const [url, setUrl] = useState(doc.file_url);
  const [docType, setDocType] = useState(doc.doc_type ?? "id");
  const [status, setStatus] = useState(doc.status ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim() || !url.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("hr_documents")
      .update({
        name: name.trim(),
        file_url: url.trim(),
        doc_type: docType,
        status: status || null,
      })
      .eq("id", doc.id);
    setBusy(false);
    if (error) alert("خطأ: " + error.message);
    else { setEditing(false); router.refresh(); }
  }

  if (editing) {
    return (
      <div className="bg-[#ECFDF5] rounded-2xl border-2 border-[#10B981] p-3 space-y-2">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-[#D1FAE5] rounded-lg text-sm font-bold outline-none"
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="w-full px-3 py-2 bg-white border border-[#D1FAE5] rounded-lg outline-none text-sm"
        />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          dir="ltr"
          className="w-full px-3 py-2 bg-white border border-[#D1FAE5] rounded-lg outline-none text-sm"
        />
        <div className="flex gap-2 items-center">
          <StatusSelect value={status} onChange={setStatus} />
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-2 bg-white text-[#475569] rounded-lg font-bold text-xs"
          >
            إلغاء
          </button>
          <button
            onClick={save}
            disabled={busy || !name.trim() || !url.trim()}
            className="flex-1 bg-[#10B981] text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50"
          >
            {busy ? "..." : "💾 حفظ"}
          </button>
        </div>
      </div>
    );
  }

  const type = DOC_TYPES.find((t) => t.value === doc.doc_type);
  return (
    <div id={`hr-entry-${doc.id}`} className="bg-white rounded-2xl border border-[#E2E8F0] p-3 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-lg flex-shrink-0">{type?.label.split(" ")[0] ?? "📄"}</span>
          <span className="font-bold text-[#0F172A] text-sm truncate">{doc.name}</span>
        </div>
        <ItemActions onEdit={() => setEditing(true)} onDelete={() => onDelete(doc.id)} />
      </div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <StatusBadge status={doc.status} />
      </div>
      <a
        href={doc.file_url}
        target="_blank"
        rel="noopener"
        className="text-xs text-[#10B981] font-bold hover:underline block truncate mb-2"
        dir="ltr"
      >
        🔗 فتح الملف
      </a>
      <div className="text-xs text-[#94A3B8] pt-2 border-t border-[#F1F5F9]">
        👤 {doc.profiles?.full_name ?? "—"}
      </div>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-[#E2E8F0] p-8 text-center">
      <div className="text-4xl mb-2 opacity-50">{icon}</div>
      <p className="text-sm text-[#64748B]">{message}</p>
    </div>
  );
}
