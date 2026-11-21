import type { Metadata, Viewport } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { requireUser, COURIER_APP_ROLES } from "@/lib/auth";
import { logout, setLocale } from "@/app/actions/auth";
import { setDesign } from "@/app/actions/design";
import { DESIGNS, DESIGN_META } from "@/lib/design";
import { getDesign } from "@/lib/design.server";
import { LOCALES } from "@/i18n/config";
import { SubmitButton } from "@/components/SubmitButton";
import { CourierNav } from "./CourierNav";
import { AccountSheet } from "./AccountSheet";
import { OfflineBanner } from "./OfflineBanner";

export async function generateMetadata(): Promise<Metadata> {
  const design = await getDesign();
  return {
    title: "CN Curier",
    manifest: "/manifest.webmanifest",
    // Only Dispecerat has a dark header for the phone's white clock to sit on.
    appleWebApp: { capable: true, title: "CN Curier", statusBarStyle: design === "dispecerat" ? "black-translucent" : "default" },
    icons: { apple: "/icons/180" },
  };
}

/** Matches the top of the screen in each design, so the phone's status bar and the app read as one surface. */
export async function generateViewport(): Promise<Viewport> {
  const design = await getDesign();
  return { themeColor: DESIGN_META[design].statusBar, width: "device-width", initialScale: 1, viewportFit: "cover" };
}

const LANGUAGE_NAMES: Record<string, string> = { ro: "Română", ru: "Русский", en: "English" };
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

export default async function CourierLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(COURIER_APP_ROLES);
  const t = await getTranslations("courier");
  const tn = await getTranslations("nav");
  const td = await getTranslations("design");
  const locale = await getLocale();
  const design = await getDesign();
  return (
    <div className="cr app-shell">
      <div className="cr-cover">
        <OfflineBanner text={t("offline")} />
      </div>
      <div className="cr-me-anchor">
        <AccountSheet initials={initials(user.name)} name={user.name} role={tn(`role.${user.role}`)} title={t("account")} closeLabel={t("close")}>
          <h3 className="cr-label">{t("language")}</h3>
          <form action={setLocale} className="cr-opts" data-cols="3">
            {LOCALES.map((l) => (
              <button key={l} name="locale" value={l} aria-pressed={l === locale} className="cr-opt cr-tap">
                {LANGUAGE_NAMES[l]}
              </button>
            ))}
          </form>
          <h3 className="cr-label">{td("title")}</h3>
          <form action={setDesign} className="cr-opts" data-cols="2">
            {DESIGNS.map((d) => (
              <button key={d} name="design" value={d} aria-pressed={d === design} className="cr-opt cr-tap">
                {td(`name.${d}`)}
              </button>
            ))}
          </form>
          <form action={logout}>
            <SubmitButton variant="secondary" size="lg" className="cr-logout w-full">
              <LogOut className="h-5 w-5" aria-hidden /> {t("logout")}
            </SubmitButton>
          </form>
        </AccountSheet>
      </div>
      <main className="cr-main">{children}</main>
      <CourierNav route={design === "expres"} labels={{ today: t(design === "expres" ? "navRoute" : "navToday"), scan: t("navScan"), cash: t("navCash") }} />
    </div>
  );
}
