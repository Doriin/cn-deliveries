"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatMDL } from "@/lib/money";
import type { Pulse } from "@/lib/pulse";

type Labels = { title: string; problems: string; allGood: string; at: string; idle: string; open: string; held: string; of: string };

/**
 * Insula's Dynamic Island: a black capsule at the top of every office page with the day's live state.
 * Compact it cycles through the couriers like a Live Activity; hovered, focused or pressed it grows into a panel.
 */
export function Island({ pulse, labels }: { pulse: Pulse; labels: Labels }) {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hover = useRef<number | undefined>(undefined);
  const active = pulse.couriers.filter((c) => c.total > c.done);
  const shown = active.length ? active[tick % active.length] : null;

  useEffect(() => {
    if (active.length < 2 || open) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 4200);
    return () => window.clearInterval(id);
  }, [active.length, open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const share = pulse.total ? pulse.done / pulse.total : 0;
  const enter = () => { window.clearTimeout(hover.current); hover.current = window.setTimeout(() => setOpen(true), 140); };
  const leave = () => { window.clearTimeout(hover.current); hover.current = window.setTimeout(() => setOpen(false), 260); };

  return (
    <div className="isl" ref={ref} data-open={open} onPointerEnter={(e) => e.pointerType === "mouse" && enter()} onPointerLeave={(e) => e.pointerType === "mouse" && leave()}>
      <button type="button" className="isl-pill" aria-expanded={open} aria-label={labels.title} onClick={() => setOpen((v) => !v)}>
        <span className="isl-lead">
          {pulse.bad > 0 ? (
            <><i className="isl-dot" data-tone="bad" /><span className="isl-swap" key="bad">{labels.problems}</span></>
          ) : shown ? (
            <><i className="isl-dot" data-tone="live" /><span className="isl-swap" key={shown.id}><b>{shown.name.split(" ")[0]}</b> {shown.now ? `· ${shown.now}` : `· ${labels.idle}`}</span></>
          ) : (
            <><i className="isl-dot" data-tone="ok" /><span className="isl-swap">{labels.allGood}</span></>
          )}
        </span>
        <span className="isl-trail">
          <svg viewBox="0 0 20 20" className="isl-ring" aria-hidden>
            <circle cx="10" cy="10" r="8" pathLength="1" />
            <circle cx="10" cy="10" r="8" pathLength="1" style={{ strokeDashoffset: 1 - share }} />
          </svg>
          <span>{pulse.done}/{pulse.total}</span>
        </span>
      </button>

      <div className="isl-more" inert={!open}>
        <div>
          <div className="isl-head">
            <span>{labels.title}</span>
            <b>{labels.of}</b>
          </div>
          <ul className="isl-list">
            {pulse.couriers.map((c) => (
              <li key={c.id}>
                <span className="isl-av">{c.initials}</span>
                <span className="isl-who">
                  <b>{c.name}</b>
                  <small>{c.now ? `${labels.at} ${c.now}` : labels.idle}</small>
                  <span className="isl-bar"><i style={{ transform: `scaleX(${c.total ? c.done / c.total : 0})` }} /></span>
                </span>
                <span className="isl-num"><b>{c.done}/{c.total}</b>{c.cash > 0 && <small>{formatMDL(c.cash)}</small>}</span>
              </li>
            ))}
          </ul>
          <div className="isl-foot">
            {pulse.cashHeld > 0 && <span>{labels.held} <b>{formatMDL(pulse.cashHeld)}</b></span>}
            <Link href={pulse.bad > 0 ? "/?g=bad" : "/"} className="isl-go" onClick={() => setOpen(false)}>{labels.open}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
