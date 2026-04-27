import { themes, type ThemeKey } from "@/lib/page-themes";

/**
 * Hero ناعم ملوّن — خلفية pastel + نص داكن + ايقونة بارزة
 */
export function PageHero({
  theme,
  title,
  subtitle,
  badge,
}: {
  theme: ThemeKey;
  title: string;
  subtitle?: string;
  badge?: { label: string; private?: boolean };
}) {
  const t = themes[theme];

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 md:p-6 mb-6 border"
      style={{
        background: t.bg,
        borderColor: `${t.primary}25`,
      }}
    >
      <div className="relative flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex items-center gap-3 md:gap-4">
          {/* ايقونة بدائرة بلون الصفحة */}
          <div
            className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-2xl md:text-3xl shadow-sm flex-shrink-0"
            style={{ background: "white", color: t.primary }}
          >
            {t.emoji}
          </div>

          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-extrabold text-[#0F172A]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[#475569] mt-0.5 text-sm md:text-base">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {badge && (
          <span
            className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
            style={{
              background: badge.private ? `${t.primary}15` : `${t.primary}15`,
              color: t.primary,
            }}
          >
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * خلفية صفحة هادئة بنغمة لونية خفيفة جداً
 */
export function PageBackground({
  theme,
  children,
}: {
  theme: ThemeKey;
  children: React.ReactNode;
}) {
  const t = themes[theme];

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] page-bg-wrapper">
      {/* تدرج لوني خفيف من الأعلى — يختفي في الطباعة */}
      <div
        className="absolute top-0 left-0 right-0 h-64 pointer-events-none print:hidden"
        style={{
          background: `linear-gradient(180deg, ${t.primary}08 0%, transparent 100%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
