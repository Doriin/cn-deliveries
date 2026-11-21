import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ClientForm } from "../ClientForm";

export default async function NewClientPage() {
  const t = await getTranslations("clients");
  const zones = await db.zone.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/clients" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors duration-150 hover:text-slate-900"><ArrowLeft className="h-4 w-4" aria-hidden />{t("back")}</Link>
      <PageHeader title={t("new")} />
      <ClientForm zones={zones} />
    </div>
  );
}
