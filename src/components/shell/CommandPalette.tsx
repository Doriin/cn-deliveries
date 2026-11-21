"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RiArrowRightLine, RiCornerDownLeftLine, RiSearchLine } from "@remixicon/react";
import { NavIcon } from "@/components/navIconSets";
import type { NavItem } from "@/components/navIcons";
import type { IconSet } from "@/lib/design";

type Labels = { trigger: string; placeholder: string; go: string; actions: string; find: string; empty: string; close: string };
type Entry = { key: string; label: string; href: string; icon: NavItem["icon"]; group: "go" | "do" | "find" };

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * The command line (Triaj): ⌘K, Ctrl+K or "/" from anywhere. Type a page, an action, or a tracking number, name or phone.
 * It opens and moves without animation: it is reached for many times a day, from the keyboard.
 */
export function CommandPalette({ pages, actions, labels, iconSet = "remix" }: { pages: NavItem[]; actions: NavItem[]; labels: Labels; iconSet?: IconSet }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); setQ(""); setAt(0); input.current?.focus(); }
    if (!open && d.open) d.close();
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const f = fold(q.trim());
    const all: Entry[] = [
      ...actions.map((a) => ({ key: "do" + a.href, label: a.label, href: a.href, icon: a.icon, group: "do" as const })),
      ...pages.map((p) => ({ key: "go" + p.href, label: p.label, href: p.href, icon: p.icon, group: "go" as const })),
    ];
    const hits = f ? all.filter((e) => fold(e.label).includes(f)) : all;
    return q.trim() ? [...hits, { key: "find", label: q.trim(), href: `/find?q=${encodeURIComponent(q.trim())}`, icon: "shipments", group: "find" }] : hits;
  }, [q, pages, actions]);

  const run = (e: Entry | undefined) => {
    if (!e) return;
    setOpen(false);
    router.push(e.href);
  };

  const groups: { id: Entry["group"]; title: string }[] = [
    { id: "do", title: labels.actions },
    { id: "go", title: labels.go },
    { id: "find", title: labels.find },
  ];
  const ordered = groups.flatMap((g) => entries.filter((e) => e.group === g.id));

  return (
    <>
      <button type="button" className="cp-trigger" onClick={() => setOpen(true)}>
        <RiSearchLine aria-hidden />
        <span>{labels.trigger}</span>
        <kbd>⌘K</kbd>
      </button>
      <dialog ref={dialog} className="cp" aria-label={labels.trigger} onClose={() => setOpen(false)} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
        <div className="cp-in">
          <label className="cp-q">
            <RiSearchLine aria-hidden />
            <input ref={input} value={q} placeholder={labels.placeholder} aria-label={labels.placeholder} autoComplete="off" spellCheck={false}
              onChange={(e) => { setQ(e.target.value); setAt(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setAt((n) => Math.min(ordered.length - 1, n + 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setAt((n) => Math.max(0, n - 1)); }
                if (e.key === "Enter") { e.preventDefault(); run(ordered[at]); }
              }} />
            <kbd>esc</kbd>
          </label>
          <div className="cp-list" role="listbox" aria-label={labels.trigger}>
            {ordered.length === 0 && <p className="cp-empty">{labels.empty}</p>}
            {groups.map((g) => {
              const list = ordered.filter((e) => e.group === g.id);
              if (!list.length) return null;
              return (
                <div key={g.id}>
                  <h3>{g.title}</h3>
                  {list.map((e) => {
                    const n = ordered.indexOf(e);
                    return (
                      <button key={e.key} type="button" role="option" aria-selected={n === at} data-at={n === at || undefined}
                        onMouseMove={() => setAt(n)} onClick={() => run(e)}>
                        <span className="cp-ico">{e.group === "find" ? <RiSearchLine /> : <NavIcon set={iconSet} name={e.icon} />}</span>
                        <span className="cp-lbl">{e.group === "find" ? <>“{e.label}”</> : e.label}</span>
                        {n === at ? <RiCornerDownLeftLine className="cp-enter" /> : <RiArrowRightLine className="cp-arr" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </dialog>
    </>
  );
}
