"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";

const split = (v: string) => v.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
const same = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;

/** Localities as removable chips. Saved through the same `localities` field the action already reads (one per line). */
export function LocalityChips({ initial, placeholder, removeLabel }: { initial: string[]; placeholder: string; removeLabel: string }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const fresh = split(raw);
    if (fresh.length === 0) return;
    setItems((cur) => {
      const next = [...cur];
      for (const n of fresh) if (!next.some((x) => same(x, n))) next.push(n);
      return next.sort((a, b) => a.localeCompare(b));
    });
    setDraft("");
  };

  return (
    <div
      className="flex min-h-10 flex-wrap gap-1.5 rounded-[10px] border border-slate-300 bg-white p-1.5 shadow-[0_1px_2px_rgb(12_26_43/0.04)] transition-[border-color,box-shadow] duration-150 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15"
      onClick={(e) => {
        if (e.target === e.currentTarget) input.current?.focus();
      }}
    >
      <input type="hidden" name="localities" value={[...items, ...split(draft)].join("\n")} />
      {items.map((name) => (
        <span key={name} className="inline-flex h-7 items-center gap-0.5 rounded-full bg-slate-100 pl-2.5 pr-1 text-[13px] font-medium text-slate-700">
          {name}
          <button
            type="button"
            aria-label={removeLabel.replace("{name}", name)}
            onClick={() => setItems((cur) => cur.filter((x) => x !== name))}
            className="grid h-5 w-5 place-items-center rounded-full text-slate-400 transition-colors duration-150 hover:bg-slate-300 hover:text-slate-800"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        ref={input}
        value={draft}
        onChange={(e) => (/[\n,;]/.test(e.target.value) ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // Enter adds the locality instead of saving the whole zone.
            e.preventDefault();
            add(draft);
          }
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (/[\n,;]/.test(text)) {
            e.preventDefault();
            add(text);
          }
        }}
        onBlur={() => add(draft)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        enterKeyHint="done"
        className="h-7 min-w-56 flex-1 bg-transparent px-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}
