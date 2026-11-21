"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, ScanLine, XCircle } from "lucide-react";
import type { ShipmentStatus } from "@prisma/client";
import { scanApply, type ScanResult } from "@/app/actions/scan";
import { STATUS_DOT } from "@/lib/status";
import { Spinner, Tracking, cx } from "@/components/ui";

const TARGETS = ["", "PICKED_UP", "AT_WAREHOUSE", "OUT_FOR_DELIVERY", "RETURNING", "RETURNED"] as const;

/** Short beep so the operator knows the result without looking at the screen. */
function beep(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 880 : 220;
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (ok ? 0.08 : 0.3));
  } catch {}
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.97]",
        active ? "bg-ink-950 text-white" : "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 hover:ring-slate-400",
      )}
    >
      {children}
    </button>
  );
}

export function WarehouseScanner({ couriers }: { couriers: { id: string; name: string }[] }) {
  const t = useTranslations("scan");
  const ts = useTranslations("status");
  const te = useTranslations("errors");
  const [to, setTo] = useState<string>("AT_WAREHOUSE");
  const [courierId, setCourierId] = useState("");
  const [log, setLog] = useState<ScanResult[]>([]);
  const [seq, setSeq] = useState(0);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const okCount = log.filter((r) => r.ok).length;
  const failed = log.length - okCount;
  const last = log[0];
  // Choosing a setting must never steal the cursor from the scan field: the next scan types into it.
  const choose = (fn: () => void) => {
    fn();
    input.current?.focus();
  };
  const outcome = (r: ScanResult) => (r.error ? te(r.error) : r.skipped ? t("already") : t("done"));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-900/5">
        <div>
          <div className="mb-2 text-[13px] font-medium text-slate-700">{t("setStatus")}</div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("setStatus")}>
            {TARGETS.map((s) => (
              <Choice key={s} active={to === s} onClick={() => choose(() => setTo(s))}>
                {s && <span className={cx("h-2 w-2 rounded-full", STATUS_DOT[s as ShipmentStatus])} aria-hidden />}
                {s ? ts(s) : t("noStatus")}
              </Choice>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[13px] font-medium text-slate-700">{t("assignCourier")}</div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("assignCourier")}>
            <Choice active={courierId === ""} onClick={() => choose(() => setCourierId(""))}>{t("keepCourier")}</Choice>
            {couriers.map((c) => (
              <Choice key={c.id} active={courierId === c.id} onClick={() => choose(() => setCourierId(c.id))}>{c.name}</Choice>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">{t("hint")}</p>
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const code = input.current!.value.trim();
          if (!code) return;
          input.current!.value = "";
          start(async () => {
            const r = await scanApply({ code, to, courierId });
            beep(r.ok);
            setLog((l) => [r, ...l].slice(0, 200));
            setSeq((n) => n + 1);
            input.current?.focus();
          });
        }}
      >
        <label className="relative block">
          <span className="sr-only">{t("scanHere")}</span>
          <ScanLine className="pointer-events-none absolute left-5 top-1/2 h-7 w-7 -translate-y-1/2 text-brand-600" aria-hidden />
          <input
            ref={input}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="done"
            placeholder={t("scanHere")}
            className="h-[72px] w-full rounded-2xl border-2 border-brand-500 bg-white pl-16 pr-14 font-mono text-2xl font-semibold uppercase tracking-tight text-ink-950 shadow-raised transition-shadow duration-150 placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/20"
          />
          {pending && <Spinner className="absolute right-5 top-1/2 !h-6 !w-6 -translate-y-1/2 text-brand-600" />}
        </label>
      </form>

      <div aria-live="polite">
        {last ? (
          <div
            key={seq}
            className={cx(
              "flex animate-pop items-center gap-4 rounded-2xl p-5 ring-1 ring-inset",
              last.ok ? "bg-emerald-50 ring-emerald-600/20" : "bg-red-50 ring-red-600/20",
            )}
          >
            {last.ok ? <CheckCircle2 className="h-11 w-11 shrink-0 text-emerald-600" aria-hidden /> : <XCircle className="h-11 w-11 shrink-0 text-red-600" aria-hidden />}
            <div className="min-w-0 flex-1">
              <Tracking className={cx("!text-xl", last.ok ? "text-emerald-950" : "text-red-950")}>{last.trackingNo}</Tracking>
              <div className={cx("truncate text-sm", last.ok ? "text-emerald-900" : "text-red-900")}>{last.recipient ?? outcome(last)}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className={cx("text-sm font-bold", last.ok ? "text-emerald-800" : "text-red-800")}>{outcome(last)}</div>
              {last.id && <Link href={`/shipments/${last.id}`} className={cx("text-[13px] font-medium underline-offset-2 hover:underline", last.ok ? "text-emerald-800" : "text-red-800")}>{t("open")}</Link>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-slate-300 p-5 text-slate-500">
            <ScanLine className="h-9 w-9 shrink-0 text-slate-300" aria-hidden />
            <div>
              <div className="text-sm font-semibold text-slate-700">{t("ready")}</div>
              <div className="text-sm">{t("empty")}</div>
            </div>
          </div>
        )}
      </div>

      {log.length > 0 && (
        <section className="rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5">
          <header className="flex min-h-13 flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 px-5 py-3">
            <h2 className="flex-1 text-[15px] font-semibold text-slate-900">{t("log")}</h2>
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />{t("counterOk")} <b className="tabular-nums text-slate-900">{okCount}</b></span>
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600"><span className={cx("h-2 w-2 rounded-full", failed ? "bg-red-500" : "bg-slate-300")} aria-hidden />{t("counterFailed")} <b className={cx("tabular-nums", failed ? "text-red-700" : "text-slate-900")}>{failed}</b></span>
            <button
              type="button"
              className="rounded-md text-[13px] font-medium text-slate-500 underline-offset-2 transition-colors duration-150 hover:text-slate-900 hover:underline"
              onClick={() => {
                setLog([]);
                input.current?.focus();
              }}
            >
              {t("clear")}
            </button>
          </header>
          <ul className="divide-y divide-slate-100">
            {log.map((r, i) => (
              <li key={log.length - i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                {r.ok ? <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-emerald-600" aria-hidden /> : <XCircle className="h-[18px] w-[18px] shrink-0 text-red-600" aria-hidden />}
                {r.id ? <Link href={`/shipments/${r.id}`} className="text-brand-700 hover:underline"><Tracking>{r.trackingNo}</Tracking></Link> : <Tracking>{r.trackingNo}</Tracking>}
                <span className="truncate text-slate-600">{r.recipient}</span>
                <span className={cx("ml-auto shrink-0 text-[13px]", r.ok ? "text-slate-500" : "font-semibold text-red-700")}>{outcome(r)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
