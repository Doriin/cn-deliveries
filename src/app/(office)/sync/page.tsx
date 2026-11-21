import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink, RefreshCw, Sheet } from "lucide-react";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, Badge, Card, EmptyState, LinkButton, PageHeader, Table, Td, Th } from "@/components/ui";
import { SectionTitle } from "@/components/office/Stat";
import { syncNow } from "@/app/actions/sync";
import { serviceAccountEmail, sheetsConfigured } from "@/worker/sheets/sync";
import { DEFAULT_HEADERS, INPUT_FIELDS, OUTPUT_FIELDS } from "@/lib/sheetColumns";

export default async function SyncPage() {
  const t = await getTranslations("sync");
  const locale = await getLocale();
  const configured = sheetsConfigured();
  const email = configured ? serviceAccountEmail() : null;
  const [clients, logs] = await Promise.all([
    db.client.findMany({ where: { sheetId: { not: null } }, orderBy: { name: "asc" } }),
    db.sheetSyncLog.findMany({ orderBy: { startedAt: "desc" }, take: 50, include: { client: { select: { name: true } } } }),
  ]);
  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <ActionForm action={syncNow}>
            <SubmitButton disabled={!configured}><RefreshCw className="h-4 w-4" aria-hidden />{t("syncAll")}</SubmitButton>
          </ActionForm>
        }
      />
      <div className="space-y-8">
        {!configured ? (
          <Alert kind="info">{t("notConfigured")}</Alert>
        ) : (
          <Alert kind="success">
            {t("connected")} <span className="font-normal">{t("shareWith")}</span>{" "}
            <span className="select-all break-all font-mono text-[13px] font-semibold">{email}</span>
          </Alert>
        )}

        <section>
          <SectionTitle>{t("clients")}</SectionTitle>
          {clients.length === 0 ? (
            <Card><EmptyState icon={Sheet} title={t("noClients")} action={<LinkButton variant="secondary" href="/clients">{t("addSheet")}</LinkButton>} className="py-10" /></Card>
          ) : (
            <Table>
              <thead><tr><Th>{t("client")}</Th><Th>{t("enabled")}</Th><Th>{t("lastSync")}</Th><Th /></tr></thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <Td>
                      <Link className="font-semibold text-slate-900 hover:underline" href={`/clients/${c.id}`}>{c.name}</Link>
                      <a className="ml-2 inline-flex items-center gap-1 align-middle text-[13px] font-medium text-brand-700 hover:underline" href={`https://docs.google.com/spreadsheets/d/${c.sheetId}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />Google Sheets
                      </a>
                    </Td>
                    <Td>
                      {c.sheetSyncEnabled ? (
                        <Badge className="bg-emerald-50 text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />{t("autoOn")}</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />{t("autoOff")}</Badge>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-[13px] tabular-nums text-slate-600">{c.lastSyncedAt ? fmtDateTime(c.lastSyncedAt, locale) : t("never")}</Td>
                    <Td className="text-right">
                      <ActionForm action={syncNow} className="inline-flex flex-wrap justify-end">
                        <input type="hidden" name="clientId" value={c.id} />
                        <SubmitButton size="sm" variant="secondary" disabled={!configured}>{t("syncOne")}</SubmitButton>
                      </ActionForm>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <section>
          <SectionTitle>{t("log")}</SectionTitle>
          {logs.length === 0 ? (
            <Card><EmptyState icon={RefreshCw} title={t("neverRun")} hint={t("neverRunHint")} className="py-10" /></Card>
          ) : (
            <Table>
              <thead><tr><Th>{t("time")}</Th><Th>{t("client")}</Th><Th>{t("result")}</Th><Th className="text-right">{t("imported")}</Th><Th className="text-right">{t("updated")}</Th><Th>{t("message")}</Th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <Td className="whitespace-nowrap text-[13px] tabular-nums text-slate-600">{fmtDateTime(l.startedAt, locale)}</Td>
                    <Td className="font-medium text-slate-900">{l.client.name}</Td>
                    <Td>
                      {l.errors > 0 ? (
                        <Badge className="bg-red-50 text-red-800"><span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />{t("statusErrors", { count: l.errors })}</Badge>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />{t("statusOk")}</Badge>
                      )}
                    </Td>
                    <Td className="text-right tabular-nums">{l.imported || <span className="text-slate-300">0</span>}</Td>
                    <Td className="text-right tabular-nums">{l.updated || <span className="text-slate-300">0</span>}</Td>
                    <Td className="max-w-md truncate text-[13px] text-slate-500"><span title={l.message ?? undefined}>{l.message}</span></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <Card title={t("template")}>
          <p className="mb-3 max-w-prose text-sm text-slate-600">{t("templateHint")}</p>
          <div className="flex flex-wrap gap-1.5">
            {INPUT_FIELDS.map((f) => <code key={f} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">{DEFAULT_HEADERS[f]}</code>)}
            {OUTPUT_FIELDS.map((f) => <code key={f} className="rounded-md bg-brand-50 px-2 py-1 font-mono text-xs text-brand-800">{DEFAULT_HEADERS[f]}</code>)}
          </div>
          <p className="mt-3 text-xs text-slate-500">{t("outputHint")}</p>
        </Card>
      </div>
    </>
  );
}
