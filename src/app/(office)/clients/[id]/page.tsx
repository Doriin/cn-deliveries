import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Package, PackagePlus } from "lucide-react";
import { db } from "@/lib/db";
import { Badge, LinkButton, PageHeader } from "@/components/ui";
import { ClientForm } from "../ClientForm";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("clients");
  const [client, zones] = await Promise.all([
    db.client.findUnique({ where: { id }, include: { prices: true } }),
    db.zone.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!client) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/clients" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors duration-150 hover:text-slate-900"><ArrowLeft className="h-4 w-4" aria-hidden />{t("back")}</Link>
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-3">{client.name}{!client.active && <Badge className="bg-slate-100 text-slate-500">{t("inactive")}</Badge>}</span>}
        subtitle={[client.contactName, client.phone].filter(Boolean).join(", ") || undefined}
        actions={
          <>
            <LinkButton variant="secondary" href={`/shipments?client=${client.id}`}><Package className="h-4 w-4" aria-hidden />{t("viewShipments")}</LinkButton>
            <LinkButton href={`/shipments/new?client=${client.id}`}><PackagePlus className="h-4 w-4" aria-hidden />{t("newShipment")}</LinkButton>
          </>
        }
      />
      <ClientForm client={client} zones={zones} />
    </div>
  );
}
