import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { extractTracking } from "@/lib/courier";
import { BrandLogo } from "@/components/Logo";
import { TrackForm } from "./TrackForm";

export default async function TrackSearch({ searchParams }: { searchParams: Promise<{ no?: string }> }) {
  const no = (await searchParams).no;
  if (no) redirect(`/track/${encodeURIComponent(extractTracking(no) ?? no.trim().toUpperCase())}`);
  const t = await getTranslations("track");
  return (
    <div className="pt-[8vh] text-center">
      <BrandLogo width={190} className="mx-auto mb-6" />
      <h1 className="text-[32px] font-bold leading-tight tracking-tight text-ink-950">{t("title")}</h1>
      <p className="mx-auto mt-2 max-w-xs text-[15px] text-slate-500">{t("intro")}</p>
      <div className="mt-8 text-left"><TrackForm autoFocus /></div>
    </div>
  );
}
