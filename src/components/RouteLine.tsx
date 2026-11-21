import type { ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cx } from "./ui";

export type RouteStop = {
  key: string;
  label: ReactNode;
  /** Shown above the stop (a count on the dashboard, nothing on a single parcel's route). */
  top?: ReactNode;
  /** done: passed (check mark) · current: where the parcel is now (pulses) · active: reached, no emphasis · todo: not yet. */
  state: "done" | "current" | "active" | "todo";
  /** Solid colour class for a reached stop. */
  color?: string;
  href?: string;
};

/**
 * A parcel's journey drawn as a line with stops. The same drawing is used for the whole day on the dashboard,
 * for one shipment in the office, and for the recipient on the public tracking page.
 */
export function RouteLine({ stops, className, size = "md", progress = true, line = "bg-brand-500" }: { stops: RouteStop[]; className?: string; size?: "md" | "lg"; /** Colour class of the travelled part of the line. */ line?: string; /** Colour the line up to the current stop. Off when stops are independent counts. */ progress?: boolean }) {
  const reached = (s?: RouteStop) => progress && !!s && s.state !== "todo";
  return (
    <ol className={cx("flex w-full", className)}>
      {stops.map((s, i) => {
        const node = (
          <>
            {s.top !== undefined && <div className="mb-1 tabular-nums">{s.top}</div>}
            <div className={cx("relative flex w-full items-center justify-center", size === "lg" ? "h-9" : "h-7")}>
              {i > 0 && <span className={cx("absolute left-0 right-1/2 h-[3px] origin-left", reached(s) ? line : "bg-slate-200")} aria-hidden />}
              {i < stops.length - 1 && <span className={cx("absolute left-1/2 right-0 h-[3px] origin-left", reached(stops[i + 1]) ? line : "bg-slate-200")} aria-hidden />}
              <span
                className={cx(
                  "relative z-10 grid place-items-center rounded-full ring-4 ring-white transition-transform duration-150 ease-out group-hover:scale-110",
                  size === "lg" ? "h-7 w-7" : "h-5 w-5",
                  s.state === "todo" ? "border-[3px] border-slate-300 bg-white" : cx(s.color ?? "bg-brand-500", "text-white"),
                )}
              >
                {s.state === "current" && <span className={cx("absolute inset-0 animate-pulse-ring rounded-full", s.color ?? "bg-brand-500")} aria-hidden />}
                {s.state === "done" && <Check className={size === "lg" ? "h-4 w-4" : "h-3 w-3"} strokeWidth={3.5} aria-hidden />}
              </span>
            </div>
            <div className={cx("mt-1.5 px-1 leading-tight", size === "lg" ? "text-xs sm:text-sm" : "text-[11px] sm:text-[13px]", s.state === "todo" ? "text-slate-400" : "font-semibold text-slate-800")}>
              {s.label}
            </div>
          </>
        );
        return (
          <li key={s.key} aria-current={s.state === "current" ? "step" : undefined} className="min-w-0 flex-1 text-center">
            {s.href ? (
              <Link href={s.href} className="group flex flex-col items-center rounded-xl py-1.5 transition-colors duration-150 hover:bg-slate-900/[0.03]">{node}</Link>
            ) : (
              <div className="group flex flex-col items-center py-1.5">{node}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
