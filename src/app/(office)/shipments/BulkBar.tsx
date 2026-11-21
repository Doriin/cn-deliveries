"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Printer, X } from "lucide-react";
import { Input, Select, cx } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { STATUSES, reasonsFor } from "@/lib/status";
import type { ShipmentStatus } from "@prisma/client";

const boxes = (form: HTMLFormElement | null | undefined) => Array.from(form?.querySelectorAll<HTMLInputElement>('input[name="ids"]') ?? []);

/** Floats up from the bottom of the list while at least one shipment is ticked. */
export function BulkBar({ couriers }: { couriers: { id: string; name: string }[] }) {
  const t = useTranslations("shipments");
  const ts = useTranslations("status");
  const tr = useTranslations("reason");
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [to, setTo] = useState<ShipmentStatus | "">("");
  const reasons = to ? reasonsFor(to) : [];

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const update = () => setCount(boxes(form).filter((b) => b.checked).length);
    update();
    form.addEventListener("change", update);
    return () => form.removeEventListener("change", update);
  }, []);

  const clear = () => {
    const form = ref.current?.closest("form");
    boxes(form).forEach((b) => (b.checked = false));
    const all = form?.querySelector<HTMLInputElement>("input[data-select-all]");
    if (all) all.checked = false;
    setCount(0);
  };
  const open = count > 0;

  return (
    <div
      ref={ref}
      inert={!open}
      className={cx(
        "no-print pointer-events-none sticky bottom-4 z-10 mt-4 flex justify-center transition-[transform,opacity] ease-out",
        open ? "translate-y-0 opacity-100 duration-200" : "translate-y-3 opacity-0 duration-150",
      )}
    >
      <div className={cx("flex max-w-full flex-wrap items-center gap-2 rounded-2xl bg-ink-950 p-2 pl-4 text-white shadow-float", open && "pointer-events-auto")}>
        <span className="mr-1 text-sm font-semibold tabular-nums">{t("selected", { count })}</span>
        <Select name="to" value={to} onChange={(e) => setTo(e.target.value as ShipmentStatus)} aria-label={t("chooseStatus")} className="w-44 !h-9 border-transparent">
          <option value="">{t("chooseStatus")}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{ts(s)}</option>)}
        </Select>
        {reasons.length > 0 && (
          <Select name="reason" aria-label={t("reason")} className="w-40 !h-9 border-transparent" required>
            <option value="">{t("reason")}</option>
            {reasons.map((r) => <option key={r} value={r}>{tr(r)}</option>)}
          </Select>
        )}
        {to === "POSTPONED" && <Input type="date" name="newDate" aria-label={t("newDate")} className="w-40 !h-9 border-transparent" required />}
        <SubmitButton name="op" value="status" size="sm" disabled={!to} className="!h-9">{t("applyStatus")}</SubmitButton>
        <span className="mx-1 hidden h-6 w-px bg-white/15 sm:block" aria-hidden />
        <Select name="courierId" aria-label={t("courier")} className="w-40 !h-9 border-transparent">
          <option value="">{t("noCourier")}</option>
          {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <SubmitButton name="op" value="courier" size="sm" formNoValidate className="!h-9">{t("assign")}</SubmitButton>
        <span className="mx-1 hidden h-6 w-px bg-white/15 sm:block" aria-hidden />
        <button
          type="submit"
          formAction="/labels"
          formMethod="get"
          formTarget="_blank"
          formNoValidate
          data-native="1"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[13px] font-semibold transition-[transform,background-color] duration-150 ease-out hover:bg-white/20 active:scale-[0.97]"
        >
          <Printer className="h-4 w-4" aria-hidden /> {t("printLabels")}
        </button>
        <button type="button" onClick={clear} aria-label={t("clearSelection")} title={t("clearSelection")} className="grid h-9 w-9 place-items-center rounded-lg text-white/60 transition-[transform,background-color,color] duration-150 ease-out hover:bg-white/10 hover:text-white active:scale-[0.97]">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function SelectAll({ label }: { label: string }) {
  return (
    <input
      type="checkbox"
      data-select-all
      aria-label={label}
      onChange={(e) => {
        const checked = e.currentTarget.checked;
        boxes(e.currentTarget.form).forEach((cb) => (cb.checked = checked));
      }}
    />
  );
}
