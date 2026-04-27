"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const STATUSES = [
  { value: "new", label: "🆕 جديد", color: "#3B82F6" },
  { value: "contacted", label: "📞 تم التواصل", color: "#F59E0B" },
  { value: "in_progress", label: "📋 قيد المتابعة", color: "#5438DC" },
  { value: "completed", label: "✅ مكتمل", color: "#10B981" },
];

const CHANNELS: Record<string, string> = {
  phone: "📞 مكالمة",
  whatsapp: "💬 واتساب",
  email: "📧 بريد",
  meeting: "🤝 اجتماع",
  other: "📌 أخرى",
};

export function RecentActivity({
  notes,
  contacts,
}: {
  notes: any[];
  contacts: any[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="grid md:grid-cols-2 gap-3">
      {/* آخر التواصلات */}
      <ActivityCard
        title="آخر التواصلات"
        icon="📞"
        accentColor="#1E40AF"
        bgColor="#DBEAFE"
        items={contacts}
        type="contact"
        expanded={expanded}
        setExpanded={setExpanded}
      />
      {/* آخر الملاحظات */}
      <ActivityCard
        title="آخر الملاحظات"
        icon="📝"
        accentColor="#92400E"
        bgColor="#FEF3C7"
        items={notes}
        type="note"
        expanded={expanded}
        setExpanded={setExpanded}
      />
    </div>
  );
}

function ActivityCard({
  title, icon, accentColor, bgColor,
  items, type, expanded, setExpanded,
}: {
  title: string;
  icon: string;
  accentColor: string;
  bgColor: string;
  items: any[];
  type: "note" | "contact";
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("حذف هذا الإدخال؟")) return;
    setBusy(id);
    const table = type === "note" ? "hr_notes" : "hr_contact_log";
    const { error } = await supabase.from(table).delete().eq("id", id);
    setBusy(null);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: `${bgColor}80` }}
      >
        <span className="text-base">{icon}</span>
        <h2 className="font-black text-sm" style={{ color: accentColor }}>{title}</h2>
      </div>

      {items.length === 0 ? (
        <p className="p-4 text-center text-xs text-[#64748B]">لا يوجد</p>
      ) : (
        <div className="divide-y divide-[#E2E8F0]">
          {items.map((item: any) => {
            const id = `${type}-${item.id}`;
            const isOpen = expanded === id;
            const status = STATUSES.find((s) => s.value === item.status);
            const date = type === "note" ? item.created_at : item.contacted_at;

            return (
              <div key={item.id} className="overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : id)}
                  className="w-full px-4 py-2.5 hover:bg-[#F8FAFC] text-right"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    {type === "contact" && item.channel && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{ background: `${accentColor}15`, color: accentColor }}
                      >
                        {CHANNELS[item.channel] ?? item.channel}
                      </span>
                    )}
                    {status && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-black"
                        style={{ background: `${status.color}15`, color: status.color }}
                      >
                        {status.label}
                      </span>
                    )}
                    <span className="text-[10px] text-[#94A3B8] mr-auto">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-[#0F172A] truncate">
                    {item.profiles?.full_name ?? "—"}
                  </div>
                  <div className="text-xs text-[#64748B] truncate">
                    {type === "note" ? item.note : item.reason}
                  </div>
                </button>

                {/* المحتوى الكامل */}
                {isOpen && (
                  <div className="px-4 pb-3 pt-2 space-y-2 bg-[#F8FAFC]">
                    {type === "note" && (
                      <p className="text-sm text-[#0F172A] whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-[#E2E8F0]">
                        {item.note}
                      </p>
                    )}
                    {type === "contact" && (
                      <div className="space-y-1.5 bg-white p-3 rounded-lg border border-[#E2E8F0]">
                        <div>
                          <span className="text-xs font-bold text-[#64748B]">السبب: </span>
                          <span className="text-sm font-bold text-[#0F172A]">{item.reason}</span>
                        </div>
                        {item.summary && (
                          <div>
                            <span className="text-xs font-bold text-[#64748B]">ملخص: </span>
                            <span className="text-sm text-[#475569]">{item.summary}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-[#94A3B8]">
                      <span>
                        🕐 {new Date(date).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/profiles/${item.member_id}?hr=${type === "note" ? "notes" : "contact"}&focus=${item.id}`}
                          className="px-2 py-1 bg-[#357DED] text-white rounded-lg text-[10px] font-bold"
                        >
                          ✏️ تعديل
                        </Link>
                        <button
                          onClick={() => remove(item.id)}
                          disabled={busy === item.id}
                          className="px-2 py-1 bg-[#EF4444] text-white rounded-lg text-[10px] font-bold disabled:opacity-50"
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
