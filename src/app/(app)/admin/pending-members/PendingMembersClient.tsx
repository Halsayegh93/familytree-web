"use client";

import { useState, useMemo } from "react";
import { formatPhone } from "@/lib/format-phone";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Member = {
  id: string;
  first_name: string;
  full_name: string;
  phone_number: string | null;
  created_at: string;
  avatar_url: string | null;
  registration_platform: string | null;
  username: string | null;
};

type TreeMember = {
  id: string;
  full_name: string;
  father_id: string | null;
  phone_number: string | null;
};

type NameMatch = {
  member: TreeMember;
  matchCount: number;
  matchedParts: string[];
};

// تطبيع النص العربي
function normalizeArabic(text: string): string {
  return text
    .replace(/[ً-ْٰ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه");
}

function splitName(name: string): string[] {
  const raw = name.split(/\s+/).filter((s) => s.length > 0);
  const parts: string[] = [];
  let i = 0;
  while (i < raw.length) {
    const normalized = normalizeArabic(raw[i]);
    if (normalized === "عبد" && i + 1 < raw.length) {
      parts.push(normalizeArabic(raw[i] + raw[i + 1]));
      i += 2;
    } else {
      let clean = normalized;
      if (clean.startsWith("ال") && clean.length > 2) clean = clean.slice(2);
      parts.push(clean);
      i += 1;
    }
  }
  return parts;
}

function partsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3) {
    if (a.includes(b) || b.includes(a)) return true;
  }
  return false;
}

function findNameMatches(member: Member, treeMembers: TreeMember[]): NameMatch[] {
  const newParts = splitName(member.full_name);
  if (newParts.length < 2) return [];

  const matches: NameMatch[] = [];

  for (const existing of treeMembers) {
    if (existing.id === member.id) continue;
    const existingParts = splitName(existing.full_name);
    const matched: string[] = [];
    const used = new Set<number>();

    for (const np of newParts) {
      for (let idx = 0; idx < existingParts.length; idx++) {
        if (!used.has(idx) && partsMatch(np, existingParts[idx])) {
          matched.push(np);
          used.add(idx);
          break;
        }
      }
    }

    if (matched.length >= 2) {
      matches.push({ member: existing, matchCount: matched.length, matchedParts: matched });
    }
  }

  return matches.sort((a, b) => b.matchCount - a.matchCount).slice(0, 5);
}

function formatRegistrationDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function PendingMembersClient({
  members,
  treeMembers,
  canReject,
}: {
  members: Member[];
  treeMembers: TreeMember[];
  canReject: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());

  // حساب التطابقات لكل عضو معلق
  const matchesByMember = useMemo(() => {
    const map: Record<string, NameMatch[]> = {};
    for (const m of members) {
      map[m.id] = findNameMatches(m, treeMembers);
    }
    return map;
  }, [members, treeMembers]);

  async function approve(memberId: string) {
    if (!confirm("الموافقة على هذا العضو؟")) return;
    setBusy(memberId);
    const { error } = await supabase
      .from("profiles")
      .update({ role: "member", status: "active" })
      .eq("id", memberId);
    setBusy(null);
    if (error) {
      alert("خطأ: " + error.message);
    } else {
      router.refresh();
    }
  }

  async function reject(memberId: string) {
    if (!confirm("رفض وحذف هذا الطلب؟ لا يمكن التراجع.")) return;
    setBusy(memberId);
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", memberId);
    setBusy(null);
    if (error) {
      alert("خطأ: " + error.message);
    } else {
      router.refresh();
    }
  }

  async function linkToMember(pendingId: string, treeId: string, treeName: string) {
    if (!confirm(`ربط هذا الحساب بسجل "${treeName}" الموجود بالشجرة؟`)) return;
    setBusy(pendingId);
    // ربط: حذف العضو المعلق وتعيين بياناته للسجل الموجود (مبسط)
    // هنا نعتمد على RPC أو منطق دمج إذا متوفر — حالياً نوافق فقط
    const { error } = await supabase
      .from("profiles")
      .update({ role: "member", status: "active" })
      .eq("id", pendingId);
    setBusy(null);
    if (error) {
      alert("خطأ: " + error.message);
    } else {
      // ملاحظة: الدمج الفعلي يحتاج RPC في Supabase — حالياً نوافق فقط
      alert(`تمت الموافقة. الدمج الفعلي مع "${treeName}" يحتاج منطق إضافي.`);
      router.refresh();
    }
  }

  if (members.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
        <div className="text-5xl mb-3">✅</div>
        <p className="text-[#64748B]">لا توجد طلبات معلقة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((m) => {
        const matches = matchesByMember[m.id] ?? [];
        const hasMatches = matches.length > 0;
        const platform = m.registration_platform ?? "ios";
        const isWeb = platform === "web";
        const nameParts = m.full_name.trim().split(/\s+/);
        const isFullName = nameParts.length >= 5;
        const isExpanded = expandedMatches.has(m.id);
        const visibleMatches = isExpanded ? matches : matches.slice(0, 2);

        return (
          <article
            key={m.id}
            className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm"
          >
            {/* شريط علوي ملوّن */}
            <div
              className={`h-1 ${
                hasMatches
                  ? "bg-gradient-to-r from-[#357DED] to-[#10B981]"
                  : "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]"
              }`}
            />

            <div className="p-4 space-y-3">
              {/* رأس البطاقة */}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#EF4444] text-white flex items-center justify-center font-black text-lg overflow-hidden flex-shrink-0">
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    m.first_name?.[0] ?? "؟"
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-black text-[#0F172A] truncate text-base">{m.full_name}</h3>

                  {/* اسم المستخدم */}
                  {m.username && (
                    <div className="inline-flex items-center gap-1 text-[#357DED] text-xs font-bold">
                      <span>@</span>
                      <span dir="ltr">{m.username}</span>
                    </div>
                  )}

                  {/* اسم خماسي مكتمل */}
                  {isFullName && (
                    <div className="inline-flex items-center gap-1 text-[#10B981] text-[11px] font-bold">
                      <span>✓</span>
                      <span>اسم خماسي مكتمل</span>
                    </div>
                  )}

                  {/* الوقت + المصدر */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <div className="inline-flex items-center gap-1 text-[#64748B] text-[11px] font-semibold">
                      <span>🕐</span>
                      <span>{formatRegistrationDate(m.created_at)}</span>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isWeb
                          ? "bg-[#DBEAFE] text-[#1E40AF]"
                          : "bg-[#D1FAE5] text-[#065F46]"
                      }`}
                    >
                      <span>{isWeb ? "🌐" : "📱"}</span>
                      <span>{isWeb ? "الموقع" : "التطبيق"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* رقم الهاتف */}
              {m.phone_number && (
                <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-3 flex items-center gap-2">
                  <span className="text-xl">📞</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-[#92400E] uppercase">رقم المسجِّل</div>
                    <a
                      href={`tel:${m.phone_number}`}
                      className="font-black text-[#0F172A] text-sm hover:text-[#357DED]"
                      dir="ltr"
                    >
                      {formatPhone(m.phone_number)}
                    </a>
                  </div>
                  <a
                    href={`https://wa.me/${m.phone_number.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener"
                    className="px-2.5 py-1 bg-[#25D366] text-white rounded-lg font-bold text-xs hover:opacity-90"
                  >
                    💬 واتساب
                  </a>
                </div>
              )}

              {/* تطابقات الشجرة */}
              {hasMatches ? (
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[#1E40AF] text-xs font-black">
                    <span>👥</span>
                    <span>تطابق محتمل ({matches.length})</span>
                  </div>

                  {visibleMatches.map((match) => {
                    const totalParts = Math.max(nameParts.length, match.member.full_name.split(/\s+/).length);
                    const ratio = match.matchCount / Math.max(totalParts, 1);
                    const strength =
                      ratio >= 0.8 ? "قوي" : ratio >= 0.6 ? "متوسط" : "ضعيف";
                    const strengthColor =
                      ratio >= 0.8
                        ? "bg-[#10B981]"
                        : ratio >= 0.6
                        ? "bg-[#357DED]"
                        : "bg-[#F59E0B]";

                    return (
                      <div
                        key={match.member.id}
                        className="bg-white rounded-lg p-2.5 border border-[#E2E8F0] flex items-center gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-[#94A3B8] font-medium">عضو الشجرة</div>
                          <div className="font-bold text-[#0F172A] text-sm truncate">
                            {match.member.full_name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold text-[#357DED]">
                              {match.matchCount}/{totalParts} متطابق
                            </span>
                            <span
                              className={`text-[10px] font-black text-white px-2 py-0.5 rounded-full ${strengthColor}`}
                            >
                              {strength}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => linkToMember(m.id, match.member.id, match.member.full_name)}
                          disabled={busy === m.id}
                          className="px-3 py-1.5 bg-gradient-to-r from-[#357DED] to-[#10B981] text-white rounded-lg font-bold text-xs hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                        >
                          🔗 ربط
                        </button>
                      </div>
                    );
                  })}

                  {matches.length > 2 && !isExpanded && (
                    <button
                      onClick={() =>
                        setExpandedMatches((prev) => new Set(prev).add(m.id))
                      }
                      className="w-full text-center text-[#357DED] text-xs font-bold py-1 hover:underline"
                    >
                      ▼ عرض الكل ({matches.length})
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-3 py-2 flex items-center gap-1.5 text-[#065F46] text-xs font-bold">
                  <span>✓</span>
                  <span>لا يوجد تطابق بالشجرة — اسم جديد</span>
                </div>
              )}

              {/* أزرار الإجراءات */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => approve(m.id)}
                  disabled={busy === m.id}
                  className="flex-1 px-4 py-2.5 bg-[#10B981] text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 active:scale-95 transition"
                >
                  {busy === m.id ? "⏳ جاري..." : "✓ موافقة"}
                </button>
                {canReject && (
                  <button
                    onClick={() => reject(m.id)}
                    disabled={busy === m.id}
                    className="flex-1 px-4 py-2.5 bg-[#EF4444] text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 active:scale-95 transition"
                  >
                    ✕ رفض
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
