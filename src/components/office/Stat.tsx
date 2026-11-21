import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** One number with its name: the plain tile used at the top of report pages. */
export function Stat({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: LucideIcon; tone?: string }) {
  return (
    <div className="ui-stat">
      <div className="ui-stat-label">{label}</div>
      <div className="ui-stat-value">{value}</div>
      {hint && <div className="ui-stat-hint">{hint}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
      <h2 className="text-[15px] font-semibold text-slate-900">{children}</h2>
      {aside && <div className="text-xs text-slate-500">{aside}</div>}
    </div>
  );
}
