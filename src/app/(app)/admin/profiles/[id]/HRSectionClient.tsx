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
  currentUserId,
  isHrMember,
  canManageHRMembers,
  notes,
  contactLog,
  documents,
}: {
  memberId: string;
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
  const [activeTab, setActiveTab] = useState<"timeline" | "notes" | "contact" | "docs">(
    ["timeline", "notes", "contact", "docs"].includes(initialTab) ? initialTab : "timeline"
  );

  // التمرير للـ entry المحدد لو فيه ?focus=ID
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

  // إحصائيات الحالات (من جميع الـ entries)
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

  return (
    <div className="space-y-3">
      {/* بانر السرية + عضوية اللجنة (مدمجين) */}
      <div className="bg-gradient-to-l from-[#5438DC]/10 to-[#7C3AED]/10 border border-[#5438DC]/20 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔒</span>
          <div>
            <div className="font-bold text-[#5438DC] text-sm">سري — لا يراها العضو</div>
            {latestInfo && (
              <div className="text-xs text-[#475569] mt-0.5">
                آخر حالة: <span className="font-bold" style={{ color: latestInfo.color }}>{latestInfo.label}</span>
              </div>
            )}
          </div>
        </div>
        {canManageHRMembers && (
          <HRMembershipToggle memberId={memberId} isHrMember={isHrMember} />
        )}
      </div>

      {/* بطاقات الحالات */}
      {allEntries.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {STATUSES.map((s) => (
            <div
              key={s.value}
              className="bg-white border border-[#E2E8F0] rounded-xl p-2 text-center"
            >
              <div className="text-2xl font-black" style={{ color: s.color }}>
                {statusCounts[s.value]}
              </div>
              <div className="text-[10px] font-bold text-[#475569] truncate">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* تابات */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1 flex gap-1">
        <Tab
          active={activeTab === "timeline"}
          onClick={() => setActiveTab("timeline")}
          icon="📅"
          label="الكل"
          count={allEntries.length}
          color="#5438DC"
        />
        <Tab
          active={activeTab === "notes"}
          onClick={() => setActiveTab("notes")}
          icon="📝"
          label="ملاحظات"
          count={notes.length}
          color="#F59E0B"
        />
        <Tab
          active={activeTab === "contact"}
          onClick={() => setActiveTab("contact")}
          icon="📞"
          label="تواصل"
          count={contactLog.length}
          color="#3B82F6"
        />
        <Tab
          active={activeTab === "docs"}
          onClick={() => setActiveTab("docs")}
          icon="📁"
          label="مستندات"
          count={documents.length}
          color="#10B981"
        />
      </div>

      {/* محتوى التاب */}
      {activeTab === "timeline" && (
        <TimelineView
          entries={allEntries}
          memberId={memberId}
          currentUserId={currentUserId}
        />
      )}
      {activeTab === "notes" && (
        <NotesSection memberId={memberId} currentUserId={currentUserId} notes={notes} />
      )}
      {activeTab === "contact" && (
        <ContactLogSection memberId={memberId} currentUserId={currentUserId} log={contactLog} />
      )}
      {activeTab === "docs" && (
        <DocumentsSection memberId={memberId} currentUserId={currentUserId} docs={documents} />
      )}
    </div>
  );
}

// MARK: - Timeline (الكل) — مع تعديل/حذف مباشر
function TimelineView({
  entries, memberId, currentUserId,
}: {
  entries: any[]; memberId: string; currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
        <div className="text-4xl mb-2">📭</div>
        <p className="text-sm text-[#64748B]">لا يوجد سجل بعد</p>
        <p className="text-xs text-[#94A3B8] mt-1">ابدأ بإضافة ملاحظة أو تواصل أو مستند</p>
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

  return (
    <div className="space-y-2">
      {entries.map((e) =>
        e.type === "note" ? (
          <NoteItem key={`note-${e.id}`} note={e} onDelete={() => handleDelete(e)} />
        ) : e.type === "contact" ? (
          <ContactItem key={`contact-${e.id}`} item={e} onDelete={() => handleDelete(e)} />
        ) : (
          <DocItem key={`doc-${e.id}`} doc={e} onDelete={() => handleDelete(e)} />
        )
      )}
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
  const [showForm, setShowForm] = useState(false);

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
    else { setText(""); setStatus("new"); setShowForm(false); router.refresh(); }
  }

  async function remove(id: string) {
    if (!confirm("حذف الملاحظة؟")) return;
    const { error } = await supabase.from("hr_notes").delete().eq("id", id);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-[#F59E0B] text-white py-3 rounded-2xl font-bold shadow-sm hover:opacity-90"
        >
          ➕ إضافة ملاحظة جديدة
        </button>
      ) : (
        <div className="bg-white border border-[#FEF3C7] rounded-2xl p-3 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب ملاحظة..."
            rows={3}
            autoFocus
            className="w-full px-3 py-2 bg-[#FFFBEB] border border-[#FEF3C7] rounded-lg outline-none focus:ring-2 focus:ring-[#F59E0B] resize-none text-sm"
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
              disabled={busy || !text.trim()}
              className="flex-1 bg-[#F59E0B] text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50"
            >
              {busy ? "..." : "💾 حفظ"}
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <EmptyState icon="📝" message="لا توجد ملاحظات" />
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
    <div className="flex items-center gap-1">
      <button
        onClick={onEdit}
        title="تعديل"
        className="w-7 h-7 rounded-lg bg-[#F1F5F9] hover:bg-[#357DED] hover:text-white text-[#357DED] flex items-center justify-center text-sm transition"
      >
        ✏️
      </button>
      <button
        onClick={onDelete}
        title="حذف"
        className="w-7 h-7 rounded-lg bg-[#F1F5F9] hover:bg-[#EF4444] hover:text-white text-[#EF4444] flex items-center justify-center text-sm transition"
      >
        🗑️
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
