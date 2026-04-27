"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#EF4444] text-white rounded-xl font-bold shadow-md hover:opacity-90 transition print:hidden"
    >
      <span className="text-xl">📄</span>
      <span>تنزيل PDF</span>
    </button>
  );
}
