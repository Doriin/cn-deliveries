import { getTranslations } from "next-intl/server";
import { ChevronDown, UserPlus } from "lucide-react";
import type { Client, User } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge, Field, Input, PageHeader, Select, cx } from "@/components/ui";
import { saveUser } from "@/app/actions/settings";

const ROLES = ["ADMIN", "DISPATCHER", "COURIER", "CLIENT"] as const;
const ROLE_TONE: Record<string, string> = {
  ADMIN: "bg-brand-50 text-brand-800", DISPATCHER: "bg-sky-50 text-sky-800", COURIER: "bg-accent-100 text-amber-900", CLIENT: "bg-slate-100 text-slate-700",
};
const AVATAR: Record<string, string> = {
  ADMIN: "bg-brand-600 text-white", DISPATCHER: "bg-sky-600 text-white", COURIER: "bg-accent-500 text-ink-950", CLIENT: "bg-slate-200 text-slate-700",
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

async function UserForm({ user, clients }: { user?: User; clients: Client[] }) {
  const t = await getTranslations("users");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");
  return (
    <ActionForm action={saveUser}>
      {user && <input type="hidden" name="id" value={user.id} />}
      <div className="grid gap-x-4 gap-y-5 md:grid-cols-3">
        <Field label={t("name") + " *"}><Input name="name" required autoComplete="off" defaultValue={user?.name} /></Field>
        <Field label={t("email") + " *"}><Input name="email" type="email" required autoComplete="off" spellCheck={false} defaultValue={user?.email} /></Field>
        <Field label={t("phone")}><Input name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder="+373 69 123 456" defaultValue={user?.phone ?? ""} /></Field>
        <Field label={t("role")}>
          <Select name="role" defaultValue={user?.role ?? "COURIER"}>
            {ROLES.map((r) => <option key={r} value={r}>{tn(`role.${r}`)}</option>)}
          </Select>
        </Field>
        <Field label={t("client")}>
          <Select name="clientId" defaultValue={user?.clientId ?? ""}>
            <option value="">—</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label={user ? t("newPassword") : t("password") + " *"} hint={t("passwordHint")}>
          <Input name="password" type="password" minLength={6} required={!user} autoComplete="new-password" />
        </Field>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        {user ? (
          <label className="flex min-h-10 items-center gap-2.5 text-sm font-medium text-slate-700"><input type="checkbox" name="active" defaultChecked={user.active} /> {t("active")}</label>
        ) : <span />}
        <SubmitButton>{user ? tc("save") : t("create")}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export default async function UsersPage() {
  await requireUser(["ADMIN"]);
  const t = await getTranslations("users");
  const tn = await getTranslations("nav");
  const [users, clients] = await Promise.all([
    db.user.findMany({ orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }], include: { client: { select: { name: true } } } }),
    db.client.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="space-y-5">
        <details className="group rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5">
          <summary className="flex min-h-13 items-center gap-3 rounded-2xl px-5 py-3 text-[15px] font-semibold text-brand-700 transition-colors duration-150 hover:bg-slate-50 group-open:rounded-b-none">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600"><UserPlus className="h-[18px] w-[18px]" aria-hidden /></span>
            <span className="flex-1">{t("new")}</span>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-150 ease-out group-open:rotate-180" aria-hidden />
          </summary>
          <div className="border-t border-slate-100 p-5"><UserForm clients={clients} /></div>
        </details>

        <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5">
          {users.map((u) => (
            <details key={u.id} className="group first:rounded-t-2xl last:rounded-b-2xl">
              <summary className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-slate-50 group-first:rounded-t-2xl group-last:rounded-b-2xl group-open:bg-slate-50 group-open:group-last:rounded-b-none">
                <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold", u.active ? AVATAR[u.role] : "bg-slate-100 text-slate-400")} aria-hidden>{initials(u.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className={cx("block truncate text-sm font-semibold", u.active ? "text-slate-900" : "text-slate-500")}>{u.name}</span>
                  <span className="block truncate text-[13px] text-slate-500">{[u.email, u.phone].filter(Boolean).join(", ")}</span>
                </span>
                {u.client && <span className="hidden max-w-40 truncate text-[13px] text-slate-500 sm:block">{u.client.name}</span>}
                {!u.active && <Badge className="bg-slate-100 text-slate-500">{t("inactive")}</Badge>}
                <Badge className={u.active ? ROLE_TONE[u.role] : "bg-slate-100 text-slate-500"}>{tn(`role.${u.role}`)}</Badge>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ease-out group-open:rotate-180" aria-hidden />
              </summary>
              <div className="border-t border-slate-100 bg-slate-50/60 p-5 group-last:rounded-b-2xl"><UserForm user={u} clients={clients} /></div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
