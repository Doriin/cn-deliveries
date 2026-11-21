import { getLocale, getTranslations } from "next-intl/server";
import { ChevronDown, MapPinPlus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, Field, Input, PageHeader } from "@/components/ui";
import { saveZone } from "@/app/actions/settings";
import { baniToInput, formatMDL } from "@/lib/money";
import { zoneName } from "@/lib/zones";
import type { Locality, Zone } from "@prisma/client";
import { LocalityChips } from "./LocalityChips";

function Unit({ unit, children }: { unit: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">{unit}</span>
    </div>
  );
}

async function ZoneForm({ zone }: { zone?: Zone & { localities: Locality[] } }) {
  const t = await getTranslations("zones");
  const tc = await getTranslations("common");
  return (
    <ActionForm action={saveZone} className="grid gap-5">
      {zone && <input type="hidden" name="id" value={zone.id} />}
      <div className="grid gap-x-4 gap-y-5 md:grid-cols-3">
        <Field label={t("basePrice")}>
          <Unit unit="MDL"><Input name="basePrice" inputMode="decimal" required className="w-full pr-14 tabular-nums" defaultValue={zone ? baniToInput(zone.basePrice) : ""} /></Unit>
        </Field>
        <Field label={t("includedKg")}>
          <Unit unit="kg"><Input name="includedKg" type="number" min={0} required className="w-full pr-10 tabular-nums" defaultValue={zone?.includedKg ?? 5} /></Unit>
        </Field>
        <Field label={t("extraPerKg")}>
          <Unit unit="MDL"><Input name="extraPerKg" inputMode="decimal" required className="w-full pr-14 tabular-nums" defaultValue={zone ? baniToInput(zone.extraPerKg) : "4"} /></Unit>
        </Field>
        <Field label={`${t("name")} (RO) *`}><Input name="nameRo" required autoComplete="off" defaultValue={zone?.nameRo} /></Field>
        <Field label={`${t("name")} (RU)`}><Input name="nameRu" autoComplete="off" defaultValue={zone?.nameRu} /></Field>
        <Field label={`${t("name")} (EN)`}><Input name="nameEn" autoComplete="off" defaultValue={zone?.nameEn} /></Field>
      </div>
      <div>
        <div className="mb-1.5 text-[13px] font-medium text-slate-700">{t("localities")}</div>
        <LocalityChips
          initial={(zone?.localities.map((l) => l.name) ?? []).sort((a, b) => a.localeCompare(b))}
          placeholder={t("addLocality")}
          removeLabel={t("removeLocality", { name: "{name}" })}
        />
        <p className="mt-1.5 text-xs text-slate-500">{t("localitiesChipsHint")}</p>
      </div>
      <input type="hidden" name="sortOrder" value={zone?.sortOrder ?? 99} />
      <div className="flex justify-end"><SubmitButton>{tc("save")}</SubmitButton></div>
    </ActionForm>
  );
}

export default async function ZonesPage() {
  await requireUser(["ADMIN"]);
  const t = await getTranslations("zones");
  const locale = await getLocale();
  const zones = await db.zone.findMany({ orderBy: { sortOrder: "asc" }, include: { localities: true } });
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="space-y-5">
        {zones.map((z) => (
          <Card
            key={z.id}
            title={zoneName(z, locale)}
            actions={
              <span className="text-right text-[13px] text-slate-500">
                <span className="font-semibold text-slate-800">{t("summary", { price: formatMDL(z.basePrice), kg: z.includedKg, extra: formatMDL(z.extraPerKg) })}</span>
                <span className="hidden sm:inline">, {t("localityCount", { count: z.localities.length })}</span>
              </span>
            }
          >
            <ZoneForm zone={z} />
          </Card>
        ))}
        <details className="group rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5">
          <summary className="flex min-h-13 items-center gap-3 rounded-2xl px-5 py-3 text-[15px] font-semibold text-brand-700 transition-colors duration-150 hover:bg-slate-50 group-open:rounded-b-none">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600"><MapPinPlus className="h-[18px] w-[18px]" aria-hidden /></span>
            <span className="flex-1">{t("new")}</span>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-150 ease-out group-open:rotate-180" aria-hidden />
          </summary>
          <div className="border-t border-slate-100 p-5"><ZoneForm /></div>
        </details>
      </div>
    </div>
  );
}
