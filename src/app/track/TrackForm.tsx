import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { btnClass, cx } from "@/components/ui";

export async function TrackForm({ defaultValue, autoFocus }: { defaultValue?: string; autoFocus?: boolean }) {
  const t = await getTranslations("track");
  return (
    <form action="/track" role="search" className="flex gap-2">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{t("trackingNo")}</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          name="no"
          defaultValue={defaultValue}
          placeholder="CN-261117-0001"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={autoFocus}
          required
          className="h-13 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-3 font-mono text-base font-semibold uppercase tracking-tight text-ink-950 shadow-[0_1px_2px_rgb(12_26_43/0.04)] transition-[border-color,box-shadow] duration-150 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        />
      </label>
      <button className={cx(btnClass("primary", "lg"), "shrink-0")}>{t("find")}</button>
    </form>
  );
}
