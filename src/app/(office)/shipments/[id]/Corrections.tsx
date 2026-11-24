import type { ReactNode } from "react";
import type { PaymentMethod, ShipmentChange } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { PencilLine, RotateCcw, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, Input, Select } from "@/components/ui";
import { fixPaymentAction, undoStatusAction } from "@/app/actions/shipments";
import { baniToInput, formatKg, formatMDL } from "@/lib/money";
import { ConfirmSubmit } from "./ConfirmSubmit";

/** Fixing what was entered by mistake on an order: one payment, the last status step, and how corrections read in the history. */

type T = Awaited<ReturnType<typeof getTranslations>>;
const METHODS: PaymentMethod[] = ["CASH_RECEIPT", "CASH_NO_RECEIPT", "CARD", "TRANSFER"];

/** Edit or delete one recorded COD payment. Cash already handed in keeps its amount and method. */
export function PaymentFix({ shipmentId, payment, t, tc }: {
  shipmentId: string;
  payment: { id: string; amount: number; method: PaymentMethod; receiptNo: string | null; handoverId: string | null };
  t: T;
  tc: T;
}) {
  const locked = !!payment.handoverId;
  return (
    <details className="group mt-1">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-brand-700 hover:underline [&::-webkit-details-marker]:hidden">
        <PencilLine className="h-3.5 w-3.5" aria-hidden />{t("fixPayment")}
      </summary>
      <ActionForm action={fixPaymentAction} className="mt-2 grid gap-3 rounded-xl bg-slate-50 p-3">
        <input type="hidden" name="id" value={shipmentId} />
        <input type="hidden" name="paymentId" value={payment.id} />
        {locked && <p className="text-xs text-slate-600">{t("handedOverNote")}</p>}
        {locked ? (
          <>
            <input type="hidden" name="amount" value={baniToInput(payment.amount)} />
            <input type="hidden" name="method" value={payment.method} />
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("amount")}><Input name="amount" inputMode="decimal" required defaultValue={baniToInput(payment.amount)} /></Field>
            <Field label={t("method")}>
              <Select name="method" defaultValue={payment.method}>
                {METHODS.map((m) => <option key={m} value={m}>{tc(`method.${m}`)}</option>)}
              </Select>
            </Field>
          </div>
        )}
        <Field label={t("receiptNo")}><Input name="receiptNo" inputMode="numeric" autoComplete="off" defaultValue={payment.receiptNo ?? ""} /></Field>
        <div className="flex flex-wrap gap-2">
          <SubmitButton variant="secondary" size="sm" name="op" value="save">{t("savePayment")}</SubmitButton>
          {!locked && (
            <ConfirmSubmit variant="ghost" size="sm" name="op" value="delete" message={t("deletePaymentConfirm")} className="text-red-700">
              <Trash2 className="h-3.5 w-3.5" aria-hidden />{t("deletePayment")}
            </ConfirmSubmit>
          )}
        </div>
      </ActionForm>
    </details>
  );
}

/** Undo the order's latest step (set by mistake). The step stays in the history, crossed out. */
export function UndoStep({ shipmentId, step, back, t }: { shipmentId: string; step: string; back: string; t: T }) {
  return (
    <details className="mt-4 border-t border-slate-100 pt-3">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 [&::-webkit-details-marker]:hidden">
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />{t("undoTitle")}
      </summary>
      <ActionForm action={undoStatusAction} className="mt-3 grid gap-3">
        <input type="hidden" name="id" value={shipmentId} />
        <p className="text-[13px] text-slate-600">{t("undoHelp", { step, back })}</p>
        <Field label={t("undoReason")}><Input name="reason" required autoComplete="off" /></Field>
        <SubmitButton variant="danger" className="w-full">{t("undoButton", { step })}</SubmitButton>
      </ActionForm>
    </details>
  );
}

type Pay = { amount: number; method: PaymentMethod; receiptNo: string | null };
type Val = string | number | null;

/** One correction in the order's history: what it was, what it became. */
export function ChangeLines({ change, t, tc, zoneLabel, dayLabel }: { change: ShipmentChange; t: T; tc: T; zoneLabel: (code: string) => string; dayLabel: (iso: string) => string }): { title: string; lines: ReactNode[] } {
  const pay = (p: Pay) => `${tc(`method.${p.method}`)} ${formatMDL(p.amount)}${p.receiptNo ? `, ${t("receiptShort", { no: p.receiptNo })}` : ""}`;
  if (change.kind === "PAYMENT_EDITED") {
    const d = change.data as { before: Pay; after: Pay };
    return { title: t("changePaymentEdited"), lines: [<>{pay(d.before)} → <b className="font-medium text-slate-800">{pay(d.after)}</b></>] };
  }
  if (change.kind === "PAYMENT_DELETED") {
    const d = change.data as { before: Pay };
    return { title: t("changePaymentDeleted"), lines: [<s key="p">{pay(d.before)}</s>] };
  }
  const show = (field: string, v: Val): string => {
    if (v === null) return "—";
    if (field === "codAmount" || field === "deliveryFee") return formatMDL(Number(v));
    if (field === "weightGrams") return formatKg(Number(v));
    if (field === "type") return v === "DOCUMENTS" ? t("typeDocuments") : t("typeParcel");
    if (field === "feeMode") return tc(`feeMode.${v}`);
    if (field === "zoneId") return zoneLabel(String(v));
    if (field === "desiredDate") return dayLabel(String(v));
    return String(v);
  };
  const d = change.data as Record<string, [Val, Val]>;
  return {
    title: t("changeDetails"),
    lines: Object.entries(d).map(([field, [a, b]]) => (
      <>{t(`field.${field}`)}: {show(field, a)} → <b className="font-medium text-slate-800">{show(field, b)}</b></>
    )),
  };
}
