"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function BranchSupervisorsClient({
  existing,
  allMembers,
  suggestedBranches,
}: {
  existing: any[];
  allMembers: any[];
  suggestedBranches: any[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [adding, setAdding] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const [supervisorSearch, setSupervisorSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState<any | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const assignedBranchIds = new Set(existing.map((e) => e.branch_root_id));

  const branchOptions = useMemo(() => {
    const q = branchSearch.trim();
    const pool = suggestedBranches.filter((m) => !assignedBranchIds.has(m.id));
    if (!q) return pool.slice(0, 50);
    return pool.filter((m) => m.full_name.includes(q)).slice(0, 50);
  }, [suggestedBranches, branchSearch, assignedBranchIds]);

  const supervisorOptions = useMemo(() => {
    const q = supervisorSearch.trim();
    if (!q) return allMembers.slice(0, 30);
    return allMembers.filter((m) => m.full_name.includes(q)).slice(0, 30);
  }, [allMembers, supervisorSearch]);

  async function save() {
    if (!selectedBranch || !selectedSupervisor) return;
    setBusy(true);
    const { error } = await supabase.from("branch_supervisors").insert({
      branch_root_id: selectedBranch.id,
      supervisor_id: selectedSupervisor.id,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) {
      alert("خطأ: " + error.message);
    } else {
      setSelectedBranch(null);
      setSelectedSupervisor(null);
      setNotes("");
      setAdding(false);
      router.refresh();
    }
  }

  async function remove(id: number) {
    if (!confirm("إلغاء تعيين هذا المشرف؟")) return;
    const { error } = await supabase.from("branch_supervisors").delete().eq("id", id);
    if (error) alert("خطأ: " + error.message);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* قائمة الفروع المعيّنة */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="font-black text-[#0F172A]">⭐ المشرفون المعيّنون</h2>
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 bg-[#5438DC] text-white rounded-lg text-sm font-bold hover:opacity-90"
          >
            + تعيين مشرف
          </button>
        </div>

        {existing.length === 0 ? (
          <div className="p-8 text-center text-[#64748B]">
            <div className="text-4xl mb-2">⭐</div>
            <p className="font-bold">لا يوجد مشرفون معيّنون بعد</p>
            <p className="text-xs mt-1">اضغط "تعيين مشرف" لبدء التعيين</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {existing.map((e) => (
              <div key={e.id} className="p-4 flex items-start gap-3">
                {/* الفرع */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">
                    🌳 الفرع
                  </div>
                  <div className="font-bold text-sm text-[#5438DC] truncate">
                    {e.branch?.full_name ?? "—"}
                  </div>
                </div>

                <span className="text-[#94A3B8] mt-5">←</span>

                {/* المشرف */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">
                    ⭐ المشرف
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#357DED] to-[#2460C0] text-white flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0">
                      {e.supervisor?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.supervisor.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        e.supervisor?.full_name?.[0] ?? "؟"
                      )}
                    </div>
                    <div className="font-bold text-sm text-[#0F172A] truncate">
                      {e.supervisor?.full_name ?? "—"}
                    </div>
                  </div>
                  {e.notes && (
                    <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2">{e.notes}</p>
                  )}
                </div>

                <button
                  onClick={() => remove(e.id)}
                  className="px-2 h-7 rounded-lg bg-[#EF4444]/10 hover:bg-[#EF4444] hover:text-white text-[#EF4444] text-xs font-bold transition"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* مودال التعيين */}
      {adding && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-[#0F172A]">⭐ تعيين مشرف على فرع</h2>
              <button
                onClick={() => { setAdding(false); setSelectedBranch(null); setSelectedSupervisor(null); }}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#475569] font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* اختيار الفرع */}
              <div>
                <label className="block text-sm font-bold text-[#0F172A] mb-2">
                  🌳 الفرع
                </label>
                {selectedBranch ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#5438DC]/10 rounded-xl border border-[#5438DC]/20">
                    <span className="font-bold text-sm text-[#5438DC] flex-1 truncate">
                      {selectedBranch.full_name}
                    </span>
                    <button onClick={() => setSelectedBranch(null)} className="text-[#EF4444]">✕</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                      placeholder="ابحث عن الفرع (الجيل 3 أو 4)..."
                      className="w-full px-3 py-2 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#5438DC] text-sm"
                    />
                    <div className="mt-2 max-h-40 overflow-y-auto border border-[#E2E8F0] rounded-xl divide-y divide-[#E2E8F0]">
                      {branchOptions.length === 0 ? (
                        <p className="p-3 text-center text-xs text-[#94A3B8]">لا نتائج</p>
                      ) : (
                        branchOptions.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setSelectedBranch(m)}
                            className="w-full px-3 py-2 text-right hover:bg-[#F8FAFC] text-sm font-bold text-[#475569]"
                          >
                            {m.full_name}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* اختيار المشرف */}
              <div>
                <label className="block text-sm font-bold text-[#0F172A] mb-2">
                  ⭐ المشرف
                </label>
                {selectedSupervisor ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#357DED]/10 rounded-xl border border-[#357DED]/20">
                    <span className="font-bold text-sm text-[#357DED] flex-1 truncate">
                      {selectedSupervisor.full_name}
                    </span>
                    <button onClick={() => setSelectedSupervisor(null)} className="text-[#EF4444]">✕</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={supervisorSearch}
                      onChange={(e) => setSupervisorSearch(e.target.value)}
                      placeholder="ابحث عن العضو..."
                      className="w-full px-3 py-2 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED] text-sm"
                    />
                    <div className="mt-2 max-h-40 overflow-y-auto border border-[#E2E8F0] rounded-xl divide-y divide-[#E2E8F0]">
                      {supervisorOptions.length === 0 ? (
                        <p className="p-3 text-center text-xs text-[#94A3B8]">لا نتائج</p>
                      ) : (
                        supervisorOptions.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setSelectedSupervisor(m)}
                            className="w-full px-3 py-2 text-right hover:bg-[#F8FAFC] text-sm font-bold text-[#475569]"
                          >
                            {m.full_name}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* ملاحظات */}
              <div>
                <label className="block text-sm font-bold text-[#0F172A] mb-2">
                  📝 ملاحظات (اختياري)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="مثلاً: مسؤول عن اعتماد التعديلات والتأكد من البيانات"
                  className="w-full px-3 py-2 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#5438DC] text-sm resize-none"
                />
              </div>

              <button
                onClick={save}
                disabled={busy || !selectedBranch || !selectedSupervisor}
                className="w-full bg-[#5438DC] text-white py-3 rounded-2xl font-bold shadow-md disabled:opacity-50"
              >
                {busy ? "..." : "💾 تعيين"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
