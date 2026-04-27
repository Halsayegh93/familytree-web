"use client";

import { useState } from "react";

type SubBranch = {
  id: string;
  name: string;
  avatar_url: string | null;
  is_deceased: boolean;
  totalCount: number;
};

type Branch = {
  id: string;
  name: string;
  avatar_url: string | null;
  is_deceased: boolean;
  directCount: number;
  totalCount: number;
  children: SubBranch[];
};

export function BranchesTree({ branches }: { branches: Branch[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  if (branches.length === 0) {
    return <p className="p-4 text-center text-sm text-[#64748B]">لا توجد بيانات</p>;
  }

  return (
    <div className="divide-y divide-[#E2E8F0]">
      {branches.map((b, i) => {
        const isOpen = expanded.has(b.id);
        const canExpand = b.children.length > 0;
        return (
          <div key={b.id}>
            <button
              type="button"
              onClick={() => canExpand && toggle(b.id)}
              disabled={!canExpand}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-right ${
                canExpand ? "hover:bg-[#F8FAFC] cursor-pointer" : "cursor-default"
              }`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                style={{
                  background: i < 3 ? "#5438DC" : "#F1F5F9",
                  color: i < 3 ? "white" : "#475569",
                }}
              >
                {i + 1}
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5438DC] to-[#7C3AED] text-white flex items-center justify-center font-bold overflow-hidden flex-shrink-0">
                {b.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  b.name?.[0] ?? "؟"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-[#0F172A] truncate">
                  {b.name} {b.is_deceased && <span className="text-xs">🕊️</span>}
                </div>
                <div className="text-[10px] text-[#64748B]">
                  {b.directCount} ابن مباشر
                </div>
              </div>
              <div className="text-left flex-shrink-0 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#5438DC]/15 text-[#5438DC] font-black text-sm">
                  {b.totalCount}
                </span>
                {canExpand && (
                  <span className="text-[#94A3B8] text-xs w-3">{isOpen ? "▲" : "▼"}</span>
                )}
              </div>
            </button>

            {isOpen && b.children.length > 0 && (
              <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] divide-y divide-[#E2E8F0]">
                {b.children.map((c, ci) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-2 pr-12">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0 bg-[#E2E8F0] text-[#475569]">
                      {ci + 1}
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#0891B2] text-white flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0">
                      {c.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        c.name?.[0] ?? "؟"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-[#0F172A] truncate">
                        {c.name} {c.is_deceased && <span className="text-[10px]">🕊️</span>}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#06B6D4]/15 text-[#06B6D4] font-black text-xs flex-shrink-0">
                      {c.totalCount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
