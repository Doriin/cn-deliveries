import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Phone } from "lucide-react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Logo } from "@/components/Logo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("track");
  return { title: t("title"), robots: { index: false } };
}

export default async function TrackLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("track");
  const phone = process.env.COMPANY_PHONE;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <a href="https://cn-deliveries.com" className="rounded-lg"><Logo tag={null} /></a>
        <LocaleSwitcher />
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-4">{children}</main>
      <footer className="mx-auto w-full max-w-xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 text-center text-sm text-slate-500">
        <div>
          {t("questions")}{" "}
          {phone ? (
            <a className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-900" href={`tel:${phone.replace(/\s/g, "")}`}><Phone className="h-3.5 w-3.5" aria-hidden />{phone}</a>
          ) : (
            <a className="font-semibold text-brand-700 hover:text-brand-900" href="https://cn-deliveries.com">cn-deliveries.com</a>
          )}
        </div>
        <div className="mt-2 text-xs text-slate-400">{t("slogan")}</div>
      </footer>
    </div>
  );
}
