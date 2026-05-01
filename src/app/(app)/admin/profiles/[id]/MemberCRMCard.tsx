"use client";

import Link from "next/link";
import { formatPhone } from "@/lib/format-phone";

export function MemberCRMCard({
  member,
  father,
  children,
  branchRootName,
  branchSubName,
  supervisor,
  pendingRequestsCount,
  completenessPercent,
  missingFields = [],
  lastActivityDate,
  newsCount,
  storiesCount,
  projectsCount,
}: {
  member: any;
  father: any;
  children: any[];
  branchRootName: string | null;
  branchSubName?: string | null;
  supervisor?: { id: string; full_name: string; avatar_url?: string | null; phone_number?: string | null } | null;
  pendingRequestsCount: number;
  completenessPercent: number;
  missingFields?: string[];
  lastActivityDate?: string | null;
  newsCount: number;
  storiesCount: number;
  projectsCount: number;
}) {
  const phoneE164 = (member.phone_number ?? "").replace(/\s/g, "").replace(/[^\d+]/g, "");
  const verified = completenessPercent === 100;
  const isDeceased = !!member.is_deceased;
  const childrenCount = children?.length ?? 0;
  const totalContributions = newsCount + storiesCount + projectsCount;

  const lastDays = lastActivityDate
    ? Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / 86400000)
    : null;

  const health = (() => {
    if (!lastActivityDate) return { label: "لم تبدأ", color: "#94A3B8", emoji: "○" };
    if (lastDays! <= 30) return { label: "نشطة", color: "#10B981", emoji: "●" };
    if (lastDays! <= 90) return { label: "تحتاج متابعة", color: "#F59E0B", emoji: "◐" };
    return { label: "فاترة", color: "#EF4444", emoji: "◌" };
  })();

  const accountStatus = member.is_deceased
    ? { label: "متوفى", color: "#6B7B8D", emoji: "🕊️" }
    : member.status === "frozen"
    ? { label: "مجمّد", color: "#EF4444", emoji: "🔒" }
    : { label: "نشط", color: "#10B981", emoji: "✓" };

  // المتوفى: لا تنبيهات اكتمال أو خمول
  const hasAlerts = pendingRequestsCount > 0 || (!isDeceased && (!verified || (lastDays !== null && lastDays > 90)));

  // اللون الرئيسي للبطاقة — يعكس حالة العلاقة
  const accentColor = health.color;

  return (
    <div
      className="bg-white rounded-3xl overflow-hidden relative"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        borderTop: `3px solid ${accentColor}`,
      }}
    >
      {/* === الهيدر: صورة + اسم + شارات === */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start gap-4">
          {/* الصورة الكبيرة */}
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-2xl text-white flex items-center justify-center font-black text-2xl overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
              }}
            >
              {member.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (member.full_name?.[0] ?? "؟")
              )}
            </div>
            {/* مؤشر صحة العلاقة على الصورة */}
            <div
              className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-black border-2"
              style={{ color: health.color, borderColor: health.color }}
              title={health.label}
            >
              {health.emoji}
            </div>
          </div>

          {/* المعلومات */}
          <div className="flex-1 min-w-0 pl-7">
            {/* الاسم الكبير */}
            <h2 className="font-black text-[#0F172A] text-lg leading-tight mb-2">
              {member.full_name}
            </h2>

            {/* الفرع */}
            {branchRootName && (
              <div className="flex items-center gap-1.5 text-xs text-[#64748B] flex-wrap mb-2">
                {(() => {
                  const parts = branchRootName.trim().split(/\s+/);
                  const lastThree = parts.slice(-3).join(" ");
                  const rest = parts.slice(0, -3).join(" ");
                  return (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">FAM</span>
                      {rest && <span className="font-bold text-[#475569]">{rest}</span>}
                      <span className="px-2 py-0.5 rounded-full bg-[#5438DC]/8 text-[#5438DC] text-[10px] font-black border border-[#5438DC]/20 whitespace-nowrap">
                        {lastThree}
                      </span>
                    </>
                  );
                })()}
              </div>
            )}

            {/* الشارات */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {!isDeceased && (
                <Pill color={verified ? "#10B981" : "#F59E0B"}>
                  {verified ? "✓ موثّق" : "⚠ غير مكتمل"}
                </Pill>
              )}
              <Pill color={accountStatus.color}>
                {accountStatus.emoji} {accountStatus.label}
              </Pill>
            </div>
          </div>
        </div>
      </div>

      {/* === التواصل === */}
      {member.phone_number && phoneE164 && (
        <div className="mx-5 mb-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3 flex items-center gap-3">
          <span dir="ltr" className="font-black text-[#0F172A] text-sm flex-1 truncate">
            {formatPhone(member.phone_number)}
          </span>
          <a
            href={`tel:${phoneE164}`}
            className="w-9 h-9 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white flex items-center justify-center transition shadow-sm"
            title="اتصال"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </a>
          <a
            href={`https://wa.me/${phoneE164.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener"
            className="w-9 h-9 rounded-xl bg-[#25D366] hover:bg-[#1EBE59] text-white flex items-center justify-center transition shadow-sm"
            title="واتساب"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          </a>
        </div>
      )}

      {/* === صف المؤشرات (للأحياء فقط) === */}
      {!isDeceased && (
        <div className="grid grid-cols-4 px-5 pb-4 gap-3">
          <BigMetric
            label="اكتمال"
            value={`${completenessPercent}%`}
            color={completenessPercent >= 80 ? "#10B981" : completenessPercent >= 50 ? "#F59E0B" : "#EF4444"}
            progress={completenessPercent}
          />
          <BigMetric
            label="آخر نشاط"
            value={lastDays !== null ? (lastDays === 0 ? "اليوم" : `${lastDays}ي`) : "—"}
            color={health.color}
          />
          <BigMetric
            label="طلبات"
            value={String(pendingRequestsCount)}
            color={pendingRequestsCount > 0 ? "#F59E0B" : "#94A3B8"}
          />
          <BigMetric
            label="مساهمات"
            value={String(totalContributions)}
            color="#06B6D4"
          />
        </div>
      )}

      {/* === التنبيهات === */}
      {hasAlerts && (
        <div className="border-t border-[#FEF3C7] bg-[#FFFBEB] px-5 py-3">
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[10px] font-black mt-0.5">
              !
            </span>
            <div className="flex-1 flex items-center gap-1.5 flex-wrap">
              {!verified && missingFields.length > 0 && (
                <>
                  <span className="text-[11px] font-bold text-[#92400E]">يحتاج:</span>
                  {missingFields.map((field) => (
                    <span
                      key={field}
                      className="px-2 py-0.5 rounded-md bg-white text-[#92400E] text-[10px] font-bold border border-[#F59E0B]/40"
                    >
                      {field}
                    </span>
                  ))}
                </>
              )}
              {pendingRequestsCount > 0 && (
                <Link
                  href="/admin/pending-projects"
                  className="px-2 py-0.5 rounded-md bg-white text-[#92400E] text-[10px] font-bold border border-[#F59E0B]/40 hover:bg-[#F59E0B] hover:text-white"
                >
                  ⏳ {pendingRequestsCount} طلب
                </Link>
              )}
              {lastDays !== null && lastDays > 90 && (
                <span className="px-2 py-0.5 rounded-md bg-white text-[#92400E] text-[10px] font-bold border border-[#F59E0B]/40">
                  💤 {lastDays} يوم
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === المشرف المسؤول === */}
      <div className="border-t border-[#E2E8F0] px-4 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
            ⭐ المشرف المسؤول
          </span>
          {supervisor ? (
            <span className="text-[10px] font-bold text-[#10B981] mr-auto">معيّن</span>
          ) : (
            <span className="text-[10px] font-bold text-[#EF4444] mr-auto">غير محدد</span>
          )}
        </div>
        {supervisor ? (
          <Link
            href={`/admin/profiles/${supervisor.id}?tab=hr`}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#357DED]/8 hover:bg-[#357DED]/15 border border-[#357DED]/20 transition"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#357DED] to-[#2460C0] text-white flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
              {supervisor.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={supervisor.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                supervisor.full_name?.[0] ?? "؟"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-[#0F172A] truncate">{supervisor.full_name}</div>
              <div className="text-[10px] text-[#64748B]">مسؤول عن اعتماد بيانات هذا الفرع</div>
            </div>
            <span className="text-[#357DED]">←</span>
          </Link>
        ) : (
          <Link
            href="/admin/branch-supervisors"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#F59E0B]/30 transition"
          >
            <span className="text-base">⚠️</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-[#92400E]">لم يُعيّن مشرف لهذا الفرع</div>
              <div className="text-[10px] text-[#92400E]">اضغط لتعيين مشرف</div>
            </div>
            <span className="text-[#92400E]">←</span>
          </Link>
        )}
      </div>

      {/* === الأبناء === */}
      {childrenCount > 0 && (
        <div className="border-t border-[#E2E8F0] px-5 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
              CHILDREN
            </span>
            <span className="text-[10px] font-bold text-[#94A3B8]">·</span>
            <span className="text-[10px] font-bold text-[#475569]">{childrenCount}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(children ?? []).slice(0, 10).map((c) => (
              <Link
                key={c.id}
                href={`/admin/profiles/${c.id}?tab=hr`}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#5438DC] hover:text-white text-[11px] font-bold transition border border-[#E2E8F0]"
              >
                {c.is_deceased && <span className="text-[10px]">🕊️</span>}
                <span>{c.full_name?.split(" ")[0]}</span>
              </Link>
            ))}
            {childrenCount > 10 && (
              <span className="text-[10px] font-bold text-[#94A3B8] px-2">+{childrenCount - 10}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1"
      style={{
        background: `${color}10`,
        color,
        boxShadow: `inset 0 0 0 1px ${color}25`,
      }}
    >
      {children}
    </span>
  );
}

function BigMetric({
  label,
  value,
  color,
  progress,
}: {
  label: string;
  value: string;
  color: string;
  progress?: number;
}) {
  return (
    <div className="text-center">
      <div className="font-black text-xl tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] font-bold text-[#94A3B8] mt-0.5">{label}</div>
      {progress !== undefined && (
        <div className="mt-1.5 mx-auto w-12 h-0.5 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}
