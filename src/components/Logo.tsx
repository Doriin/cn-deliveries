/**
 * The company logo from cn-deliveries.com. The full logo is the website's own file (public/brand/cn-deliveries-logo.webp);
 * the two boxes are redrawn here as a vector, fitted to that file (95% pixel overlap), for small and sharp spots:
 * menus, favicon, home-screen icons, labels.
 */

/** The logo blue, as in the website's logo file. */
export const BRAND_BLUE = "#0c77eb";
/** Fixed colours where CSS variables cannot reach: the generated home-screen icons. */
export const MARK = { ink: BRAND_BLUE, tile: "#ffffff" };

const STROKE = 6.1;
/** Below this size the gaps and dots would close up, so the edges are drawn whole and a little heavier. */
const SMALL = 48;
const PATHS = [
  "M73.9 104.2V80.4L128.9 48.4L184.2 80.4V173.6L239.5 205.6L294.5 173.6V108.9L239.5 76.9L184.2 108.9",
  "M73.9 126.4V145.1L128.9 177.1L184.2 145.1",
  "M73.9 80.4L128.9 112.4L184.2 80.4M128.9 112.4V177.1",
  "M184.2 108.9L239.5 140.9V205.6M239.5 140.9L257 130.7M275.9 119.7L294.5 108.9",
];
const PATHS_SMALL = [
  "M73.9 145.1V80.4L128.9 48.4L184.2 80.4V173.6L239.5 205.6L294.5 173.6V108.9L239.5 76.9L184.2 108.9",
  "M73.9 145.1L128.9 177.1L184.2 145.1",
  "M73.9 80.4L128.9 112.4L184.2 80.4M128.9 112.4V177.1",
  "M184.2 108.9L239.5 140.9V205.6M239.5 140.9L294.5 108.9",
];
const DOTS = [
  [73.9, 115],
  [266.2, 125.4],
];
/** Square frames around the boxes: tight, or with the safe margin phones need to cut their own icon shape. */
const FRAME = { tight: { x: 66.2, y: 9, s: 236 }, bleed: { x: 22.2, y: -35, s: 324 } };

/**
 * The two boxes. On screen they take `--logo-mark` (the logo blue, white on a blue menu bar);
 * `fixed` paints them on a white tile for the icon generator, `color` forces a colour (black on labels).
 */
export function LogoMark({ size = 32, bleed = false, fixed = false, color, className }: { size?: number; bleed?: boolean; fixed?: boolean; color?: string; className?: string }) {
  const f = bleed ? FRAME.bleed : FRAME.tight;
  const ink = color ?? (fixed ? MARK.ink : `var(--logo-mark, ${BRAND_BLUE})`);
  const small = size < SMALL;
  // keep the line at least ~1.6px on screen
  const stroke = Math.max(STROKE, (1.6 * f.s) / size);
  return (
    <svg width={size} height={size} viewBox={`${f.x} ${f.y} ${f.s} ${f.s}`} fill="none" aria-hidden="true" className={className}>
      {fixed && <rect x={f.x} y={f.y} width={f.s} height={f.s} fill={MARK.tile} />}
      <g stroke={ink} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        {(small ? PATHS_SMALL : PATHS).map((d) => <path key={d} d={d} />)}
      </g>
      {!small && (
        <g fill={ink}>
          {DOTS.map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r={stroke / 2} />)}
        </g>
      )}
    </svg>
  );
}

/** Mark and "CN DELIVERIES" side by side, for menus and headers. */
export function Logo({ tag, size = 30 }: { light?: boolean; tag?: string | null; size?: number }) {
  return (
    <div className="sh-brand">
      <LogoMark size={size} />
      <span className="brand-word">
        CN DELIVERIES
        {tag && <small className="block text-[11px] font-medium opacity-60">{tag}</small>}
      </span>
    </div>
  );
}

/** The website's full logo (boxes, name and "Livrăm cu pasiune, livrăm încredere!"), for light pages. */
export function BrandLogo({ width = 180, className }: { width?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/cn-deliveries-logo.webp" alt="CN Deliveries" width={width} height={Math.round((width * 254) / 358)} className={className} />
  );
}
