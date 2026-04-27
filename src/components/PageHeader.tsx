/**
 * PageHeader — موحد لكل الصفحات.
 * تصميم نظيف: عنوان + وصف + شارة اختيارية (يمين)
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  badge?: { label: string; color?: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] flex items-center gap-2">
            {icon && <span>{icon}</span>}
            <span>{title}</span>
          </h1>
          {subtitle && (
            <p className="text-[#475569] mt-1 text-sm md:text-base">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span
              className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
              style={{
                background: `${badge.color ?? "#357DED"}15`,
                color: badge.color ?? "#357DED",
              }}
            >
              {badge.label}
            </span>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
