import type { Zone } from "@prisma/client";

export function zoneName(z: Pick<Zone, "nameRo" | "nameRu" | "nameEn">, locale: string): string {
  return locale === "ru" ? z.nameRu : locale === "en" ? z.nameEn : z.nameRo;
}
