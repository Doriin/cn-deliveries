"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** A small menu that opens from its trigger and closes on Escape, an outside click, or after navigating. */
export function UserMenu({ label, trigger, triggerClass = "sh-avatar", side = "down", children }: { label: string; trigger: ReactNode; triggerClass?: string; side?: "down" | "up"; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={ref} className="sh-menu" data-open={open}>
      <button type="button" className={triggerClass} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {trigger}
      </button>
      <div className="sh-pop" data-side={side} inert={!open}>
        {children}
      </div>
    </div>
  );
}
