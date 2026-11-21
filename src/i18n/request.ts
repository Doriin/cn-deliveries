import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config";

export default getRequestConfig(async () => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(c) ? c : DEFAULT_LOCALE;
  return {
    locale,
    timeZone: "Europe/Chisinau",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
