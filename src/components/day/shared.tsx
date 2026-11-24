import type { ReactNode } from "react";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { assignCourierAction, changeStatusAction } from "@/app/actions/shipments";
import { confirmHandover } from "@/app/actions/courier";
import { baniToInput } from "@/lib/money";
import type { DayCourier, DayParcel } from "@/lib/day";
import { AssignSelect } from "./AssignSelect";

/** Office actions used on the homepage and the courier day. */

type BtnProps = { variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md" | "lg"; className?: string };

/** The office confirms it received a courier's cash. Guarded on the server against a stale amount. */
export function ReceiveCash({ courier, children, ...btn }: { courier: Pick<DayCourier, "id" | "cash">; children: ReactNode } & BtnProps) {
  return (
    <ActionForm action={confirmHandover} className="contents">
      <input type="hidden" name="courierId" value={courier.id} />
      <input type="hidden" name="expected" value={baniToInput(courier.cash)} />
      <SubmitButton {...btn}>{children}</SubmitButton>
    </ActionForm>
  );
}

/** Give a parcel to a courier picked from a menu; choosing applies it. */
export function AssignMenu({ parcel, options, label, className }: { parcel: DayParcel; options: { id: string; name: string }[]; label: string; className?: string }) {
  return (
    <ActionForm action={assignCourierAction} className="contents">
      <input type="hidden" name="id" value={parcel.id} />
      <AssignSelect options={options} label={label} className={className} />
    </ActionForm>
  );
}

/** Confirm a new order (NEW → CONFIRMED). */
export function ConfirmOrder({ parcel, children, ...btn }: { parcel: DayParcel; children: ReactNode } & BtnProps) {
  return (
    <ActionForm action={changeStatusAction} className="contents">
      <input type="hidden" name="id" value={parcel.id} />
      <input type="hidden" name="to" value="CONFIRMED" />
      <SubmitButton {...btn}>{children}</SubmitButton>
    </ActionForm>
  );
}
