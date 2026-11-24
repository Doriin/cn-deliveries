import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/**
 * Small SVG/HTML charts for the homepage and the courier day. Server-rendered; colours come from the active
 * design's tokens (see home.css), hover labels from `data-tip` read by <Tips>.
 */

const css = (v: Record<string, string | number>) => v as CSSProperties;

/** A round upper bound for an axis: 1, 2, 2.5, 5 × 10^k. */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

export type Series = { name: string; values: number[]; color: string };

/** Columns per day or hour; grouped or stacked, with an optional line on the same scale and a "now" marker. */
export function Columns({ bars, stacked = false, line, nowAt, height = 180, xLabel, fmt, tipFmt = fmt, tipTitle, label }: {
  bars: Series[];
  stacked?: boolean;
  line?: Series & { dashed?: boolean };
  /** Fractional index of "now". */
  nowAt?: number | null;
  height?: number;
  xLabel: (i: number) => string | null;
  /** Axis figures. */
  fmt: (v: number) => string;
  /** Hover figures; the axis format when not given. */
  tipFmt?: (v: number) => string;
  tipTitle: (i: number) => string;
  /** Summary for screen readers. */
  label: string;
}) {
  const n = bars[0]?.values.length ?? 0;
  const tops = Array.from({ length: n }, (_, i) =>
    Math.max(stacked ? bars.reduce((a, s) => a + s.values[i], 0) : Math.max(0, ...bars.map((s) => s.values[i])), line?.values[i] ?? 0));
  const max = niceMax(Math.max(0, ...tops));
  const y = (v: number) => 100 - (v / max) * 100;
  const slot = 10;
  const groupW = stacked || bars.length === 1 ? 6.4 : 7.6;
  const barW = stacked ? groupW : groupW / bars.length;
  const ticks = [0, 0.5, 1].map((f) => f * max);

  return (
    <div className="hm-cols" style={css({ "--h": `${height}px` })}>
      <div className="hm-yax" aria-hidden>{[...ticks].reverse().map((t) => <span key={t}>{fmt(t)}</span>)}</div>
      <div className="hm-plot">
        <svg viewBox={`0 0 ${n * slot} 100`} preserveAspectRatio="none" role="img" aria-label={label}>
          {ticks.slice(1).map((t) => <line key={t} className="hm-gl" x1={0} x2={n * slot} y1={y(t)} y2={y(t)} vectorEffect="non-scaling-stroke" />)}
          {Array.from({ length: n }, (_, i) => {
            let acc = 0;
            return bars.map((s, k) => {
              const v = s.values[i];
              if (!v) return null;
              const x = i * slot + (slot - groupW) / 2 + (stacked ? 0 : k * barW);
              const top = stacked ? acc + v : v;
              const bottom = stacked ? acc : 0;
              acc += stacked ? v : 0;
              return <rect key={`${i}-${k}`} x={x} width={barW - (stacked ? 0 : 0.6)} y={y(top)} height={Math.max(0.6, y(bottom) - y(top) - (stacked && k ? 0.8 : 0))} style={{ fill: s.color }} />;
            });
          })}
          {line && (
            <polyline className="hm-line" points={line.values.map((v, i) => `${i * slot + slot / 2},${y(v)}`).join(" ")} vectorEffect="non-scaling-stroke"
              style={{ stroke: line.color, strokeDasharray: line.dashed ? "4 4" : undefined }} />
          )}
          {nowAt !== null && nowAt !== undefined && nowAt >= 0 && nowAt <= n && (
            <line className="hm-now" x1={nowAt * slot} x2={nowAt * slot} y1={0} y2={100} vectorEffect="non-scaling-stroke" />
          )}
          {Array.from({ length: n }, (_, i) => (
            <rect key={`h${i}`} className="hm-hit" x={i * slot} width={slot} y={0} height={100}
              data-tip={[tipTitle(i), ...bars.map((s) => `${s.name}: ${tipFmt(s.values[i])}`), ...(line ? [`${line.name}: ${tipFmt(line.values[i])}`] : [])].join("\n")} />
          ))}
        </svg>
        <div className="hm-xax" aria-hidden>
          {Array.from({ length: n }, (_, i) => {
            const l = xLabel(i);
            return l ? <span key={i} style={{ left: `${((i + 0.5) / n) * 100}%` }}>{l}</span> : null;
          })}
        </div>
      </div>
    </div>
  );
}

