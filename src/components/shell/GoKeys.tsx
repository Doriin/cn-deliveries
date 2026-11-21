"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Two-key jumps, as in Linear: press G, then a page's letter (G then S opens Shipments). */
export function GoKeys({ map, single = {} }: { map: Record<string, string>; /** one-key jumps, e.g. N for a new shipment */ single?: Record<string, string> }) {
  const router = useRouter();
  useEffect(() => {
    let armed = 0;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (armed && Date.now() - armed < 1200 && map[k]) { e.preventDefault(); e.stopImmediatePropagation(); armed = 0; router.push(map[k]); return; }
      if (!armed && single[k]) { e.preventDefault(); e.stopImmediatePropagation(); router.push(single[k]); return; }
      armed = k === "g" ? Date.now() : 0;
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [map, single, router]);
  return null;
}
