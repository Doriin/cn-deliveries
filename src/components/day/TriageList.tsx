"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type TriageItem = { key: string; href: string | null; row: ReactNode; detail: ReactNode };

/**
 * Triaj's inbox: a list on the left, the chosen item in full on the right.
 * J/K or the arrows move, Enter opens, C calls, A assigns, R receives cash, X confirms. Nothing animates but the
 * selection mark, which slides in 140ms: this screen is worked through many times a day.
 */
export function TriageList({ items, empty, hints }: { items: TriageItem[]; empty: ReactNode; hints: { k: string; label: string }[] }) {
  const [at, setAt] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const cur = items[Math.min(at, items.length - 1)];

  useEffect(() => { if (at > items.length - 1) setAt(Math.max(0, items.length - 1)); }, [items.length, at]);

  useLayoutEffect(() => {
    const el = list.current?.querySelector<HTMLElement>(`[data-i="${at}"]`);
    const mark = list.current?.querySelector<HTMLElement>(".tr-mark");
    if (!el || !mark) return;
    mark.style.transform = `translateY(${el.offsetTop}px)`;
    mark.style.height = `${el.offsetHeight}px`;
    el.scrollIntoView({ block: "nearest" });
  }, [at, items.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (document.querySelector("dialog[open]")) return;
      const k = e.key.toLowerCase();
      const click = (sel: string) => pane.current?.querySelector<HTMLElement>(sel)?.click();
      if (k === "j" || e.key === "ArrowDown") { e.preventDefault(); setAt((n) => Math.min(items.length - 1, n + 1)); }
      else if (k === "k" || e.key === "ArrowUp") { e.preventDefault(); setAt((n) => Math.max(0, n - 1)); }
      else if (e.key === "Enter" && cur?.href) { e.preventDefault(); router.push(cur.href); }
      else if (k === "c") click('[data-key="call"]');
      else if (k === "r") click('[data-key="receive"] button');
      else if (k === "x") click('[data-key="confirm"] button');
      else if (k === "a") { e.preventDefault(); pane.current?.querySelector<HTMLSelectElement>('[data-key="assign"] select')?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length, cur, router]);

  if (!items.length) return <div className="tr-split"><div className="tr-zero">{empty}</div></div>;

  return (
    <div className="tr-split">
      <div className="tr-list" ref={list} role="listbox" aria-activedescendant={cur ? `tr-${cur.key}` : undefined}>
        <span className="tr-mark" aria-hidden />
        {items.map((it, i) => (
          <button key={it.key} id={`tr-${it.key}`} type="button" role="option" aria-selected={i === at} data-i={i} className="tr-row"
            onClick={() => setAt(i)} onDoubleClick={() => it.href && router.push(it.href)}>
            {it.row}
          </button>
        ))}
      </div>
      <div className="tr-pane" ref={pane}>
        <div key={cur?.key} className="tr-detail">{cur?.detail}</div>
        <footer className="tr-hints">{hints.map((h) => <span key={h.k}><kbd>{h.k}</kbd>{h.label}</span>)}</footer>
      </div>
    </div>
  );
}