/** A tiny trend line; gaps where a day has no value. */
export function Spark({ values, color = "var(--hm-a)" }: { values: (number | null)[]; color?: string }) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return <svg className="hm-spark" aria-hidden />;
  const lo = Math.min(...nums), hi = Math.max(...nums);
  const span = hi - lo || 1;
  const x = (i: number) => (values.length === 1 ? 50 : (i / (values.length - 1)) * 100);
  const y = (v: number) => 27 - ((v - lo) / span) * 24;
  const runs: string[] = [];
  let cur: string[] = [];
  values.forEach((v, i) => {
    if (v === null) { if (cur.length) runs.push(cur.join(" ")); cur = []; return; }
    cur.push(`${x(i).toFixed(2)},${y(v).toFixed(2)}`);
  });
  if (cur.length) runs.push(cur.join(" "));
  return (
    <svg className="hm-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
      {runs.map((r, i) => <polyline key={i} points={r} vectorEffect="non-scaling-stroke" style={{ stroke: color }} />)}
    </svg>
  );
}

export type Part = { key: string; label: string; value: number; color: string; href?: string; tip?: string };

/** One bar split into parts; each part (and its legend entry) can link somewhere. */
export function SegBar({ parts, legend = true, thick = false }: { parts: Part[]; legend?: boolean; thick?: boolean }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const seg = (p: Part, children?: ReactNode) => {
    const props = { className: "hm-seg", style: css({ flexGrow: p.value, "--c": p.color }), "data-tip": p.tip ?? `${p.label}\n${p.value}` };
    return p.href ? <Link key={p.key} href={p.href} {...props}>{children}</Link> : <span key={p.key} {...props}>{children}</span>;
  };
  return (
    <div className="hm-segbar">
      <div className={`hm-segs${thick ? " thick" : ""}`} role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {total === 0 ? <span className="hm-seg empty" /> : parts.filter((p) => p.value > 0).map((p) => seg(p))}
      </div>
      {legend && (
        <ul className="hm-legend">
          {parts.map((p) => {
            const inner = <><i style={{ background: p.color }} />{p.label}<b>{p.value}</b></>;
            return <li key={p.key}>{p.href ? <Link href={p.href}>{inner}</Link> : inner}</li>;
          })}
        </ul>
      )}
    </div>
  );
}

export type BarRow = { key: string; label: ReactNode; value: number; display: ReactNode; href?: string; tip?: string };

/** Ranked horizontal bars with the label on the left and the figure on the right. */
export function BarList({ rows, color = "var(--hm-a)", empty }: { rows: BarRow[]; color?: string; empty: ReactNode }) {
  if (!rows.length) return <p className="hm-empty">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="hm-bars">
      {rows.map((r) => {
        const body = (
          <>
            <span className="lbl">{r.label}</span>
            <span className="track"><span style={{ width: `${(r.value / max) * 100}%`, background: color }} /></span>
            <span className="val">{r.display}</span>
          </>
        );
        return <li key={r.key} data-tip={r.tip}>{r.href ? <Link href={r.href}>{body}</Link> : body}</li>;
      })}
    </ul>
  );
}

/** Weekday × hour grid, shaded by count. */
export function Heatmap({ grid, rows, from, to, tip, label }: { grid: number[][]; rows: string[]; from: number; to: number; tip: (row: number, hour: number, v: number) => string; label: string }) {
  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const max = Math.max(1, ...grid.flatMap((r) => hours.map((h) => r[h])));
  return (
    <div className="hm-heat" role="img" aria-label={label} style={css({ "--cols": hours.length })}>
      {grid.map((r, ri) => (
        <div key={ri} className="row">
          <span className="lbl">{rows[ri]}</span>
          {hours.map((h) => {
            const v = r[h];
            return <span key={h} className="cell" data-tip={tip(ri, h, v)} style={css({ "--p": v ? `${Math.round(14 + (86 * v) / max)}%` : "0%" })} />;
          })}
        </div>
      ))}
      <div className="row hours" aria-hidden>
        <span className="lbl" />
        {hours.map((h) => <span key={h}>{h % 2 === 0 ? String(h).padStart(2, "0") : ""}</span>)}
      </div>
    </div>
  );
}

export type StripMark = { key: string; pos: number; tone: string; tip: string };

/** A day on one line (08–20): a dot per step, the part already behind shaded, "now" marked. */
export function DayStrip({ marks, nowPos, from, to, label }: { marks: StripMark[]; nowPos: number | null; from: number; to: number; label: string }) {
  const hours = Array.from({ length: (to - from) / 2 + 1 }, (_, i) => from + i * 2);
  const end = nowPos ?? Math.max(0, ...marks.map((m) => m.pos));
  return (
    <div className="hm-strip" role="img" aria-label={label}>
      <div className="rail"><span className="done" style={{ width: `${end}%` }} /></div>
      {marks.map((m) => <span key={m.key} className="dot" data-tone={m.tone} data-tip={m.tip} style={{ left: `${m.pos}%` }} />)}
      {nowPos !== null && <span className="now" style={{ left: `${nowPos}%` }} />}
      <div className="hours" aria-hidden>{hours.map((h) => <span key={h} style={{ left: `${((h - from) / (to - from)) * 100}%` }}>{String(h).padStart(2, "0")}</span>)}</div>
    </div>
  );
}
