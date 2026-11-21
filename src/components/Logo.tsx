/** Fixed colours of the mark, used where a design cannot reach: the generated home-screen icons. */
export const MARK = { tile: "#0e3b8e", top: "#ffffff", left: "#d3e3fb", right: "#93b8f3", tape: "#ffb020" };

/**
 * The mark: a taped parcel on a tile. On screen it takes its colours from the chosen design;
 * `fixed` uses the constants above (the icon generator cannot read CSS variables), and `bleed`
 * drops the rounded corners so the phone can cut its own icon shape.
 */
export function LogoMark({ size = 32, bleed = false, fixed = false }: { size?: number; bleed?: boolean; fixed?: boolean }) {
  const c = fixed
    ? MARK
    : { tile: "var(--logo-tile, #0e3b8e)", top: "var(--logo-top, #fff)", left: "var(--logo-left, #d3e3fb)", right: "var(--logo-right, #93b8f3)", tape: "var(--logo-tape, #ffb020)" };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx={bleed ? 0 : 7} fill={c.tile} />
      <g transform={bleed ? "translate(16 16) scale(0.9) translate(-16 -16)" : undefined} stroke={c.tile} strokeWidth="1.3" strokeLinejoin="round">
        <path d="M16 5 25.5 10.5 16 16 6.5 10.5Z" fill={c.top} />
        <path d="M6.5 10.5 16 16V27L6.5 21.5Z" fill={c.left} />
        <path d="M25.5 10.5V21.5L16 27V16Z" fill={c.right} />
        <path d="M19.23 6.87 22.27 8.63 12.77 14.13V19.4L9.73 17.64V12.37Z" fill={c.tape} strokeWidth="0" />
      </g>
    </svg>
  );
}

export function Logo({ tag, size = 30 }: { light?: boolean; tag?: string | null; size?: number }) {
  return (
    <div className="sh-brand">
      <LogoMark size={size} />
      <span>
        CN <span>Deliveries</span>
        {tag && <small className="block text-[11px] font-medium opacity-60">{tag}</small>}
      </span>
    </div>
  );
}
