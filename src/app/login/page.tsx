import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PackageSearch } from "lucide-react";
import { LoginForm } from "./LoginForm";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { BrandLogo, Logo } from "@/components/Logo";

const ROUTE = "M36 232 C150 232 128 140 236 140 S330 52 444 52";

/** A parcel travelling its route once, on the screen people see before anything else. */
function RouteArt({ labels }: { labels: [string, string, string] }) {
  return (
    <svg viewBox="0 0 480 280" className="w-full max-w-lg" fill="none" aria-hidden="true">
      <path d={ROUTE} stroke="currentColor" strokeOpacity="0.22" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 10" />
      <path d={ROUTE} stroke="currentColor" strokeWidth="3" strokeLinecap="round" pathLength={1} strokeDasharray="1" className="animate-draw [--draw-length:1] [animation-delay:350ms] [animation-duration:2.8s] [animation-timing-function:var(--ease-in-out)]" />
      {[[36, 232], [236, 140], [444, 52]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="9" fill="var(--d-shell)" stroke="currentColor" strokeWidth="3" />
          <text x={x} y={y + 32} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} dx={i === 0 ? -9 : i === 2 ? 9 : 0} fill="currentColor" fillOpacity="0.7" fontSize="13" fontWeight="500">{labels[i]}</text>
        </g>
      ))}
      <g className="animate-travel [offset-rotate:0deg]" style={{ offsetPath: `path("${ROUTE}")` }}>
        <rect x="-17" y="-17" width="34" height="34" rx="9" fill="var(--d-surface)" stroke="currentColor" strokeOpacity="0.25" />
        {/* one box of the company mark */}
        <path transform="translate(-24.5 -21.4) scale(0.19)" d="M73.9 80.4L128.9 48.4L184.2 80.4V145.1L128.9 177.1L73.9 145.1ZM73.9 80.4L128.9 112.4L184.2 80.4M128.9 112.4V177.1"
          stroke="var(--brand-logo)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export default async function LoginPage() {
  const t = await getTranslations("login");
  const ts = await getTranslations("status");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="brand-panel relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <Logo light tag={null} size={38} />
        <div>
          <RouteArt labels={[ts("PICKED_UP"), ts("OUT_FOR_DELIVERY"), ts("DELIVERED")]} />
          <p className="mt-8 max-w-md text-[34px] font-bold leading-[1.15] tracking-tight" style={{ fontFamily: "var(--d-display)" }}>{t("slogan")}</p>
          <p className="mt-4 max-w-sm text-base leading-relaxed opacity-70">{t("pitch")}</p>
        </div>
        <a href="https://cn-deliveries.com" className="text-sm font-medium opacity-60 transition-opacity duration-150 hover:opacity-100">cn-deliveries.com</a>
      </aside>

      <main className="flex flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10">
        <div className="flex items-center justify-between">
          <span aria-hidden />
          <LocaleSwitcher />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div>
            <BrandLogo width={150} className="mb-8" />
            <h1 className="text-[28px] font-bold tracking-tight text-ink-950">{t("welcome")}</h1>
            <p className="mt-1.5 text-[15px] text-slate-500">{t("intro")}</p>
            <div className="mt-8"><LoginForm /></div>
          </div>
        </div>
        <Link href="/track" className="mx-auto inline-flex h-10 items-center gap-2 rounded-[10px] px-3 text-sm font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-900/5 hover:text-slate-900">
          <PackageSearch className="h-4 w-4" aria-hidden /> {t("trackLink")}
        </Link>
      </main>
    </div>
  );
}
