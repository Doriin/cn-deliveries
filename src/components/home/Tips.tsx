"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Hover labels for the charts inside it. Any element with `data-tip` shows its text (lines split by "\n",
 * the first line bold) next to the pointer. One listener for the whole block, so charts stay server-rendered.
 */
export function Tips({ children, className }: { children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ lines: string[]; x: number; y: number; flip: boolean } | null>(null);

  function move(e: React.PointerEvent) {
    const el = (e.target as Element).closest<HTMLElement>("[data-tip]");
    const root = box.current;
    if (!el || !root || !root.contains(el)) return setTip(null);
    const r = root.getBoundingClientRect();
    const x = e.clientX - r.left;
    setTip({ lines: el.dataset.tip!.split("\n"), x, y: e.clientY - r.top, flip: x > r.width - 180 });
  }

  return (
    <div ref={box} className={`hm-tips ${className ?? ""}`} onPointerMove={move} onPointerLeave={() => setTip(null)}>
      {children}
      {tip && (
        <div className="hm-tip" role="status" style={{ left: tip.x, top: tip.y, translate: tip.flip ? "calc(-100% - 14px) -50%" : "14px -50%" }}>
          {tip.lines.map((l, i) => (i ? <div key={i}>{l}</div> : <b key={i}>{l}</b>))}
        </div>
      )}
    </div>
  );
}
