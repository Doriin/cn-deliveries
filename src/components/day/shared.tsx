import type { ReactNode } from "react";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { assignCourierAction, changeStatusAction } from "@/app/actions/shipments";
import { confirmHandover } from "@/app/actions/courier";
import { baniToInput } from "@/lib/money";
import type { Day, DayCourier, DayGroup, DayParcel } from "@/lib/day";
import { AssignSelect } from "./AssignSelect";

/** What every design's "Today" screen receives. `filter` is the stage chosen with ?g= in the address. */
export type DayViewProps = { day: Day; filter: DayGroup | "all"; /** Other choices kept in the address, e.g. the courier picked in the Expres design. */ params?: Record<string, string | undefined> };

/** Link for a stage tab: the day screen filters on the server, so tabs are plain links. */
export const groupHref = (g: DayGroup | "all") => (g === "all" ? "/" : `/?g=${g}`);

/** Parcels of the chosen stage. */
export const filtered = (day: Day, filter: DayGroup | "all") => (filter === "all" ? day.parcels : day.parcels.filter((p) => p.group === filter));

/** "Locality, street" with whichever part exists. */
export const place = (p: Pick<DayParcel, "city" | "addr">) => [p.city, p.addr].filter(Boolean).join(", ");

type BtnProps = { variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md" | "lg"; className?: string };

/** The office confirms it received a courier's cash. Guarded on the server against a stale amount. */
export function ReceiveCash({ courier, children, ...btn }: { courier: DayCourier; children: ReactNode } & BtnProps) {
  return (
    <ActionForm action={confirmHandover} className="contents">
      <input type="hidden" name="courierId" value={courier.id} />
      <input type="hidden" name="expected" value={baniToInput(courier.cash)} />
      <SubmitButton {...btn}>{children}</SubmitButton>
    </ActionForm>
  );
}

/** Give a parcel to one named courier with a single button. */
export function AssignTo({ parcel, courierId, children, ...btn }: { parcel: DayParcel; courierId: string; children: ReactNode } & BtnProps) {
  return (
    <ActionForm action={assignCourierAction} className="contents">
      <input type="hidden" name="id" value={parcel.id} />
      <input type="hidden" name="courierId" value={courierId} />
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
