/**
 * Card — ناعم متفاعل
 */
export function Card({
  children,
  className = "",
  padding = "md",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
}) {
  const padClass =
    padding === "none" ? "" :
    padding === "sm" ? "p-4" :
    padding === "lg" ? "p-6 md:p-8" :
    "p-4 md:p-6";

  const interactiveClass = interactive
    ? "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#CBD5E1] cursor-pointer"
    : "";

  return (
    <div
      className={`bg-white rounded-2xl border border-[#E2E8F0] ${padClass} ${interactiveClass} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#E2E8F0]">
      <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
        {icon && <span>{icon}</span>}
        <span>{title}</span>
      </h3>
      {action}
    </div>
  );
}
