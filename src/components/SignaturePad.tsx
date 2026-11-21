"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

/** Finger/mouse signature. Calls onChange with a PNG data URL (or null when cleared). */
export function SignaturePad({ onChange, clearLabel, hint }: { onChange: (dataUrl: string | null) => void; clearLabel: string; hint?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    const c = ref.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0c1a2b";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current) onChange(ref.current!.toDataURL("image/png"));
  };

  return (
    <div className="cr-sign">
      <canvas
        ref={ref}
        className="cr-sign-canvas"
        onPointerDown={(e) => {
          // One finger signs; a second touch must not jump the stroke.
          if (drawing.current) return;
          drawing.current = true;
          try {
            ref.current!.setPointerCapture(e.pointerId); // keeps the stroke going if the finger leaves the box
          } catch {}
          const ctx = ref.current!.getContext("2d")!;
          const p = pos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = ref.current!.getContext("2d")!;
          const p = pos(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          if (!dirty.current) {
            dirty.current = true;
            setSigned(true);
          }
        }}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <div className="cr-sign-line" aria-hidden />
      {hint && (
        <div className="cr-sign-hint" data-off={signed || undefined} aria-hidden>
          {hint}
        </div>
      )}
      <button
        type="button"
        className="cr-chip cr-sign-clear cr-tap"
        data-off={!signed || undefined}
        tabIndex={signed ? 0 : -1}
        onClick={() => {
          const c = ref.current!;
          const ctx = c.getContext("2d")!;
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, c.width, c.height);
          ctx.restore();
          dirty.current = false;
          drawing.current = false;
          setSigned(false);
          onChange(null);
        }}
      >
        <Eraser aria-hidden />{clearLabel}
      </button>
    </div>
  );
}
