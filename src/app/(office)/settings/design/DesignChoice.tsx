"use client";

import { startTransition, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check } from "lucide-react";
import { saveDesign, setDesign } from "@/app/actions/design";

type Props = {
  id: string;
  name: string;
  about: string;
  traits?: string[];
  /** The office frame class of this design, to know when the new design has arrived. */
  shell: string;
  on: boolean;
  /** What the preview frame shows, drawn at `frame` px wide and scaled down to fit. */
  src: string;
  frame: { w: number; h: number };
  index?: number;
  big?: boolean;
  labels: { use: string; current: string; live?: string; open?: string; switching: string };
};

/**
 * One design to choose from: a live preview and a button. Choosing it plays a View Transition: the new design
 * spreads out in a circle from the button, over the old one, while the server stores the choice.
 */
export function DesignChoice({ id, name, about, traits, shell, on, src, frame, index, big, labels }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  const [busy, start] = useTransition();
  const [load, setLoad] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / frame.w);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLoad(true), { rootMargin: "200px" });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, [frame.w]);

  const choose = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) {
      const fd = new FormData();
      fd.set("design", id);
      start(() => setDesign(fd));
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const root = document.documentElement;
    root.style.setProperty("--vt-x", `${x}px`);
    root.style.setProperty("--vt-y", `${y}px`);
    root.style.setProperty("--vt-r", `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
    root.dataset.vt = "design";
    // the new page is drawn inside the transition, so wait for it, but never long enough for the browser to give up
    const arrived = () => new Promise<void>((done) => {
      const t0 = performance.now();
      const look = () => (document.querySelector(`.sh-${shell}`) || performance.now() - t0 > 2500 ? done() : window.setTimeout(look, 30));
      look();
    });
    await saveDesign(id);
    const vt = document.startViewTransition(async () => {
      root.dataset.design = id;
      startTransition(() => router.refresh());
      await arrived();
    });
    vt.finished.finally(() => delete root.dataset.vt);
  };

  return (
    <article className="dz-card" data-on={on} data-big={big || undefined} style={{ "--i": index ?? 0 } as React.CSSProperties}>
      <div ref={box} className="dz-shot" aria-hidden>
        {load && <iframe src={src} loading="lazy" tabIndex={-1} title="" style={{ width: frame.w, height: frame.h, transform: `scale(${scale})` }} />}
        {labels.live && <span className="dz-live"><i />{labels.live}</span>}
      </div>
      <div className="dz-cap">
        <div className="dz-txt">
          <h3>{name}</h3>
          <p>{about}</p>
          {traits && <ul className="dz-traits">{traits.map((t) => <li key={t}>{t}</li>)}</ul>}
        </div>
        <div className="dz-act">
          {on ? (
            <span className="dz-now"><Check aria-hidden />{labels.current}</span>
          ) : (
            <button type="button" className="ui-btn ui-btn-primary dz-use" onClick={choose} disabled={busy}>{busy ? labels.switching : labels.use}</button>
          )}
          {labels.open && <a className="dz-open" href={src} target="_blank" rel="noreferrer">{labels.open}<ArrowUpRight aria-hidden /></a>}
        </div>
      </div>
    </article>
  );
}
