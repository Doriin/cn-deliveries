"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

/** Search box in the office menu. "/" or Ctrl/⌘+K jumps to it from anywhere; a USB scanner can type straight into it. */
export function HeaderSearch({ placeholder }: { placeholder: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form action="/find" role="search" className="sh-search">
      <Search aria-hidden />
      <input ref={ref} name="q" type="search" enterKeyHint="search" autoComplete="off" placeholder={placeholder} aria-label={placeholder} />
      <kbd>/</kbd>
    </form>
  );
}
