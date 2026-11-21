import { useLocale } from "next-intl";
import { setLocale } from "@/app/actions/auth";
import { LOCALES } from "@/i18n/config";

export function LocaleSwitcher(_: { dark?: boolean }) {
  const current = useLocale();
  return (
    <form action={setLocale} className="ui-locale">
      {LOCALES.map((l) => (
        <button key={l} name="locale" value={l} aria-pressed={l === current}>
          {l}
        </button>
      ))}
    </form>
  );
}
