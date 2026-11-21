"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ShipmentStatus } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, Input, Select, cx } from "@/components/ui";
import { changeStatusAction } from "@/app/actions/shipments";
import { STATUS_DOT, reasonsFor } from "@/lib/status";

/** The first allowed status is the natural next step, so it is preselected: one click moves the parcel on. */
export function StatusChanger({ id, next }: { id: string; next: ShipmentStatus[] }) {
  const t = useTranslations("shipments");
  const ts = useTranslations("status");
  const tr = useTranslations("reason");
  const [to, setTo] = useState<ShipmentStatus | "">(next[0] ?? "");
  const reasons = to ? reasonsFor(to) : [];
  if (next.length === 0) return <p className="text-sm text-slate-500">{t("finalStatus")}</p>;
  return (
    <ActionForm action={changeStatusAction} className="grid gap-4">
      <input type="hidden" name="id" value={id} />
      <div role="radiogroup" aria-label={t("changeStatus")} className="flex flex-wrap gap-1.5">
        {next.map((s) => (
          <button
            type="button"
            role="radio"
            aria-checked={to === s}
            key={s}
            onClick={() => setTo(s)}
            className={cx(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.97]",
              to === s ? "bg-ink-950 text-white shadow-sm" : "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 hover:ring-slate-400",
            )}
          >
            <span className={cx("h-1.5 w-1.5 rounded-full", STATUS_DOT[s])} aria-hidden />
            {ts(s)}
          </button>
        ))}
      </div>
      <input type="hidden" name="to" value={to} />
      {reasons.length > 0 && (
        <Field label={t("reason") + " *"}>
          <Select name="reason" required key={to}>
            <option value="">—</option>
            {reasons.map((r) => <option key={r} value={r}>{tr(r)}</option>)}
          </Select>
        </Field>
      )}
      {to === "POSTPONED" && <Field label={t("newDate") + " *"}><Input type="date" name="newDate" required /></Field>}
      <Field label={t("statusNote")}><Input name="note" autoComplete="off" /></Field>
      <SubmitButton disabled={!to} className="w-full">{to ? ts(to) : t("setStatus")}</SubmitButton>
    </ActionForm>
  );
}
