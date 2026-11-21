"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { saveShipment } from "@/app/actions/shipments";
import { calculateFee } from "@/lib/pricing";
import { formatMDL, parseKg, parseMDL } from "@/lib/money";
import { normalizeLocality } from "@/lib/text";

export type ShipmentFormData = {
  clients: { id: string; name: string; feeMode: string; prices: Record<string, number> }[];
  zones: { id: string; name: string; basePrice: number; includedKg: number; extraPerKg: number }[];
  localities: { name: string; key: string; zoneId: string }[];
  couriers: { id: string; name: string }[];
  initial?: Record<string, string>;
};

function Line({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-3", strong ? "text-base font-bold text-ink-950" : "text-sm", muted && "text-slate-400")}>
      <dt className={strong ? "" : "text-slate-500"}>{label}</dt>
      <dd className="whitespace-nowrap tabular-nums">{value}</dd>
    </div>
  );
}

export function ShipmentForm({ clients, zones, localities, couriers, initial = {} }: ShipmentFormData) {
  const t = useTranslations("shipments");
  const tc = useTranslations("common");
  const [clientId, setClientId] = useState(initial.clientId ?? "");
  const [zoneId, setZoneId] = useState(initial.zoneId ?? "");
  const [weight, setWeight] = useState(initial.weightKg ?? "");
  const [feeOverride, setFeeOverride] = useState(initial.feeOverride ?? "");
  const [cod, setCod] = useState(initial.codAmount ?? "");
  const [zoneAuto, setZoneAuto] = useState(false);

  const client = clients.find((c) => c.id === clientId);
  const zone = zones.find((z) => z.id === zoneId);
  const price = useMemo(() => {
    if (!zone) return null;
    const base = client?.prices[zone.id] ?? zone.basePrice;
    const total = calculateFee({ basePrice: base, includedKg: zone.includedKg, extraPerKg: zone.extraPerKg, weightGrams: parseKg(weight) ?? 0 });
    return { base, extra: total - base, total, special: client?.prices[zone.id] !== undefined };
  }, [zone, weight, client]);
  const manualFee = feeOverride.trim() ? parseMDL(feeOverride) : null;
  const fee = manualFee ?? price?.total ?? null;
  const codBani = parseMDL(cod) ?? 0;

  function onLocality(v: string) {
    const hit = localities.find((l) => l.key === normalizeLocality(v));
    if (hit) {
      setZoneId(hit.zoneId);
      setZoneAuto(true);
    }
  }

  return (
    <ActionForm action={saveShipment} className="grid items-start gap-5 xl:grid-cols-3">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="space-y-5 xl:col-span-2">
        <Card title={t("senderSection")}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={t("client") + " *"} className="md:col-span-2">
              <Select name="clientId" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">—</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label={t("feeMode")}>
              <Select name="feeMode" defaultValue={initial.feeMode ?? ""} key={clientId}>
                <option value="">{tc("default")}{client ? ` (${tc(`feeMode.${client.feeMode}`)})` : ""}</option>
                <option value="INVOICE">{tc("feeMode.INVOICE")}</option>
                <option value="DEDUCT_FROM_COD">{tc("feeMode.DEDUCT_FROM_COD")}</option>
              </Select>
            </Field>
            <Field label={t("senderName")}><Input name="senderName" autoComplete="off" defaultValue={initial.senderName} /></Field>
            <Field label={t("senderPhone")}><Input name="senderPhone" type="tel" inputMode="tel" autoComplete="off" defaultValue={initial.senderPhone} /></Field>
            <Field label={t("senderAddress")} hint={t("senderHint")}><Input name="senderAddress" autoComplete="off" defaultValue={initial.senderAddress} /></Field>
          </div>
        </Card>

        <Card title={t("recipient")}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("recipientName") + " *"}><Input name="recipientName" required autoComplete="off" defaultValue={initial.recipientName} /></Field>
            <Field label={t("recipientPhone") + " *"}><Input name="recipientPhone" type="tel" inputMode="tel" required autoComplete="off" defaultValue={initial.recipientPhone} placeholder="+373 69 123 456" /></Field>
            <Field label={t("locality")}>
              <Input name="recipientLocality" list="localities" autoComplete="off" defaultValue={initial.recipientLocality} onChange={(e) => onLocality(e.target.value)} />
              <datalist id="localities">{localities.map((l) => <option key={l.key} value={l.name} />)}</datalist>
            </Field>
            <Field label={t("zone")} hint={zoneAuto ? t("zoneAuto") : t("zoneHint")}>
              <Select name="zoneId" value={zoneId} onChange={(e) => { setZoneId(e.target.value); setZoneAuto(false); }}>
                <option value="">—</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </Select>
            </Field>
            <Field label={t("address") + " *"} className="md:col-span-2"><Input name="recipientAddress" required autoComplete="off" defaultValue={initial.recipientAddress} /></Field>
          </div>
        </Card>

        <Card title={t("parcel")}>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Field label={t("type")}>
              <Select name="type" defaultValue={initial.type ?? "PARCEL"}>
                <option value="PARCEL">{t("typeParcel")}</option>
                <option value="DOCUMENTS">{t("typeDocuments")}</option>
              </Select>
            </Field>
            <Field label={t("weightKg")}><Input name="weightKg" inputMode="decimal" autoComplete="off" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" /></Field>
            <Field label={t("pieces")}><Input name="pieces" type="number" inputMode="numeric" min={1} defaultValue={initial.pieces ?? "1"} /></Field>
            <Field label={t("codAmount")}><Input name="codAmount" inputMode="decimal" autoComplete="off" value={cod} onChange={(e) => setCod(e.target.value)} placeholder="0" /></Field>
            <Field label={t("contents")} className="sm:col-span-2 md:col-span-4" hint={t("codHint")}><Input name="contents" autoComplete="off" defaultValue={initial.contents} /></Field>
          </div>
        </Card>

        <Card title={t("delivery")}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={t("desiredDate")}><Input name="desiredDate" type="date" defaultValue={initial.desiredDate} /></Field>
            <Field label={t("courier")}>
              <Select name="courierId" defaultValue={initial.courierId ?? ""}>
                <option value="">—</option>
                {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label={t("fee")} hint={price ? `${t("calculated")}: ${formatMDL(price.total)}` : t("feeNeedsZone")}>
              <Input name="feeOverride" inputMode="decimal" autoComplete="off" value={feeOverride} onChange={(e) => setFeeOverride(e.target.value)} placeholder={price ? String(price.total / 100) : ""} />
            </Field>
            <Field label={tc("notes")} className="md:col-span-3"><Textarea name="notes" rows={2} defaultValue={initial.notes} /></Field>
          </div>
        </Card>
      </div>

      <aside className="sticky bottom-3 z-10 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-white px-5 py-3.5 shadow-float ring-1 ring-slate-900/5 xl:top-20 xl:bottom-auto xl:block xl:p-5 xl:shadow-card">
        <h2 className="mb-3 hidden text-[15px] font-semibold text-slate-900 xl:block">{t("summary")}</h2>
        <dl className="hidden space-y-2 xl:block">
          <Line label={`${t("basePrice")}${zone ? ` · ${zone.name}` : ""}${price?.special ? ` (${t("clientPrice")})` : ""}`} value={price ? formatMDL(price.base) : "—"} muted={!price} />
          <Line label={t("extraWeight")} value={price?.extra ? `+ ${formatMDL(price.extra)}` : "—"} muted={!price?.extra} />
          {manualFee !== null && <Line label={t("manual")} value={formatMDL(manualFee)} />}
        </dl>
        <dl className="min-w-40 space-y-2 xl:mt-3 xl:border-t xl:border-slate-100 xl:pt-3">
          <Line strong label={t("total")} value={fee !== null ? formatMDL(fee) : "—"} />
          <div className="hidden xl:block"><Line label={t("toCollect")} value={codBani ? formatMDL(codBani) : "—"} muted={!codBani} /></div>
        </dl>
        {!price && <p className="mt-2 hidden text-xs text-slate-500 xl:block">{t("feeNeedsZone")}</p>}
        <div className="ml-auto flex flex-wrap gap-2 xl:mt-4 xl:flex-col">
          {!initial.id && <SubmitButton variant="secondary" name="next" value="new" className="xl:order-2 xl:w-full">{t("saveAndNew")}</SubmitButton>}
          <SubmitButton className="min-w-32 xl:w-full">{tc("save")}</SubmitButton>
        </div>
      </aside>
    </ActionForm>
  );
}
