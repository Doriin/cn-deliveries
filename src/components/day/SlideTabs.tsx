"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";

export type SlideTab = { key: string; href: string; label: string; count?: number; alert?: boolean };

/**
 * Stage tabs with one indicator that travels to the chosen tab. The tabs are real links (the list is
 * filtered on the server); the indicator moves the moment a tab is pressed, without waiting for the page.
 */
export function SlideTabs({ tabs, active, label, className }: { tabs: SlideTab[]; active: string; label: string; className?: string }) {
  const [sel, setSel] = useState(active);
  const [ready, setReady] = useState(false);
  const nav = useRef<HTMLElement>(null);
  useEffect(() => setSel(active), [active]);
  useLayoutEffect(() => {
    const el = nav.current;
    if (!el) return;
    const place = () => {
      const on = el.querySelector<HTMLElement>('[data-on="true"]');
      const ind = el.querySelector<HTMLElement>(".ind");
      if (!on || !ind) return;
      ind.style.setProperty("--x", `${on.offsetLeft}px`);
      ind.style.setProperty("--w", `${on.offsetWidth}px`);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    document.fonts?.ready.then(place);
    // the first placement should not animate in from the left edge
    const id = requestAnimationFrame(() => setReady(true));
    return () => { ro.disconnect(); cancelAnimationFrame(id); };
  }, [sel, tabs.length]);
  return (
    <nav ref={nav} aria-label={label} className={className} data-ready={ready}>
      <span className="ind" aria-hidden />
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} scroll={false} replace data-on={sel === t.key} data-alert={t.alert || undefined} aria-current={sel === t.key ? "page" : undefined} onClick={() => setSel(t.key)}>
          {t.label}
          {t.count !== undefined && <b>{t.count}</b>}
        </Link>
      ))}
    </nav>
  );
}
