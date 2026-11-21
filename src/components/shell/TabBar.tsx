"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { DotsThreeCircleIcon } from "@phosphor-icons/react";
import { NavIcon } from "@/components/navIconSets";
import { useCurrentHref, type NavItem } from "@/components/NavLinks";

/**
 * Insula's tab bar: a floating glass bar at the bottom of the screen, like iOS 26.
 * One lens slides to the current tab and swells while pressed; the bar shrinks to icons while you scroll down
 * and comes back when you scroll up. Set-up pages sit behind "More".
 */
export function TabBar({ main, admin, moreLabel, search }: { main: NavItem[]; admin: NavItem[]; moreLabel: string; search: ReactNode }) {
  const current = useCurrentHref([...main, ...admin].map((i) => i.href));
  const [sel, setSel] = useState<string | undefined>(current);
  const [min, setMin] = useState(false);
  const [more, setMore] = useState(false);
  const [ready, setReady] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const inAdmin = admin.some((i) => i.href === current);

  useEffect(() => setSel(current), [current]);
  useEffect(() => setMore(false), [current]);

  useLayoutEffect(() => {
    const el = bar.current;
    if (!el) return;
    const place = () => {
      const on = el.querySelector<HTMLElement>('[data-sel="true"]');
      if (!on) { el.style.setProperty("--lens-o", "0"); return; }
      el.style.setProperty("--lens-o", "1");
      el.style.setProperty("--lens-x", `${on.offsetLeft}px`);
      el.style.setProperty("--lens-w", `${on.offsetWidth}px`);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    const id = requestAnimationFrame(() => setReady(true));
    return () => { ro.disconnect(); cancelAnimationFrame(id); };
  }, [sel, min, inAdmin]);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setMin(y > last && y > 120);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!more) return;
    const away = (e: PointerEvent) => { if (!moreRef.current?.contains(e.target as Node)) setMore(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMore(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [more]);

  return (
    <div className="tb no-print" data-min={min} onPointerEnter={() => setMin(false)}>
      <div className="tb-bar" ref={bar} data-ready={ready}>
        <span className="tb-lens" aria-hidden />
        <nav className="tb-tabs">
          {main.map((i) => {
            const on = sel === i.href;
            return (
              <Link key={i.href} href={i.href} className="tb-tab" data-sel={on} aria-current={current === i.href ? "page" : undefined}
                onClick={() => setSel(i.href)}>
                <span className="tb-ico"><NavIcon set="phosphor" name={i.icon} active={on} /></span>
                <span className="tb-lbl">{i.short ?? i.label}</span>
                {!!i.badge && <span className="tb-badge">{i.badge}</span>}
              </Link>
            );
          })}
          {admin.length > 0 && (
            <div className="tb-more" ref={moreRef} data-open={more}>
              <button type="button" className="tb-tab" data-sel={inAdmin && !main.some((i) => i.href === sel)} aria-expanded={more} aria-haspopup="menu" onClick={() => setMore((v) => !v)}>
                <span className="tb-ico"><DotsThreeCircleIcon weight={inAdmin ? "fill" : "regular"} /></span>
                <span className="tb-lbl">{moreLabel}</span>
              </button>
              <div className="tb-pop" inert={!more}>
                {admin.map((i) => (
                  <Link key={i.href} href={i.href} aria-current={current === i.href ? "page" : undefined}>
                    <span className="tb-pop-ico" data-k={i.icon}><NavIcon set="phosphor" name={i.icon} active /></span>{i.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>
      <div className="tb-search">{search}</div>
    </div>
  );
}
