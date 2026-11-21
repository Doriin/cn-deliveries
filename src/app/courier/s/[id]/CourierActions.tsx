"use client";

import { useActionState, useEffect, useRef, useState, startTransition, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ShipmentStatus } from "@prisma/client";
import {
  ArrowLeft, CalendarClock, ChevronRight, CirclePause, CircleX, Navigation, PackageCheck, PackagePlus, PackageX, Phone, PhoneOff,
  TriangleAlert, Truck, Undo2, Warehouse, type LucideIcon,
} from "lucide-react";
import { courierUpdate } from "@/app/actions/courier";
import type { FormState } from "@/components/ActionForm";
import { Alert, Button, Input, Spinner, btnClass, cx } from "@/components/ui";
import { Sheet } from "@/components/courier/Sheet";
import { PhotoInput } from "@/components/PhotoInput";
import { SignaturePad } from "@/components/SignaturePad";
import { PROBLEM_STATUSES, reasonsFor } from "@/lib/status";
import { formatMDL } from "@/lib/money";

const METHODS = ["CASH_RECEIPT", "CASH_NO_RECEIPT", "CARD", "TRANSFER"] as const;
type Method = (typeof METHODS)[number];

const ICON: Partial<Record<ShipmentStatus, LucideIcon>> = {
  PICKED_UP: PackagePlus, AT_WAREHOUSE: Warehouse, OUT_FOR_DELIVERY: Truck, DELIVERED: PackageCheck, FAILED_ATTEMPT: PhoneOff,
  POSTPONED: CalendarClock, ON_HOLD: CirclePause, REFUSED: CircleX, RETURNING: Undo2, RETURNED: PackageX,
};

const vibrate = () => {
  try {
    navigator.vibrate?.(30);
  } catch {}
};

