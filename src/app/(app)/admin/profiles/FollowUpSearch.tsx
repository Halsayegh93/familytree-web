"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Member = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone_number: string | null;
  is_deceased: boolean | null;
};

export function FollowUpSearch({ members }: { members: Member[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "living" | "deceased">("all");

  const filteredByStatus = useMemo(() => {
    if (filter === "living") return members.filter((m) => !m.is_deceased);
    if (filter === "deceased") return members.filter((m) => m.is_deceased);
    return members;
  }, [members, filter]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return filteredByStatus
      .filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          (m.phone_number ?? "").includes(q)
      )
      .slice(0, 10);
  }, [filteredByStatus, query]);

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-base">🔍</span>
        <input
          type="text"
          placeholder="ابحث عن عضو لفتح ملفه..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-3 py-2 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#5438DC] text-sm"
        />
        {query && (
          <button onClick={() => setQuery("")} className="px-2 text-[#94A3B8] text-sm font-bold">
            ✕
          </button>
        )}
      </div>

      <div className="flex gap-1.5">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} label="الكل" color="#5438DC" />
        <Chip active={filter === "living"} onClick={() => setFilter("living")} label="الأحياء" color="#10B981" />
        <Chip active={filter === "deceased"} onClick={() => setFilter("deceased")} label="المتوفون" color="#6B7B8D" />
      </div>

      {results.length > 0 && (
        <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] max-h-72 overflow-y-auto divide-y divide-[#E2E8F0]">
          {results.map((m) => (
            <Link
              key={m.id}
              href={`/admin/profiles/${m.id}`}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-white"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#5438DC] to-[#7C3AED] text-white flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  m.full_name.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-[#0F172A] truncate flex items-center gap-1">
                  <span className="truncate">{m.full_name}</span>
                  {m.is_deceased && <span className="text-[10px] flex-shrink-0">🕊️</span>}
                </div>
                {m.phone_number && (
                  <div className="text-xs text-[#64748B] truncate" dir="ltr">
                    {m.phone_number}
                  </div>
                )}
              </div>
              <span className="text-[#5438DC] text-sm">←</span>
            </Link>
          ))}
        </div>
      )}

      {query && results.length === 0 && (
        <div className="bg-[#F8FAFC] rounded-xl p-4 text-center text-sm text-[#64748B]">
          🔍 لا توجد نتائج
        </div>
      )}
    </div>
  );
}

function Chip({
  active, onClick, label, color,
}: {
  active: boolean; onClick: () => void; label: string; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-bold transition ${
        active ? "text-white" : "text-[#475569] bg-[#F1F5F9]"
      }`}
      style={active ? { background: color } : {}}
    >
      {label}
    </button>
  );
}
