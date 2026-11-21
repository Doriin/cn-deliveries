import { getTranslations } from "next-intl/server";
import { Hammer, LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui";

export default async function Page() {
  const user = await requireUser();
  const t = await getTranslations("common");
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo tag={null} /></div>
        <div className="rounded-2xl bg-white p-8 text-center shadow-raised ring-1 ring-slate-900/5">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Hammer className="h-6 w-6" aria-hidden /></div>
          <h1 className="text-xl font-bold tracking-tight text-ink-950">{t("portalTitle")}</h1>
          <p className="mt-1 text-sm font-medium text-slate-700">{user.name}</p>
          <p className="mt-2 text-sm text-slate-600">{t("comingPortal")}</p>
          <form action={logout} className="mt-6">
            <Button variant="secondary" className="w-full"><LogOut className="h-4 w-4" aria-hidden />{t("logout")}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