export function CourierActions({
  id, next, primary, codLeft, recipientName, placement = "bar", phone, mapHref,
}: {
  id: string; next: ShipmentStatus[]; primary: ShipmentStatus; codLeft: number; recipientName: string;
  /** "bar": fixed above the tab bar on the parcel screen. "stop": inside the next stop on the home screen, with Call and Map. */
  placement?: "bar" | "stop"; phone?: string | null; mapHref?: string | null;
}) {
  const t = useTranslations("courier");
  const [state, run, pending] = useActionState<FormState, FormData>(courierUpdate, {});
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState<ShipmentStatus | null>(null);
  const [viaPicker, setViaPicker] = useState(false);
  // Errors from an earlier attempt must not show up on a freshly opened form.
  const [seen, setSeen] = useState<FormState>(state);
  const inFlight = useRef(false);
  const others = next.filter((s) => s !== primary);

  useEffect(() => {
    if (state.error) inFlight.current = false;
    if (state.ok) {
      inFlight.current = false;
      vibrate();
      toast.success(t("statusSaved"));
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  // Leaving this screen while a save is in flight means the server redirected back to the list: it worked.
  useEffect(() => () => { if (inFlight.current) vibrate(); }, []);
  // On the home screen the same parcel can stay in place after a save (a failed attempt, say): its steps changed, so the sheet is done.
  const steps = next.join();
  useEffect(() => {
    if (inFlight.current) {
      inFlight.current = false;
      vibrate();
    }
    setOpen(false);
  }, [steps]);

  const show = (s: ShipmentStatus | null, picker: boolean) => {
    setSeen(state);
    setTo(s);
    setViaPicker(picker);
    setOpen(true);
  };
  const go = (
    <Button type="button" size="lg" className="cr-go" onClick={() => show(primary, false)}>
      <span className="truncate">{t(`action.${primary}`)}</span>
    </Button>
  );

  return (
    <>
      {placement === "stop" ? (
        <div className="cr-acts">
          <div className="cr-dock">
            {(phone || mapHref) && (
              <div className="cr-quick">
                {phone && (
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className={cx(btnClass("secondary", "lg"), "cr-qbtn")}>
                    <Phone aria-hidden /><span>{t("call")}</span>
                  </a>
                )}
                {mapHref && (
                  <a href={mapHref} target="_blank" rel="noreferrer" className={cx(btnClass("secondary", "lg"), "cr-qbtn")}>
                    <Navigation aria-hidden /><span>{t("map")}</span>
                  </a>
                )}
              </div>
            )}
            {go}
          </div>
          {others.length > 0 && (
            <button type="button" className="cr-cant cr-tap" onClick={() => show(null, true)}>
              {primary === "DELIVERED" ? t("cantDeliver") : t("other")}
            </button>
          )}
        </div>
      ) : (
        <div className="cr-bar">
          {others.length > 0 && (
            <Button type="button" variant="secondary" size="lg" className="cr-other" onClick={() => show(null, true)} aria-label={t("other")}>
              <TriangleAlert aria-hidden /> <span>{t("otherShort")}</span>
            </Button>
          )}
          {go}
        </div>
      )}

      <Sheet
        open={open}
        onOpenChange={(o) => !pending && setOpen(o)}
        locked={pending}
        title={to ? t(`action.${to}`) : t("otherTitle")}
        closeLabel={t("close")}
        leading={
          to && viaPicker ? (
            <button type="button" aria-label={t("back")} disabled={pending} onClick={() => setTo(null)} className="cr-sheet-back cr-tap">
              <ArrowLeft aria-hidden />
            </button>
          ) : undefined
        }
      >
        {to ? (
          <StatusForm
            key={to}
            id={id}
            to={to}
            codLeft={codLeft}
            recipientName={recipientName}
            pending={pending}
            error={state !== seen ? state.error : undefined}
            onSubmit={(fd) => {
              inFlight.current = true;
              startTransition(() => run(fd));
            }}
          />
        ) : (
          <ul className="cr-picks">
            {others.map((s) => {
              const Icon = ICON[s] ?? TriangleAlert;
              return (
                <li key={s}>
                  <button type="button" onClick={() => show(s, true)} className="cr-li cr-tap" data-bad={PROBLEM_STATUSES.includes(s) || undefined}>
                    <Icon aria-hidden />
                    <div><b>{t(`action.${s}`)}</b></div>
                    <ChevronRight aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>
    </>
  );
}

function StatusForm({
  id, to, codLeft, recipientName, pending, error, onSubmit,
}: {
  id: string; to: ShipmentStatus; codLeft: number; recipientName: string; pending: boolean; error?: string; onSubmit: (fd: FormData) => void;
}) {
  const t = useTranslations("courier");
  const ts = useTranslations("status");
  const tr = useTranslations("reason");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [photo, setPhoto] = useState<File | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("CASH_RECEIPT");
  const [localError, setLocalError] = useState<string | null>(null);
  const reasons = reasonsFor(to);
  const delivering = to === "DELIVERED";
  const shown = localError ?? error;

  return (
    <form
      className="cr-form"
      onSubmit={(e) => {
        e.preventDefault();
        // Checked here too, so a missing photo or signature doesn't cost an upload on mobile data.
        if (delivering && !photo && !signature) return setLocalError("proofRequired");
        setLocalError(null);
        const fd = new FormData(e.currentTarget);
        fd.set("to", to);
        if (photo) fd.set("photo", photo);
        if (signature) fd.set("signature", signature);
        onSubmit(fd);
      }}
    >
      <input type="hidden" name="id" value={id} />
      <fieldset disabled={pending} className="contents">
        {delivering && codLeft > 0 && (
          <div className="cr-cod">
            <div className="cr-amount">
              <span>{t("due")}</span>
              <b>{formatMDL(codLeft)}</b>
            </div>
            <label className="block">
              <span className="cr-label">{t("amountCollected")}</span>
              <Input name="codAmount" inputMode="decimal" autoComplete="off" enterKeyHint="done" defaultValue={String(codLeft / 100)} required className="cr-field cr-field-num" />
            </label>
            <div>
              <div className="cr-label" id={`pay-${id}`}>{t("payMethod")}</div>
              <div className="cr-seg" role="radiogroup" aria-labelledby={`pay-${id}`} style={{ "--i": METHODS.indexOf(method) } as CSSProperties}>
                <i className="cr-seg-thumb" aria-hidden />
                {METHODS.map((m) => (
                  <label key={m} className="cr-seg-opt" data-on={method === m || undefined}>
                    <input type="radio" name="codMethod" value={m} checked={method === m} onChange={() => setMethod(m)} aria-label={tc(`method.${m}`)} className="sr-only" />
                    <span aria-hidden>{t(`method.${m}`)}</span>
                  </label>
                ))}
              </div>
            </div>
            {method === "CASH_RECEIPT" && (
              <label className="block">
                <span className="cr-label">{t("receiptNo")}</span>
                <Input name="receiptNo" required inputMode="numeric" autoComplete="off" enterKeyHint="done" className="cr-field" />
              </label>
            )}
          </div>
        )}

        {reasons.length > 0 && (
          <div>
            <div className="cr-label">{t("reason")}</div>
            <div className="cr-choices">
              {reasons.map((r) => (
                <label key={r} className="cr-choice cr-tap">
                  <input type="radio" name="reason" value={r} required /> {tr(r)}
                </label>
              ))}
            </div>
          </div>
        )}

        {to === "POSTPONED" && (
          <label className="block">
            <span className="cr-label">{t("newDate")}</span>
            <Input type="date" name="newDate" required min={new Date().toLocaleDateString("en-CA")} className="cr-field" />
          </label>
        )}

        {delivering && (
          <label className="block">
            <span className="cr-label">{t("receivedBy")}</span>
            <Input name="receivedBy" defaultValue={recipientName} required autoComplete="off" autoCapitalize="words" enterKeyHint="done" className="cr-field" />
          </label>
        )}

        {delivering && (
          <div>
            <div className="cr-label">{t("proof")}</div>
            <p className="cr-hint">{t("proofHint")}</p>
            <div className="cr-proof">
              <PhotoInput onChange={(f) => { setPhoto(f); setLocalError(null); }} label={t("photoDelivery")} retakeLabel={t("retake")} />
              <div>
                <div className="cr-label">{t("signature")}</div>
                <SignaturePad onChange={(s) => { setSignature(s); setLocalError(null); }} clearLabel={t("clear")} hint={t("signHere")} />
              </div>
            </div>
          </div>
        )}

        {!delivering && reasons.length > 0 && <PhotoInput onChange={setPhoto} label={t("photoOptional")} retakeLabel={t("retake")} />}

        <Input name="note" placeholder={t("note")} aria-label={t("note")} autoComplete="off" enterKeyHint="done" className="cr-field" />
      </fieldset>

      {shown && <Alert>{te(shown)}</Alert>}

      <Button type="submit" size="lg" disabled={pending} aria-busy={pending} className="cr-go cr-confirm">
        {pending && <Spinner className="h-5 w-5" />}
        <span className="truncate">{t("confirm", { status: ts(to) })}</span>
      </Button>
    </form>
  );
}
