import Link from "next/link";
import { FollowUpSearch } from "./FollowUpSearch";
import { RecentActivity } from "./RecentActivity";

const STATUSES = [
  { value: "new", label: "🆕 جديد", subtitle: "لم يتم التواصل", color: "#3B82F6" },
  { value: "contacted", label: "📞 تم التواصل", subtitle: "تم الاتصال الأول", color: "#F59E0B" },
  { value: "in_progress", label: "📋 قيد المتابعة", subtitle: "متابعة مستمرة", color: "#5438DC" },
  { value: "completed", label: "✅ مكتمل", subtitle: "تم إنجاز الموضوع", color: "#10B981" },
];

export function FollowUpDashboard({
  trackedMembers,
  recentNotes,
  recentContact,
  allMembers,
}: {
  trackedMembers: any[];
  recentNotes: any[];
  recentContact: any[];
  allMembers: any[];
}) {
  const byStatus: Record<string, typeof trackedMembers> = {};
  STATUSES.forEach((s) => (byStatus[s.value] = []));
  trackedMembers.forEach((m) => {
    if (m.hr_status && byStatus[m.hr_status]) {
      byStatus[m.hr_status].push(m);
    }
  });

  return (
    <div className="space-y-3">
      {/* البحث */}
      <FollowUpSearch members={allMembers} />

      {/* بطاقات الحالات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s.value}
            href={`#status-${s.value}`}
            className="bg-white rounded-xl border border-[#E2E8F0] p-3 hover:shadow-sm hover:border-[#5438DC] transition"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">{s.label.split(" ")[0]}</span>
              <span className="text-xl font-black" style={{ color: s.color }}>
                {byStatus[s.value].length}
              </span>
            </div>
            <div className="font-bold text-[#0F172A] text-xs">{s.label.replace(/^[^\s]+\s/, "")}</div>
            <div className="text-[10px] text-[#64748B] mt-0.5">{s.subtitle}</div>
          </Link>
        ))}
      </div>

      {/* أقسام لكل حالة */}
      {STATUSES.map((s) => {
        const items = byStatus[s.value];
        if (items.length === 0) return null;

        return (
          <section
            key={s.value}
            id={`status-${s.value}`}
            className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden scroll-mt-20"
          >
            <div
              className="px-4 py-2.5 flex items-center justify-between"
              style={{ background: `${s.color}10`, color: s.color }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{s.label.split(" ")[0]}</span>
                <h2 className="font-black text-sm">{s.label.replace(/^[^\s]+\s/, "")}</h2>
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                style={{ background: s.color }}
              >
                {items.length}
              </span>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {items.map((m: any) => (
                <Link
                  key={m.id}
                  href={`/admin/profiles/${m.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5438DC] to-[#7C3AED] text-white flex items-center justify-center font-bold overflow-hidden flex-shrink-0">
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      m.full_name?.[0] ?? "؟"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-[#0F172A] truncate">{m.full_name}</div>
                    <div className="text-xs text-[#64748B] flex flex-wrap gap-2">
                      {m.phone_number && <span dir="ltr">📞 {m.phone_number}</span>}
                      {m.is_deceased && <span>🕊️</span>}
                      {m.status === "frozen" && <span>🔒</span>}
                    </div>
                  </div>
                  <span className="text-[#64748B]">←</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {trackedMembers.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
          <div className="text-4xl mb-2">📭</div>
          <p className="font-bold text-[#0F172A] text-sm">لا توجد متابعات حالياً</p>
          <p className="text-xs text-[#64748B] mt-1">
            ادخل ملف عضو وأضف ملاحظة/تواصل/مستند بحالة لتظهر هنا
          </p>
        </div>
      )}

      {/* النشاط الأخير */}
      <RecentActivity notes={recentNotes} contacts={recentContact} />
    </div>
  );
}
