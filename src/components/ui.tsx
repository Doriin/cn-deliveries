import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Info, type LucideIcon } from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/*
 * These controls carry no look of their own. Their appearance comes from the chosen design
 * (src/app/designs/base.css reads the design's tokens), so every page follows the design switch.
 */
type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "success";
type BtnSize = "sm" | "md" | "lg";

export const btnClass = (variant: BtnVariant = "primary", size: BtnSize = "md") =>
  cx("ui-btn", `ui-btn-${variant}`, size !== "md" && `ui-btn-${size}`);

export function Button({ variant, size, className, ...p }: ComponentProps<"button"> & { variant?: BtnVariant; size?: BtnSize }) {
  return <button {...p} className={cx(btnClass(variant, size), className)} />;
}

export function LinkButton({ variant, size, className, ...p }: ComponentProps<typeof Link> & { variant?: BtnVariant; size?: BtnSize }) {
  return <Link {...p} className={cx(btnClass(variant, size), className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("h-4 w-4 animate-spin [animation-duration:600ms]", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Full width unless the caller sets its own width class. */
const width = (className?: string) => (className && /(^|\s)(w-|flex-)/.test(className) ? "" : "w-full");

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input {...p} className={cx("ui-field field", width(className), className)} />;
}
export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select {...p} className={cx("ui-field field", width(className), className)} />;
}
export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea {...p} className={cx("ui-field field", width(className), className)} />;
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="ui-label">{label}</span>
      {children}
      {hint && <span className="ui-hint">{hint}</span>}
    </label>
  );
}

export function Card({ title, actions, children, className, flush }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cx("ui-card", className)}>
      {(title || actions) && (
        <header className="ui-card-head">
          <h2 className="ui-card-title">{title}</h2>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ui-page-head">
      <div className="min-w-0">
        <h1 className="ui-page-title">{title}</h1>
        {subtitle && <p className="ui-page-sub">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold", className)}>{children}</span>;
}

const ALERT_ICON: Record<string, LucideIcon> = { error: AlertCircle, success: CheckCircle2, info: Info };
export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  const Icon = ALERT_ICON[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cx("ui-alert", `ui-alert-${kind}`)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("ui-table-wrap", className)}>
      <table>{children}</table>
    </div>
  );
}
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => <th className={cx("ui-th", className)}>{children}</th>;
export const Td = ({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={cx("ui-td", className)}>{children}</td>
);

/** A tracking number, set like the code printed on the label. */
export function Tracking({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("ui-tracking", className)}>{children}</span>;
}

/** An empty list says what belongs here and, when possible, how to add it. */
export function EmptyState({ icon: Icon, title, hint, action, className }: { icon: LucideIcon; title: ReactNode; hint?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col items-center px-6 py-12 text-center", className)}>
      <Icon className="mb-3 h-7 w-7 text-slate-400" aria-hidden />
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      {hint && <p className="mt-1 max-w-xs text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden />;
}

export { cx };
