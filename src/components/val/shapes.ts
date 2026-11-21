/**
 * Material 3 Expressive shapes as CSS clip-paths. Every shape has the same number of points, so the browser
 * can morph one into another with a plain clip-path transition.
 */
const N = 72;
const poly = (r: (a: number) => number) =>
  `polygon(${Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2;
    const k = r(a);
    return `${(50 + 50 * k * Math.sin(a)).toFixed(2)}% ${(50 - 50 * k * Math.cos(a)).toFixed(2)}%`;
  }).join(",")})`;
const scallop = (n: number, depth: number) => poly((a) => 1 - depth * (1 - Math.cos(n * a)) / 2);

export const SHAPE = {
  circle: poly(() => 1),
  cookie: scallop(9, 0.1),
  clover: scallop(4, 0.32),
  sunny: scallop(8, 0.16),
  burst: scallop(12, 0.12),
  /** a rounded square drawn with the same 72 points */
  square: poly((a) => {
    const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    const p = 4;
    return 1 / Math.pow(Math.pow(c, p) + Math.pow(s, p), 1 / p);
  }),
} as const;

export type ShapeName = keyof typeof SHAPE;

/** A circle with a wave on its edge, as an SVG path, for the wavy circular progress indicator. */
export function wavyCircle(cx: number, cy: number, r: number, amp: number, waves: number, steps = 240) {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = r + amp * Math.sin(waves * a);
    const x = cx + rr * Math.sin(a), y = cy - rr * Math.cos(a);
    d += `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d + "Z";
}

/** A horizontal sine wave from x0 to x1 around y, for the wavy linear progress indicator. */
export function wave(x0: number, x1: number, y: number, amp: number, period: number) {
  let d = `M${x0} ${y}`;
  for (let x = x0; x <= x1; x += period / 8) d += `L${x.toFixed(2)} ${(y + amp * Math.sin(((x - x0) / period) * Math.PI * 2)).toFixed(2)}`;
  return d;
}
