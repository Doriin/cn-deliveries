"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconSet } from "@/lib/design";
import { type NavItem } from "./navIcons";
import { NavIcon } from "./navIconSets";

export type { NavItem };

/** The most specific menu entry matching the address (so /shipments/new doesn't also light up /shipments). */
export function useCurrentHref(hrefs: string[]) {
  const path = usePathname();
  const matches = (h: string) => (h === "/" ? path === "/" : path === h || path.startsWith(h + "/"));
  return hrefs.filter(matches).sort((a, b) => b.length - a.length)[0];
}

/** Menu links. The markup is the same in every design; the chosen design's menu styles place and draw them. */
export function NavLinks({ items, all, short, gaps, icons = "lucide", numbered }: {
  items: NavItem[];
  /** every link in the app, to decide which one is current */
  all?: NavItem[];
  short?: boolean;
  gaps?: boolean;
  icons?: IconSet;
  /** Flux and Folio print an index number before each entry. */
  numbered?: boolean;
}) {
  const best = useCurrentHref((all ?? items).map((i) => i.href));
  return (
    <nav className="sh-nav">
      {items.map((i, n) => {
        const on = best === i.href;
        return (
          <span key={i.href} className="contents">
            {gaps && n > 0 && i.group !== items[n - 1].group && <span className="sh-gap" aria-hidden />}
            <Link href={i.href} aria-current={on ? "page" : undefined} className="sh-link" title={i.label}>
              {numbered && <span className="sh-no" aria-hidden>{String(n + 1).padStart(2, "0")}</span>}
              <span className="sh-ico" aria-hidden><NavIcon set={icons} name={i.icon} active={on} /></span>
              <span className="sh-lbl">{short ? i.short ?? i.label : i.label}</span>
              {!!i.badge && <span className="sh-badge">{i.badge}</span>}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
