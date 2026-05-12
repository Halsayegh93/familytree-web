/**
 * مكوّن أقسام موحّد لإدارة الأعضاء وكل صفحات الإدارة.
 * يطبّق:
 *   - شريط لوني علوي (accent) بسماكة 3px
 *   - رأس بسيط مع أيقونة + عنوان + (اختياري: trailing)
 *   - shadow خفيف بدل border ثقيل
 *   - حواف مدوّرة rounded-2xl
 */

import Link from "next/link";

export function AdminSection({
  title,
  icon,
  accent,
  trailing,
  href,
  children,
}: {
  title: string;
  icon?: string;
  accent?: string;
  trailing?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        borderTop: accent ? `3px solid ${accent}` : undefined,
        border: accent ? undefined : "1px solid #E2E8F0",
      }}
    >
      <div className="px-5 py-3 flex items-center gap-2 border-b border-[#F1F5F9]">
        {icon && <span className="text-base">{icon}</span>}
        {href ? (
          <Link href={href} className="font-black text-[#0F172A] text-sm hover:text-[#357DED]">
            {title}
          </Link>
        ) : (
          <h2 className="font-black text-[#0F172A] text-sm">{title}</h2>
        )}
        {trailing && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-auto"
            style={{
              background: accent ? `${accent}10` : "#F1F5F9",
              color: accent ?? "#64748B",
              boxShadow: accent ? `inset 0 0 0 1px ${accent}25` : undefined,
            }}
          >
            {trailing}
          </span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function AdminRow({
  label,
  value,
  dir,
  mono,
}: {
  label: string;
  value: string | number | null | undefined;
  dir?: "ltr" | "rtl";
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#F1F5F9] last:border-0">
      <span className="text-xs text-[#64748B] font-medium">{label}</span>
      <span
        className={`font-bold text-[#0F172A] text-sm text-right max-w-[60%] truncate ${mono ? "font-mono text-xs" : ""}`}
        dir={dir}
      >
        {value ?? <span className="text-[#94A3B8] font-normal">—</span>}
      </span>
    </div>
  );
}

export function AdminLabel({
  icon,
  text,
  color = "#94A3B8",
}: {
  icon?: string;
  text: string;
  color?: string;
}) {
  return (
    <div
      className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider mb-1.5"
      style={{ color }}
    >
      {icon && <span className="text-xs">{icon}</span>}
      <span>{text}</span>
    </div>
  );
}

export function AdminPill({
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

export function AdminMetric({
  label,
  value,
  color,
  progress,
  sub,
}: {
  label: string;
  value: string | number;
  color: string;
  progress?: number;
  sub?: string;
}) {
  return (
    <div className="text-center px-3 py-2.5">
      <div className="font-black text-2xl tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] font-bold text-[#94A3B8] mt-0.5 uppercase tracking-wider">
        {label}
      </div>
      {sub && <div className="text-[9px] text-[#94A3B8] mt-0.5 truncate">{sub}</div>}
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
