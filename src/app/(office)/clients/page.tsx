import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Building2, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table, Td, Th, cx } from "@/components/ui";

export default async function ClientsPage() {
  const t = await getTranslations("clients");
  const tc = await getTranslations("common");
  const clients = await db.client.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { shipments: true } } } });
  const add = <LinkButton href="/clients/new"><Plus className="h-4 w-4" aria-hidden />{t("new")}</LinkButton>;
  return (
    <>
      <PageHeader title={t("title")} subtitle={clients.length > 0 ? t("count", { count: clients.length }) : undefined} actions={clients.length > 0 && add} />
      {clients.length === 0 ? (
        <Card><EmptyState icon={Building2} title={t("empty")} hint={t("emptyHint")} action={add} /></Card>
      ) : (
        <Table>
          <thead>
            <tr><Th>{t("name")}</Th><Th>{t("phone")}</Th><Th>{t("feeMode")}</Th><Th>{t("sheet")}</Th><Th className="text-right">{t("shipments")}</Th></tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="transition-colors duration-150 hover:bg-slate-50">
                <Td>
                  <div className="flex items-center gap-2">
                    <Link className={cx("font-semibold hover:underline", c.active ? "text-slate-900" : "text-slate-500")} href={`/clients/${c.id}`}>{c.name}</Link>
                    {!c.active && <Badge className="bg-slate-100 text-slate-500">{t("inactive")}</Badge>}
                  </div>
                  {c.contactName && <div className="mt-0.5 text-[13px] text-slate-500">{c.contactName}</div>}
                </Td>
                <Td className="whitespace-nowrap tabular-nums text-slate-700">{c.phone ?? <span className="text-slate-300">—</span>}</Td>
                <Td className="text-slate-700">{tc(`feeMode.${c.feeMode}`)}</Td>
                <Td>
                  {c.sheetSyncEnabled ? (
                    <Badge className="bg-emerald-50 text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />{t("syncOn")}</Badge>
                  ) : c.sheetId ? (
                    <Badge className="bg-slate-100 text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />{t("syncOff")}</Badge>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </Td>
                <Td className="text-right">
                  <Link href={`/shipments?client=${c.id}&status=ALL`} className="font-medium tabular-nums text-brand-700 hover:underline">{c._count.shipments}</Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
