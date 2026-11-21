import type { Client, ClientZonePrice, Zone } from "@prisma/client";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, Field, Input, Select, Textarea } from "@/components/ui";
import { saveClient } from "@/app/actions/clients";
import { DEFAULT_HEADERS, INPUT_FIELDS, OUTPUT_FIELDS, headersFor } from "@/lib/sheetColumns";
import { baniToInput, formatMDL } from "@/lib/money";
import { zoneName } from "@/lib/zones";

const CHECK = "flex min-h-10 items-center gap-2.5 text-sm font-medium text-slate-700";

export async function ClientForm({ client, zones }: { client?: Client & { prices: ClientZonePrice[] }; zones: Zone[] }) {
  const t = await getTranslations("clients");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const headers = headersFor(client?.columnMap);
  const priceFor = (zoneId: string) => client?.prices.find((p) => p.zoneId === zoneId)?.price;
  return (
    <ActionForm action={saveClient} className="grid gap-5">
      {client && <input type="hidden" name="id" value={client.id} />}
      <Card title={t("details")}>
        <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
          <Field label={t("name") + " *"} className="md:col-span-2"><Input name="name" required autoComplete="organization" defaultValue={client?.name} /></Field>
          <Field label={t("contactName")}><Input name="contactName" autoComplete="off" defaultValue={client?.contactName ?? ""} /></Field>
          <Field label={t("phone")}><Input name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder="+373 69 123 456" defaultValue={client?.phone ?? ""} /></Field>
          <Field label={t("email")}><Input name="email" type="email" autoComplete="off" defaultValue={client?.email ?? ""} /></Field>
          <Field label={t("address")} hint={t("addressHint")}><Input name="address" autoComplete="off" defaultValue={client?.address ?? ""} /></Field>
          <Field label={tc("notes")} className="md:col-span-2"><Textarea name="notes" rows={2} defaultValue={client?.notes ?? ""} /></Field>
          <label className={CHECK}>
            <input type="checkbox" name="active" defaultChecked={client?.active ?? true} /> {t("active")}
          </label>
        </div>
      </Card>

      <Card title={t("billing")}>
        <div className="grid gap-x-4 gap-y-5 md:grid-cols-3">
          <Field label={t("feeMode")}>
            <Select name="feeMode" defaultValue={client?.feeMode ?? "INVOICE"}>
              <option value="INVOICE">{tc("feeMode.INVOICE")}</option>
              <option value="DEDUCT_FROM_COD">{tc("feeMode.DEDUCT_FROM_COD")}</option>
            </Select>
          </Field>
          <Field label={t("fiscalCode")}><Input name="fiscalCode" inputMode="numeric" autoComplete="off" defaultValue={client?.fiscalCode ?? ""} /></Field>
          <Field label="IBAN"><Input name="iban" autoComplete="off" autoCapitalize="characters" spellCheck={false} className="font-mono" defaultValue={client?.iban ?? ""} /></Field>
        </div>
      </Card>

      <Card title={t("prices")}>
        <p className="mb-4 max-w-prose text-sm text-slate-500">{t("pricesHint")}</p>
        <div className="grid gap-x-4 gap-y-5 md:grid-cols-3">
          {zones.map((z) => (
            <Field key={z.id} label={zoneName(z, locale)} hint={`${tc("default")}: ${formatMDL(z.basePrice)}`}>
              <div className="relative">
                <Input name={`price_${z.id}`} inputMode="decimal" className="w-full pr-14 tabular-nums" placeholder={baniToInput(z.basePrice)} defaultValue={priceFor(z.id) !== undefined ? baniToInput(priceFor(z.id)!) : ""} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">MDL</span>
              </div>
            </Field>
          ))}
        </div>
      </Card>

      <Card title={t("sheet")}>
        <div className="grid gap-x-4 gap-y-5 md:grid-cols-3">
          <Field label={t("sheetUrl")} className="md:col-span-2" hint={t("sheetUrlHint")}>
            <Input name="sheetId" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://docs.google.com/spreadsheets/d/…" defaultValue={client?.sheetId ? `https://docs.google.com/spreadsheets/d/${client.sheetId}` : ""} />
          </Field>
          <Field label={t("sheetTab")} hint={t("sheetTabHint")}><Input name="sheetTab" autoComplete="off" defaultValue={client?.sheetTab ?? ""} /></Field>
          <label className={CHECK + " md:col-span-3"}>
            <input type="checkbox" name="sheetSyncEnabled" defaultChecked={client?.sheetSyncEnabled ?? false} /> {t("sheetSyncEnabled")}
          </label>
        </div>
        <details className="group mt-4 border-t border-slate-100 pt-4">
          <summary className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-brand-700 hover:text-brand-800">
            <ChevronRight className="h-4 w-4 transition-transform duration-150 ease-out group-open:rotate-90" aria-hidden />{t("columns")}
          </summary>
          <p className="my-4 max-w-prose text-sm text-slate-500">{t("columnsHint")}</p>
          <div className="grid gap-x-4 gap-y-4 md:grid-cols-3">
            {[...INPUT_FIELDS, ...OUTPUT_FIELDS].map((f) => (
              <Field key={f} label={t(`col.${f}`)}>
                <Input name={`col_${f}`} autoComplete="off" placeholder={DEFAULT_HEADERS[f]} defaultValue={headers[f] !== DEFAULT_HEADERS[f] ? headers[f] : ""} />
              </Field>
            ))}
          </div>
        </details>
      </Card>

      <div className="flex justify-end">
        <SubmitButton>{tc("save")}</SubmitButton>
      </div>
    </ActionForm>
  );
}
